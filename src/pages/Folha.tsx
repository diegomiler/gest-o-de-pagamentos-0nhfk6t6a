import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatCurrency,
  parseInputValue,
  timeToDecimal,
  decimalToTime,
  formatTimeOnBlur,
} from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import { Save, MessageSquareText, Eraser, Lock, Unlock } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { ClientResponseError } from 'pocketbase'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { usePeriod } from '@/hooks/use-period'
import { PeriodSelector } from '@/components/PeriodSelector'

function EntryInput({
  value,
  onChange,
  descValue,
  onDescChange,
  disabled,
}: {
  value: string | number
  onChange: (val: string) => void
  descValue: string
  onDescChange: (val: string) => void
  disabled?: boolean
}) {
  return (
    <div className="relative flex items-center ml-auto w-[110px]">
      <Input
        type="number"
        min="0"
        step="0.01"
        className="text-right h-8 w-full pr-8"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              descValue ? 'text-blue-500' : 'text-muted-foreground hover:text-foreground',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            disabled={disabled}
          >
            <MessageSquareText className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" side="left">
          <Textarea
            placeholder="Adicionar nota/histórico..."
            value={descValue || ''}
            onChange={(e) => onDescChange(e.target.value)}
            className="min-h-[80px] text-sm"
            disabled={disabled}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function calculateOvertimeValue(
  base_salary: number,
  hours: number,
  company_id: string,
  companies: any[],
) {
  const company = companies.find((c) => c.id === company_id)
  const config = company?.overtime_config || []

  if (config.length === 0 || hours === 0) {
    return (base_salary / 30 / 7.33) * 1.5 * hours
  }

  const sortedBrackets = [...config].sort((a, b) => {
    if (a.limit === null) return 1
    if (b.limit === null) return -1
    return a.limit - b.limit
  })

  let totalValue = 0
  const hourlyRate = base_salary / 30 / 7.33
  let previousLimit = 0

  for (const bracket of sortedBrackets) {
    if (hours <= previousLimit) break

    const multiplier = 1 + bracket.percentage / 100
    let hoursInBracket = hours - previousLimit

    if (bracket.limit !== null) {
      hoursInBracket = Math.min(hours - previousLimit, bracket.limit - previousLimit)
    }

    if (hoursInBracket > 0) {
      totalValue += hourlyRate * multiplier * hoursInBracket
    }

    if (bracket.limit !== null) {
      previousLimit = bracket.limit
    } else {
      break
    }
  }

  return totalValue
}

export default function Folha() {
  const { toast } = useToast()
  const { user, signOut } = useAuth()
  const { selectedMonth } = usePeriod()
  const invalidCompanyIdRef = useRef<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [employees, setEmployees] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [payrollPeriod, setPayrollPeriod] = useState<any>(null)

  const loadPeriod = async (companyIdToLoad: string) => {
    if (!companyIdToLoad) return
    const [year, month] = selectedMonth.split('-')
    try {
      const record = await pb
        .collection('payroll_periods')
        .getFirstListItem(
          `company_id = '${companyIdToLoad}' && month = ${Number(month)} && year = ${Number(year)}`,
        )
      setPayrollPeriod(record)
    } catch {
      setPayrollPeriod(null)
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [emps, comps] = await Promise.all([
        pb.collection('employees').getFullList({ sort: 'name' }),
        pb.collection('companies').getFullList(),
      ])
      setEmployees(emps)
      setCompanies(comps)

      if (user?.company_id && user.id && user.company_id !== invalidCompanyIdRef.current) {
        const userCompanyExists = comps.some((c) => c.id === user.company_id)
        if (!userCompanyExists) {
          invalidCompanyIdRef.current = user.company_id
          try {
            await pb.collection('users').update(user.id, { company_id: null })
          } catch (updateErr: any) {
            if (updateErr instanceof ClientResponseError && updateErr.status === 404) {
              signOut()
            }
          }
        }
      }

      let activeCompanyId = selectedCompanyId
      if (!activeCompanyId) {
        if (
          user?.role !== 'admin' &&
          user?.company_id &&
          user.company_id !== invalidCompanyIdRef.current
        ) {
          activeCompanyId = user.company_id
        } else if (comps.length > 0) {
          activeCompanyId = comps[0].id
        }
        if (activeCompanyId) {
          setSelectedCompanyId(activeCompanyId)
          return
        }
      }

      if (activeCompanyId) {
        await loadPeriod(activeCompanyId)

        const startDate = `${selectedMonth}-01 00:00:00`
        const endDate = `${selectedMonth}-31 23:59:59`
        const fetchedEntries = await pb.collection('payroll_entries').getFullList({
          filter: `entry_date >= '${startDate}' && entry_date <= '${endDate}' && company_id = '${activeCompanyId}'`,
        })

        const activeEmployees = emps.filter(
          (e) => e.status !== 'inactive' && e.company_id === activeCompanyId,
        )
        const merged = activeEmployees.map((emp) => {
          const empEntries = fetchedEntries.filter((e) => e.employee_id === emp.id)
          let commissions = 0,
            bonuses = 0,
            pharmacy = 0,
            advances = 0,
            overtime_hours = 0,
            base_net = 0,
            cash_shortage = 0,
            negative_hours = 0,
            partner_agreement = 0,
            store_agreement = 0,
            other_discount = 0,
            other_addition = 0

          let cash_shortage_desc = '',
            negative_hours_desc = '',
            partner_agreement_desc = '',
            store_agreement_desc = '',
            other_discount_desc = '',
            other_addition_desc = ''

          empEntries.forEach((e) => {
            if (e.category === 'commission') commissions += e.amount
            if (e.category === 'bonus') bonuses += e.amount
            if (e.category === 'pharmacy_discount') pharmacy += e.amount
            if (e.category === 'advance') advances += e.amount
            if (e.category === 'overtime') overtime_hours += e.quantity || 0
            if (e.category === 'base_net') base_net += e.amount
            if (e.category === 'cash_shortage') {
              cash_shortage += e.amount
              cash_shortage_desc = e.description || ''
            }
            if (e.category === 'negative_hours') {
              negative_hours += e.amount
              negative_hours_desc = e.description || ''
            }
            if (e.category === 'partner_agreement') {
              partner_agreement += e.amount
              partner_agreement_desc = e.description || ''
            }
            if (e.category === 'store_agreement') {
              store_agreement += e.amount
              store_agreement_desc = e.description || ''
            }
            if (e.category === 'other_discount') {
              other_discount += e.amount
              other_discount_desc = e.description || ''
            }
            if (e.category === 'other_addition') {
              other_addition += e.amount
              other_addition_desc = e.description || ''
            }
          })

          return {
            employee_id: emp.id,
            commissions,
            bonuses,
            pharmacy,
            advances,
            overtime_hours,
            overtime_hours_str: decimalToTime(overtime_hours),
            base_net: base_net || 0,
            cash_shortage,
            cash_shortage_desc,
            negative_hours,
            negative_hours_desc,
            partner_agreement,
            partner_agreement_desc,
            store_agreement,
            store_agreement_desc,
            other_discount,
            other_discount_desc,
            other_addition,
            other_addition_desc,
          }
        })

        setEntries(merged)
      } else {
        setEntries([])
        setPayrollPeriod(null)
      }
    } catch {
      /* intentionally ignored */
    } finally {
      setIsLoading(false)
    }
  }

  const userId = user?.id
  const userRole = user?.role
  const userCompanyId = user?.company_id

  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedCompanyId, userId, userRole, userCompanyId])

  const debouncedLoadDataRef = useRef<() => void>(() => {})
  const debouncedLoadPeriodRef = useRef<() => void>(() => {})

  useEffect(() => {
    debouncedLoadDataRef.current = loadData
    debouncedLoadPeriodRef.current = () => {
      if (selectedCompanyId) loadPeriod(selectedCompanyId)
    }
  })

  const realtimeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRealtimeRefresh = useCallback(() => {
    if (realtimeTimeoutRef.current) clearTimeout(realtimeTimeoutRef.current)
    realtimeTimeoutRef.current = setTimeout(() => {
      debouncedLoadDataRef.current()
    }, 500)
  }, [])

  const periodTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerPeriodRefresh = useCallback(() => {
    if (periodTimeoutRef.current) clearTimeout(periodTimeoutRef.current)
    periodTimeoutRef.current = setTimeout(() => {
      debouncedLoadPeriodRef.current()
    }, 500)
  }, [])

  useRealtime('employees', triggerRealtimeRefresh)
  useRealtime('payroll_entries', triggerRealtimeRefresh)
  useRealtime('companies', triggerRealtimeRefresh)
  useRealtime('payroll_periods', triggerPeriodRefresh)

  const isClosed = payrollPeriod?.status === 'closed'

  const handleInputChange = (
    employee_id: string,
    field: string,
    value: string,
    isString = false,
  ) => {
    if (isClosed) return

    if (field === 'overtime_hours_str') {
      const decimal = timeToDecimal(value)
      setEntries((prev) =>
        prev.map((e) =>
          e.employee_id === employee_id
            ? { ...e, overtime_hours_str: value, overtime_hours: decimal }
            : e,
        ),
      )
      return
    }

    if (isString) {
      setEntries((prev) =>
        prev.map((e) => (e.employee_id === employee_id ? { ...e, [field]: value } : e)),
      )
      return
    }

    const num = parseInputValue(value)
    setEntries((prev) =>
      prev.map((e) => (e.employee_id === employee_id ? { ...e, [field]: num } : e)),
    )
  }

  const handleClearAll = () => {
    if (isClosed) return
    setEntries((prev) =>
      prev.map((e) => ({
        ...e,
        commissions: 0,
        bonuses: 0,
        pharmacy: 0,
        advances: 0,
        overtime_hours: 0,
        overtime_hours_str: '',
        cash_shortage: 0,
        cash_shortage_desc: '',
        negative_hours: 0,
        negative_hours_desc: '',
        partner_agreement: 0,
        partner_agreement_desc: '',
        store_agreement: 0,
        store_agreement_desc: '',
        other_discount: 0,
        other_discount_desc: '',
        other_addition: 0,
        other_addition_desc: '',
      })),
    )
    toast({
      title: 'Valores limpos',
      description: 'Todos os valores da grade (exceto salário líquido) foram zerados.',
    })
  }

  const handleTogglePeriod = async () => {
    if (!selectedCompanyId) return
    const [year, month] = selectedMonth.split('-')
    const newStatus = isClosed ? 'open' : 'closed'
    try {
      await pb.send('/backend/v1/payroll-periods/toggle', {
        method: 'POST',
        body: JSON.stringify({
          company_id: selectedCompanyId,
          month: Number(month),
          year: Number(year),
          status: newStatus,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      toast({ title: `Período ${newStatus === 'closed' ? 'fechado' : 'aberto'} com sucesso.` })
      loadPeriod(selectedCompanyId)
    } catch (err: any) {
      toast({ title: 'Erro ao alterar status', description: err.message, variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    if (isClosed) return
    try {
      const sanitizedEntries = entries.map((entry) => {
        const emp = employees.find((e) => e.id === entry.employee_id)
        const overtime_amount = emp
          ? calculateOvertimeValue(
              emp.base_salary,
              entry.overtime_hours || 0,
              emp.company_id,
              companies,
            )
          : 0

        return {
          ...entry,
          company_id: emp?.company_id,
          base_net: Number(entry.base_net) || 0,
          commissions: Number(entry.commissions) || 0,
          bonuses: Number(entry.bonuses) || 0,
          pharmacy: Number(entry.pharmacy) || 0,
          advances: Number(entry.advances) || 0,
          cash_shortage: Number(entry.cash_shortage) || 0,
          negative_hours: Number(entry.negative_hours) || 0,
          partner_agreement: Number(entry.partner_agreement) || 0,
          store_agreement: Number(entry.store_agreement) || 0,
          other_discount: Number(entry.other_discount) || 0,
          other_addition: Number(entry.other_addition) || 0,
          overtime_hours: Number(entry.overtime_hours) || 0,
          overtime_amount,
        }
      })

      await pb.send('/backend/v1/payroll/sync', {
        method: 'POST',
        body: JSON.stringify({ month: selectedMonth, entries: sanitizedEntries }),
        headers: { 'Content-Type': 'application/json' },
      })
      toast({ title: 'Folha Salva', description: `Folha de ${selectedMonth} salva com sucesso.` })
      await loadData()
    } catch (err: any) {
      const isNetwork = err.status === 0
      const isServer = err.status >= 500

      let detailMessage = ''
      const data = err.response?.data
      if (data && typeof data === 'object') {
        detailMessage = Object.entries(data)
          .map(([key, val]: any) => `${key}: ${val.message}`)
          .join('\n')
      }

      toast({
        title: 'Erro',
        description: isNetwork
          ? 'Erro de conexão. Verifique sua internet.'
          : isServer
            ? 'Erro interno no servidor.'
            : detailMessage ||
              'Não foi possível salvar a folha. Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const totals = entries.reduce(
    (acc, entry) => {
      const emp = employees.find((e) => e.id === entry.employee_id)
      if (!emp) return acc
      const overtimeValue = calculateOvertimeValue(
        emp.base_salary,
        entry.overtime_hours || 0,
        emp.company_id,
        companies,
      )
      const currentAdditions = entry.commissions + entry.bonuses + (entry.other_addition || 0)
      const currentDeductions =
        entry.pharmacy +
        entry.advances +
        (entry.cash_shortage || 0) +
        (entry.negative_hours || 0) +
        (entry.partner_agreement || 0) +
        (entry.store_agreement || 0) +
        (entry.other_discount || 0)

      acc.base += entry.base_net || 0
      acc.additional += emp.additional_amount || 0
      acc.overtime += overtimeValue
      acc.overtime_hours += entry.overtime_hours || 0
      acc.additions += currentAdditions
      acc.deductions += currentDeductions
      acc.net +=
        (entry.base_net || 0) +
        (emp.additional_amount || 0) +
        overtimeValue +
        currentAdditions -
        currentDeductions

      acc.commissions += entry.commissions || 0
      acc.bonuses += entry.bonuses || 0
      acc.other_addition += entry.other_addition || 0
      acc.pharmacy += entry.pharmacy || 0
      acc.advances += entry.advances || 0
      acc.cash_shortage += entry.cash_shortage || 0
      acc.negative_hours += entry.negative_hours || 0
      acc.partner_agreement += entry.partner_agreement || 0
      acc.store_agreement += entry.store_agreement || 0
      acc.other_discount += entry.other_discount || 0

      return acc
    },
    {
      base: 0,
      additional: 0,
      overtime: 0,
      overtime_hours: 0,
      additions: 0,
      deductions: 0,
      net: 0,
      commissions: 0,
      bonuses: 0,
      other_addition: 0,
      pharmacy: 0,
      advances: 0,
      cash_shortage: 0,
      negative_hours: 0,
      partner_agreement: 0,
      store_agreement: 0,
      other_discount: 0,
    },
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Lançamentos da Folha</h2>
          <p className="text-muted-foreground">
            Registre comissões, horas extras e descontos mensais.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={selectedCompanyId}
            onValueChange={setSelectedCompanyId}
            disabled={user?.role !== 'admin'}
          >
            <SelectTrigger className="w-[200px] bg-card">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PeriodSelector />
          <Button
            variant={isClosed ? 'outline' : 'secondary'}
            onClick={handleTogglePeriod}
            className="gap-2"
          >
            {isClosed ? (
              <>
                <Unlock className="h-4 w-4" /> Abrir Período
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Fechar Período
              </>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 text-muted-foreground hover:text-foreground"
                disabled={isClosed}
              >
                <Eraser className="h-4 w-4" /> Limpar Valores
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar todos os valores?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja zerar todos os valores (horas extras, comissões, descontos)
                  desta folha na tela atual? O salário líquido não será afetado. Lembre-se de salvar
                  a folha após limpar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAll}>Confirmar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSave} className="gap-2" disabled={isClosed}>
            <Save className="h-4 w-4" /> Salvar Folha
          </Button>
        </div>
      </div>

      {isClosed && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-900/50 dark:text-rose-200">
          <Lock className="h-5 w-5" />
          <div>
            <h4 className="font-semibold text-sm">Período Fechado para Edição</h4>
            <p className="text-sm opacity-90">
              Este período de folha foi finalizado. Nenhuma alteração de lançamentos pode ser feita.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[200px] sticky left-0 z-20 bg-muted shadow-[1px_0_0_0_#e5e7eb]">
                  Funcionário
                </TableHead>
                <TableHead className="text-right">Salário Líq.</TableHead>
                <TableHead className="text-right">Adicional Fix.</TableHead>
                <TableHead className="text-right text-emerald-600">Hrs Extras</TableHead>
                <TableHead className="text-right text-emerald-600">Val. Extras</TableHead>
                <TableHead className="text-right text-emerald-600">Comissões (+)</TableHead>
                <TableHead className="text-right text-emerald-600">Bônus (+)</TableHead>
                <TableHead className="text-right text-emerald-600">Outros Acrésc. (+)</TableHead>
                <TableHead className="text-right text-rose-600">Farmácia (-)</TableHead>
                <TableHead className="text-right text-rose-600">Vales (-)</TableHead>
                <TableHead className="text-right text-rose-600">Furo de Caixa (-)</TableHead>
                <TableHead className="text-right text-rose-600">Horas Neg. (-)</TableHead>
                <TableHead className="text-right text-rose-600">Conv. Parc. (-)</TableHead>
                <TableHead className="text-right text-rose-600">Conv. Loja (-)</TableHead>
                <TableHead className="text-right text-rose-600">Outros Desc. (-)</TableHead>
                <TableHead className="text-right font-bold bg-muted sticky right-0 shadow-[-1px_0_0_0_#e5e7eb] z-20">
                  Líquido
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const emp = employees.find((e) => e.id === entry.employee_id)
                if (!emp) return null
                const overtimeValue = calculateOvertimeValue(
                  emp.base_salary,
                  entry.overtime_hours || 0,
                  emp.company_id,
                  companies,
                )
                const totalAdditions =
                  (entry.base_net || 0) +
                  (emp.additional_amount || 0) +
                  overtimeValue +
                  entry.commissions +
                  entry.bonuses +
                  (entry.other_addition || 0)
                const totalDeductions =
                  entry.pharmacy +
                  entry.advances +
                  (entry.cash_shortage || 0) +
                  (entry.negative_hours || 0) +
                  (entry.partner_agreement || 0) +
                  (entry.store_agreement || 0) +
                  (entry.other_discount || 0)
                const net = totalAdditions - totalDeductions

                return (
                  <TableRow key={entry.employee_id}>
                    <TableCell
                      className={cn(
                        'font-medium sticky left-0 z-10 shadow-[1px_0_0_0_#e5e7eb] bg-muted',
                      )}
                    >
                      <div>{emp.name}</div>
                      <div className="text-xs text-muted-foreground">{emp.role}</div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.base_net || ''}
                        onChange={(e) => handleInputChange(emp.id, 'base_net', e.target.value)}
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(emp.additional_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="00:00"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.overtime_hours_str || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d:]/g, '')
                          handleInputChange(emp.id, 'overtime_hours_str', val)
                        }}
                        onBlur={(e) => {
                          const val = e.target.value
                          if (val) {
                            const formatted = formatTimeOnBlur(val)
                            handleInputChange(emp.id, 'overtime_hours_str', formatted)
                          }
                        }}
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {formatCurrency(overtimeValue)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.commissions || ''}
                        onChange={(e) => handleInputChange(emp.id, 'commissions', e.target.value)}
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.bonuses || ''}
                        onChange={(e) => handleInputChange(emp.id, 'bonuses', e.target.value)}
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell>
                      <EntryInput
                        value={entry.other_addition}
                        onChange={(v) => handleInputChange(emp.id, 'other_addition', v)}
                        descValue={entry.other_addition_desc}
                        onDescChange={(v) =>
                          handleInputChange(emp.id, 'other_addition_desc', v, true)
                        }
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.pharmacy || ''}
                        onChange={(e) => handleInputChange(emp.id, 'pharmacy', e.target.value)}
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right h-8 w-24 ml-auto"
                        value={entry.advances || ''}
                        onChange={(e) => handleInputChange(emp.id, 'advances', e.target.value)}
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell>
                      <EntryInput
                        value={entry.cash_shortage}
                        onChange={(v) => handleInputChange(emp.id, 'cash_shortage', v)}
                        descValue={entry.cash_shortage_desc}
                        onDescChange={(v) =>
                          handleInputChange(emp.id, 'cash_shortage_desc', v, true)
                        }
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell>
                      <EntryInput
                        value={entry.negative_hours}
                        onChange={(v) => handleInputChange(emp.id, 'negative_hours', v)}
                        descValue={entry.negative_hours_desc}
                        onDescChange={(v) =>
                          handleInputChange(emp.id, 'negative_hours_desc', v, true)
                        }
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell>
                      <EntryInput
                        value={entry.partner_agreement}
                        onChange={(v) => handleInputChange(emp.id, 'partner_agreement', v)}
                        descValue={entry.partner_agreement_desc}
                        onDescChange={(v) =>
                          handleInputChange(emp.id, 'partner_agreement_desc', v, true)
                        }
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell>
                      <EntryInput
                        value={entry.store_agreement}
                        onChange={(v) => handleInputChange(emp.id, 'store_agreement', v)}
                        descValue={entry.store_agreement_desc}
                        onDescChange={(v) =>
                          handleInputChange(emp.id, 'store_agreement_desc', v, true)
                        }
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell>
                      <EntryInput
                        value={entry.other_discount}
                        onChange={(v) => handleInputChange(emp.id, 'other_discount', v)}
                        descValue={entry.other_discount_desc}
                        onDescChange={(v) =>
                          handleInputChange(emp.id, 'other_discount_desc', v, true)
                        }
                        disabled={isClosed}
                      />
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-bold sticky right-0 shadow-[-1px_0_0_0_#e5e7eb] z-10 bg-muted',
                      )}
                    >
                      {formatCurrency(net)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            <TableFooter className="bg-muted">
              <TableRow>
                <TableCell className="sticky left-0 z-20 bg-muted shadow-[1px_0_0_0_#e5e7eb] font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right">{formatCurrency(totals.base)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.additional)}</TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  {decimalToTime(totals.overtime_hours)}
                </TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  +{formatCurrency(totals.overtime)}
                </TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  +{formatCurrency(totals.commissions)}
                </TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  +{formatCurrency(totals.bonuses)}
                </TableCell>
                <TableCell className="text-right text-emerald-600 font-medium">
                  +{formatCurrency(totals.other_addition)}
                </TableCell>
                <TableCell className="text-right text-rose-600 font-medium">
                  -{formatCurrency(totals.pharmacy)}
                </TableCell>
                <TableCell className="text-right text-rose-600 font-medium">
                  -{formatCurrency(totals.advances)}
                </TableCell>
                <TableCell className="text-right text-rose-600 font-medium">
                  -{formatCurrency(totals.cash_shortage)}
                </TableCell>
                <TableCell className="text-right text-rose-600 font-medium">
                  -{formatCurrency(totals.negative_hours)}
                </TableCell>
                <TableCell className="text-right text-rose-600 font-medium">
                  -{formatCurrency(totals.partner_agreement)}
                </TableCell>
                <TableCell className="text-right text-rose-600 font-medium">
                  -{formatCurrency(totals.store_agreement)}
                </TableCell>
                <TableCell className="text-right text-rose-600 font-medium">
                  -{formatCurrency(totals.other_discount)}
                </TableCell>
                <TableCell className="text-right font-bold text-lg sticky right-0 bg-muted shadow-[-1px_0_0_0_#e5e7eb] z-20">
                  {formatCurrency(totals.net)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
