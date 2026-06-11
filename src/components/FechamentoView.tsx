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
        .zebra-row {
          background-color: hsl(var(--background)) !important;
        }
        .zebra-row:nth-child(even) {
          background-color: color-mix(in srgb, hsl(var(--muted)) 40%, hsl(var(--background))) !important;
        }
        .zebra-row:hover {
          background-color: color-mix(in srgb, hsl(var(--muted)) 70%, hsl(var(--background))) !important;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
            font-size: 7pt !important;
          }
          .print-hidden {
            display: none !important;
          }
          aside, header, nav {
            display: none !important;
          }
          html, body, #root, main {
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .sticky {
            position: static !important;
            box-shadow: none !important;
          }
          table { 
            page-break-inside: auto !important; 
            width: 100% !important; 
            border-collapse: collapse !important; 
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr { 
            page-break-inside: avoid !important; 
            page-break-after: auto !important; 
          }
          th, td { 
            padding: 4px 6px !important; 
            border-bottom: 1px solid #ddd !important;
            white-space: nowrap !important;
            font-size: 6.5pt !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>
      <div className="space-y-3 flex flex-col flex-1 h-[calc(100vh-8rem)] min-h-[400px] print:h-auto print:min-h-0 print:space-y-0 print:block print:w-full">
        <div className="flex flex-col gap-3 print-hidden flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card px-4 py-2.5 rounded-lg border shadow-sm">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Mês/Ano:</label>
                <PeriodSelector />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Empresa:</label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                  disabled={companies.length === 0}
                >
                  <SelectTrigger className="w-[200px] h-9">
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={summariesList.length === 0}
                className="gap-2 h-9"
              >
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                disabled={summariesList.length === 0}
                className="gap-2 h-9"
              >
                <Printer className="h-4 w-4" /> Imprimir PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x bg-card rounded-lg border shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-medium text-muted-foreground">Total de Proventos</span>
              <span className="text-base font-bold text-green-600">
                {formatCurrency(totalProventos)}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-medium text-muted-foreground">Total de Descontos</span>
              <span className="text-base font-bold text-red-600">
                {formatCurrency(totalDescontos)}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/10">
              <span className="text-sm font-medium text-muted-foreground">Valor Líquido Total</span>
              <span className="text-base font-bold">{formatCurrency(netTotal)}</span>
            </div>
          </div>
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

        <div className="flex-1 flex flex-col min-h-0 bg-card border print:border-none print:bg-transparent rounded-lg print:rounded-none overflow-hidden relative print:block print:overflow-visible">
          {isLoading ? (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center print-hidden">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Carregando fechamento...</span>
              </div>
            </div>
          ) : null}

          <Table
            wrapperClassName="flex-1 overflow-auto scrollbar-thin print:overflow-visible"
            className="whitespace-nowrap text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3.5"
          >
            <TableHeader className="sticky top-0 z-20 bg-muted shadow-sm print:static print:bg-transparent print:shadow-none">
              <TableRow className="hover:bg-transparent print:border-b-2 print:border-black">
                <TableHead className="min-w-[200px] print:min-w-0 sticky left-0 top-0 z-30 bg-muted border-r print:border-none print:shadow-none print:bg-transparent">
                  Funcionário
                </TableHead>
                {ALL_PROVENTOS.map((cat) => (
                  <TableHead key={cat} className="text-right min-w-[100px] print:min-w-0">
                    {CAT_LABELS[cat] || cat}
                  </TableHead>
                ))}
                <TableHead className="text-right min-w-[120px] print:min-w-0 font-bold text-green-700 bg-green-50 print:bg-transparent">
                  T. Proventos
                </TableHead>
                {ALL_DESCONTOS.map((cat) => (
                  <TableHead key={cat} className="text-right min-w-[100px] print:min-w-0">
                    {CAT_LABELS[cat] || cat}
                  </TableHead>
                ))}
                <TableHead className="text-right min-w-[120px] print:min-w-0 font-bold text-red-700 bg-red-50 print:bg-transparent">
                  T. Descontos
                </TableHead>
                <TableHead className="text-right min-w-[130px] print:min-w-0 font-bold bg-muted print:bg-transparent sticky right-0 top-0 z-30 border-l print:border-none print:shadow-none">
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
                  <TableRow key={sum.employeeId} className="zebra-row transition-colors group">
                    <TableCell className="font-medium sticky left-0 z-10 bg-inherit border-r print:border-none print:static print:bg-transparent">
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
                    <TableCell className="text-right font-semibold text-green-600 print:text-black bg-green-50/50 group-hover:bg-green-100/50 print:bg-transparent">
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
                    <TableCell className="text-right font-semibold text-red-600 print:text-black bg-red-50/50 group-hover:bg-red-100/50 print:bg-transparent">
                      {formatCurrency(sum.totalDescontos)}
                    </TableCell>
                    <TableCell className="text-right font-bold print:text-black bg-inherit sticky right-0 z-10 border-l print:border-none print:static print:bg-transparent">
                      {formatCurrency(sum.netTotal)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
