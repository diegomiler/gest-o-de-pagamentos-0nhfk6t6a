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
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useAuth } from '@/hooks/use-auth'
import { Plus, Trash2, UploadCloud, Image as ImageIcon, X, Loader2 } from 'lucide-react'

export default function Configuracoes() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const [formData, setFormData] = useState({ name: '', tax_id: '' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [overtimeBrackets, setOvertimeBrackets] = useState<{ limit: string; percentage: string }[]>(
    [],
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user?.company_id) {
      loadCompany(user.company_id)
    } else {
      setIsLoading(false)
      toast({
        title: 'Aviso',
        description: 'Nenhuma empresa associada ao seu usuário.',
        variant: 'destructive',
      })
    }
  }, [user?.company_id])

  const loadCompany = async (id: string) => {
    try {
      setIsLoading(true)
      const company = await pb.collection('companies').getOne(id)
      setCompanyId(company.id)
      setFormData({ name: company.name || '', tax_id: company.tax_id || '' })
      setLogoPreview(company.logo ? pb.files.getURL(company, company.logo) : null)

      let brackets: { limit: string; percentage: string }[] = []
      if (Array.isArray(company.overtime_config)) {
        brackets = company.overtime_config.map((b: any) => ({
          limit: b.limit === null || b.limit === undefined ? '' : String(b.limit),
          percentage: String(b.percentage || ''),
        }))
      }
      setOvertimeBrackets(brackets)
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5242880) {
        toast({ title: 'Erro', description: 'Máximo 5MB.', variant: 'destructive' })
        return
      }
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    setErrors({})
    setIsSaving(true)

    if (!formData.name.trim()) {
      setErrors({ name: 'Nome é obrigatório' })
      setIsSaving(false)
      return
    }

    try {
      const parsedBrackets = overtimeBrackets.map((b) => ({
        limit: (b.limit || '').trim() ? Number(b.limit) : null,
        percentage: Number(b.percentage) || 0,
      }))

      const payload: any = {
        name: formData.name,
        tax_id: formData.tax_id || '',
        overtime_config: parsedBrackets,
      }
      if (logoFile) payload.logo = logoFile
      else if (logoPreview === null) payload.logo = null

      await pb.collection('companies').update(companyId, payload)
      toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso.' })
      await loadCompany(companyId)
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.tax_id) fieldErrors.tax_id = 'Este CNPJ já está cadastrado'
      setErrors(fieldErrors)
      toast({
        title: 'Erro ao salvar',
        description: 'Verifique os campos.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">
          Gerencie os dados e regras de negócio da sua empresa.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Dados da Empresa</CardTitle>
            <CardDescription>
              Atualize as informações cadastrais e configurações específicas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Razão Social *</Label>
                <Input
                  id="companyName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Empresa LTDA"
                  disabled={!companyId}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_id">CNPJ / Identificação Fiscal</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  disabled={!companyId}
                />
                {errors.tax_id && <p className="text-sm text-destructive">{errors.tax_id}</p>}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base">Regras de Horas Extras</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Exemplo: Até 2 horas = 50%; Acima (limite vazio) = 100%.
                </p>
              </div>
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
                      disabled={!companyId}
                    />
                    <span className="text-sm font-medium text-muted-foreground">h =</span>
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
                      disabled={!companyId}
                    />
                    <span className="text-sm font-medium text-muted-foreground">%</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setOvertimeBrackets(overtimeBrackets.filter((_, i) => i !== idx))
                      }
                      disabled={!companyId}
                      className="text-muted-foreground hover:text-destructive"
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
                  disabled={!companyId}
                  className="mt-2"
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Regra
                </Button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base">Logo da Empresa</Label>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30 relative overflow-hidden group">
                  {logoPreview ? (
                    <>
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="w-full h-full object-contain p-2"
                      />
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={handleRemoveLogo}
                          disabled={!companyId}
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
                    disabled={!companyId}
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {logoPreview ? 'Trocar Logo' : 'Fazer Upload'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Formatos: JPG, PNG, WEBP. Máx: 5MB.
                  </p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg, image/png, image/webp"
                    onChange={handleFileChange}
                    disabled={!companyId}
                  />
                  {errors.logo && <p className="text-sm text-destructive">{errors.logo}</p>}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-6 bg-muted/20">
            <Button type="submit" disabled={isSaving || !companyId}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
