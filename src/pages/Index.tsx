import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import {
  Banknote,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CalendarClock,
  Info,
  Clock,
  Calculator,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatMonthYear } from '@/lib/format'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import {
  differenceInMonths,
  isValid,
  parseISO,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { PeriodSelector } from '@/components/PeriodSelector'
import { usePeriod } from '@/hooks/use-period'

export default function Index() {
  const { user } = useAuth()
  const { selectedMonth } = usePeriod()
  const [employees, setEmployees] = useState<any[]>([])
  const [payrollEntries, setPayrollEntries] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>('all')

  const loadData = useCallback(async () => {
    if (!user) return
    const isAdmin = user.role === 'admin'
    if (!isAdmin && !user.company_id) return

    try {
      if (isAdmin) {
        const comps = await pb.collection('companies').getFullList({ sort: 'name' })
        setCompanies(comps)
      }

      const activeCompanyId = isAdmin
        ? selectedCompany === 'all'
          ? null
          : selectedCompany
        : user.company_id

      const empFilter = activeCompanyId ? `company_id = '${activeCompanyId}'` : ''
      const emps = await pb.collection('employees').getFullList({
        filter: empFilter,
        expand: 'company_id',
      })
      setEmployees(emps)

      const selectedDate = parseISO(`${selectedMonth}-01`)
      const startDate = format(startOfMonth(subMonths(selectedDate, 5)), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(selectedDate), 'yyyy-MM-dd')

      let entriesFilter = `entry_date >= '${startDate} 00:00:00' && entry_date <= '${endDate} 23:59:59'`
      if (activeCompanyId) {
        entriesFilter += ` && company_id = '${activeCompanyId}'`
      }

      let entries: any[] = []
      if (isAdmin || user.company_id) {
        entries = await pb.collection('payroll_entries').getFullList({
          filter: entriesFilter,
        })
      }
      setPayrollEntries(entries)
    } catch {
      /* intentionally ignored */
    }
  }, [user, selectedMonth, selectedCompany])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('employees', loadData)
  useRealtime('payroll_entries', loadData)
  useRealtime('companies', loadData)

  const stats = useMemo(() => {
    const currentMonthEntries = payrollEntries.filter((e) => e.entry_date.startsWith(selectedMonth))

    let totalNet = 0
    let totalAdditions = 0
    let totalOvertime = 0
    let totalDeductions = 0

    currentMonthEntries.forEach((entry) => {
      if (entry.category === 'base_net') {
        totalNet += entry.amount
      } else if (entry.category === 'overtime') {
        totalOvertime += entry.amount
        totalAdditions += entry.amount
      } else if (['commission', 'bonus', 'additional', 'other_addition'].includes(entry.category)) {
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

    const activeEmployeesList = employees.filter((e) => e.status === 'active')
    const activeEmployeesCount = activeEmployeesList.length

    let sumActiveTotalEarnings = 0
    activeEmployeesList.forEach((emp) => {
      let empEarnings = (emp.base_salary || 0) + (emp.additional_amount || 0)
      const empEntries = currentMonthEntries.filter((e) => e.employee_id === emp.id)
      empEntries.forEach((entry) => {
        if (
          ['overtime', 'commission', 'bonus', 'additional', 'other_addition'].includes(
            entry.category,
          )
        ) {
          empEarnings += entry.amount
        }
      })
      sumActiveTotalEarnings += empEarnings
    })

    const averageTotalEarnings =
      activeEmployeesCount > 0 ? sumActiveTotalEarnings / activeEmployeesCount : 0

    return {
      activeEmployees: activeEmployeesCount,
      totalNet,
      totalAdditions,
      totalOvertime,
      totalDiscounts: totalDeductions,
      averageTotalEarnings,
    }
  }, [employees, payrollEntries, selectedMonth])

  const chartData = useMemo(() => {
    const selectedDate = parseISO(`${selectedMonth}-01`)
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = subMonths(selectedDate, 5 - i)
      return format(d, 'yyyy-MM')
    })

    return months.map((m) => {
      const monthEntries = payrollEntries.filter((e) => e.entry_date.startsWith(m))
      let salarioLiquido = 0

      monthEntries.forEach((e) => {
        if (e.category === 'base_net') {
          salarioLiquido += e.amount
        }
      })

      return {
        month: formatMonthYear(m).split('/')[0].trim(),
        total: salarioLiquido,
      }
    })
  }, [payrollEntries, selectedMonth])

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
          {user?.role === 'admin' && (
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas as Empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Empresas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <PeriodSelector />
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
                      Funcionário <strong>{emp.name}</strong>
                      {user?.role === 'admin' && emp.expand?.company_id?.name && (
                        <span> ({emp.expand.company_id.name})</span>
                      )}{' '}
                      está próximo de completar {years} ano
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Média Proventos</CardTitle>
            <Calculator className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageTotalEarnings)}</div>
            <p className="text-xs text-muted-foreground mt-1">Por funcionário ativo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Extras</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalOvertime)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total pago no período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outros Proventos</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalAdditions - stats.totalOvertime)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Comissões, bônus, etc.</p>
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

      <Card className="md:col-span-2 lg:col-span-5">
        <CardHeader>
          <CardTitle>Histórico de Pagamentos (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent className="pl-0">
          {chartData.every((d) => d.total === 0) ? (
            <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível para o período selecionado.
            </div>
          ) : (
            <ChartContainer
              config={{
                total: { label: 'Salário Líquido', color: 'hsl(var(--primary))' },
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
                  <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
