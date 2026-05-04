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
import {
  formatCurrency,
  parseInputValue,
  timeToDecimal,
  decimalToTime,
  formatTimeOnBlur,
} from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import { Save } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

function calculateOvertimeValue(
  base_salary: number,
  hours: number,
  company_id: string,
  companies: any[],
) {
  const company = companies.find((c) => c.id === company_id)
  const config = company?.overtime_config || []

  if (config.length === 0 || hours === 0) {
    return (base_salary / 30 / 7.33) * 1.5 * hours
  }

  const sortedBrackets = [...config].sort((a, b) => {
    if (a.limit === null) return 1
    if (b.limit === null) return -1
    return a.limit - b.limit
  })

  let totalValue = 0
  const hourlyRate = base_salary / 30 / 7.33
  let previousLimit = 0

  for (const bracket of sortedBrackets) {
    if (hours <= previousLimit) break

    const multiplier = 1 + bracket.percentage / 100
    let hoursInBracket = hours - previousLimit

    if (bracket.limit !== null) {
      hoursInBracket = Math.min(hours - previousLimit, bracket.limit - previousLimit)
    }

    if (hoursInBracket > 0) {
      totalValue += hourlyRate * multiplier * hoursInBracket
    }

    if (bracket.limit !== null) {
      previousLimit = bracket.limit
    } else {
      break
    }
  }

  return totalValue
}

