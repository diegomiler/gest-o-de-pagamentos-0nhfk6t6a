import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const currentMonth = '2026-04'

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

    let totalBase = 0
    let totalAdditions = 0
    let totalDeductions = 0

    employees.forEach((emp) => {
      if (emp.status === 'active') {
        totalBase += emp.base_salary
      }
    })

    currentMonthEntries.forEach((entry) => {
      if (entry.category === 'commission' || entry.category === 'bonus') {
        totalAdditions += entry.amount
      } else if (entry.category === 'pharmacy_discount' || entry.category === 'advance') {
        totalDeductions += entry.amount
      }
    })

    return {
      activeEmployees: employees.filter((e) => e.status === 'active').length,
      totalPayroll: totalBase + totalAdditions - totalDeductions,
      totalCommissions: totalAdditions,
      totalDiscounts: totalDeductions,
    }
  }, [employees, payrollEntries, currentMonth])

  const chartData = useMemo(() => {
    const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04']
    return months.map((m) => {
      const monthEntries = payrollEntries.filter((e) => e.entry_date.startsWith(m))
      let totalBase = 0
      let vars = 0
      let overtime = 0

      employees.forEach((emp) => {
        if (emp.status === 'active' || emp.status === 'on_leave') totalBase += emp.base_salary
      })

      monthEntries.forEach((e) => {
        if (e.category === 'commission' || e.category === 'bonus') vars += e.amount
        if (e.category === 'overtime') overtime += e.amount
      })

      return {
        month: formatMonthYear(m).split('/')[0].trim(),
        base: totalBase,
        variaveis: vars,
        horasExtras: overtime,
      }
    })
  }, [employees, payrollEntries])

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
          <p className="text-muted-foreground">
            Visão geral da folha de pagamento ({formatMonthYear(currentMonth)})
          </p>
        </div>
        <div className="flex gap-2">
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
            <CardTitle className="text-sm font-medium">Custo Total Folha</CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPayroll)}</div>
            <p className="text-xs text-muted-foreground mt-1">Líquido estimado neste mês</p>
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
            <CardTitle className="text-sm font-medium">Total Variáveis</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCommissions)}</div>
            <p className="text-xs text-muted-foreground mt-1">Comissões e Bônus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Descontos</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalDiscounts)}</div>
            <p className="text-xs text-muted-foreground mt-1">Adiantamentos e Farmácia</p>
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
              base: { label: 'Salário Base', color: 'hsl(var(--primary))' },
              variaveis: { label: 'Variáveis (Comissões/Bônus)', color: 'hsl(var(--chart-2))' },
              horasExtras: { label: 'Horas Extras Pagas (R$)', color: 'hsl(var(--destructive))' },
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
                <Bar dataKey="base" stackId="a" fill="var(--color-base)" radius={[0, 0, 4, 4]} />
                <Bar
                  dataKey="variaveis"
                  stackId="a"
                  fill="var(--color-variaveis)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="horasExtras"
                  stackId="a"
                  fill="var(--color-horasExtras)"
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
