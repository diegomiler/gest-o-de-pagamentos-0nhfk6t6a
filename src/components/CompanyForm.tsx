import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { UploadCloud, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { formatCNPJ, formatCEP } from '@/lib/format'

export function CompanyForm({
  company,
  onSaved,
  onCancel,
}: {
  company?: any
  onSaved: () => void
  onCancel: () => void
}) {
  const { toast } = useToast()
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
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (company) {
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
    }
  }, [company])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsSaving(true)
    try {
      const unmaskedCnpj = formData.cnpj.replace(/\D/g, '')
      if (unmaskedCnpj) {
        const exist = await pb.collection('companies').getList(1, 1, {
          filter: `cnpj = "${unmaskedCnpj}"${company ? ` && id != "${company.id}"` : ''}`,
        })
        if (exist.items.length > 0) {
          setErrors({ cnpj: 'CNPJ já cadastrado.' })
          setIsSaving(false)
          return
        }
      }
      const payload = new FormData()
      Object.entries(formData).forEach(([k, v]) =>
        payload.append(k, k === 'cnpj' || k === 'zip_code' ? v.replace(/\D/g, '') : v),
      )
      if (logoFile) payload.append('logo', logoFile)
      else if (logoPreview === null) payload.append('logo', '')

      if (company) {
        await pb.collection('companies').update(company.id, payload)
      } else {
        await pb.collection('companies').create(payload)
      }
      toast({ title: 'Sucesso', description: 'Empresa salva com sucesso' })
      onSaved()
    } catch (err: any) {
      setErrors(extractFieldErrors(err))
      toast({ title: 'Erro', description: 'Falha ao salvar a empresa.', variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Razão Social</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input
            value={formData.cnpj}
            onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
            maxLength={18}
          />
          {errors.cnpj && <p className="text-sm text-destructive">{errors.cnpj}</p>}
        </div>
      </div>
      <div className="grid grid-cols-12 gap-4 pt-2">
        <div className="col-span-4 space-y-2">
          <Label>CEP</Label>
          <Input
            value={formData.zip_code}
            onChange={(e) => setFormData({ ...formData, zip_code: formatCEP(e.target.value) })}
            maxLength={9}
          />
        </div>
        <div className="col-span-8 space-y-2">
          <Label>Logradouro</Label>
          <Input
            value={formData.street}
            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
          />
        </div>
        <div className="col-span-4 space-y-2">
          <Label>Número</Label>
          <Input
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
          />
        </div>
        <div className="col-span-4 space-y-2">
          <Label>Complemento</Label>
          <Input
            value={formData.complement}
            onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
          />
        </div>
        <div className="col-span-4 space-y-2">
          <Label>Bairro</Label>
          <Input
            value={formData.neighborhood}
            onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
          />
        </div>
        <div className="col-span-8 space-y-2">
          <Label>Cidade</Label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div className="col-span-4 space-y-2">
          <Label>UF</Label>
          <Input
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
            maxLength={2}
          />
        </div>
      </div>
      <div className="flex items-center gap-4 pt-2">
        <div className="w-16 h-16 rounded border flex items-center justify-center bg-muted relative group overflow-hidden">
          {logoPreview ? (
            <>
              <img src={logoPreview} className="w-full h-full object-contain p-1" />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white"
                  onClick={() => {
                    setLogoFile(null)
                    setLogoPreview(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud className="mr-2 h-4 w-4" /> Logo
          </Button>
          <input
            type="file"
            ref={fileRef}
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
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
        </Button>
      </div>
    </form>
  )
}
