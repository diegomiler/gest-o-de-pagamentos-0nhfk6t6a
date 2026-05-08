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
import { Download, Printer } from 'lucide-react'
import { usePayrollData } from '@/hooks/use-payroll-data'
import { formatCurrency, formatCNPJ } from '@/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ADDITION_CATEGORIES = ['commission', 'bonus', 'overtime', 'additional', 'other_addition']
const DISCOUNT_CATEGORIES = [
  'pharmacy_discount',
  'advance',
  'cash_shortage',
  'negative_hours',
  'partner_agreement',
  'store_agreement',
  'other_discount',
]

export function FechamentoView() {
  const [selectedMonth, setSelectedMonth] = useState('2026-04')
  const [selectedCompanyId, setSelectedCompanyId] = useState('all')

  const { employees, payrollEntries, companies, userCompany } = usePayrollData(selectedMonth)

  const activeCompany = useMemo(() => {
    if (selectedCompanyId !== 'all') {
      return companies.find((c) => c.id === selectedCompanyId)
    }
    return userCompany
  }, [selectedCompanyId, userCompany, companies])

  const reportData = useMemo(() => {
    if (!activeCompany) return []

    const companyEmployees = employees.filter((e) => e.company_id === activeCompany.id)

    return companyEmployees.map((emp) => {
      const entries = payrollEntries.filter((e) => e.employee_id === emp.id)

      let totalOvertime = 0
      let totalOtherAdditions = 0
      let totalDiscounts = 0

      entries.forEach((entry) => {
        if (entry.category === 'overtime') {
          totalOvertime += entry.amount
        } else if (ADDITION_CATEGORIES.includes(entry.category)) {
          totalOtherAdditions += entry.amount
        } else if (DISCOUNT_CATEGORIES.includes(entry.category)) {
          totalDiscounts += entry.amount
        }
      })

      const baseFixed = (emp.base_salary || 0) + (emp.additional_amount || 0)
      const totalAdditions = totalOvertime + totalOtherAdditions
      const netSalary = baseFixed + totalAdditions - totalDiscounts

      return {
        id: emp.id,
        name: emp.name,
        baseFixed,
        totalOvertime,
        totalOtherAdditions,
        totalAdditions,
        totalDiscounts,
        netSalary,
      }
    })
  }, [activeCompany, employees, payrollEntries])

  const totals = useMemo(() => {
    return reportData.reduce(
      (acc, row) => ({
        earnings: acc.earnings + row.baseFixed + row.totalAdditions,
        discounts: acc.discounts + row.totalDiscounts,
        net: acc.net + row.netSalary,
      }),
      { earnings: 0, discounts: 0, net: 0 },
    )
  }, [reportData])

  const handlePrint = () => window.print()

  const handleExportCSV = () => {
    if (!activeCompany) return
    const headers = [
      'Empresa',
      'Funcionário',
      'Salário Base + Fixos',
      'Total Horas Extras',
      'Total Adicionais',
      'Total Descontos',
      'Salário Líquido',
    ]
    const rows = reportData.map((row) => [
      `"${activeCompany.name}"`,
      `"${row.name}"`,
      row.baseFixed.toFixed(2),
      row.totalOvertime.toFixed(2),
      row.totalOtherAdditions.toFixed(2),
      row.totalDiscounts.toFixed(2),
      row.netSalary.toFixed(2),
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const [year, month] = selectedMonth.split('-')
    link.download = `fechamento_${activeCompany.name}_${month}_${year}.csv`
    link.click()
    URL.revokeObjectURL(url)
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
            <label className="text-sm font-medium">Empresa</label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {userCompany ? 'Minha Empresa' : 'Selecione uma empresa'}
                </SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={reportData.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button onClick={handlePrint} disabled={reportData.length === 0} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-hidden">
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Total Vencimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.earnings)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Total Descontos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.discounts)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm text-muted-foreground">Saída Líquida Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totals.net)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="hidden print:block mb-6 space-y-2">
        <h2 className="text-2xl font-bold text-center uppercase border-b pb-2">
          Fechamento Mensal - {selectedMonth}
        </h2>
        {activeCompany && (
          <div className="text-center text-sm">
            <p className="font-bold text-lg">{activeCompany.name}</p>
            <p>CNPJ: {formatCNPJ(activeCompany.cnpj || '')}</p>
          </div>
        )}
      </div>

      <div className="flex-1 bg-card border rounded-lg overflow-auto print:border-none print:shadow-none print:m-0 print:p-0 print:overflow-visible">
        <Table className="print:text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Funcionário</TableHead>
              <TableHead className="text-right">Base + Fixos</TableHead>
              <TableHead className="text-right">Horas Extras</TableHead>
              <TableHead className="text-right">Outros Adic.</TableHead>
              <TableHead className="text-right">Descontos</TableHead>
              <TableHead className="text-right font-bold">Líquido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reportData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Nenhum dado encontrado
                </TableCell>
              </TableRow>
            ) : (
              reportData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.baseFixed)}</TableCell>
                  <TableCell className="text-right text-blue-600">
                    {formatCurrency(row.totalOvertime)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(row.totalOtherAdditions)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(row.totalDiscounts)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(row.netSalary)}
                  </TableCell>
                </TableRow>
              ))
            )}
            {reportData.length > 0 && (
              <TableRow className="font-bold bg-muted/50 print:bg-gray-100">
                <TableCell>Total Geral</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(reportData.reduce((sum, r) => sum + r.baseFixed, 0))}
                </TableCell>
                <TableCell className="text-right text-blue-600">
                  {formatCurrency(reportData.reduce((sum, r) => sum + r.totalOvertime, 0))}
                </TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(reportData.reduce((sum, r) => sum + r.totalOtherAdditions, 0))}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(totals.discounts)}
                </TableCell>
                <TableCell className="text-right font-bold text-lg">
                  {formatCurrency(totals.net)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
