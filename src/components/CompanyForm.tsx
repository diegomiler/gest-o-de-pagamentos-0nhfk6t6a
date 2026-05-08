import { useState, useEffect, useRef } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { UploadCloud, Image as ImageIcon, X, Loader2, ArrowLeft } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { formatCNPJ } from '@/lib/format'

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
  const [formData, setFormData] = useState({ name: '', cnpj: '', overtime_rules: '' })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (companyId) {
      pb.collection('companies')
        .getOne(companyId)
        .then((company) => {
          setFormData({
            name: company.name || '',
            cnpj: formatCNPJ(company.cnpj || ''),
            overtime_rules: company.overtime_rules || '',
          })
          setLogoPreview(company.logo ? pb.files.getURL(company, company.logo) : null)
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
    try {
      const payload: any = {
        name: formData.name,
        cnpj: formData.cnpj || '',
        overtime_rules: formData.overtime_rules || '',
      }
      if (logoFile) payload.logo = logoFile
      else if (logoPreview === null) payload.logo = null

      if (companyId) await pb.collection('companies').update(companyId, payload)
      else await pb.collection('companies').create(payload)
      toast({ title: 'Sucesso', description: 'Empresa salva com sucesso!' })
      onSaved()
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      setErrors(fieldErrors)
      toast({
        title: 'Erro',
        description: 'Erro ao salvar empresa. Verifique os campos.',
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
              <div className="space-y-2 md:col-span-2">
                <Label>Regras para Horas Extras</Label>
                <Textarea
                  value={formData.overtime_rules}
                  onChange={(e) => setFormData({ ...formData, overtime_rules: e.target.value })}
                  placeholder="Descreva as regras para horas extras da empresa..."
                  className="resize-none min-h-[100px]"
                />
                {errors.overtime_rules && (
                  <p className="text-sm text-destructive">{errors.overtime_rules}</p>
                )}
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
