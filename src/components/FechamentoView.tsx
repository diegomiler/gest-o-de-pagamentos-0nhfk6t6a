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
import { format } from 'date-fns'
import { toast } from 'sonner'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'

const ALL_PROVENTOS = [
  'base_net',
  'overtime',
  'commission',
  'bonus',
  'additional',
  'other_addition',
  'other',
]

const ALL_DESCONTOS = [
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

  const { totalProventos, totalDescontos, netTotal } = useMemo(() => {
    let proventos = 0
    let descontos = 0

    entries.forEach((entry) => {
      if (isProvento(entry.category)) {
        proventos += entry.amount
      } else if (isDesconto(entry.category)) {
        descontos += entry.amount
      }
    })

    return {
      totalProventos: proventos,
      totalDescontos: descontos,
      netTotal: proventos - descontos,
    }
  }, [entries])

  const handlePrint = () => window.print()

  const handleExportCSV = () => {
    if (!activeCompany || entries.length === 0) return

    const headers = ['Funcionário', 'Categoria', 'Data', 'Quantidade', 'Valor', 'Descrição', 'Tipo']

    const rows = entries.map((entry) => {
      const empName = entry.expand?.employee_id?.name || 'N/A'
      const catLabel = CAT_LABELS[entry.category] || entry.category
      const date = entry.entry_date ? format(new Date(entry.entry_date), 'dd/MM/yyyy') : ''
      const qtd =
        entry.quantity !== null && entry.quantity !== undefined ? entry.quantity.toString() : ''
      const desc = entry.description || ''
      const type = isProvento(entry.category)
        ? 'Provento'
        : isDesconto(entry.category)
          ? 'Desconto'
          : 'Outro'
      const val = entry.amount.toFixed(2).replace('.', ',')

      return [
        `"${empName}"`,
        `"${catLabel}"`,
        `"${date}"`,
        `"${qtd}"`,
        `"${val}"`,
        `"${desc}"`,
        `"${type}"`,
      ]
    })

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
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
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
            font-size: 10pt !important;
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
          tr { page-break-inside: avoid; page-break-after: auto; }
          th, td { 
            padding: 4px 8px !important; 
            border-bottom: 1px solid #ddd;
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
              disabled={entries.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
            <Button onClick={handlePrint} disabled={entries.length === 0} className="gap-2">
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
            <h2 className="text-2xl font-bold uppercase tracking-wide">Relatório de Fechamento</h2>
            <p className="text-base text-gray-800 mt-2">
              Referência: {formatMonthYear(selectedMonth)}
            </p>
            {activeCompany && (
              <div className="mt-2 text-gray-800">
                <p className="font-bold text-lg">{activeCompany.name}</p>
                <p className="text-sm">
                  CNPJ: {activeCompany.cnpj ? formatCNPJ(activeCompany.cnpj) : 'N/A'}
                </p>
              </div>
            )}

            <div className="flex gap-8 mt-6">
              <div>
                <p className="text-sm text-gray-600">Total Proventos</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(totalProventos)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Descontos</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(totalDescontos)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Líquido Total</p>
                <p className="text-lg font-bold">{formatCurrency(netTotal)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-card border print:border-none print:bg-transparent rounded-lg print:rounded-none overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center print-hidden">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Carregando lançamentos...</span>
              </div>
            </div>
          ) : null}

          <div className="flex-1 overflow-auto print:overflow-visible">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm print:bg-transparent z-10 shadow-sm">
                <TableRow className="print:border-b-2 print:border-black">
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 && !isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum lançamento encontrado para esta empresa e período.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => {
                    const isProv = isProvento(entry.category)
                    const isDesc = isDesconto(entry.category)

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.expand?.employee_id?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isProv
                                ? 'bg-green-100 text-green-700 print:bg-transparent print:text-black'
                                : isDesc
                                  ? 'bg-red-100 text-red-700 print:bg-transparent print:text-black'
                                  : 'bg-gray-100 text-gray-700 print:bg-transparent print:text-black'
                            }`}
                          >
                            {CAT_LABELS[entry.category] || entry.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground print:text-black">
                          {entry.entry_date
                            ? format(new Date(entry.entry_date), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground print:text-black">
                          {entry.quantity !== null && entry.quantity !== undefined
                            ? entry.quantity
                            : '-'}
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            isProv
                              ? 'text-green-600 print:text-black'
                              : isDesc
                                ? 'text-red-600 print:text-black'
                                : ''
                          }`}
                        >
                          {isDesc ? '-' : ''}
                          {formatCurrency(entry.amount)}
                        </TableCell>
                        <TableCell
                          className="text-muted-foreground max-w-[200px] truncate print:whitespace-normal print:text-black"
                          title={entry.description}
                        >
                          {entry.description || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  )
}
