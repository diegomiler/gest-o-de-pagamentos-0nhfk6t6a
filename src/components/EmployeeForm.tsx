import { useState, useEffect } from 'react'
import { Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import pb from '@/lib/pocketbase/client'

type Props = {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function EmployeeForm({ initialData, onSubmit, onCancel }: Props) {
  const [companies, setCompanies] = useState<any[]>([])
  const [formData, setFormData] = useState<any>(
    initialData || {
      name: '',
      role: '',
      department: '',
      company_id: '',
      base_salary: 0,
      additional_amount: 0,
      overtime_parameter: 1.5,
      status: 'active',
      admission_date: new Date().toISOString().split('T')[0],
    },
  )

  useEffect(() => {
    pb.collection('companies')
      .getFullList({ sort: 'name' })
      .then(setCompanies)
      .catch(() => {})
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSave = {
      ...formData,
      admission_date: formData.admission_date
        ? `${formData.admission_date.split('T')[0]} 12:00:00.000Z`
        : '',
    }
    onSubmit(dataToSave)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      {companies.length === 0 && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
          Nenhuma empresa cadastrada. Vá em Configurações para criar uma empresa primeiro.
        </div>
      )}

      <div className="space-y-2">
        <Label>Empresa *</Label>
        <Select
          required
          value={formData.company_id}
          onValueChange={(val) => setFormData({ ...formData, company_id: val })}
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
        <Label htmlFor="name">Nome Completo *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role">Cargo</Label>
          <Input
            id="role"
            value={formData.role || ''}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Departamento</Label>
          <Input
            id="department"
            value={formData.department || ''}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="base_salary">Salário Base *</Label>
          <Input
            id="base_salary"
            type="number"
            step="0.01"
            required
            value={formData.base_salary}
            onChange={(e) =>
              setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="additional_amount">Adicional</Label>
          <Input
            id="additional_amount"
            type="number"
            step="0.01"
            value={formData.additional_amount}
            onChange={(e) =>
              setFormData({ ...formData, additional_amount: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="overtime_parameter">Parâmetro Hrs Extras</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="cursor-help rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                  <span className="sr-only">Informações sobre Parâmetro Hrs Extras</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[320px] p-3 text-sm space-y-2" side="top">
                <p>Este parâmetro atua como um multiplicador para o valor da hora calculada.</p>
                <div className="font-mono text-xs bg-muted/50 p-2 rounded-md text-foreground border">
                  Fórmula: (Salário Base / 30 / 7.33) * Parâmetro
                </div>
                <p className="text-muted-foreground">
                  Exemplo: Para um adicional de 50%, utilize o valor 1.5. Para um adicional de 100%,
                  utilize o valor 2.0.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Input
            id="overtime_parameter"
            type="number"
            step="0.1"
            value={formData.overtime_parameter ?? 1.5}
            onChange={(e) =>
              setFormData({ ...formData, overtime_parameter: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admission_date">Admissão</Label>
          <Input
            id="admission_date"
            type="date"
            value={formData.admission_date ? formData.admission_date.split('T')[0] : ''}
            onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(val) => setFormData({ ...formData, status: val })}
        >
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

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={companies.length === 0}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
