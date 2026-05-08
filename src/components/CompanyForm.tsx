import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Plus, Trash2, UploadCloud, Image as ImageIcon, X, Loader2, ArrowLeft } from 'lucide-react'

export function CompanyForm({
  companyId,
  onBack,
  onSaved,
}: {
  companyId: string | null
  onBack: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(!!companyId)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', tax_id: '' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [overtimeBrackets, setOvertimeBrackets] = useState<{ limit: string; percentage: string }[]>(
    [],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (companyId) {
      pb.collection('companies')
        .getOne(companyId)
        .then((company) => {
          setFormData({ name: company.name || '', tax_id: company.tax_id || '' })
          setLogoPreview(company.logo ? pb.files.getURL(company, company.logo) : null)
          let brackets: any[] = []
          if (Array.isArray(company.overtime_config)) {
            brackets = company.overtime_config.map((b: any) => ({
              limit: b.limit ?? '',
              percentage: b.percentage || '',
            }))
          }
          setOvertimeBrackets(brackets)
          setIsLoading(false)
        })
        .catch(() => {
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar.',
            variant: 'destructive',
          })
          onBack()
        })
    }
  }, [companyId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSaving(true)
    if (!formData.name.trim()) {
      setErrors({ name: 'Nome é obrigatório' })
      setIsSaving(false)
      return
    }
    try {
      const payload: any = {
        name: formData.name,
        tax_id: formData.tax_id || '',
        overtime_config: overtimeBrackets.map((b) => ({
          limit: String(b.limit).trim() ? Number(b.limit) : null,
          percentage: Number(b.percentage) || 0,
        })),
      }
      if (logoFile) payload.logo = logoFile
      else if (logoPreview === null) payload.logo = null

      if (companyId) await pb.collection('companies').update(companyId, payload)
      else await pb.collection('companies').create(payload)
      toast({ title: 'Sucesso', description: 'Empresa salva com sucesso.' })
      onSaved()
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.tax_id) fieldErrors.tax_id = 'Este CNPJ já está cadastrado'
      setErrors(fieldErrors)
      toast({ title: 'Erro', description: 'Verifique os campos.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {companyId ? 'Editar Empresa' : 'Nova Empresa'}
          </h2>
        </div>
      </div>
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
                {errors.tax_id && <p className="text-sm text-destructive">{errors.tax_id}</p>}
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base">Regras de Horas Extras</Label>
              <div className="space-y-3">
                {overtimeBrackets.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <Input
                      type="number"
                      placeholder="Limite (h)"
                      value={b.limit}
                      onChange={(e) => {
                        const n = [...overtimeBrackets]
                        n[idx].limit = e.target.value
                        setOvertimeBrackets(n)
                      }}
                      className="w-28"
                    />
                    <span className="text-sm text-muted-foreground">h =</span>
                    <Input
                      type="number"
                      placeholder="%"
                      value={b.percentage}
                      onChange={(e) => {
                        const n = [...overtimeBrackets]
                        n[idx].percentage = e.target.value
                        setOvertimeBrackets(n)
                      }}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setOvertimeBrackets(overtimeBrackets.filter((_, i) => i !== idx))
                      }
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOvertimeBrackets([...overtimeBrackets, { limit: '', percentage: '50' }])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Regra
                </Button>
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base">Logo da Empresa</Label>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-lg border flex items-center justify-center bg-muted/30 relative group">
                  {logoPreview ? (
                    <>
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="w-full h-full object-contain p-2"
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setLogoFile(null)
                            setLogoPreview(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />{' '}
                    {logoPreview ? 'Trocar Logo' : 'Fazer Upload'}
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setLogoFile(e.target.files[0])
                        setLogoPreview(URL.createObjectURL(e.target.files[0]))
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6 bg-muted/20">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
