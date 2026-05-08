import { useState, useEffect, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { formatCurrency, formatMonthYear } from '@/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const EARNINGS = [
  'commission',
  'bonus',
  'additional',
  'overtime',
  'base_net',
  'other_addition',
  'fixed_additional',
]
const DEDUCTIONS = [
  'pharmacy_discount',
  'advance',
  'cash_shortage',
  'negative_hours',
  'partner_agreement',
  'store_agreement',
  'other_discount',
]

const getCategoryLabel = (cat: string) => {
  const labels: Record<string, string> = {
    commission: 'Comissão',
    bonus: 'Bônus',
    pharmacy_discount: 'Farmácia',
    advance: 'Vale / Adiantamento',
    additional: 'Adicional',
    other: 'Outro',
    overtime: 'Hora Extra',
    base_net: 'Salário Base Líquido',
    cash_shortage: 'Furo de Caixa',
    negative_hours: 'Horas Negativas',
    partner_agreement: 'Convênio Parceiro',
    store_agreement: 'Convênio Loja',
    other_discount: 'Outros Descontos',
    other_addition: 'Outros Acréscimos',
    fixed_additional: 'Adicional Fixo',
  }
  return labels[cat] || cat
}

const chartConfig = {
  net: {
    label: 'Líquido',
    color: 'hsl(var(--primary))',
  },
}

export function EmployeePaymentHistory({ employeeId }: { employeeId: string }) {
  const [entries, setEntries] = useState<any[]>([])
  const [employee, setEmployee] = useState<any>(null)
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<any | null>(null)

  const loadData = async () => {
    try {
      const [emp, records] = await Promise.all([
        pb.collection('employees').getOne(employeeId),
        pb.collection('payroll_entries').getFullList({
          filter: `employee_id = "${employeeId}"`,
          sort: '-entry_date',
        }),
      ])
      setEmployee(emp)
      setEntries(records)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [employeeId])

  useRealtime('payroll_entries', loadData)
  useRealtime('employees', loadData)

  const availableYears = useMemo(() => {
    const years = new Set<string>()
    entries.forEach((e) => years.add(e.entry_date.substring(0, 4)))
    const arr = Array.from(years).sort().reverse()
    if (!arr.includes(new Date().getFullYear().toString())) {
      arr.unshift(new Date().getFullYear().toString())
      arr.sort().reverse()
    }
    return arr
  }, [entries])

  const monthlyData = useMemo(() => {
    const groups: Record<string, any> = {}
    const additionalAmount = employee?.additional_amount || 0

    entries.forEach((e) => {
      const month = e.entry_date.substring(0, 7)
      if (!groups[month]) {
        groups[month] = { month, earnings: additionalAmount, deductions: 0, details: [] }
        groups[month].details.push({
          id: `fixed-${month}`,
          category: 'fixed_additional',
          description: 'Adicional Fixo',
          amount: additionalAmount,
        })
      }

      if (EARNINGS.includes(e.category)) groups[month].earnings += e.amount
      if (DEDUCTIONS.includes(e.category)) groups[month].deductions += e.amount

      groups[month].details.push(e)
    })

    return Object.values(groups)
      .sort((a, b) => b.month.localeCompare(a.month))
      .map((g) => ({
        ...g,
        net: g.earnings - g.deductions,
      }))
  }, [entries, employee])

  const last12Months = useMemo(() => {
    const data = []
    const now = new Date()
    const monthNames = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ]
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`
      data.push({ monthStr, label })
    }
    return data
  }, [])

  const chartData = useMemo(() => {
    return last12Months.map((m) => {
      const group = monthlyData.find((g) => g.month === m.monthStr)
      return {
        month: m.label,
        net: group ? group.net : 0,
      }
    })
  }, [last12Months, monthlyData])

  const tableData = useMemo(() => {
    return monthlyData.filter((d) => d.month.startsWith(selectedYear))
  }, [monthlyData, selectedYear])

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum histórico de pagamentos encontrado para este funcionário.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução do Ganho Líquido (Últimos 12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
              <YAxis
                tickFormatter={(val) =>
                  new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(val)
                }
                tickLine={false}
                axisLine={false}
                width={50}
                fontSize={12}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="net" fill="var(--color-net)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Histórico Mensal</h3>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Ano" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Período</TableHead>
              <TableHead className="text-right text-emerald-600">Vencimentos (+)</TableHead>
              <TableHead className="text-right text-rose-600">Descontos (-)</TableHead>
              <TableHead className="text-right font-bold">Líquido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  Nenhum registro encontrado para {selectedYear}.
                </TableCell>
              </TableRow>
            )}
            {tableData.map((row) => (
              <TableRow
                key={row.month}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedMonthDetail(row)}
              >
                <TableCell className="font-medium">{formatMonthYear(row.month)}</TableCell>
                <TableCell className="text-right text-emerald-600">
                  {formatCurrency(row.earnings)}
                </TableCell>
                <TableCell className="text-right text-rose-600">
                  {formatCurrency(row.deductions)}
                </TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(row.net)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!selectedMonthDetail}
        onOpenChange={(open) => !open && setSelectedMonthDetail(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhamento - {selectedMonthDetail && formatMonthYear(selectedMonthDetail.month)}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...(selectedMonthDetail?.details || [])]
                  .sort((a: any, b: any) => {
                    const aIsEarn = EARNINGS.includes(a.category)
                    const bIsEarn = EARNINGS.includes(b.category)
                    if (aIsEarn && !bIsEarn) return -1
                    if (!aIsEarn && bIsEarn) return 1

                    const labelA = getCategoryLabel(a.category)
                    const labelB = getCategoryLabel(b.category)
                    return labelA.localeCompare(labelB)
                  })
                  .map((d: any) => {
                    const isEarn = EARNINGS.includes(d.category)
                    const isDed = DEDUCTIONS.includes(d.category)
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">
                          {getCategoryLabel(d.category)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {d.description || '-'}
                        </TableCell>
                        <TableCell
                          className={`text-right ${isDed ? 'text-rose-600' : isEarn ? 'text-emerald-600' : ''}`}
                        >
                          {isDed ? '-' : isEarn ? '+' : ''}
                          {formatCurrency(d.amount)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
