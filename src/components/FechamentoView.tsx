import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'
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
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'

const ALL_PROVENTOS = [
  'base_net',
  'commission',
  'bonus',
  'overtime',
  'additional',
  'other_addition',
  'other',
]

const ALL_DESCONTOS = [
  'advance',
  'pharmacy_discount',
  'cash_shortage',
  'negative_hours',
  'partner_agreement',
  'store_agreement',
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
  advance: 'Adiantamento',
  other_discount: 'Out. Desc.',
}

const isProvento = (cat: string) => ALL_PROVENTOS.includes(cat)
const isDesconto = (cat: string) => ALL_DESCONTOS.includes(cat)

export function FechamentoView() {
  const { selectedMonth } = usePeriod()
  const { user } = useAuth()

  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')

  const [entries, setEntries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const comps = await pb.collection('companies').getFullList()
        setCompanies(comps)

        if (user?.company_id) {
          setSelectedCompanyId(user.company_id)
        } else if (comps.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(comps[0].id)
        }
      } catch (error) {
        console.error(error)
      }
    }
    fetchCompanies()
  }, [user])

  const loadEntries = useCallback(async () => {
    if (!selectedCompanyId || !selectedMonth) {
      setEntries([])
      return
    }

    setIsLoading(true)
    try {
      const [year, month] = selectedMonth.split('-')
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const startDate = `${selectedMonth}-01 00:00:00`
      const endDate = `${selectedMonth}-${lastDay} 23:59:59`
      const filter = `company_id = '${selectedCompanyId}' && entry_date >= '${startDate}' && entry_date <= '${endDate}'`

      const data = await pb.collection('payroll_entries').getFullList({
        filter,
        expand: 'employee_id',
        sort: '-entry_date',
      })
      setEntries(data)
    } catch (error: any) {
      if (!error?.isAbort) {
        toast.error(getErrorMessage(error))
        const fieldErrs = extractFieldErrors(error)
        if (Object.keys(fieldErrs).length > 0) {
          console.error('Erros de validação:', fieldErrs)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompanyId, selectedMonth])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId)
  }, [selectedCompanyId, companies])

  const employeeSummaries = useMemo(() => {
    const summaries: Record<string, any> = {}
    let proventosGeral = 0
    let descontosGeral = 0

    entries.forEach((entry) => {
      const empId = entry.employee_id
      if (!summaries[empId]) {
        summaries[empId] = {
          employeeId: empId,
          employeeName: entry.expand?.employee_id?.name || 'N/A',
          categories: {},
          totalProventos: 0,
          totalDescontos: 0,
          netTotal: 0,
        }
      }

      const sum = summaries[empId]
      const amount = entry.amount || 0
      sum.categories[entry.category] = (sum.categories[entry.category] || 0) + amount

      if (isProvento(entry.category)) {
        sum.totalProventos += amount
        proventosGeral += amount
      } else if (isDesconto(entry.category)) {
        sum.totalDescontos += amount
        descontosGeral += amount
      }
    })

    Object.values(summaries).forEach((sum) => {
      sum.netTotal = sum.totalProventos - sum.totalDescontos
    })

    return {
      list: Object.values(summaries).sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
      totalProventos: proventosGeral,
      totalDescontos: descontosGeral,
      netTotal: proventosGeral - descontosGeral,
    }
  }, [entries])

  const { list: summariesList, totalProventos, totalDescontos, netTotal } = employeeSummaries

  const handlePrint = () => window.print()

  const handleExportCSV = () => {
    if (!activeCompany || summariesList.length === 0) return

    const provHeaders = ALL_PROVENTOS.map((c) => CAT_LABELS[c] || c)
    const descHeaders = ALL_DESCONTOS.map((c) => CAT_LABELS[c] || c)

    const headers = [
      'Funcionário',
      ...provHeaders,
      'Total Proventos',
      ...descHeaders,
      'Total Descontos',
      'Líquido Total',
    ]

    const rows = summariesList.map((sum) => {
      return [
        `"${sum.employeeName}"`,
        ...ALL_PROVENTOS.map((c) => `"${(sum.categories[c] || 0).toFixed(2).replace('.', ',')}"`),
        `"${sum.totalProventos.toFixed(2).replace('.', ',')}"`,
        ...ALL_DESCONTOS.map((c) => `"${(sum.categories[c] || 0).toFixed(2).replace('.', ',')}"`),
        `"${sum.totalDescontos.toFixed(2).replace('.', ',')}"`,
        `"${sum.netTotal.toFixed(2).replace('.', ',')}"`,
      ]
    })

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const [year, month] = selectedMonth.split('-')
    link.download = `fechamento_consolidado_${activeCompany.name.replace(/\s+/g, '_')}_${month}_${year}.csv`
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
            font-size: 9pt !important;
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
          table { 
            page-break-inside: auto; 
            width: 100% !important; 
            border-collapse: collapse; 
          }
          thead {
            display: table-header-group;
          }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th, td { 
            padding: 4px 6px !important; 
            border-bottom: 1px solid #ddd;
            white-space: nowrap;
            font-size: 9pt !important;
          }
        }
      `}</style>
      <div className="space-y-6 flex flex-col flex-1 min-h-0 print:block print:w-full">
        <div className="flex flex-col sm:flex-row justify-between gap-4 print-hidden bg-card p-4 rounded-lg border flex-shrink-0">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-1">
              <label className="text-sm font-medium">Mês/Ano</label>
              <PeriodSelector />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Empresa</label>
              <Select
                value={selectedCompanyId}
                onValueChange={setSelectedCompanyId}
                disabled={companies.length === 0}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
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
              disabled={summariesList.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={handlePrint} disabled={summariesList.length === 0} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print-hidden flex-shrink-0">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-muted-foreground">Total de Proventos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalProventos)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-muted-foreground">Total de Descontos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDescontos)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm text-muted-foreground">Valor Líquido Total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(netTotal)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="hidden print:block mb-6 flex-shrink-0">
          <div className="border-b-2 border-black pb-4">
            <h2 className="text-xl font-bold uppercase tracking-wide">Fechamento Consolidado</h2>
            <p className="text-sm text-gray-800 mt-1">
              Referência: {formatMonthYear(selectedMonth)}
            </p>
            {activeCompany && (
              <div className="mt-1 text-gray-800">
                <p className="font-bold text-base">{activeCompany.name}</p>
                <p className="text-xs">
                  CNPJ: {activeCompany.cnpj ? formatCNPJ(activeCompany.cnpj) : 'N/A'}
                </p>
              </div>
            )}

            <div className="flex gap-8 mt-4">
              <div>
                <p className="text-xs text-gray-600">Total Proventos</p>
                <p className="text-sm font-bold text-green-700">{formatCurrency(totalProventos)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Descontos</p>
                <p className="text-sm font-bold text-red-700">{formatCurrency(totalDescontos)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Líquido Total</p>
                <p className="text-sm font-bold">{formatCurrency(netTotal)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-card border print:border-none print:bg-transparent rounded-lg print:rounded-none overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center print-hidden">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Carregando fechamento...</span>
              </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-auto print:overflow-visible">
            <Table className="whitespace-nowrap">
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-md print:bg-transparent z-20 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
                <TableRow className="print:border-b-2 print:border-black hover:bg-transparent">
                  <TableHead className="min-w-[200px] sticky left-0 bg-muted/95 backdrop-blur-md z-30 shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                    Funcionário
                  </TableHead>
                  {ALL_PROVENTOS.map((cat) => (
                    <TableHead key={cat} className="text-right min-w-[110px]">
                      {CAT_LABELS[cat] || cat}
                    </TableHead>
                  ))}
                  <TableHead className="text-right min-w-[120px] font-bold text-green-700 bg-green-50/50 print:bg-transparent">
                    T. Proventos
                  </TableHead>
                  {ALL_DESCONTOS.map((cat) => (
                    <TableHead key={cat} className="text-right min-w-[110px]">
                      {CAT_LABELS[cat] || cat}
                    </TableHead>
                  ))}
                  <TableHead className="text-right min-w-[120px] font-bold text-red-700 bg-red-50/50 print:bg-transparent">
                    T. Descontos
                  </TableHead>
                  <TableHead className="text-right min-w-[120px] font-bold bg-muted/50 print:bg-transparent">
                    Líquido
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summariesList.length === 0 && !isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={ALL_PROVENTOS.length + ALL_DESCONTOS.length + 4}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhum lançamento encontrado para esta empresa e período.
                    </TableCell>
                  </TableRow>
                ) : (
                  summariesList.map((sum) => (
                    <TableRow key={sum.employeeId} className="group hover:bg-muted/50">
                      <TableCell className="font-medium sticky left-0 bg-background group-hover:bg-muted/50 print:bg-transparent z-10 shadow-[1px_0_0_rgba(0,0,0,0.1)]">
                        {sum.employeeName}
                      </TableCell>
                      {ALL_PROVENTOS.map((cat) => (
                        <TableCell
                          key={cat}
                          className="text-right text-muted-foreground print:text-black"
                        >
                          {sum.categories[cat] ? formatCurrency(sum.categories[cat]) : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold text-green-600 print:text-black bg-green-50/30 group-hover:bg-green-50/50 print:bg-transparent">
                        {formatCurrency(sum.totalProventos)}
                      </TableCell>
                      {ALL_DESCONTOS.map((cat) => (
                        <TableCell
                          key={cat}
                          className="text-right text-muted-foreground print:text-black"
                        >
                          {sum.categories[cat] ? formatCurrency(sum.categories[cat]) : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold text-red-600 print:text-black bg-red-50/30 group-hover:bg-red-50/50 print:bg-transparent">
                        {formatCurrency(sum.totalDescontos)}
                      </TableCell>
                      <TableCell className="text-right font-bold print:text-black bg-muted/20 group-hover:bg-muted/40 print:bg-transparent">
                        {formatCurrency(sum.netTotal)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  )
}
