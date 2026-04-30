import { useState, useMemo, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Printer } from 'lucide-react'
import { HoleritePrint } from '@/components/HoleritePrint'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export default function Relatorios() {
  const { user } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState('2026-04')
  const [selectedEmp, setSelectedEmp] = useState('all')

  const [employees, setEmployees] = useState<any[]>([])
  const [payrollEntries, setPayrollEntries] = useState<any[]>([])
  const [company, setCompany] = useState<{ name: string; tax_id: string } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const emps = await pb.collection('employees').getFullList()
        setEmployees(emps)

        if (user?.company_id) {
          const c = await pb.collection('companies').getOne(user.company_id)
          setCompany({ name: c.name, tax_id: c.tax_id || '' })
        }

        const startDate = `${selectedMonth}-01 00:00:00`
        const endDate = `${selectedMonth}-31 23:59:59`
        const entries = await pb.collection('payroll_entries').getFullList({
          filter: `entry_date >= '${startDate}' && entry_date <= '${endDate}'`,
        })
        setPayrollEntries(entries)
      } catch {
        /* intentionally ignored */
      }
    }
    loadData()
  }, [selectedMonth, user])

  const printableData = useMemo(() => {
    const grouped = employees
      .map((emp) => {
        const empEntries = payrollEntries.filter((e) => e.employee_id === emp.id)
        if (empEntries.length === 0 && emp.status === 'inactive') return null

        let commissions = 0,
          bonuses = 0,
          pharmacy = 0,
          advances = 0
        empEntries.forEach((e) => {
          if (e.category === 'commission') commissions += e.amount
          if (e.category === 'bonus') bonuses += e.amount
          if (e.category === 'pharmacy_discount') pharmacy += e.amount
          if (e.category === 'advance') advances += e.amount
        })

        return {
          employee: emp,
          entry: { month: selectedMonth, commissions, bonuses, pharmacy, advances },
        }
      })
      .filter(Boolean)

    return grouped.filter((data) => selectedEmp === 'all' || data?.employee.id === selectedEmp)
  }, [selectedMonth, selectedEmp, payrollEntries, employees])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 print-hidden bg-card p-4 rounded-lg border">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="space-y-1">
            <label className="text-sm font-medium">Mês/Ano</label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Funcionário</label>
            <Select value={selectedEmp} onValueChange={setSelectedEmp}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Funcionários</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-end">
          <Button
            onClick={handlePrint}
            disabled={printableData.length === 0 || !company}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir Holerites ({printableData.length})
          </Button>
        </div>
      </div>

      <div className="print-hidden mb-4 border-l-4 border-primary pl-4 text-muted-foreground">
        Visualização de impressão. Clique no botão acima para enviar para a impressora ou gerar PDF.
      </div>

      <div className="space-y-12 pb-12 print:block print:w-full print:m-0 print:p-0">
        {printableData.length === 0 && (
          <div className="text-center p-12 bg-card border rounded-lg print-hidden">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        )}

        {company &&
          printableData.map((data: any) => (
            <div
              key={data.employee.id}
              className="print:page-break-after-always last:print:page-break-after-auto"
            >
              <HoleritePrint employee={data.employee} entry={data.entry} company={company} />
            </div>
          ))}
      </div>
    </div>
  )
}
