import { useState, useMemo } from 'react'
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
import { usePayrollData } from '@/hooks/use-payroll-data'

export function HoleritesView() {
  const [selectedMonth, setSelectedMonth] = useState('2026-04')
  const [selectedEmp, setSelectedEmp] = useState('all')

  const { employees, payrollEntries, userCompany: company } = usePayrollData(selectedMonth)

  const printableData = useMemo(() => {
    const grouped = employees
      .map((emp) => {
        const empEntries = payrollEntries.filter((e) => e.employee_id === emp.id)
        if (empEntries.length === 0 && emp.status === 'inactive') return null

        return {
          employee: emp,
          entries: empEntries,
          month: selectedMonth,
        }
      })
      .filter(Boolean)

    return grouped.filter((data) => selectedEmp === 'all' || data?.employee.id === selectedEmp)
  }, [selectedMonth, selectedEmp, payrollEntries, employees])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 flex flex-col h-full">
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
            Imprimir ({printableData.length})
          </Button>
        </div>
      </div>

      <div className="print-hidden mb-4 border-l-4 border-primary pl-4 py-2 text-muted-foreground bg-muted/30 rounded-r-md text-sm">
        Visualização em formato 80mm (bobina térmica). Clique em imprimir para gerar os recibos.
      </div>

      <div className="flex-1 overflow-auto print:overflow-visible pb-10">
        <div className="flex flex-wrap gap-8 print:block print:w-[80mm] print:m-0 print:p-0">
          {printableData.length === 0 && (
            <div className="text-center p-12 bg-card border rounded-lg w-full print-hidden">
              Nenhum dado encontrado para os filtros selecionados.
            </div>
          )}

          {company &&
            printableData.map((data: any) => (
              <div
                key={data.employee.id}
                className="print:page-break-after-always last:print:page-break-after-auto shrink-0"
              >
                <HoleritePrint
                  employee={data.employee}
                  entries={data.entries}
                  month={data.month}
                  company={company}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
