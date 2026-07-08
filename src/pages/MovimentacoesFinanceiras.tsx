import { useState, useMemo, useCallback, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { usePeriod } from '@/hooks/use-period'
import { PeriodSelector } from '@/components/PeriodSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calculator, ChevronDown, Download, Loader2, Search, Building2 } from 'lucide-react'
import { formatCurrency, formatMonthYear } from '@/lib/format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const EARNING_CATEGORIES = [
  'commission',
  'bonus',
  'additional',
  'overtime',
  'base_net',
  'other_addition',
]

const DEDUCTION_CATEGORIES = [
  'pharmacy_discount',
  'advance',
  'cash_shortage',
  'negative_hours',
  'partner_agreement',
  'store_agreement',
  'other_discount',
  'market_voucher',
]

const CATEGORY_LABELS: Record<string, string> = {
  commission: 'Comissão',
  bonus: 'Bônus',
  additional: 'Adicional',
  overtime: 'Hora Extra',
  base_net: 'Salário Líquido',
  other_addition: 'Outros Acréscimos',
  other: 'Outro',
  pharmacy_discount: 'Farmácia',
  advance: 'Adiantamento',
  cash_shortage: 'Furo de Caixa',
  negative_hours: 'Horas Negativas',
  partner_agreement: 'Convênio Parceiro',
  store_agreement: 'Convênio Loja',
  other_discount: 'Outros Descontos',
  market_voucher: 'Vale Mercado',
}

const getEntryType = (category: string): 'provento' | 'desconto' | 'outro' => {
  if (EARNING_CATEGORIES.includes(category)) return 'provento'
  if (DEDUCTION_CATEGORIES.includes(category)) return 'desconto'
  return 'outro'
}

interface PayrollEntry {
  id: string
  employee_id: string
  company_id: string
  category: string
  amount: number
  entry_date: string
  description: string
  quantity: number
  expand?: {
    employee_id?: { name: string; role?: string }
    company_id?: { name: string }
  }
}

interface Company {
  id: string
  name: string
}

