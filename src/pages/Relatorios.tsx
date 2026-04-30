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
import useMainStore from '@/stores/main'
import { HoleritePrint } from '@/components/HoleritePrint'
import { formatMonthYear } from '@/lib/format'

export default function Relatorios() {
  const { employees, payroll, company } = useMainStore()
  const [selectedMonth, setSelectedMonth] = useState('2026-04')
  const [selectedEmp, setSelectedEmp] = useState('all')

  const printableData = useMemo(() => {
    const entries = payroll[selectedMonth] || []
    return entries
      .map((entry) => {
        const emp = employees.find((e) => e.id === entry.employeeId)
        return emp ? { employee: emp, entry } : null
      })
      .filter(Boolean)
      .filter((data) => selectedEmp === 'all' || data?.employee.id === selectedEmp) as {
      employee: any
      entry: any
    }[]
  }, [selectedMonth, selectedEmp, payroll, employees])

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
          <Button onClick={handlePrint} disabled={printableData.length === 0} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir Holerites ({printableData.length})
          </Button>
        </div>
      </div>

      <div className="print-hidden mb-4 border-l-4 border-primary pl-4 text-muted-foreground">
        Visualização de impressão. Clique no botão acima para enviar para a impressora ou gerar PDF.
      </div>

      {/* Printable Area - In CSS print mode, only this fills the screen */}
      <div className="space-y-12 pb-12 print:block print:w-full print:m-0 print:p-0">
        {printableData.length === 0 && (
          <div className="text-center p-12 bg-card border rounded-lg print-hidden">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        )}

        {printableData.map((data) => (
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
