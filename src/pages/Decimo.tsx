import { Fragment, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Printer, Save, Search } from 'lucide-react'
import { useDecimoPayments, DecimoRow, installmentCompetency } from '@/hooks/useDecimoSalary'
import type { DecimoInstallment } from '@/services/decimo_payments'
import { useAuth } from '@/hooks/use-auth'
import { usePeriod } from '@/hooks/use-period'
import { PeriodSelector } from '@/components/PeriodSelector'
import { formatCurrency, formatMonthYear } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import { DecimoReceiptPrint } from '@/components/DecimoReceiptPrint'
import pb from '@/lib/pocketbase/client'

const PARCELS: { installment: DecimoInstallment; label: string }[] = [
  { installment: 'first', label: '1ª Parcela' },
  { installment: 'second', label: '2ª Parcela' },
]

/** Alvo de impressão: uma parcela inteira (todos) ou um funcionário numa parcela. */
interface PrintTarget {
  installment: DecimoInstallment
  employeeId: string | null
}

const parseNum = (v: string) => {
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export default function Decimo() {
  const { user } = useAuth()
  const { selectedMonth } = usePeriod()
  const { toast } = useToast()

  const [allEmployees, setAllEmployees] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)
  const [search, setSearch] = useState('')
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null)

  const isAdmin = user?.role === 'admin'

  // Lançamentos carregados em lote para a empresa exibida (seletor do admin ou própria empresa).
  const { rows, payments, isLoading, isSaving, updateRow, saveAll } = useDecimoPayments(
    selectedMonth,
    selectedCompanyId || undefined,
  )

  useEffect(() => {
    const load = async () => {
      setIsLoadingEmployees(true)
      try {
        const roleFilter =
          user?.role !== 'admin' && user?.company_id
            ? `company_id = '${user.company_id}'`
            : undefined
        const [emps, comps] = await Promise.all([
          pb.collection('employees').getFullList({ filter: roleFilter, sort: 'name' }),
          pb.collection('companies').getFullList(),
        ])
        setAllEmployees(emps)
        setCompanies(comps)
      } catch (err) {
        console.error('Erro ao carregar funcionários:', err)
      } finally {
        setIsLoadingEmployees(false)
      }
    }
    load()
  }, [user])

  // Empresa exibida: admin escolhe qualquer uma; demais usuários ficam na própria empresa.
  useEffect(() => {
    if (companies.length === 0) return
    const preferred = user?.company_id || ''
    if (!isAdmin && preferred) {
      setSelectedCompanyId(preferred)
      return
    }
    setSelectedCompanyId((prev) => {
      if (companies.some((c) => c.id === prev)) return prev
      if (companies.some((c) => c.id === preferred)) return preferred
      return companies[0].id
    })
  }, [companies, user, isAdmin])

  const company = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) || null,
    [companies, selectedCompanyId],
  )

  const employees = useMemo(
    () => (company ? allEmployees.filter((e) => e.company_id === company.id) : []),
    [allEmployees, company],
  )

  const year = parseInt(selectedMonth?.split('-')[0] || String(new Date().getFullYear()), 10)
  const compFirst = installmentCompetency(year, 'first')
  const compSecond = installmentCompetency(year, 'second')

  /** Lançamentos de UMA parcela de um funcionário (competência da própria parcela). */
  const receiptPaymentsFor = (employeeId: string, installment: DecimoInstallment) => {
    const comp = installmentCompetency(year, installment)
    return payments.filter(
      (p) =>
        p &&
        p.employee_id === employeeId &&
        p.installment === installment &&
        p.competency_month === comp,
    )
  }

  const hasReceipt = (employeeId: string, installment: DecimoInstallment) =>
    receiptPaymentsFor(employeeId, installment).length > 0

  const countWithReceipt = (installment: DecimoInstallment) =>
    employees.filter((emp) => hasReceipt(emp.id, installment)).length

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((emp) =>
      String(emp?.name || '')
        .toLowerCase()
        .includes(q),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, search])

  const rowTotal = (row: DecimoRow | undefined) => {
    if (!row) return 0
    return parseNum(row.amount) + parseNum(row.additional) + parseNum(row.other)
  }

  const totals = useMemo(
    () =>
      PARCELS.reduce(
        (acc, parcel) => {
          acc[parcel.installment] = employees.reduce(
            (sum, emp) => sum + rowTotal(rows[parcel.installment]?.[emp.id]),
            0,
          )
          return acc
        },
        { first: 0, second: 0 } as Record<DecimoInstallment, number>,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, employees],
  )

  // Recibos a imprimir: uma parcela (todos ou um funcionário). Só entram funcionários com lançamento nela.
  const printList = printTarget
    ? (printTarget.employeeId
        ? employees.filter((e) => e.id === printTarget.employeeId)
        : employees
      ).filter((e) => hasReceipt(e.id, printTarget.installment))
    : []

  // Dispara a impressão depois que a área de recibos foi renderizada e limpa o alvo.
  useEffect(() => {
    if (!printTarget) return
    const t = setTimeout(() => {
      window.print()
      setPrintTarget(null)
    }, 50)
    return () => clearTimeout(t)
  }, [printTarget])

  const handleSave = async () => {
    try {
      await saveAll(allEmployees)
      toast({ title: 'Sucesso', description: '13º salário salvo com sucesso.' })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao salvar o 13º salário.',
      })
    }
  }

  const parcelCells = (installment: DecimoInstallment, emp: any) => {
    const row = rows[installment]?.[emp.id]
    return (
      <>
        <TableCell className="p-1">
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={row?.amount ?? ''}
            onChange={(e) => updateRow(installment, emp.id, 'amount', e.target.value)}
          />
        </TableCell>
        <TableCell className="p-1">
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={row?.additional ?? ''}
            onChange={(e) => updateRow(installment, emp.id, 'additional', e.target.value)}
          />
        </TableCell>
        <TableCell className="p-1">
          <Input
            inputMode="decimal"
            placeholder="0,00"
            value={row?.other ?? ''}
            onChange={(e) => updateRow(installment, emp.id, 'other', e.target.value)}
          />
        </TableCell>
        <TableCell className="p-1">
          <Input
            placeholder="Histórico"
            value={row?.other_desc ?? ''}
            onChange={(e) => updateRow(installment, emp.id, 'other_desc', e.target.value)}
          />
        </TableCell>
        <TableCell className="p-1">
          <Input
            type="date"
            value={row?.payment_date ?? ''}
            onChange={(e) => updateRow(installment, emp.id, 'payment_date', e.target.value)}
          />
        </TableCell>
        <TableCell className="p-1 text-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Imprimir recibo da parcela de ${emp.name || ''}`}
            title="Imprimir recibo desta parcela"
            disabled={!hasReceipt(emp.id, installment)}
            onClick={() => setPrintTarget({ installment, employeeId: emp.id })}
          >
            <Printer className="h-4 w-4" />
          </Button>
        </TableCell>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print-hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">13º Salário</h2>
          <p className="text-muted-foreground">
            1ª parcela (competência {formatMonthYear(compFirst)}) e 2ª parcela (competência{' '}
            {formatMonthYear(compSecond)}), cada uma com data de pagamento própria.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin ? (
            <div className="space-y-1">
              <label htmlFor="decimo-empresa" className="text-sm font-medium">
                Empresa
              </label>
              <Select
                value={selectedCompanyId}
                onValueChange={setSelectedCompanyId}
                disabled={companies.length === 0}
              >
                <SelectTrigger id="decimo-empresa" className="w-[250px]">
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
          ) : (
            <p className="text-sm text-muted-foreground">
              Empresa: <span className="font-medium text-foreground">{company?.name || '—'}</span>
            </p>
          )}
          <PeriodSelector />
          <Button onClick={handleSave} disabled={isSaving || isLoading || isLoadingEmployees}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar 13º'}
          </Button>
          {PARCELS.map((p) => (
            <Button
              key={`print-${p.installment}`}
              variant="outline"
              onClick={() => setPrintTarget({ installment: p.installment, employeeId: null })}
              disabled={countWithReceipt(p.installment) === 0}
            >
              <Printer className="h-4 w-4 mr-2" />
              Recibos da {p.label} ({countWithReceipt(p.installment)})
            </Button>
          ))}
        </div>
      </div>

      <div className="relative max-w-sm print-hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar funcionário pelo nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar funcionário pelo nome"
        />
      </div>

      {(isLoading || isLoadingEmployees) && (
        <div className="space-y-2 print-hidden">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isLoading && !isLoadingEmployees && (
        <div className="rounded-lg border bg-card overflow-x-auto folha-scroll-container print-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 min-w-[160px]">
                  Funcionário
                </TableHead>
                <TableHead colSpan={6} className="text-center border-l font-semibold">
                  1ª Parcela — Novembro
                </TableHead>
                <TableHead colSpan={6} className="text-center border-l font-semibold">
                  2ª Parcela — Dezembro
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10"></TableHead>
                {PARCELS.map((p) => (
                  <Fragment key={`h-${p.installment}`}>
                    <TableHead className="border-l w-[90px]">13º (R$)</TableHead>
                    <TableHead className="w-[90px]">Adicional (R$)</TableHead>
                    <TableHead className="w-[90px]">Outros (R$)</TableHead>
                    <TableHead className="w-[140px]">Histórico</TableHead>
                    <TableHead className="w-[130px]">Data de pagamento</TableHead>
                    <TableHead className="w-[70px] text-center">Recibo</TableHead>
                  </Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/40">
                <TableCell className="sticky left-0 bg-card z-10 font-semibold">Total</TableCell>
                {PARCELS.map((p) => (
                  <TableCell key={`t-${p.installment}`} colSpan={6} className="border-l">
                    <span className="text-xs text-muted-foreground">Total {p.label}: </span>
                    <span className="font-semibold">{formatCurrency(totals[p.installment])}</span>
                  </TableCell>
                ))}
              </TableRow>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium">
                    {emp.name}
                  </TableCell>
                  {PARCELS.map((p) => (
                    <Fragment key={`${emp.id}-${p.installment}`}>
                      {parcelCells(p.installment, emp)}
                    </Fragment>
                  ))}
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário encontrado para esta empresa.
                  </TableCell>
                </TableRow>
              )}
              {employees.length > 0 && filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário encontrado para "{search}".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Área de impressão: um recibo por funcionário, de UMA parcela, em bobina 80mm. Só montada ao imprimir. */}
      <div className="printable-area hidden print:block">
        {company &&
          printTarget &&
          printList.map((emp) => (
            <div
              key={emp.id}
              className="print:page-break-after-always last:print:page-break-after-auto"
            >
              <DecimoReceiptPrint
                employee={emp}
                company={company}
                payments={receiptPaymentsFor(emp.id, printTarget.installment)}
                year={year}
                installment={printTarget.installment}
              />
            </div>
          ))}
      </div>
    </div>
  )
}
