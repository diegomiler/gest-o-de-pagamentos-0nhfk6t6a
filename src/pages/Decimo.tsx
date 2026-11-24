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
import { Printer, Save } from 'lucide-react'
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

const parseNum = (v: string) => {
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export default function Decimo() {
  const { user } = useAuth()
  const { selectedMonth } = usePeriod()
  const { toast } = useToast()
  const { rows, payments, isLoading, isSaving, updateRow, saveAll } =
    useDecimoPayments(selectedMonth)

  const [employees, setEmployees] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)

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
        const myCompany = user?.company_id
          ? comps.find((c) => c.id === user.company_id) || null
          : comps[0] || null
        setEmployees(myCompany ? emps.filter((e) => e.company_id === myCompany.id) : emps)
        setCompany(myCompany)
      } catch (err) {
        console.error('Erro ao carregar funcionários:', err)
      } finally {
        setIsLoadingEmployees(false)
      }
    }
    load()
  }, [user])

  const year = parseInt(selectedMonth?.split('-')[0] || String(new Date().getFullYear()), 10)
  const compFirst = installmentCompetency(year, 'first')
  const compSecond = installmentCompetency(year, 'second')

  const receiptPaymentsFor = (employeeId: string) =>
    payments.filter(
      (p) =>
        p.employee_id === employeeId &&
        (p.competency_month === compFirst || p.competency_month === compSecond),
    )

  const employeesWithReceipt = useMemo(
    () => employees.filter((emp) => receiptPaymentsFor(emp.id).length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employees, payments, compFirst, compSecond],
  )

  const rowTotal = (row: DecimoRow | undefined) => {
    if (!row) return 0
    return parseNum(row.amount) + parseNum(row.additional) + parseNum(row.other)
  }

  const totals = useMemo(
    () =>
      PARCELS.reduce(
        (acc, parcel) => {
          acc[parcel.installment] = Object.values(rows[parcel.installment] || {}).reduce(
            (sum, row) => sum + rowTotal(row),
            0,
          )
          return acc
        },
        { first: 0, second: 0 } as Record<DecimoInstallment, number>,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows],
  )

  const handleSave = async () => {
    try {
      await saveAll(employees)
      toast({ title: 'Sucesso', description: '13º salário salvo com sucesso.' })
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao salvar o 13º salário.',
      })
    }
  }

  const handlePrint = () => {
    window.print()
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
          <PeriodSelector />
          <Button onClick={handleSave} disabled={isSaving || isLoading || isLoadingEmployees}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar 13º'}
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={employeesWithReceipt.length === 0}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Recibo do 13º ({employeesWithReceipt.length})
          </Button>
        </div>
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
                <TableHead colSpan={5} className="text-center border-l font-semibold">
                  1ª Parcela — Novembro
                </TableHead>
                <TableHead colSpan={5} className="text-center border-l font-semibold">
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
                  </Fragment>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/40">
                <TableCell className="sticky left-0 bg-card z-10 font-semibold">Total</TableCell>
                {PARCELS.map((p) => (
                  <TableCell key={`t-${p.installment}`} colSpan={5} className="border-l">
                    <span className="text-xs text-muted-foreground">Total {p.label}: </span>
                    <span className="font-semibold">{formatCurrency(totals[p.installment])}</span>
                  </TableCell>
                ))}
              </TableRow>
              {employees.map((emp) => (
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
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário encontrado para esta empresa.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Área de impressão: recibos do 13º em bobina 80mm, um por funcionário com lançamento */}
      <div className="printable-area hidden print:block">
        {company &&
          employeesWithReceipt.map((emp) => (
            <div
              key={emp.id}
              className="print:page-break-after-always last:print:page-break-after-auto"
            >
              <DecimoReceiptPrint
                employee={emp}
                company={company}
                payments={receiptPaymentsFor(emp.id)}
                year={year}
              />
            </div>
          ))}
      </div>
    </div>
  )
}
