import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import useMainStore, { actions, PayrollEntry } from '@/stores/main'
import { formatCurrency, parseInputValue } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import { Save } from 'lucide-react'

export default function Folha() {
  const { employees, payroll } = useMainStore()
  const { toast } = useToast()

  const [selectedMonth, setSelectedMonth] = useState('2026-04')
  const [entries, setEntries] = useState<PayrollEntry[]>([])

  useEffect(() => {
    // Sync local form state with store when month changes
    const existing = payroll[selectedMonth] || []
    const activeEmployees = employees.filter((e) => e.status !== 'Desligado')

    const merged = activeEmployees.map((emp) => {
      const found = existing.find((e) => e.employeeId === emp.id)
      return (
        found || {
          employeeId: emp.id,
          month: selectedMonth,
          commissions: 0,
          bonuses: 0,
          pharmacy: 0,
          advances: 0,
        }
      )
    })
    setEntries(merged)
  }, [selectedMonth, payroll, employees])

  const handleInputChange = (employeeId: string, field: keyof PayrollEntry, value: string) => {
    const num = parseInputValue(value)
    setEntries((prev) =>
      prev.map((e) => (e.employeeId === employeeId ? { ...e, [field]: num } : e)),
    )
  }

  const handleSave = () => {
    // Validation
    const hasErrors = entries.some((entry) => {
      const emp = employees.find((e) => e.id === entry.employeeId)
      if (!emp) return false
      const additions = emp.baseSalary + entry.commissions + entry.bonuses
      const deductions = entry.pharmacy + entry.advances
      return deductions > additions * 0.3
    })

    if (hasErrors) {
      toast({
        title: 'Atenção',
        description: 'Existem descontos excedendo 30% dos vencimentos!',
        variant: 'destructive',
      })
      return
    }

    actions.savePayroll(selectedMonth, entries)
    toast({ title: 'Folha Salva', description: `Folha de ${selectedMonth} salva com sucesso.` })
  }

  const totals = entries.reduce(
    (acc, entry) => {
      const emp = employees.find((e) => e.id === entry.employeeId)
      if (!emp) return acc
      acc.base += emp.baseSalary
      acc.additions += entry.commissions + entry.bonuses
      acc.deductions += entry.pharmacy + entry.advances
      acc.net +=
        emp.baseSalary + entry.commissions + entry.bonuses - entry.pharmacy - entry.advances
      return acc
    },
    { base: 0, additions: 0, deductions: 0, net: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lançamentos da Folha</h2>
          <p className="text-muted-foreground">
            Registre comissões, adicionais e descontos mensais.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-40 bg-card"
          />
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" /> Salvar Folha
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[200px]">Funcionário</TableHead>
                <TableHead className="text-right">Salário Base</TableHead>
                <TableHead className="text-right text-emerald-600">Comissões (+)</TableHead>
                <TableHead className="text-right text-emerald-600">Adicionais (+)</TableHead>
                <TableHead className="text-right text-rose-600">Farmácia (-)</TableHead>
                <TableHead className="text-right text-rose-600">Vales (-)</TableHead>
                <TableHead className="text-right font-bold">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const emp = employees.find((e) => e.id === entry.employeeId)!
                if (!emp) return null
                const net =
                  emp.baseSalary +
                  entry.commissions +
                  entry.bonuses -
                  entry.pharmacy -
                  entry.advances
                const isOverLimit =
                  entry.pharmacy + entry.advances >
                  (emp.baseSalary + entry.commissions + entry.bonuses) * 0.3

                return (
                  <TableRow key={entry.employeeId} className={isOverLimit ? 'bg-rose-50/50' : ''}>
                    <TableCell className="font-medium">
                      <div>{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.role}</div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(emp.baseSalary)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8"
                        value={entry.commissions || ''}
                        onChange={(e) => handleInputChange(emp.id, 'commissions', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8"
                        value={entry.bonuses || ''}
                        onChange={(e) => handleInputChange(emp.id, 'bonuses', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8"
                        value={entry.pharmacy || ''}
                        onChange={(e) => handleInputChange(emp.id, 'pharmacy', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8"
                        value={entry.advances || ''}
                        onChange={(e) => handleInputChange(emp.id, 'advances', e.target.value)}
                      />
                    </TableCell>
                    <TableCell
                      className={`text-right font-bold ${isOverLimit ? 'text-rose-600' : ''}`}
                    >
                      {formatCurrency(net)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            <TableFooter className="bg-muted/50">
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.base)}</TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  +{formatCurrency(totals.additions)}
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right text-rose-600 font-medium">
                  -{formatCurrency(totals.deductions)}
                </TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-bold text-lg">
                  {formatCurrency(totals.net)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
