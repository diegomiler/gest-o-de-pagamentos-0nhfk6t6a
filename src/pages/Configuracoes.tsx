import { useState, useEffect } from 'react'
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

export default function Configuracoes() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [companyId, setCompanyId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchCompany = async () => {
      if (!user?.company_id) return
      try {
        const c = await pb.collection('companies').getOne(user.company_id)
        setCompanyId(c.id)
        setFormData({ name: c.name, tax_id: c.tax_id || '' })
      } catch {
        /* intentionally ignored */
      }
    }
    fetchCompany()
  }, [user])

  const handleSave = async () => {
    setErrors({})
    try {
      if (companyId) {
        await pb.collection('companies').update(companyId, formData)
      } else {
        const c = await pb.collection('companies').create(formData)
        await pb.collection('users').update(user.id, { company_id: c.id })
        setCompanyId(c.id)
      }
      toast({ title: 'Sucesso', description: 'Configurações da empresa atualizadas.' })
    } catch (err: any) {
      setErrors(extractFieldErrors(err))
      toast({ title: 'Erro', description: 'Verifique os campos.', variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie os dados globais do sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>Estas informações aparecem no cabeçalho dos holerites.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Razão Social</Label>
            <Input
              id="companyName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax_id">CNPJ</Label>
            <Input
              id="tax_id"
              value={formData.tax_id}
              onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
              placeholder="00.000.000/0001-00"
            />
            {errors.tax_id && <p className="text-sm text-red-500">{errors.tax_id}</p>}
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
