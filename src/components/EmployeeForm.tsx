import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import pb from '@/lib/pocketbase/client'
import { formatCPF, formatCEP } from '@/lib/format'
import { useAuth } from '@/hooks/use-auth'

type Props = {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function EmployeeForm({ initialData, onSubmit, onCancel }: Props) {
  const { user } = useAuth()
  const canEditSalary = user?.role === 'admin' || user?.role === 'manager'

  const [companies, setCompanies] = useState<any[]>([])
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [reasonText, setReasonText] = useState('')

  const [formData, setFormData] = useState<any>(() => {
    const data = {
      name: '',
      cpf: '',
      phone: '',
      email: '',
      role: '',
      department: '',
      company_id: '',
      base_salary: 0,
      additional_amount: 0,
      status: 'active',
      admission_date: new Date().toISOString().split('T')[0],
      zip_code: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      ...initialData,
    }

    if (data.admission_date) {
      data.admission_date = data.admission_date.split(' ')[0].split('T')[0]
    }

    return data
  })

  useEffect(() => {
    pb.collection('companies')
      .getFullList({ sort: 'name' })
      .then((data) => {
        setCompanies(data)
        setFormData((prev: any) => {
          if (data.length === 1 && !prev.company_id) {
            return { ...prev, company_id: data[0].id }
          }
          return prev
        })
      })
      .catch(() => {})
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (initialData) {
      const oldSalary = initialData.base_salary || 0
      const newSalary = formData.base_salary || 0
      const oldAdditional = initialData.additional_amount || 0
      const newAdditional = formData.additional_amount || 0

      const salaryChanged = newSalary !== oldSalary
      const additionalChanged = newAdditional !== oldAdditional

      if (salaryChanged || additionalChanged) {
        setShowReasonModal(true)
        return
      }
    }

    submitData()
  }

  const submitData = (reason?: string) => {
    const dataToSave = {
      ...formData,
      admission_date: formData.admission_date ? `${formData.admission_date} 12:00:00.000Z` : '',
      change_reason: reason || '',
    }
    onSubmit(dataToSave)
  }

  const confirmSave = () => {
    submitData(reasonText)
    setShowReasonModal(false)
  }

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 py-4">
      {companies.length === 0 && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
          Nenhuma empresa cadastrada. Vá em Configurações para criar uma empresa primeiro.
        </div>
      )}

      {/* Dados Pessoais */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium">Dados Pessoais</h3>

        <div className="space-y-2">
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf || ''}
              onChange={(e) => updateField('cpf', formatCPF(e.target.value))}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Dados Profissionais */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium">Dados Profissionais</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Empresa *</Label>
            <Select
              required
              value={formData.company_id}
              onValueChange={(val) => updateField('company_id', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.tax_id ? `(${c.tax_id})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Cargo</Label>
            <Input
              id="role"
              value={formData.role || ''}
              onChange={(e) => updateField('role', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              value={formData.department || ''}
              onChange={(e) => updateField('department', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="base_salary">Salário Base *</Label>
            <Input
              id="base_salary"
              type="number"
              step="0.01"
              required
              disabled={!canEditSalary}
              value={formData.base_salary}
              onChange={(e) => updateField('base_salary', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="additional_amount">Adicional</Label>
            <Input
              id="additional_amount"
              type="number"
              step="0.01"
              disabled={!canEditSalary}
              value={formData.additional_amount}
              onChange={(e) => updateField('additional_amount', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admission_date">Admissão</Label>
            <Input
              id="admission_date"
              type="date"
              value={formData.admission_date || ''}
              onChange={(e) => updateField('admission_date', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(val) => updateField('status', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="on_leave">Férias</SelectItem>
                <SelectItem value="inactive">Desligado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Separator />

      {/* Endereço */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium">Endereço</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="zip_code">CEP</Label>
            <Input
              id="zip_code"
              value={formData.zip_code || ''}
              onChange={(e) => updateField('zip_code', formatCEP(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              value={formData.neighborhood || ''}
              onChange={(e) => updateField('neighborhood', e.target.value)}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="street">Logradouro</Label>
            <Input
              id="street"
              value={formData.street || ''}
              onChange={(e) => updateField('street', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              value={formData.number || ''}
              onChange={(e) => updateField('number', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="complement">Complemento</Label>
            <Input
              id="complement"
              value={formData.complement || ''}
              onChange={(e) => updateField('complement', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={formData.city || ''}
              onChange={(e) => updateField('city', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Input
              id="state"
              maxLength={2}
              value={formData.state || ''}
              onChange={(e) => updateField('state', e.target.value.toUpperCase())}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background py-2 mt-4 z-10">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={companies.length === 0}>
          Salvar
        </Button>
      </div>

      <Dialog open={showReasonModal} onOpenChange={setShowReasonModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Alteração</DialogTitle>
            <DialogDescription>
              Você alterou o salário base ou o valor adicional deste funcionário. Por favor, forneça
              o motivo para essa alteração (mínimo 5 caracteres).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motivo da alteração..."
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowReasonModal(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmSave} disabled={reasonText.trim().length < 5}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  )
}
