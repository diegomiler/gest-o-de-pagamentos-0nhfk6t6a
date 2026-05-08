import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'
import { usePayrollData } from '@/hooks/use-payroll-data'
import { formatCurrency, formatCNPJ, formatMonthYear } from '@/lib/format'
import { usePeriod } from '@/hooks/use-period'
import { PeriodSelector } from '@/components/PeriodSelector'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CATEGORY_NAMES: Record<string, string> = {
  base_net: 'Salário Base/Líquido',
  commission: 'Comissão',
  bonus: 'Prêmio/Bônus',
  pharmacy_discount: 'Farmácia',
  advance: 'Adiantamento',
  additional: 'Adicional',
  other: 'Outros',
  overtime: 'Horas Extras',
  cash_shortage: 'Furo de Caixa',
  negative_hours: 'Horas Negativas',
  partner_agreement: 'Convênio Parceiro',
  store_agreement: 'Convênio Loja',
  other_discount: 'Outros Descontos',
  other_addition: 'Outros Vencimentos',
}

const isProvento = (cat: string) =>
  ['base_net', 'commission', 'bonus', 'overtime', 'additional', 'other_addition', 'other'].includes(
    cat,
  )
const isDesconto = (cat: string) =>
  [
    'pharmacy_discount',
    'advance',
    'cash_shortage',
    'negative_hours',
    'partner_agreement',
    'store_agreement',
    'other_discount',
  ].includes(cat)

