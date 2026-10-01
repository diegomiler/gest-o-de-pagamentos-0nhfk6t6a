import { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, Upload, Trash2, RotateCw, Check, X, SwitchCamera, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Slider } from '@/components/ui/slider'

interface EmployeePhotoCaptureProps {
  currentPhotoUrl?: string | null
  employeeName?: string
  onChange: (file: File | null) => void
  disabled?: boolean
}

export function EmployeePhotoCapture({
  currentPhotoUrl,
  employeeName = '',
  onChange,
  disabled = false,
}: EmployeePhotoCaptureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isCropOpen, setIsCropOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)

  // Estados de recorte
  const [zoom, setZoom] = useState<number>(1)
  const [rotation, setRotation] = useState<number>(0)
  const [cropOffset, setCropOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const currentOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cropCanvasRef = useRef<HTMLCanvasElement>(null)
  const imageObjRef = useRef<HTMLImageElement | null>(null)

  // Sincroniza se a foto externa mudar
  useEffect(() => {
    setPreviewUrl(currentPhotoUrl || null)
  }, [currentPhotoUrl])

  // Iniciais para fallback
  const initials = employeeName
    ? employeeName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'FN'

  // Finalizar stream da câmera ao fechar
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      stopCameraStream()
    }
  }, [stopCameraStream])

  // Iniciar câmera
  const startCamera = async (deviceId?: string) => {
    stopCameraStream()
    setCameraError(null)

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 960 },
          facingMode: deviceId ? undefined : { ideal: 'user' },
          deviceId: deviceId ? { exact: deviceId } : undefined,
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Descobrir dispositivos disponíveis
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevs = devices.filter((d) => d.kind === 'videoinput')
      setVideoDevices(videoDevs)

      const activeTrack = stream.getVideoTracks()[0]
      const activeSettings = activeTrack?.getSettings()
      if (activeSettings?.deviceId) {
        setSelectedDeviceId(activeSettings.deviceId)
      }
    } catch (err: any) {
      console.error('Erro ao acessar câmera:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permissão para uso da câmera foi negada no navegador.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Nenhuma câmera foi encontrada neste dispositivo.')
      } else {
        setCameraError('Não foi possível inicializar a câmera. Tente upload de arquivo.')
      }
    }
  }

  const openCameraDialog = () => {
    setIsCameraOpen(true)
    setTimeout(() => {
      startCamera()
    }, 100)
  }

  const closeCameraDialog = () => {
    stopCameraStream()
    setIsCameraOpen(false)
    setCameraError(null)
  }

  const switchCamera = () => {
    if (videoDevices.length <= 1) return
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId)
    const nextIndex = (currentIndex + 1) % videoDevices.length
    const nextDevice = videoDevices[nextIndex]
    setSelectedDeviceId(nextDevice.deviceId)
    startCamera(nextDevice.deviceId)
  }

  // Capturar foto do vídeo
  const takeSnapshot = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Se estiver usando câmera frontal padrão, espelhar para selfie natural
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)

    closeCameraDialog()
    openCropDialog(dataUrl)
  }

  // Upload de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        openCropDialog(reader.result)
      }
    }
    reader.readAsDataURL(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Abrir modal de recorte 3x4
  const openCropDialog = (imageSrc: string) => {
    setRawImageSrc(imageSrc)
    setZoom(1)
    setRotation(0)
    setCropOffset({ x: 0, y: 0 })
    currentOffsetRef.current = { x: 0, y: 0 }
    setIsCropOpen(true)

    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      imageObjRef.current = img
      drawCropPreview(img, 1, 0, { x: 0, y: 0 })
    }
  }

  // Renderizar o preview do recorte no canvas
  // Proporção padrão 3x4 (ex: 300x400 ou 600x800)
  const TARGET_WIDTH = 450
  const TARGET_HEIGHT = 600

  const drawCropPreview = (
    img: HTMLImageElement,
    currentZoom: number,
    currentRotation: number,
    offset: { x: number; y: number },
  ) => {
    const canvas = cropCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = TARGET_WIDTH
    canvas.height = TARGET_HEIGHT

    ctx.clearRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)
    ctx.save()

    // Fundo branco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT)

    // Mover para o centro do canvas para rotação e translação
    ctx.translate(TARGET_WIDTH / 2 + offset.x, TARGET_HEIGHT / 2 + offset.y)
    ctx.rotate((currentRotation * Math.PI) / 180)

    // Calcular escala base para "cover" no formato 3x4
    const scaleToCover = Math.max(TARGET_WIDTH / img.width, TARGET_HEIGHT / img.height)
    const effectiveScale = scaleToCover * currentZoom

    const drawW = img.width * effectiveScale
    const drawH = img.height * effectiveScale

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
    ctx.restore()
  }

  // Redesenhar quando zoom, rotação ou offset mudarem
  useEffect(() => {
    if (imageObjRef.current && isCropOpen) {
      drawCropPreview(imageObjRef.current, zoom, rotation, cropOffset)
    }
  }, [zoom, rotation, cropOffset, isCropOpen])

  // Arrastar a imagem no modal de recorte
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    currentOffsetRef.current = { ...cropOffset }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setCropOffset({
      x: currentOffsetRef.current.x + dx,
      y: currentOffsetRef.current.y + dy,
    })
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  // Touch para mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      currentOffsetRef.current = { ...cropOffset }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - dragStartRef.current.x
    const dy = e.touches[0].clientY - dragStartRef.current.y
    setCropOffset({
      x: currentOffsetRef.current.x + dx,
      y: currentOffsetRef.current.y + dy,
    })
  }

  const handleTouchEnd = () => {
    isDraggingRef.current = false
  }

  // Confirmar recorte e gerar File
  const handleConfirmCrop = () => {
    const canvas = cropCanvasRef.current
    if (!canvas) return

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const timestamp = Date.now()
        const file = new File([blob], `funcionario_${timestamp}.jpg`, { type: 'image/jpeg' })
        const localUrl = URL.createObjectURL(blob)
        setPreviewUrl(localUrl)
        onChange(file)
        setIsCropOpen(false)
      },
      'image/jpeg',
      0.9,
    )
  }

  // Remover foto
  const handleRemovePhoto = () => {
    setPreviewUrl(null)
    onChange(null)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-lg border bg-muted/20">
      {/* Visualizador da Foto com moldura 3x4 */}
      <div className="relative group">
        <div className="w-28 h-36 rounded-md overflow-hidden border-2 border-border shadow-sm bg-muted flex items-center justify-center relative">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={employeeName || 'Foto do funcionário'}
              className="w-full h-full object-cover"
            />
          ) : (
            <Avatar className="w-full h-full rounded-none">
              <AvatarFallback className="rounded-none bg-primary/10 text-primary font-semibold text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Badge Proporção 3x4 */}
          <span className="absolute bottom-1 right-1 text-[10px] font-medium bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-xs">
            3x4
          </span>
        </div>

        {previewUrl && !disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow"
            onClick={handleRemovePhoto}
            title="Remover foto"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Botões e Instruções */}
      <div className="flex-1 space-y-2 text-center sm:text-left">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Foto do Funcionário</h4>
          <p className="text-xs text-muted-foreground">
            Formato oficial 3x4 para identificação. Tire uma foto pela câmera ou envie um arquivo do
            computador/celular.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={openCameraDialog}
            disabled={disabled}
            className="h-8 gap-1.5"
          >
            <Camera className="h-3.5 w-3.5" />
            Tirar Foto
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="h-8 gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            Enviar Arquivo
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled}
          />

          {previewUrl && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (previewUrl) openCropDialog(previewUrl)
              }}
              className="h-8 gap-1 text-xs"
            >
              Reajustar 3x4
            </Button>
          )}
        </div>
      </div>

      {/* MODAL 1: CÂMERA */}
      <Dialog open={isCameraOpen} onOpenChange={(open) => (!open ? closeCameraDialog() : null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tirar Foto com a Câmera</DialogTitle>
            <DialogDescription>
              Posicione o rosto no centro da moldura 3x4 e capture a foto.
            </DialogDescription>
          </DialogHeader>

          <div className="relative w-full aspect-[4/3] bg-black rounded-lg overflow-hidden flex items-center justify-center">
            {cameraError ? (
              <div className="p-4 text-center text-white space-y-3">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-sm text-red-200">{cameraError}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                  onClick={() => startCamera(selectedDeviceId)}
                >
                  Tentar Novamente
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Guia visual de enquadramento 3x4 */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[180px] h-[240px] border-2 border-primary/80 rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] relative">
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground text-[10px] px-2 py-0.5 rounded">
                      Enquadramento 3x4
                    </span>
                  </div>
                </div>

                {videoDevices.length > 1 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 text-white hover:bg-black/80"
                    onClick={switchCamera}
                    title="Trocar Câmera"
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between items-center gap-2">
            <Button type="button" variant="outline" onClick={closeCameraDialog}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={takeSnapshot}
              disabled={Boolean(cameraError)}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              Capturar Foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: AJUSTE / RECORTE 3x4 */}
      <Dialog open={isCropOpen} onOpenChange={setIsCropOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajustar Foto (Padrão 3x4)</DialogTitle>
            <DialogDescription>
              Arraste a foto para posicionar o rosto, ajuste o zoom e confirme.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {/* Área de recorte proporcional 3x4 */}
            <div
              className="relative w-[240px] h-[320px] rounded-lg overflow-hidden border-2 border-primary shadow-inner bg-slate-900 cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <canvas
                ref={cropCanvasRef}
                className="w-full h-full object-contain pointer-events-none"
              />

              {/* Linhas guia sutis */}
              <div className="absolute inset-0 pointer-events-none border border-white/20 grid grid-cols-3 grid-rows-3 opacity-40" />
            </div>

            {/* Controles de Zoom e Rotação */}
            <div className="w-full space-y-3 px-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Zoom</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <Slider
                  value={[zoom]}
                  min={0.8}
                  max={2.5}
                  step={0.05}
                  onValueChange={([val]) => setZoom(val)}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="gap-1.5 text-xs h-8"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Girar 90°
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setZoom(1)
                    setRotation(0)
                    setCropOffset({ x: 0, y: 0 })
                  }}
                  className="text-xs h-8"
                >
                  Centralizar
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCropOpen(false)}>
              <X className="mr-1 h-4 w-4" />
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmCrop} className="gap-1.5">
              <Check className="h-4 w-4" />
              Salvar Recorte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
