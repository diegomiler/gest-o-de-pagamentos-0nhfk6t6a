import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}

export function EmployeeForm({ initialData, onSubmit, onCancel }: Props) {
  const [formData, setFormData] = useState<any>(
    initialData || {
      name: '',
      role: '',
      department: '',
      base_salary: 0,
      status: 'active',
      admission_date: new Date().toISOString().split('T')[0],
    },
  )

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
      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo</Label>
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
          <Label htmlFor="base_salary">Salário Base (R$)</Label>
          <Input
            id="base_salary"
            type="number"
            step="0.01"
            required
            value={formData.base_salary || ''}
            onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admission_date">Data de Admissão</Label>
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
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  )
}
