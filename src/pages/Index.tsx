import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import {
  Users,
  Banknote,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CalendarClock,
  Info,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { formatCurrency, formatMonthYear } from '@/lib/format'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { differenceInMonths, isValid, parseISO } from 'date-fns'

export default function Index() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<any[]>([])
  const [payrollEntries, setPayrollEntries] = useState<any[]>([])
  const [currentMonth, setCurrentMonth] = useState('2026-04')

  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    months.add('2026-04') // Default
    payrollEntries.forEach((e) => {
      if (e.entry_date) months.add(e.entry_date.substring(0, 7))
    })
    return Array.from(months).sort().reverse()
  }, [payrollEntries])

  const loadData = useCallback(async () => {
    if (!user?.company_id) return
    try {
      const emps = await pb.collection('employees').getFullList({
        filter: `company_id = '${user.company_id}'`,
      })
      setEmployees(emps)

      const entries = await pb.collection('payroll_entries').getFullList({
        filter: `entry_date >= '2025-11-01 00:00:00' && company_id = '${user.company_id}'`,
      })
      setPayrollEntries(entries)
    } catch {
      /* intentionally ignored */
    }
  }, [user?.company_id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('employees', loadData)
  useRealtime('payroll_entries', loadData)

  const stats = useMemo(() => {
    const currentMonthEntries = payrollEntries.filter((e) => e.entry_date.startsWith(currentMonth))

    let totalNet = 0
    let totalAdditions = 0
    let totalDeductions = 0

    currentMonthEntries.forEach((entry) => {
      if (entry.category === 'base_net') {
        totalNet += entry.amount
      } else if (
        ['commission', 'bonus', 'additional', 'overtime', 'other_addition'].includes(entry.category)
      ) {
        totalAdditions += entry.amount
      } else if (
        [
          'pharmacy_discount',
          'advance',
          'negative_hours',
          'cash_shortage',
          'partner_agreement',
          'store_agreement',
          'other_discount',
        ].includes(entry.category)
      ) {
        totalDeductions += entry.amount
      }
    })

    return {
      activeEmployees: employees.filter((e) => e.status === 'active').length,
      totalNet,
      totalAdditions,
      totalDiscounts: totalDeductions,
    }
  }, [employees, payrollEntries, currentMonth])

  const chartData = useMemo(() => {
    const currentIdx =
      availableMonths.indexOf(currentMonth) >= 0 ? availableMonths.indexOf(currentMonth) : 0
    const months = availableMonths.slice(currentIdx, currentIdx + 6).reverse()
    if (months.length === 0) months.push(currentMonth)

    return months.map((m) => {
      const monthEntries = payrollEntries.filter((e) => e.entry_date.startsWith(m))
      let baseNet = 0
      let proventos = 0

      monthEntries.forEach((e) => {
        if (e.category === 'base_net') {
          baseNet += e.amount
        } else if (
          ['commission', 'bonus', 'additional', 'overtime', 'other_addition'].includes(e.category)
        ) {
          proventos += e.amount
        }
      })

      return {
        month: formatMonthYear(m).split('/')[0].trim(),
        baseNet,
        proventos,
      }
    })
  }, [payrollEntries, currentMonth, availableMonths])

  const vacationAlerts = useMemo(() => {
    const today = new Date()
    return employees.filter((emp) => {
      if (emp.status !== 'active' || !emp.admission_date) return false
      const admission = parseISO(emp.admission_date)
      if (!isValid(admission)) return false
      const months = differenceInMonths(today, admission)
      return months > 0 && months % 12 === 11
    })
  }, [employees])

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Visão geral da folha de pagamento</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={currentMonth} onValueChange={setCurrentMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonthYear(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline">
            <Link to="/funcionarios">Gerenciar Equipe</Link>
          </Button>
          <Button asChild>
            <Link to="/folha">
              Fechar Folha <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Central de Notificações - Alertas de Férias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vacationAlerts.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {vacationAlerts.map((emp) => {
                const admission = parseISO(emp.admission_date)
                const years = Math.ceil(differenceInMonths(new Date(), admission) / 12)
                return (
                  <Alert
                    key={emp.id}
                    className="border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-500"
                  >
                    <CalendarClock className="h-4 w-4" color="currentColor" />
                    <AlertTitle>Férias Próximas</AlertTitle>
                    <AlertDescription className="text-sm mt-1">
                      Funcionário <strong>{emp.name}</strong> está próximo de completar {years} ano
                      {years > 1 ? 's' : ''} de admissão. Planejar férias.
                    </AlertDescription>
                  </Alert>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              Nenhum funcionário com período concessivo de férias vencendo no momento.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salário Líq.</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalNet > 0 ? formatCurrency(stats.totalNet) : 'R$ 0,00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total de salários líquidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionários Ativos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">Colaboradores registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proventos</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAdditions)}</div>
            <p className="text-xs text-muted-foreground mt-1">Ganhos e adicionais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Descontos</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalDiscounts)}</div>
            <p className="text-xs text-muted-foreground mt-1">Descontos no período</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Histórico de Pagamentos (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          <ChartContainer
            config={{
              baseNet: { label: 'Salário Líq.', color: 'hsl(var(--primary))' },
              proventos: { label: 'Proventos', color: 'hsl(var(--chart-2))' },
            }}
            className="h-[300px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(val) => `R$ ${val / 1000}k`}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend verticalAlign="top" height={36} />
                <Bar
                  dataKey="baseNet"
                  stackId="a"
                  fill="var(--color-baseNet)"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  dataKey="proventos"
                  stackId="a"
                  fill="var(--color-proventos)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
