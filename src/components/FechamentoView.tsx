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

const ALL_PROVENTOS = [
  'base_net',
  'overtime',
  'commission',
  'bonus',
  'additional',
  'other_addition',
  'other',
]

const DISPLAY_PROVENTOS = ['base_net', 'overtime', 'commission', 'bonus', 'other_addition']

const ALL_DESCONTOS = [
  'pharmacy_discount',
  'store_agreement',
  'partner_agreement',
  'cash_shortage',
  'negative_hours',
  'advance',
  'other_discount',
]

const DISPLAY_DESCONTOS = [
  'pharmacy_discount',
  'store_agreement',
  'partner_agreement',
  'cash_shortage',
  'negative_hours',
  'advance',
  'other_discount',
]

const CAT_LABELS: Record<string, string> = {
  base_net: 'Sal. Lanç.',
  overtime: 'H. Extras',
  commission: 'Comissão',
  bonus: 'Bônus',
  additional: 'Adicional',
  other_addition: 'Out. Venc.',
  other: 'Outros',
  pharmacy_discount: 'Farmácia',
  store_agreement: 'Conv. Loja',
  partner_agreement: 'Conv. Parc.',
  cash_shortage: 'Furo Cx.',
  negative_hours: 'H. Neg.',
  advance: 'Adiant.',
  other_discount: 'Out. Desc.',
}