export default function Folha() {
  const { toast } = useToast()

  const [selectedMonth, setSelectedMonth] = useState('2026-04')
  const [employees, setEmployees] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])

  const loadData = async () => {
    try {
      const [emps, comps] = await Promise.all([
        pb.collection('employees').getFullList({ sort: 'name' }),
        pb.collection('companies').getFullList(),
      ])
      setEmployees(emps)
      setCompanies(comps)

      const startDate = `${selectedMonth}-01 00:00:00`
      const endDate = `${selectedMonth}-31 23:59:59`
      const fetchedEntries = await pb.collection('payroll_entries').getFullList({
        filter: `entry_date >= '${startDate}' && entry_date <= '${endDate}'`,
      })

      const activeEmployees = emps.filter((e) => e.status !== 'inactive')
      const merged = activeEmployees.map((emp) => {
        const empEntries = fetchedEntries.filter((e) => e.employee_id === emp.id)
        let commissions = 0,
          bonuses = 0,
          pharmacy = 0,
          advances = 0,
          overtime_hours = 0,
          base_net = 0
        empEntries.forEach((e) => {
          if (e.category === 'commission') commissions += e.amount
          if (e.category === 'bonus') bonuses += e.amount
          if (e.category === 'pharmacy_discount') pharmacy += e.amount
          if (e.category === 'advance') advances += e.amount
          if (e.category === 'overtime') overtime_hours += e.quantity || 0
          if (e.category === 'base_net') base_net += e.amount
        })

        return {
          employee_id: emp.id,
          commissions,
          bonuses,
          pharmacy,
          advances,
          overtime_hours,
          overtime_hours_str: decimalToTime(overtime_hours),
          base_net: base_net || 0,
        }
      })

      setEntries(merged)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedMonth])

  useRealtime('employees', loadData)
  useRealtime('payroll_entries', loadData)
  useRealtime('companies', loadData)

  const handleInputChange = (employee_id: string, field: string, value: string) => {
    if (field === 'overtime_hours_str') {
      const decimal = timeToDecimal(value)
      setEntries((prev) =>
        prev.map((e) =>
          e.employee_id === employee_id
            ? { ...e, overtime_hours_str: value, overtime_hours: decimal }
            : e,
        ),
      )
      return
    }

    const num = parseInputValue(value)
    setEntries((prev) =>
      prev.map((e) => (e.employee_id === employee_id ? { ...e, [field]: num } : e)),
    )
  }

  const handleSave = async () => {
    const hasErrors = entries.some((entry) => {
      const emp = employees.find((e) => e.id === entry.employee_id)
      if (!emp) return false
      const overtimeValue = calculateOvertimeValue(
        emp.base_salary,
        entry.overtime_hours || 0,
        emp.company_id,
        companies,
      )
      const additions =
        (entry.base_net || 0) +
        (emp.additional_amount || 0) +
        overtimeValue +
        entry.commissions +
        entry.bonuses
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

    try {
      await pb.send('/backend/v1/payroll/sync', {
        method: 'POST',
        body: JSON.stringify({ month: selectedMonth, entries }),
        headers: { 'Content-Type': 'application/json' },
      })
      toast({ title: 'Folha Salva', description: `Folha de ${selectedMonth} salva com sucesso.` })
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a folha.',
        variant: 'destructive',
      })
    }
  }

  const totals = entries.reduce(
    (acc, entry) => {
      const emp = employees.find((e) => e.id === entry.employee_id)
      if (!emp) return acc
      const overtimeValue = calculateOvertimeValue(
        emp.base_salary,
        entry.overtime_hours || 0,
        emp.company_id,
        companies,
      )
      acc.base += entry.base_net || 0
      acc.additional += emp.additional_amount || 0
      acc.overtime += overtimeValue
      acc.additions += entry.commissions + entry.bonuses
      acc.deductions += entry.pharmacy + entry.advances
      acc.net +=
        (entry.base_net || 0) +
        (emp.additional_amount || 0) +
        overtimeValue +
        entry.commissions +
        entry.bonuses -
        entry.pharmacy -
        entry.advances
      return acc
    },
    { base: 0, additional: 0, overtime: 0, additions: 0, deductions: 0, net: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lançamentos da Folha</h2>
          <p className="text-muted-foreground">
            Registre comissões, horas extras e descontos mensais.
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
        <CardContent className="p-0 overflow-x-auto relative">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[200px] sticky left-0 z-20 bg-muted/50 shadow-[1px_0_0_0_#e5e7eb]">
                  Funcionário
                </TableHead>
                <TableHead className="text-right">Salário Líq.</TableHead>
                <TableHead className="text-right">Adicional Fix.</TableHead>
                <TableHead className="text-right text-emerald-600">Hrs Extras</TableHead>
                <TableHead className="text-right text-emerald-600">Val. Extras</TableHead>
                <TableHead className="text-right text-emerald-600">Comissões (+)</TableHead>
                <TableHead className="text-right text-emerald-600">Bônus (+)</TableHead>
                <TableHead className="text-right text-rose-600">Farmácia (-)</TableHead>
                <TableHead className="text-right text-rose-600">Vales (-)</TableHead>
                <TableHead className="text-right font-bold">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const emp = employees.find((e) => e.id === entry.employee_id)
                if (!emp) return null
                const overtimeValue = calculateOvertimeValue(
                  emp.base_salary,
                  entry.overtime_hours || 0,
                  emp.company_id,
                  companies,
                )
                const totalAdditions =
                  (entry.base_net || 0) +
                  (emp.additional_amount || 0) +
                  overtimeValue +
                  entry.commissions +
                  entry.bonuses
                const totalDeductions = entry.pharmacy + entry.advances
                const net = totalAdditions - totalDeductions
                const isOverLimit = totalDeductions > totalAdditions * 0.3

                return (
                  <TableRow
                    key={entry.employee_id}
                    className={isOverLimit ? 'bg-rose-50/50 hover:bg-rose-50/50' : ''}
                  >
                    <TableCell className="font-medium sticky left-0 z-10 bg-card shadow-[1px_0_0_0_#e5e7eb]">
                      <div>{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.role}</div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.base_net || ''}
                        onChange={(e) => handleInputChange(emp.id, 'base_net', e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(emp.additional_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="00:00"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.overtime_hours_str || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d:]/g, '')
                          handleInputChange(emp.id, 'overtime_hours_str', val)
                        }}
                        onBlur={(e) => {
                          const val = e.target.value
                          if (val) {
                            const formatted = formatTimeOnBlur(val)
                            handleInputChange(emp.id, 'overtime_hours_str', formatted)
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {formatCurrency(overtimeValue)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.commissions || ''}
                        onChange={(e) => handleInputChange(emp.id, 'commissions', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.bonuses || ''}
                        onChange={(e) => handleInputChange(emp.id, 'bonuses', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.pharmacy || ''}
                        onChange={(e) => handleInputChange(emp.id, 'pharmacy', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8 w-24 ml-auto"
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
                <TableCell className="sticky left-0 z-20 bg-muted/50 shadow-[1px_0_0_0_#e5e7eb]">
                  Total
                </TableCell>
                <TableCell className="text-right">{formatCurrency(totals.base)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.additional)}</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  +{formatCurrency(totals.overtime)}
                </TableCell>
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
