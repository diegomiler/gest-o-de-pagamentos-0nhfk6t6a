import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DecimoInstallment,
  DecimoPayment,
  fetchDecimoPayments,
  installmentCompetency,
  saveDecimoPayment,
} from '@/services/decimo_payments'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'

export type { DecimoInstallment }
export { installmentCompetency }

export interface DecimoRow {
  amount: string
  additional: string
  other: string
  other_desc: string
  payment_date: string
}

const EMPTY_ROW: DecimoRow = {
  amount: '',
  additional: '',
  other: '',
  other_desc: '',
  payment_date: '',
}

type RowsByInstallment = Record<DecimoInstallment, Record<string, DecimoRow>>

const buildRows = (): RowsByInstallment => ({ first: {}, second: {} })

const money = (v: unknown): string => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || n === 0) return ''
  return String(n).replace('.', ',')
}

export function useDecimoPayments(selectedMonth: string) {
  const { user } = useAuth()
  const [payments, setPayments] = useState<DecimoPayment[]>([])
  const [rows, setRows] = useState<RowsByInstallment>(buildRows)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const year = useMemo(() => parseInt(selectedMonth?.split('-')[0] || '', 10), [selectedMonth])

  useEffect(() => {
    if (!user || !Number.isFinite(year)) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetchDecimoPayments(user.company_id ? [user.company_id] : [], year)
      .then((data) => {
        if (cancelled) return
        setPayments(data)
        const next = buildRows()
        data.forEach((p) => {
          if (!next[p.installment]) next[p.installment] = {}
          next[p.installment][p.employee_id] = {
            amount: money(p.amount),
            additional: money(p.additional),
            other: money(p.other),
            other_desc: p.other_desc || '',
            payment_date: (p.payment_date || '').slice(0, 10),
          }
        })
        setRows(next)
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          setError('Erro ao carregar lançamentos do 13º.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, year])

  useRealtime('decimo_payments', () => {
    if (!user || !Number.isFinite(year)) return
    fetchDecimoPayments(user.company_id ? [user.company_id] : [], year)
      .then((data) => setPayments(data))
      .catch(() => {})
  })

  const updateRow = useCallback(
    (installment: DecimoInstallment, employeeId: string, field: keyof DecimoRow, value: string) => {
      setRows((prev) => {
        const byEmployee = { ...(prev[installment] || {}) }
        byEmployee[employeeId] = {
          ...(byEmployee[employeeId] || EMPTY_ROW),
          [field]: value,
        }
        return { ...prev, [installment]: byEmployee }
      })
    },
    [],
  )

  const saveAll = useCallback(
    async (employees: any[]) => {
      setIsSaving(true)
      setError(null)
      try {
        const byEmployeeCompany = new Map(employees.map((e) => [e.id, e.company_id]))
        const ops: Promise<void>[] = []
        ;(Object.keys(rows) as DecimoInstallment[]).forEach((installment) => {
          const comp = installmentCompetency(year, installment)
          Object.entries(rows[installment] || {}).forEach(([empId, row]) => {
            const empty =
              !row.amount.trim() &&
              !row.additional.trim() &&
              !row.other.trim() &&
              !row.other_desc.trim() &&
              !row.payment_date.trim()
            if (empty) return
            const companyId = byEmployeeCompany.get(empId)
            if (!companyId) return
            ops.push(
              saveDecimoPayment({
                employeeId: empId,
                companyId,
                installment,
                competencyMonth: comp,
                paymentDate: row.payment_date,
                amount: parseFloat(row.amount.replace(',', '.')) || 0,
                additional: parseFloat(row.additional.replace(',', '.')) || 0,
                other: parseFloat(row.other.replace(',', '.')) || 0,
                otherDesc: row.other_desc,
                userId: user?.id,
              }),
            )
          })
        })
        await Promise.all(ops)
        // recarrega para refletir o estado real do banco
        if (user) {
          const data = await fetchDecimoPayments(user.company_id ? [user.company_id] : [], year)
          setPayments(data)
        }
      } catch (err) {
        console.error(err)
        setError('Erro ao salvar lançamentos do 13º.')
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [rows, year, user],
  )

  return { rows, payments, isLoading, isSaving, error, updateRow, saveAll }
}