export default function MovimentacoesFinanceiras() {
  const { user } = useAuth()
  const { selectedMonth } = usePeriod()

  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false)
  const [entries, setEntries] = useState<PayrollEntry[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [companiesLoading, setCompaniesLoading] = useState(true)
  const [updateTrigger, setUpdateTrigger] = useState(0)

  useEffect(() => {
    const loadCompanies = async () => {
      if (!user) return
      try {
        const comps = await pb.collection('companies').getFullList({ sort: 'name' })
        const mapped = comps.map((c) => ({ id: c.id, name: c.name }))
        setCompanies(mapped)
        if (user.role !== 'admin' && user.company_id) {
          setSelectedCompanyIds([user.company_id])
        } else {
          setSelectedCompanyIds(mapped.map((c) => c.id))
        }
      } catch (err) {
        console.error(err)
        toast.error('Erro ao carregar empresas.')
      } finally {
        setCompaniesLoading(false)
      }
    }
    loadCompanies()
  }, [user, updateTrigger])

  const loadEntries = useCallback(async () => {
    if (!selectedMonth || selectedCompanyIds.length === 0) {
      setEntries([])
      return
    }
    setIsLoading(true)
    try {
      const [year, month] = selectedMonth.split('-')
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const startDate = `${selectedMonth}-01 00:00:00`
      const endDate = `${selectedMonth}-${lastDay} 23:59:59`
      const companyFilter = selectedCompanyIds.map((id) => `company_id = '${id}'`).join(' || ')

      const filter = `(${companyFilter}) && entry_date >= '${startDate}' && entry_date <= '${endDate}'`

      const records = await pb.collection('payroll_entries').getFullList({
        filter,
        expand: 'employee_id,company_id',
        sort: 'entry_date,-created',
      })
      setEntries(records as unknown as PayrollEntry[])
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar lançamentos.', {
        description: 'Verifique sua conexão e tente novamente.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [selectedMonth, selectedCompanyIds])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const realtimeTimeoutRef = useState<ReturnType<typeof setTimeout> | null>(null)[0]
  const timeoutRef = useMemo(() => ({ current: realtimeTimeoutRef }), [realtimeTimeoutRef])

  const triggerRefresh = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setUpdateTrigger((p) => p + 1)
    }, 500)
  }, [timeoutRef])

  useRealtime('payroll_entries', triggerRefresh)
  useRealtime('companies', triggerRefresh)
  useRealtime('employees', triggerRefresh)

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return entries
    return entries.filter((e) => {
      const empName = e.expand?.employee_id?.name || ''
      const compName = e.expand?.company_id?.name || ''
      const catLabel = CATEGORY_LABELS[e.category] || e.category
      return (
        empName.toLowerCase().includes(query) ||
        compName.toLowerCase().includes(query) ||
        catLabel.toLowerCase().includes(query) ||
        (e.description || '').toLowerCase().includes(query)
      )
    })
  }, [entries, search])

  const totals = useMemo(() => {
    let proventos = 0
    let descontos = 0
    filteredEntries.forEach((e) => {
      const type = getEntryType(e.category)
      if (type === 'provento') proventos += e.amount || 0
      else if (type === 'desconto') descontos += e.amount || 0
    })
    return {
      proventos,
      descontos,
      net: proventos - descontos,
    }
  }, [filteredEntries])

  const toggleCompany = (id: string) => {
    setSelectedCompanyIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const selectAllCompanies = () => {
    setSelectedCompanyIds(companies.map((c) => c.id))
  }

  const clearCompanies = () => {
    setSelectedCompanyIds([])
  }

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return
    const headers = ['Funcionário', 'Empresa', 'Categoria', 'Data', 'Tipo', 'Descrição', 'Valor']
    const rows = filteredEntries.map((e) => {
      const type = getEntryType(e.category)
      const typeLabel =
        type === 'provento' ? 'Provento' : type === 'desconto' ? 'Desconto' : 'Outro'
      return [
        `"${e.expand?.employee_id?.name || 'N/A'}"`,
        `"${e.expand?.company_id?.name || 'N/A'}"`,
        `"${CATEGORY_LABELS[e.category] || e.category}"`,
        `"${e.entry_date.split(' ')[0]}"`,
        `"${typeLabel}"`,
        `"${(e.description || '').replace(/"/g, '""')}"`,
        `"${(e.amount || 0).toFixed(2).replace('.', ',')}"`,
      ]
    })
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `movimentacoes_financeiras_${selectedMonth}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const selectedCompaniesLabel = useMemo(() => {
    if (selectedCompanyIds.length === 0) return 'Selecione empresas...'
    if (selectedCompanyIds.length === companies.length) return 'Todas as empresas'
    if (selectedCompanyIds.length === 1) {
      const c = companies.find((c) => c.id === selectedCompanyIds[0])
      return c?.name || '1 empresa'
    }
    return `${selectedCompanyIds.length} empresas selecionadas`
  }, [selectedCompanyIds, companies])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-black">Esfhera Folhas</h1>
            <p className="text-muted-foreground">
              Movimentações Financeiras — Auditoria de proventos e descontos por empresa e período.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end justify-between">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Período</label>
                <PeriodSelector />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Empresas</label>
                <Popover open={companyPopoverOpen} onOpenChange={setCompanyPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={companyPopoverOpen}
                      className="w-[280px] justify-between font-normal"
                    >
                      <span className="truncate flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        {selectedCompaniesLabel}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <div className="flex items-center justify-between px-3 py-2 border-b">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllCompanies}
                        className="h-7 text-xs"
                      >
                        Selecionar todas
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCompanies}
                        className="h-7 text-xs text-muted-foreground"
                      >
                        Limpar
                      </Button>
                    </div>
                    <div className="max-h-[260px] overflow-auto py-1">
                      {companies.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                          Nenhuma empresa cadastrada.
                        </div>
                      ) : (
                        companies.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                          >
                            <Checkbox
                              checked={selectedCompanyIds.includes(c.id)}
                              onCheckedChange={() => toggleCompany(c.id)}
                            />
                            <span className="text-sm">{c.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Funcionário, empresa, categoria..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex h-9 w-[260px] rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>
            <Button
              onClick={handleExportCSV}
              disabled={filteredEntries.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Proventos</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(totals.proventos)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
              <span className="text-emerald-600 font-bold text-lg">+</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-rose-200 dark:border-rose-900/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Descontos</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {formatCurrency(totals.descontos)}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center">
              <span className="text-rose-600 font-bold text-lg">−</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Líquido Total</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(totals.net)}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0 relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Carregando lançamentos...</span>
              </div>
            </div>
          )}
          {!isLoading && selectedCompanyIds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-lg font-medium">Selecione ao menos uma empresa</p>
              <p className="text-sm text-muted-foreground mt-1">
                Use o filtro de empresas acima para visualizar as movimentações financeiras.
              </p>
            </div>
          ) : !isLoading && filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-lg font-medium">Nenhum registro encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Não há lançamentos para os filtros selecionados em {formatMonthYear(selectedMonth)}.
              </p>
            </div>
          ) : (
            <Table
              wrapperClassName="max-h-[calc(100vh-440px)] overflow-auto scrollbar-thin"
              className="min-w-[900px]"
            >
              <TableHeader className="bg-muted sticky top-0 z-20">
                <TableRow>
                  <TableHead className="min-w-[180px]">Funcionário</TableHead>
                  <TableHead className="min-w-[140px]">Empresa</TableHead>
                  <TableHead className="min-w-[140px]">Categoria</TableHead>
                  <TableHead className="min-w-[110px]">Data</TableHead>
                  <TableHead className="min-w-[120px]">Tipo</TableHead>
                  <TableHead className="text-right min-w-[130px]">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => {
                  const type = getEntryType(entry.category)
                  const typeLabel =
                    type === 'provento' ? 'Provento' : type === 'desconto' ? 'Desconto' : 'Outro'
                  return (
                    <TableRow key={entry.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div>{entry.expand?.employee_id?.name || 'N/A'}</div>
                        {entry.expand?.employee_id?.role && (
                          <div className="text-xs text-muted-foreground">
                            {entry.expand.employee_id.role}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.expand?.company_id?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {CATEGORY_LABELS[entry.category] || entry.category}
                        </span>
                        {entry.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {entry.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.entry_date.split(' ')[0].split('-').reverse().join('/')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-medium',
                            type === 'provento' &&
                              'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400',
                            type === 'desconto' &&
                              'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400',
                            type === 'outro' && 'border-muted bg-muted/50 text-muted-foreground',
                          )}
                        >
                          {typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-semibold',
                          type === 'provento' && 'text-emerald-600',
                          type === 'desconto' && 'text-rose-600',
                        )}
                      >
                        {type === 'desconto' ? '−' : type === 'provento' ? '+' : ''}
                        {formatCurrency(entry.amount || 0)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