const isProvento = (cat: string) => ALL_PROVENTOS.includes(cat)
const isDesconto = (cat: string) => ALL_DESCONTOS.includes(cat)

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

        const cats: Record<string, number> = {}
        let totalEarnings = 0
        let totalDiscounts = 0

        entries.forEach((entry) => {
          const amount = entry.amount || 0
          cats[entry.category] = (cats[entry.category] || 0) + amount
          if (isProvento(entry.category)) {
            totalEarnings += amount
          } else if (isDesconto(entry.category)) {
            totalDiscounts += amount
          }
        })

        const empBaseSalary = cats['base_net'] || 0
        const fixedAdditional = cats['additional'] || 0

        const netTotal = totalEarnings - totalDiscounts

        return {
          id: emp.id,
          name: emp.name,
          role: emp.role || emp.department || '',
          empBaseSalary,
          fixedAdditional,
          cats,
          totalEarnings,
          totalDiscounts,
          netTotal,
          hasEntries: entries.length > 0,
        }
      })
      .filter((emp) => emp.hasEntries)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activeCompany, employees, payrollEntries])

  const totals = useMemo(() => {
    const initCats: Record<string, number> = {}
    DISPLAY_PROVENTOS.forEach((c) => (initCats[c] = 0))
    DISPLAY_DESCONTOS.forEach((c) => (initCats[c] = 0))

    return reportData.reduce(
      (acc, row) => {
        acc.empBaseSalary += row.empBaseSalary
        acc.fixedAdditional += row.fixedAdditional
        DISPLAY_PROVENTOS.forEach((c) => (acc.cats[c] += row.cats[c] || 0))
        DISPLAY_DESCONTOS.forEach((c) => (acc.cats[c] += row.cats[c] || 0))
        acc.totalEarnings += row.totalEarnings
        acc.totalDiscounts += row.totalDiscounts
        acc.netTotal += row.netTotal
        return acc
      },
      {
        empBaseSalary: 0,
        fixedAdditional: 0,
        cats: initCats,
        totalEarnings: 0,
        totalDiscounts: 0,
        netTotal: 0,
      },
    )
  }, [reportData])

  const handlePrint = () => window.print()

  const handleExportCSV = () => {
    if (!activeCompany) return
    const headers = [
      'Funcionário',
      'Cargo',
      'Sal. Base',
      'Adic. Fixo',
      ...DISPLAY_PROVENTOS.map((c) => CAT_LABELS[c]),
      'Tot. Proventos',
      ...DISPLAY_DESCONTOS.map((c) => CAT_LABELS[c]),
      'Tot. Descontos',
      'Líquido',
    ]

    const rows: string[][] = reportData.map((row) => [
      `"${row.name}"`,
      `"${row.role}"`,
      `"${row.empBaseSalary.toFixed(2).replace('.', ',')}"`,
      `"${row.fixedAdditional.toFixed(2).replace('.', ',')}"`,
      ...DISPLAY_PROVENTOS.map((c) => `"${(row.cats[c] || 0).toFixed(2).replace('.', ',')}"`),
      `"${row.totalEarnings.toFixed(2).replace('.', ',')}"`,
      ...DISPLAY_DESCONTOS.map((c) => `"${(row.cats[c] || 0).toFixed(2).replace('.', ',')}"`),
      `"${row.totalDiscounts.toFixed(2).replace('.', ',')}"`,
      `"${row.netTotal.toFixed(2).replace('.', ',')}"`,
    ])

    rows.push([
      `"Total Geral"`,
      `""`,
      `"${totals.empBaseSalary.toFixed(2).replace('.', ',')}"`,
      `"${totals.fixedAdditional.toFixed(2).replace('.', ',')}"`,
      ...DISPLAY_PROVENTOS.map((c) => `"${(totals.cats[c] || 0).toFixed(2).replace('.', ',')}"`),
      `"${totals.totalEarnings.toFixed(2).replace('.', ',')}"`,
      ...DISPLAY_DESCONTOS.map((c) => `"${(totals.cats[c] || 0).toFixed(2).replace('.', ',')}"`),
      `"${totals.totalDiscounts.toFixed(2).replace('.', ',')}"`,
      `"${totals.netTotal.toFixed(2).replace('.', ',')}"`,
    ])

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const [year, month] = selectedMonth.split('-')
    link.download = `fechamento_${activeCompany.name.replace(/\s+/g, '_')}_${month}_${year}.csv`
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
            background: white !important;
            font-size: 8pt !important;
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
            width: 100% !important;
            display: block !important;
            overflow: visible !important;
          }
          .print-table-container, .print-table-container > div {
            overflow: visible !important;
            display: block !important;
            width: 100% !important;
          }
          table { 
            page-break-inside: auto; 
            width: 100% !important; 
            max-width: 100% !important; 
            border-collapse: collapse; 
            table-layout: auto !important; 
          }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th, td { 
            padding: 2px 4px !important; 
            font-size: 8pt !important; 
            white-space: nowrap !important; 
          }
          .employee-name-cell {
            white-space: normal !important;
            min-width: 100px;
          }
        }
      `}</style>
      <div className="space-y-6 flex flex-col h-full print:block print:w-full print:space-y-4">
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

        <div className="hidden print:block mb-4">
          <div className="border-b-2 border-black pb-2">
            <h2 className="text-xl font-bold uppercase tracking-wide">Relatório de Fechamento</h2>
            <p className="text-sm text-gray-800 mt-1">
              Referência: {formatMonthYear(selectedMonth)}
            </p>
            {activeCompany && (
              <div className="mt-1 text-gray-800">
                <p className="font-bold text-md">{activeCompany.name}</p>
                <p className="text-xs">
                  CNPJ: {activeCompany.cnpj ? formatCNPJ(activeCompany.cnpj) : 'N/A'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-card border print:border-none print:bg-transparent rounded-lg print:rounded-none overflow-auto print:overflow-visible relative print:block print:w-full print-table-container">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-start pt-20 justify-center print-hidden">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          <Table className="text-[11px] print:text-[8pt] whitespace-nowrap print:w-full print:min-w-full">
            <TableHeader>
              <TableRow className="print:border-b-2 print:border-black">
                <TableHead className="w-[150px] print:w-auto p-2 employee-name-cell">
                  Funcionário
                </TableHead>
                <TableHead className="text-right p-2">Sal. Base</TableHead>
                <TableHead className="text-right p-2">Adic. Fixo</TableHead>
                {DISPLAY_PROVENTOS.map((c) => (
                  <TableHead key={c} className="text-right p-2 text-blue-700 print:text-black">
                    {CAT_LABELS[c]}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold bg-muted/30 print:bg-transparent p-2 text-green-700 print:text-black">
                  Tot. Prov.
                </TableHead>
                {DISPLAY_DESCONTOS.map((c) => (
                  <TableHead key={c} className="text-right p-2 text-red-700 print:text-black">
                    {CAT_LABELS[c]}
                  </TableHead>
                ))}
                <TableHead className="text-right font-bold bg-muted/30 print:bg-transparent p-2 text-red-700 print:text-black">
                  Tot. Desc.
                </TableHead>
                <TableHead className="text-right font-bold bg-primary/10 print:bg-transparent p-2 text-black">
                  Líquido
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={20} className="text-center py-8">
                    Nenhum lançamento encontrado para o período.
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((row) => (
                  <TableRow key={row.id} className="print:border-b print:border-gray-300">
                    <TableCell className="font-medium whitespace-normal p-2 min-w-[120px] employee-name-cell">
                      <div className="flex flex-col">
                        <span className="font-bold print:font-semibold leading-tight">
                          {row.name}
                        </span>
                        <span className="text-[9px] print:text-[7pt] text-muted-foreground print:text-gray-600 leading-tight">
                          {row.role || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right p-2">
                      {formatCurrency(row.empBaseSalary)}
                    </TableCell>
                    <TableCell className="text-right p-2">
                      {formatCurrency(row.fixedAdditional)}
                    </TableCell>
                    {DISPLAY_PROVENTOS.map((c) => (
                      <TableCell
                        key={c}
                        className={`text-right p-2 ${row.cats[c] ? 'text-blue-600 print:text-black' : 'text-gray-300 print:text-gray-400'}`}
                      >
                        {formatCurrency(row.cats[c] || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold bg-muted/10 print:bg-transparent p-2 text-green-600 print:text-black">
                      {formatCurrency(row.totalEarnings)}
                    </TableCell>
                    {DISPLAY_DESCONTOS.map((c) => (
                      <TableCell
                        key={c}
                        className={`text-right p-2 ${row.cats[c] ? 'text-red-500 print:text-black' : 'text-gray-300 print:text-gray-400'}`}
                      >
                        {formatCurrency(row.cats[c] || 0)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-semibold bg-muted/10 print:bg-transparent p-2 text-red-600 print:text-black">
                      {formatCurrency(row.totalDiscounts)}
                    </TableCell>
                    <TableCell className="text-right font-bold bg-primary/5 print:bg-transparent p-2 text-black">
                      {formatCurrency(row.netTotal)}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {reportData.length > 0 && (
                <TableRow className="font-bold bg-muted/50 print:bg-transparent print:border-t-2 print:border-black">
                  <TableCell className="uppercase text-[10px] print:text-[8pt] p-2 employee-name-cell">
                    Total Geral
                  </TableCell>
                  <TableCell className="text-right p-2">
                    {formatCurrency(totals.empBaseSalary)}
                  </TableCell>
                  <TableCell className="text-right p-2">
                    {formatCurrency(totals.fixedAdditional)}
                  </TableCell>
                  {DISPLAY_PROVENTOS.map((c) => (
                    <TableCell key={c} className="text-right p-2 text-blue-700 print:text-black">
                      {formatCurrency(totals.cats[c] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold p-2 text-green-700 print:text-black">
                    {formatCurrency(totals.totalEarnings)}
                  </TableCell>
                  {DISPLAY_DESCONTOS.map((c) => (
                    <TableCell key={c} className="text-right p-2 text-red-700 print:text-black">
                      {formatCurrency(totals.cats[c] || 0)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold p-2 text-red-700 print:text-black">
                    {formatCurrency(totals.totalDiscounts)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm print:text-[8pt] p-2">
                    {formatCurrency(totals.netTotal)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
