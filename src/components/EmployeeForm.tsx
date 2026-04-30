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
import { Employee, EmployeeStatus } from '@/stores/main'

type Props = {
  initialData?: Employee
  onSubmit: (data: Omit<Employee, 'id'> | Employee) => void
  onCancel: () => void
}

export function EmployeeForm({ initialData, onSubmit, onCancel }: Props) {
  const [formData, setFormData] = useState<Partial<Employee>>(
    initialData || {
      name: '',
      role: '',
      department: '',
      baseSalary: 0,
      status: 'Ativo',
      admissionDate: new Date().toISOString().split('T')[0],
    },
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData as Employee)
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
            required
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Departamento</Label>
          <Input
            id="department"
            required
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="baseSalary">Salário Base (R$)</Label>
          <Input
            id="baseSalary"
            type="number"
            step="0.01"
            required
            value={formData.baseSalary || ''}
            onChange={(e) => setFormData({ ...formData, baseSalary: parseFloat(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admissionDate">Data de Admissão</Label>
          <Input
            id="admissionDate"
            type="date"
            required
            value={formData.admissionDate}
            onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(val: EmployeeStatus) => setFormData({ ...formData, status: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Férias">Férias</SelectItem>
            <SelectItem value="Desligado">Desligado</SelectItem>
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
