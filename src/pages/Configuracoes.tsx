import { useState, useEffect, useRef } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { UploadCloud, Image as ImageIcon, X } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

export default function Configuracoes() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fetchCompany = async () => {
    if (!user?.company_id) return
    try {
      const c = await pb.collection('companies').getOne(user.company_id)
      setCompanyId(c.id)
      setFormData({ name: c.name, tax_id: c.tax_id || '' })
      if (c.logo) {
        setLogoPreview(pb.files.getURL(c, c.logo))
      }
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    fetchCompany()
  }, [user])

  useRealtime('companies', fetchCompany)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5242880) {
        // 5MB limit
        toast({
          title: 'Erro',
          description: 'A imagem deve ter no máximo 5MB.',
          variant: 'destructive',
        })
        return
      }
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setErrors({})
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('tax_id', formData.tax_id)

      if (logoFile) {
        data.append('logo', logoFile)
      } else if (logoPreview === null && companyId) {
        // user removed the logo
        data.append('logo', '')
      }

      if (companyId) {
        await pb.collection('companies').update(companyId, data)
      } else {
        const c = await pb.collection('companies').create(data)
        await pb.collection('users').update(user.id, { company_id: c.id })
        setCompanyId(c.id)
      }
      toast({ title: 'Sucesso', description: 'Configurações da empresa atualizadas.' })
    } catch (err: any) {
      setErrors(extractFieldErrors(err))
      toast({
        title: 'Erro',
        description: 'Verifique os campos obrigatórios.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie os dados globais e o perfil da empresa.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>Estas informações aparecem no cabeçalho dos holerites.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="space-y-2 flex-1">
              <Label htmlFor="companyName">Razão Social *</Label>
              <Input
                id="companyName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da Empresa LTDA"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="tax_id">CNPJ</Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                placeholder="00.000.000/0001-00"
              />
              {errors.tax_id && <p className="text-sm text-red-500">{errors.tax_id}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Logo da Empresa</Label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/50 relative overflow-hidden group">
                {logoPreview ? (
                  <>
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={handleRemoveLogo}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="h-4 w-4" />
                  {logoPreview ? 'Trocar Logo' : 'Fazer Upload'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleFileChange}
                />
                {errors.logo && <p className="text-sm text-red-500">{errors.logo}</p>}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4 bg-muted/10">
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
