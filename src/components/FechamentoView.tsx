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
import { formatCurrency, formatCNPJ, formatMonthYear } from '@/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const INITIAL_TOTALS = {
  baseSalary: 0,
  fixedValue: 0,
  additionalFixed: 0,
  overtime: 0,
  commissionBonus: 0,
  otherAdditions: 0,
  pharmacyStore: 0,
  cashShortage: 0,
  negativeHours: 0,
  advances: 0,
  otherDiscounts: 0,
  totalEarnings: 0,
  totalDiscounts: 0,
  netTotal: 0,
}

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

    return companyEmployees
      .map((emp) => {
        const entries = payrollEntries.filter((e) => e.employee_id === emp.id)

        let baseSalary = 0
        let additionalFixed = 0
        let overtime = 0
        let commissionBonus = 0
        let otherAdditions = 0
        let pharmacyStore = 0
        let cashShortage = 0
        let negativeHours = 0
        let advances = 0
        let otherDiscounts = 0

        entries.forEach((entry) => {
          switch (entry.category) {
            case 'base_net':
              baseSalary += entry.amount
              break
            case 'additional':
              additionalFixed += entry.amount
              break
            case 'overtime':
              overtime += entry.amount
              break
            case 'commission':
            case 'bonus':
              commissionBonus += entry.amount
              break
            case 'other_addition':
            case 'other':
              otherAdditions += entry.amount
              break
            case 'pharmacy_discount':
            case 'store_agreement':
            case 'partner_agreement':
              pharmacyStore += entry.amount
              break
            case 'cash_shortage':
              cashShortage += entry.amount
              break
            case 'negative_hours':
              negativeHours += entry.amount
              break
            case 'advance':
              advances += entry.amount
              break
            case 'other_discount':
              otherDiscounts += entry.amount
              break
          }
        })
        const totalEarnings =
          baseSalary + additionalFixed + overtime + commissionBonus + otherAdditions
        const totalDiscounts =
          pharmacyStore + cashShortage + negativeHours + advances + otherDiscounts
        const netTotal = totalEarnings - totalDiscounts
        const fixedValue = emp.additional_amount || 0

        return {
          id: emp.id,
          name: emp.name,
          role: emp.role || '',
          fixedValue,
          baseSalary,
          additionalFixed,
          overtime,
          commissionBonus,
          otherAdditions,
          totalEarnings,
          pharmacyStore,
          cashShortage,
          negativeHours,
          advances,
          otherDiscounts,
          totalDiscounts,
          netTotal,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activeCompany, employees, payrollEntries])

  const totals = useMemo(() => {
    return reportData.reduce(
      (acc, row) => ({
        baseSalary: acc.baseSalary + row.baseSalary,
        fixedValue: acc.fixedValue + row.fixedValue,
        additionalFixed: acc.additionalFixed + row.additionalFixed,
        overtime: acc.overtime + row.overtime,
        commissionBonus: acc.commissionBonus + row.commissionBonus,
        otherAdditions: acc.otherAdditions + row.otherAdditions,
        pharmacyStore: acc.pharmacyStore + row.pharmacyStore,
        cashShortage: acc.cashShortage + row.cashShortage,
        negativeHours: acc.negativeHours + row.negativeHours,
        advances: acc.advances + row.advances,
        otherDiscounts: acc.otherDiscounts + row.otherDiscounts,
        totalEarnings: acc.totalEarnings + row.totalEarnings,
        totalDiscounts: acc.totalDiscounts + row.totalDiscounts,
        netTotal: acc.netTotal + row.netTotal,
      }),
      { ...INITIAL_TOTALS },
    )
  }, [reportData])

  const handlePrint = () => window.print()

  const handleExportCSV = () => {
    if (!activeCompany) return
    const headers = [
      'Empresa',
      'Funcionário',
      'Cargo',
      'Salário Base',
      'Valor Fixo',
      'Adicional Fixo',
      'Categoria',
      'Valor',
      'Quantidade',
      'Data',
      'Descrição',
      'Salário Líquido (Mês)',
    ]

    const categoryMap: Record<string, string> = {
      commission: 'Comissão',
      bonus: 'Prêmio',
      pharmacy_discount: 'Farmácia',
      advance: 'Adiantamento',
      additional: 'Adicional',
      other: 'Outro',
      overtime: 'Hora Extra',
      base_net: 'Base Líquida',
      cash_shortage: 'Furo de Caixa',
      negative_hours: 'Hora Negativa',
      partner_agreement: 'Convênio Parceiro',
      store_agreement: 'Convênio Loja',
      other_discount: 'Outro Desconto',
      other_addition: 'Outro Acréscimo',
    }

    const companyEmployees = employees.filter((e) => e.company_id === activeCompany.id)
    const rows: string[][] = []

    companyEmployees.forEach((emp) => {
      const empEntries = payrollEntries.filter((e) => e.employee_id === emp.id)

      const baseSalaryAmount = empEntries
        .filter((e) => e.category === 'base_net')
        .reduce((acc, curr) => acc + curr.amount, 0)
      const additionalAmount = empEntries
        .filter((e) => e.category === 'additional')
        .reduce((acc, curr) => acc + curr.amount, 0)

      const baseSalary = baseSalaryAmount.toFixed(2)
      const addFixed = additionalAmount.toFixed(2)

      const empReport = reportData.find((r) => r.id === emp.id)
      const netTotalStr = (empReport?.netTotal || 0).toFixed(2)
      const fixedValueStr = (emp.additional_amount || 0).toFixed(2)

      if (empEntries.length === 0) {
        rows.push([
          `"${activeCompany.name}"`,
          `"${emp.name}"`,
          `"${emp.role || ''}"`,
          '0.00',
          fixedValueStr,
          '0.00',
          '""',
          '0.00',
          '0.00',
          '""',
          '""',
          '0.00',
        ])
      } else {
        empEntries.forEach((entry) => {
          rows.push([
            `"${activeCompany.name}"`,
            `"${emp.name}"`,
            `"${emp.role || ''}"`,
            baseSalary,
            fixedValueStr,
            addFixed,
            `"${categoryMap[entry.category] || entry.category}"`,
            (entry.amount || 0).toFixed(2),
            (entry.quantity || 0).toFixed(2),
            `"${entry.entry_date ? entry.entry_date.split(' ')[0] : ''}"`,
            `"${entry.description || ''}"`,
            netTotalStr,
          ])
        })
      }
    })

    rows.push([])
    rows.push([
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '"TOTAL VENCIMENTOS"',
      totals.totalEarnings.toFixed(2),
      '""',
      '""',
      '""',
      '""',
    ])
    rows.push([
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '"TOTAL DESCONTOS"',
      totals.totalDiscounts.toFixed(2),
      '""',
      '""',
      '""',
      '""',
    ])
    rows.push([
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '"TOTAL LÍQUIDO GERAL"',
      totals.netTotal.toFixed(2),
      '""',
      '""',
      '""',
      '""',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const [year, month] = selectedMonth.split('-')
    link.download = `relatorio_detalhado_${activeCompany.name}_${month}_${year}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            width: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-hidden {
            display: none !important;
          }
          aside, header, nav {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          table { 
            page-break-inside: auto; 
            width: 100%; 
          }
          tr { 
            page-break-inside: avoid; 
            page-break-after: auto; 
          }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          td, th {
            white-space: normal !important;
            word-wrap: break-word;
          }
        }
      `}</style>
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
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.totalEarnings)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-muted-foreground">Total Descontos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totals.totalDiscounts)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-muted-foreground">Saída Líquida Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totals.netTotal)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="hidden print:block mb-6">
          <div className="flex justify-between items-end border-b-2 border-black pb-4">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-wide">
                Relatório de Fechamento Mensal
              </h2>
              <p className="text-lg text-muted-foreground mt-1">
                Referência: {formatMonthYear(selectedMonth)}
              </p>
            </div>
            {activeCompany && (
              <div className="text-right">
                <p className="font-bold text-xl">{activeCompany.name}</p>
                <p className="text-sm mt-1">
                  CNPJ: {activeCompany.cnpj ? formatCNPJ(activeCompany.cnpj) : 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-card border rounded-lg overflow-auto print:border-none print:shadow-none print:m-0 print:p-0 print:overflow-visible">
          <Table className="print:text-[9px] text-xs whitespace-nowrap print:whitespace-normal [&_th]:print:p-1 [&_td]:print:p-1 min-w-[1200px] print:min-w-full print:w-full">
            <TableHeader>
              <TableRow className="print:border-b-2 print:border-black">
                <TableHead className="w-[180px]">Funcionário / Cargo</TableHead>
                <TableHead className="text-right">Sal. Base</TableHead>
                <TableHead className="text-right">Valor Fixo</TableHead>
                <TableHead className="text-right">Adic. Fixo</TableHead>
                <TableHead className="text-right">H. Extras</TableHead>
                <TableHead className="text-right">Comis/Prêm</TableHead>
                <TableHead className="text-right">Outros V.</TableHead>
                <TableHead className="text-right font-bold bg-muted/30 print:bg-transparent">
                  Tot. Venc.
                </TableHead>
                <TableHead className="text-right">Furos Cx.</TableHead>
                <TableHead className="text-right">H. Neg.</TableHead>
                <TableHead className="text-right">Convênios</TableHead>
                <TableHead className="text-right">Adiant.</TableHead>
                <TableHead className="text-right">Outros D.</TableHead>
                <TableHead className="text-right font-bold bg-muted/30 print:bg-transparent">
                  Tot. Desc.
                </TableHead>
                <TableHead className="text-right font-bold bg-primary/10 print:bg-transparent">
                  Líquido
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8">
                    Nenhum dado encontrado para o período.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((row) => (
                  <TableRow key={row.id} className="print:border-b print:border-gray-200">
                    <TableCell className="font-medium whitespace-normal print:whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold">{row.name}</span>
                        <span className="text-[10px] text-muted-foreground print:text-black/70">
                          {row.role || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.baseSalary)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.fixedValue)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.additionalFixed)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600 print:text-black">
                      {formatCurrency(row.overtime)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 print:text-black">
                      {formatCurrency(row.commissionBonus)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.otherAdditions)}
                    </TableCell>
                    <TableCell className="text-right font-semibold bg-muted/10 print:bg-transparent">
                      {formatCurrency(row.totalEarnings)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 print:text-black">
                      {formatCurrency(row.cashShortage)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 print:text-black">
                      {formatCurrency(row.negativeHours)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 print:text-black">
                      {formatCurrency(row.pharmacyStore)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 print:text-black">
                      {formatCurrency(row.advances)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 print:text-black">
                      {formatCurrency(row.otherDiscounts)}
                    </TableCell>
                    <TableCell className="text-right font-semibold bg-muted/10 print:bg-transparent">
                      {formatCurrency(row.totalDiscounts)}
                    </TableCell>
                    <TableCell className="text-right font-bold bg-primary/5 print:bg-transparent">
                      {formatCurrency(row.netTotal)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {reportData.length > 0 && (
                <TableRow className="font-bold bg-muted/50 print:bg-transparent print:border-t-2 print:border-black">
                  <TableCell className="uppercase text-[10px]">Total Geral</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.baseSalary)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.fixedValue)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.additionalFixed)}
                  </TableCell>
                  <TableCell className="text-right text-blue-600 print:text-black">
                    {formatCurrency(totals.overtime)}
                  </TableCell>
                  <TableCell className="text-right text-green-600 print:text-black">
                    {formatCurrency(totals.commissionBonus)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.otherAdditions)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(totals.totalEarnings)}
                  </TableCell>
                  <TableCell className="text-right text-red-600 print:text-black">
                    {formatCurrency(totals.cashShortage)}
                  </TableCell>
                  <TableCell className="text-right text-red-600 print:text-black">
                    {formatCurrency(totals.negativeHours)}
                  </TableCell>
                  <TableCell className="text-right text-red-600 print:text-black">
                    {formatCurrency(totals.pharmacyStore)}
                  </TableCell>
                  <TableCell className="text-right text-red-600 print:text-black">
                    {formatCurrency(totals.advances)}
                  </TableCell>
                  <TableCell className="text-right text-red-600 print:text-black">
                    {formatCurrency(totals.otherDiscounts)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(totals.totalDiscounts)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm print:text-xs">
                    {formatCurrency(totals.netTotal)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="hidden print:block mt-8 border-t-2 border-black pt-4">
          <div className="flex justify-end gap-16 text-sm">
            <div>
              <p className="font-bold text-muted-foreground uppercase text-xs mb-1">
                Total de Vencimentos
              </p>
              <p className="text-xl font-semibold">{formatCurrency(totals.totalEarnings)}</p>
            </div>
            <div>
              <p className="font-bold text-muted-foreground uppercase text-xs mb-1">
                Total de Descontos
              </p>
              <p className="text-xl font-semibold text-red-600 print:text-black">
                {formatCurrency(totals.totalDiscounts)}
              </p>
            </div>
            <div>
              <p className="font-bold text-muted-foreground uppercase text-xs mb-1">
                Total Líquido Geral
              </p>
              <p className="text-2xl font-black">{formatCurrency(totals.netTotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