export function FechamentoView() {
  const { selectedMonth } = usePeriod()
  const [selectedCompanyId, setSelectedCompanyId] = useState('all')

  const { employees, payrollEntries, companies, userCompany, isLoading } =
    usePayrollData(selectedMonth)

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
        let overtime = 0
        let commissionBonus = 0
        let otherAdditions = 0

        let pharmacyStore = 0
        let cashShortage = 0
        let negativeHours = 0
        let advances = 0
        let otherDiscounts = 0

        let totalEarnings = 0
        let totalDiscounts = 0

        entries.forEach((entry) => {
          const amount = entry.amount || 0
          if (isProvento(entry.category)) {
            totalEarnings += amount
            if (entry.category === 'base_net') baseSalary += amount
            else if (entry.category === 'overtime') overtime += amount
            else if (entry.category === 'commission' || entry.category === 'bonus')
              commissionBonus += amount
            else otherAdditions += amount
          } else if (isDesconto(entry.category)) {
            totalDiscounts += amount
            if (
              ['pharmacy_discount', 'store_agreement', 'partner_agreement'].includes(entry.category)
            )
              pharmacyStore += amount
            else if (entry.category === 'cash_shortage') cashShortage += amount
            else if (entry.category === 'negative_hours') negativeHours += amount
            else if (entry.category === 'advance') advances += amount
            else otherDiscounts += amount
          }
        })

        const netTotal = totalEarnings - totalDiscounts
        const pdfTotalEarnings = totalEarnings - baseSalary
        const pdfNetTotal = pdfTotalEarnings - totalDiscounts

        return {
          id: emp.id,
          name: emp.name,
          role: emp.role || emp.department || '',
          baseSalary,
          overtime,
          commissionBonus,
          otherAdditions,
          totalEarnings,
          pdfTotalEarnings,
          pharmacyStore,
          cashShortage,
          negativeHours,
          advances,
          otherDiscounts,
          totalDiscounts,
          netTotal,
          pdfNetTotal,
          entries: entries.sort(
            (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime(),
          ),
        }
      })
      .filter((emp) => emp.entries.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activeCompany, employees, payrollEntries])

  const totals = useMemo(() => {
    return reportData.reduce(
      (acc, row) => ({
        baseSalary: acc.baseSalary + row.baseSalary,
        overtime: acc.overtime + row.overtime,
        commissionBonus: acc.commissionBonus + row.commissionBonus,
        otherAdditions: acc.otherAdditions + row.otherAdditions,
        totalEarnings: acc.totalEarnings + row.totalEarnings,
        pharmacyStore: acc.pharmacyStore + row.pharmacyStore,
        cashShortage: acc.cashShortage + row.cashShortage,
        negativeHours: acc.negativeHours + row.negativeHours,
        advances: acc.advances + row.advances,
        otherDiscounts: acc.otherDiscounts + row.otherDiscounts,
        totalDiscounts: acc.totalDiscounts + row.totalDiscounts,
        netTotal: acc.netTotal + row.netTotal,
      }),
      {
        baseSalary: 0,
        overtime: 0,
        commissionBonus: 0,
        otherAdditions: 0,
        totalEarnings: 0,
        pharmacyStore: 0,
        cashShortage: 0,
        negativeHours: 0,
        advances: 0,
        otherDiscounts: 0,
        totalDiscounts: 0,
        netTotal: 0,
      },
    )
  }, [reportData])

  const handlePrint = () => window.print()

  const handleExportCSV = () => {
    if (!activeCompany) return
    const headers = ['Período', 'Funcionário', 'Cargo', 'Categoria', 'Valor', 'Data']

    const rows: string[][] = []

    reportData.forEach((emp) => {
      emp.entries.forEach((entry) => {
        rows.push([
          `"${formatMonthYear(selectedMonth)}"`,
          `"${emp.name}"`,
          `"${emp.role}"`,
          `"${CATEGORY_NAMES[entry.category] || entry.category}"`,
          entry.amount.toFixed(2),
          `"${entry.entry_date.split(' ')[0]}"`,
        ])
      })
    })

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const [year, month] = selectedMonth.split('-')
    link.download = `lancamentos_${activeCompany.name.replace(/\s+/g, '_')}_${month}_${year}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white;
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
        }
      `}</style>
      <div className="space-y-6 flex flex-col h-full">
        <div className="flex flex-col sm:flex-row justify-between gap-4 print-hidden bg-card p-4 rounded-lg border">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-sm font-medium">Mês/Ano</label>
              <PeriodSelector />
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
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={handlePrint} disabled={reportData.length === 0} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-hidden">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-muted-foreground">Total Proventos</CardTitle>
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

        {/* Screen Table (Hidden in Print) */}
        <div className="flex-1 bg-card border rounded-lg overflow-auto print-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-start pt-20 justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          <Table className="text-xs whitespace-nowrap min-w-[1000px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Funcionário / Cargo</TableHead>
                <TableHead className="text-right">Sal. Lançado</TableHead>
                <TableHead className="text-right">H. Extras</TableHead>
                <TableHead className="text-right">Comis/Prêm</TableHead>
                <TableHead className="text-right">Outros Venc.</TableHead>
                <TableHead className="text-right font-bold bg-muted/30">Tot. Venc.</TableHead>
                <TableHead className="text-right">Furos Cx.</TableHead>
                <TableHead className="text-right">H. Neg.</TableHead>
                <TableHead className="text-right">Convênios</TableHead>
                <TableHead className="text-right">Adiant.</TableHead>
                <TableHead className="text-right">Outros Desc.</TableHead>
                <TableHead className="text-right font-bold bg-muted/30">Tot. Desc.</TableHead>
                <TableHead className="text-right font-bold bg-primary/10">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8">
                    Nenhum lançamento encontrado para o período.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium whitespace-normal">
                      <div className="flex flex-col">
                        <span className="font-bold">{row.name}</span>
                        <span className="text-[10px] text-muted-foreground">{row.role || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.baseSalary)}</TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(row.overtime)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(row.commissionBonus)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.otherAdditions)}
                    </TableCell>
                    <TableCell className="text-right font-semibold bg-muted/10">
                      {formatCurrency(row.totalEarnings)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(row.cashShortage)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(row.negativeHours)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(row.pharmacyStore)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(row.advances)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(row.otherDiscounts)}
                    </TableCell>
                    <TableCell className="text-right font-semibold bg-muted/10">
                      {formatCurrency(row.totalDiscounts)}
                    </TableCell>
                    <TableCell className="text-right font-bold bg-primary/5">
                      {formatCurrency(row.netTotal)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {reportData.length > 0 && (
                <TableRow className="font-bold bg-muted/50">
                  <TableCell className="uppercase text-[10px]">Total Geral</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.baseSalary)}</TableCell>
                  <TableCell className="text-right text-blue-600">
                    {formatCurrency(totals.overtime)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(totals.commissionBonus)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.otherAdditions)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(totals.totalEarnings)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(totals.cashShortage)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(totals.negativeHours)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(totals.pharmacyStore)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(totals.advances)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(totals.otherDiscounts)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(totals.totalDiscounts)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm">
                    {formatCurrency(totals.netTotal)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Print Layout (Hidden on Screen) */}
        <div className="hidden print:block w-full">
          <div className="border-b-2 border-black pb-4 mb-6">
            <h2 className="text-2xl font-bold uppercase tracking-wide">
              Relatório de Fechamento Mensal
            </h2>
            <p className="text-lg text-gray-600 mt-1">
              Referência: {formatMonthYear(selectedMonth)}
            </p>
            {activeCompany && (
              <div className="mt-2">
                <p className="font-bold text-xl">{activeCompany.name}</p>
                <p className="text-sm">
                  CNPJ: {activeCompany.cnpj ? formatCNPJ(activeCompany.cnpj) : 'N/A'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-8">
            {reportData.map((row) => (
              <div key={row.id} className="break-inside-avoid pb-6 border-b border-gray-200">
                <h3 className="font-bold text-lg mb-4">
                  {row.name} {row.role ? `- ${row.role}` : ''}
                </h3>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="font-bold border-b border-gray-300 pb-1 mb-2 uppercase text-xs text-gray-500">
                      Proventos Variáveis
                    </p>
                    {row.entries
                      .filter(
                        (e) =>
                          isProvento(e.category) &&
                          e.category !== 'base_net' &&
                          e.category !== 'additional',
                      )
                      .map((e) => (
                        <div key={e.id} className="flex justify-between text-sm py-1">
                          <span>{CATEGORY_NAMES[e.category] || e.category}</span>
                          <span>{formatCurrency(e.amount)}</span>
                        </div>
                      ))}
                    {row.entries.filter(
                      (e) =>
                        isProvento(e.category) &&
                        e.category !== 'base_net' &&
                        e.category !== 'additional',
                    ).length === 0 && (
                      <div className="text-sm py-1 text-gray-400 italic">
                        Nenhum provento variável
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-gray-300">
                      <span>Total Proventos Variáveis</span>
                      <span>{formatCurrency(row.pdfTotalEarnings)}</span>
                    </div>
                  </div>

                  <div>
                    <p className="font-bold border-b border-gray-300 pb-1 mb-2 uppercase text-xs text-gray-500">
                      Descontos
                    </p>
                    {row.entries
                      .filter((e) => isDesconto(e.category))
                      .map((e) => (
                        <div key={e.id} className="flex justify-between text-sm py-1">
                          <span>{CATEGORY_NAMES[e.category] || e.category}</span>
                          <span>{formatCurrency(e.amount)}</span>
                        </div>
                      ))}
                    {row.entries.filter((e) => isDesconto(e.category)).length === 0 && (
                      <div className="text-sm py-1 text-gray-400 italic">Nenhum desconto</div>
                    )}
                    <div className="flex justify-between font-bold text-sm mt-2 pt-2 border-t border-gray-300">
                      <span>Total Descontos</span>
                      <span>{formatCurrency(row.totalDiscounts)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="bg-gray-100 px-4 py-2 rounded-md font-bold text-lg border border-gray-200">
                    Líquido Variável a Pagar: {formatCurrency(row.pdfNetTotal)}
                  </div>
                </div>
              </div>
            ))}

            {reportData.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                Nenhum lançamento encontrado para o período.
              </p>
            )}
          </div>

          {reportData.length > 0 && (
            <div className="mt-8 border-t-2 border-black pt-4 flex justify-end gap-16 text-sm break-inside-avoid">
              <div>
                <p className="font-bold text-gray-500 uppercase text-xs mb-1">
                  Total Vencimentos (Variáveis)
                </p>
                <p className="text-xl font-semibold">
                  {formatCurrency(totals.totalEarnings - totals.baseSalary)}
                </p>
              </div>
              <div>
                <p className="font-bold text-gray-500 uppercase text-xs mb-1">Total de Descontos</p>
                <p className="text-xl font-semibold">{formatCurrency(totals.totalDiscounts)}</p>
              </div>
              <div>
                <p className="font-bold text-gray-500 uppercase text-xs mb-1">
                  Total Líquido Geral (Variável)
                </p>
                <p className="text-2xl font-black">
                  {formatCurrency(totals.netTotal - totals.baseSalary)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
