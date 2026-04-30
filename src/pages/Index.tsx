import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Users, Banknote, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatMonthYear } from '@/lib/format'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function Index() {
  const [employees, setEmployees] = useState<any[]>([])
  const [payrollEntries, setPayrollEntries] = useState<any[]>([])
  const currentMonth = '2026-04'

  const loadData = async () => {
    try {
      const emps = await pb.collection('employees').getFullList()
      setEmployees(emps)

      const entries = await pb.collection('payroll_entries').getFullList({
        filter: `entry_date >= '2025-11-01 00:00:00'`,
      })
      setPayrollEntries(entries)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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

      employees.forEach((emp) => {
        if (emp.status === 'active' || emp.status === 'on_leave') totalBase += emp.base_salary
      })

      monthEntries.forEach((e) => {
        if (e.category === 'commission' || e.category === 'bonus') vars += e.amount
      })

      return {
        month: formatMonthYear(m).split('/')[0].trim(),
        base: totalBase,
        variaveis: vars,
      }
    })
  }, [employees, payrollEntries])

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
              variaveis: { label: 'Variáveis (Comissões/Bônus)', color: 'hsl(var(--success))' },
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
