import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DecimoInstallment,
  DecimoPayment,
  fetchDecimoPayments,
  installmentCompetency,
  saveDecimoPayment,
} from '@/services/decimo_payments'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { runInBatches, withRateLimitRetry } from '@/lib/pocketbase/batch'

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

/** Gravações simultâneas no salvamento do 13º (evita estourar o rate limit). */
const SAVE_CONCURRENCY = 3
/** Espera após um evento realtime antes de recarregar (agrupa rajadas de gravações). */
const REALTIME_RELOAD_DELAY = 800

type RowsByInstallment = Record<DecimoInstallment, Record<string, DecimoRow>>

const buildRows = (): RowsByInstallment => ({ first: {}, second: {} })

const money = (v: unknown): string => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || n === 0) return ''
  return String(n).replace('.', ',')
}

/** Chave de um lançamento: parcela + funcionário (competência é derivada do ano). */
const cellKey = (installment: DecimoInstallment, employeeId: string) =>
  `${installment}|${employeeId}`

/** Chave de registro existente: parcela + funcionário + competência. */
const recordKey = (installment: DecimoInstallment, employeeId: string, competency: string) =>
  `${installment}|${employeeId}|${competency}`

export function useDecimoPayments(selectedMonth: string, companyId: string | undefined) {
  const { user } = useAuth()
  const userId = user?.id as string | undefined
  const [payments, setPayments] = useState<DecimoPayment[]>([])
  const [rows, setRows] = useState<RowsByInstallment>(buildRows)
  const [dirty, setDirty] = useState<Set<string>>(() => new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const year = useMemo(() => parseInt(selectedMonth?.split('-')[0] || '', 10), [selectedMonth])

  const applyPayments = useCallback((data: DecimoPayment[]) => {
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
    setDirty(new Set())
  }, [])

  useEffect(() => {
    if (!userId || !Number.isFinite(year)) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    // Uma única consulta em lote para a empresa e as duas competências.
    fetchDecimoPayments(companyId ? [companyId] : [], year)
      .then((data) => {
        if (!cancelled) applyPayments(data)
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
  }, [userId, companyId, year, applyPayments])

  // Limpa o temporizador de recarga ao sair da tela.
  useEffect(
    () => () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current)
    },
    [],
  )

  // Eventos realtime de uma rajada (ex.: o próprio salvamento) geram UMA recarga só.
  useRealtime('decimo_payments', () => {
    if (!userId || !Number.isFinite(year)) return
    if (reloadTimer.current) clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null
      withRateLimitRetry(() => fetchDecimoPayments(companyId ? [companyId] : [], year))
        .then((data) => setPayments(data))
        .catch(() => {})
    }, REALTIME_RELOAD_DELAY)
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
      setDirty((prev) => new Set(prev).add(cellKey(installment, employeeId)))
    },
    [],
  )

  const saveAll = useCallback(
    async (employees: any[]) => {
      setIsSaving(true)
      setError(null)
      try {
        const byEmployeeCompany = new Map(employees.map((e) => [e.id, e.company_id]))
        // id dos registros já carregados: evita uma consulta de busca por lançamento.
        const existingIds = new Map(
          payments.map((p) => [recordKey(p.installment, p.employee_id, p.competency_month), p.id]),
        )
        // Só grava as células alteradas desde a carga (ou o último salvamento).
        const jobs: { installment: DecimoInstallment; empId: string; row: DecimoRow }[] = []
        dirty.forEach((key) => {
          const [installment, empId] = key.split('|') as [DecimoInstallment, string]
          const row = rows[installment]?.[empId]
          if (row) jobs.push({ installment, empId, row })
        })

        await runInBatches(jobs, SAVE_CONCURRENCY, ({ installment, empId, row }) => {
          const empty =
            !row.amount.trim() &&
            !row.additional.trim() &&
            !row.other.trim() &&
            !row.other_desc.trim() &&
            !row.payment_date.trim()
          const companyIdOfEmp = byEmployeeCompany.get(empId)
          if (!companyIdOfEmp) return Promise.resolve()
          const comp = installmentCompetency(year, installment)
          const existingId = existingIds.get(recordKey(installment, empId, comp)) ?? null
          // Linha vazia sem registro no banco: nada a fazer.
          if (empty && !existingId) return Promise.resolve()
          return withRateLimitRetry(() =>
            saveDecimoPayment(
              {
                employeeId: empId,
                companyId: companyIdOfEmp,
                installment,
                competencyMonth: comp,
                paymentDate: row.payment_date,
                amount: parseFloat(row.amount.replace(',', '.')) || 0,
                additional: parseFloat(row.additional.replace(',', '.')) || 0,
                other: parseFloat(row.other.replace(',', '.')) || 0,
                otherDesc: row.other_desc,
                userId,
              },
              existingId,
            ),
          )
        })
        // recarrega para refletir o estado real do banco
        if (userId) {
          const data = await withRateLimitRetry(() =>
            fetchDecimoPayments(companyId ? [companyId] : [], year),
          )
          applyPayments(data)
        }
      } catch (err) {
        console.error(err)
        setError('Erro ao salvar lançamentos do 13º.')
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [rows, dirty, payments, year, userId, companyId, applyPayments],
  )

  return { rows, payments, isLoading, isSaving, error, updateRow, saveAll }
}
