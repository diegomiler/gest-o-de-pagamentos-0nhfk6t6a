import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { UploadCloud, Image as ImageIcon, X, Loader2, ArrowLeft } from 'lucide-react'
import { formatCNPJ, formatCEP } from '@/lib/format'

export function CompanyForm({
  companyId,
  onBack,
  onSaved,
}: {
  companyId: string | null
  onBack?: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [localCompanyId, setLocalCompanyId] = useState<string | null>(companyId)
  const [isLoading, setIsLoading] = useState(!!companyId)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalCompanyId(companyId)
  }, [companyId])

  useEffect(() => {
    if (companyId) {
      setIsLoading(true)
      pb.collection('companies')
        .getOne(companyId)
        .then((company) => {
          setFormData({
            name: company.name || '',
            cnpj: formatCNPJ(company.cnpj || ''),
            zip_code: formatCEP(company.zip_code || ''),
            street: company.street || '',
            number: company.number || '',
            complement: company.complement || '',
            neighborhood: company.neighborhood || '',
            city: company.city || '',
            state: company.state || '',
          })
          setLogoPreview(company.logo ? pb.files.getURL(company, company.logo) : null)
          setIsLoading(false)
        })
        .catch((err: any) => {
          if (err instanceof ClientResponseError && err.status === 404) {
            setFormData({
              name: '',
              cnpj: '',
              zip_code: '',
              street: '',
              number: '',
              complement: '',
              neighborhood: '',
              city: '',
              state: '',
            })
            setLogoPreview(null)
            setLocalCompanyId(null)
          } else {
            toast({
              title: 'Erro de conexão',
              description: 'Não foi possível carregar os dados da empresa.',
              variant: 'destructive',
            })
          }
          setIsLoading(false)
        })
    } else {
      setFormData({
        name: '',
        cnpj: '',
        zip_code: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
      })
      setLogoPreview(null)
      setIsLoading(false)
      setLocalCompanyId(null)
    }
  }, [companyId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSaving(true)
    try {
      const unmaskedCnpj = formData.cnpj ? formData.cnpj.replace(/\D/g, '') : ''

      if (unmaskedCnpj) {
        const existing = await pb.collection('companies').getList(1, 1, {
          filter: `cnpj = "${unmaskedCnpj}"${localCompanyId ? ` && id != "${localCompanyId}"` : ''}`,
        })
        if (existing.items.length > 0) {
          setErrors({ cnpj: 'Este CNPJ já está cadastrado.' })
          toast({
            title: 'Erro',
            description: 'Falha ao salvar as configurações. Verifique os campos e tente novamente.',
            variant: 'destructive',
          })
          setIsSaving(false)
          return
        }
      }

      const payload = new FormData()
      payload.append('name', formData.name)
      payload.append('cnpj', unmaskedCnpj)
      payload.append('zip_code', formData.zip_code.replace(/\D/g, ''))
      payload.append('street', formData.street)
      payload.append('number', formData.number)
      payload.append('complement', formData.complement)
      payload.append('neighborhood', formData.neighborhood)
      payload.append('city', formData.city)
      payload.append('state', formData.state)

      if (logoFile) {
        payload.append('logo', logoFile)
      } else if (logoPreview === null) {
        payload.append('logo', '')
      }

      if (localCompanyId) {
        try {
          await pb.collection('companies').update(localCompanyId, payload)
        } catch (updateErr: any) {
          if (updateErr instanceof ClientResponseError && updateErr.status === 404) {
            const newCompany = await pb.collection('companies').create(payload)
            setLocalCompanyId(newCompany.id)
            if (pb.authStore.record) {
              await pb
                .collection('users')
                .update(pb.authStore.record.id, { company_id: newCompany.id })
              await pb.collection('users').authRefresh()
            }
          } else {
            throw updateErr
          }
        }
      } else {
        const newCompany = await pb.collection('companies').create(payload)
        setLocalCompanyId(newCompany.id)
        if (pb.authStore.record) {
          await pb.collection('users').update(pb.authStore.record.id, { company_id: newCompany.id })
          await pb.collection('users').authRefresh()
        }
      }

      toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso' })
      onSaved()
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)

      const translatedErrors: Record<string, string> = {}
      for (const [field, message] of Object.entries(fieldErrors)) {
        const lowerMsg = message.toLowerCase()
        if (lowerMsg.includes('unique') || lowerMsg.includes('já existe')) {
          translatedErrors[field] = 'Este valor já está em uso.'
        } else if (lowerMsg.includes('required') || lowerMsg.includes('blank')) {
          translatedErrors[field] = 'Este campo é obrigatório.'
        } else {
          translatedErrors[field] = message
        }
      }

      if (translatedErrors.cnpj === 'Este valor já está em uso.') {
        translatedErrors.cnpj = 'Este CNPJ já está cadastrado.'
      }

      setErrors(translatedErrors)
      toast({
        title: 'Erro',
        description: 'Falha ao salvar as configurações. Verifique os campos e tente novamente.',
        variant: 'destructive',
      })
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
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {localCompanyId ? 'Configurações da Empresa' : 'Nova Empresa'}
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
                <Label>Nome / Razão Social</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Empresa XYZ LTDA"
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Endereço</Label>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="space-y-2 md:col-span-3">
                  <Label>CEP</Label>
                  <Input
                    value={formData.zip_code}
                    onChange={(e) =>
                      setFormData({ ...formData, zip_code: formatCEP(e.target.value) })
                    }
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {errors.zip_code && <p className="text-sm text-destructive">{errors.zip_code}</p>}
                </div>
                <div className="space-y-2 md:col-span-7">
                  <Label>Logradouro</Label>
                  <Input
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    placeholder="Rua, Avenida, etc."
                  />
                  {errors.street && <p className="text-sm text-destructive">{errors.street}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Número</Label>
                  <Input
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="123"
                  />
                  {errors.number && <p className="text-sm text-destructive">{errors.number}</p>}
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Complemento</Label>
                  <Input
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Apto, Sala, etc."
                  />
                  {errors.complement && (
                    <p className="text-sm text-destructive">{errors.complement}</p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-5">
                  <Label>Bairro</Label>
                  <Input
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Bairro"
                  />
                  {errors.neighborhood && (
                    <p className="text-sm text-destructive">{errors.neighborhood}</p>
                  )}
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Cidade</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Cidade"
                  />
                  {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>UF</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value.toUpperCase() })
                    }
                    placeholder="UF"
                    maxLength={2}
                  />
                  {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Logo da Empresa</Label>
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
