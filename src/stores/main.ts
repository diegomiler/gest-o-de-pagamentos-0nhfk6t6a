import { useSyncExternalStore } from 'react'

export type EmployeeStatus = 'Ativo' | 'Férias' | 'Desligado'

export type Employee = {
  id: string
  name: string
  role: string
  department: string
  baseSalary: number
  status: EmployeeStatus
  admissionDate: string
}

export type PayrollEntry = {
  employeeId: string
  month: string // YYYY-MM
  commissions: number
  bonuses: number
  pharmacy: number
  advances: number
}

type State = {
  employees: Employee[]
  payroll: Record<string, PayrollEntry[]>
  company: { name: string; cnpj: string }
}

const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Ana Silva',
    role: 'Vendedora',
    department: 'Vendas',
    baseSalary: 2500,
    status: 'Ativo',
    admissionDate: '2024-01-15',
  },
  {
    id: '2',
    name: 'Carlos Souza',
    role: 'Gerente',
    department: 'Vendas',
    baseSalary: 5000,
    status: 'Ativo',
    admissionDate: '2023-06-10',
  },
  {
    id: '3',
    name: 'Mariana Santos',
    role: 'Desenvolvedora',
    department: 'TI',
    baseSalary: 6500,
    status: 'Férias',
    admissionDate: '2025-02-01',
  },
  {
    id: '4',
    name: 'Roberto Costa',
    role: 'Suporte',
    department: 'TI',
    baseSalary: 3000,
    status: 'Desligado',
    admissionDate: '2024-08-20',
  },
]

const generateMockPayroll = () => {
  const result: Record<string, PayrollEntry[]> = {}
  const year = 2026
  for (let m = 1; m <= 4; m++) {
    const monthStr = `${year}-0${m}`
    result[monthStr] = mockEmployees
      .filter((e) => e.status !== 'Desligado')
      .map((e) => ({
        employeeId: e.id,
        month: monthStr,
        commissions: e.department === 'Vendas' ? Math.floor(Math.random() * 2000) : 0,
        bonuses: Math.floor(Math.random() * 500),
        pharmacy: Math.floor(Math.random() * 200),
        advances: Math.floor(Math.random() * 500),
      }))
  }
  return result
}

let state: State = {
  employees: mockEmployees,
  payroll: generateMockPayroll(),
  company: { name: 'Gestão de Pagamentos S.A.', cnpj: '12.345.678/0001-90' },
}

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const actions = {
  addEmployee: (emp: Omit<Employee, 'id'>) => {
    const newEmp = { ...emp, id: Date.now().toString() }
    state.employees = [...state.employees, newEmp]
    emit()
  },
  updateEmployee: (emp: Employee) => {
    state.employees = state.employees.map((e) => (e.id === emp.id ? emp : e))
    emit()
  },
  savePayroll: (month: string, entries: PayrollEntry[]) => {
    state.payroll = { ...state.payroll, [month]: entries }
    emit()
  },
  updateCompany: (company: { name: string; cnpj: string }) => {
    state.company = company
    emit()
  },
}

export default function useMainStore() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
