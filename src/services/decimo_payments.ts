import pb from '@/lib/pocketbase/client'

export type DecimoInstallment = 'first' | 'second'

export interface DecimoPayment {
  id: string
  employee_id: string
  company_id: string
  installment: DecimoInstallment
  amount: number
  additional: number
  other: number
  other_desc: string
  payment_date: string
  competency_month: string
  created_by?: string
  updated_by?: string
  created?: string
  updated?: string
  expand?: {
    employee_id?: { name: string; role?: string }
    company_id?: { name: string }
  }
}

/** Competências padrão por parcela: 1ª em novembro, 2ª em dezembro. */
export const installmentCompetency = (year: number, installment: DecimoInstallment) =>
  `${year}-${installment === 'first' ? '11' : '12'}`

export const parcelLabel = (installment: DecimoInstallment) =>
  installment === 'first' ? '1ª parcela' : '2ª parcela'

const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export interface SaveDecimoInput {
  employeeId: string
  companyId: string
  installment: DecimoInstallment
  competencyMonth: string
  paymentDate: string
  amount: number
  additional: number
  other: number
  otherDesc: string
  userId?: string
}

/**
 * Upsert de um lançamento do 13º (por funcionário + parcela + competência).
 * Sem lançamento (todos os valores zerados) remove o registro existente.
 * `existingId`: id do registro já conhecido (vindo da carga em lote). Quando
 * `undefined`, busca o registro no banco antes de gravar.
 */
export async function saveDecimoPayment(
  input: SaveDecimoInput,
  existingId?: string | null,
): Promise<void> {
  const { userId } = input
  let recordId: string | null = existingId ?? null
  if (existingId === undefined) {
    const filter = [
      `employee_id = '${input.employeeId}'`,
      `installment = '${input.installment}'`,
      `competency_month = '${input.competencyMonth}'`,
    ].join(' && ')
    const existing = await pb.collection('decimo_payments').getList(1, 1, { filter })
    recordId = existing.items[0]?.id ?? null
  }
  const hasValue =
    toNumber(input.amount) !== 0 ||
    toNumber(input.additional) !== 0 ||
    toNumber(input.other) !== 0 ||
    input.otherDesc.trim() !== ''

  if (!hasValue) {
    if (recordId) {
      await pb.collection('decimo_payments').delete(recordId)
    }
    return
  }

  if (!input.paymentDate) {
    throw new Error('Informe a data de pagamento da parcela.')
  }

  const data: Record<string, unknown> = {
    employee_id: input.employeeId,
    company_id: input.companyId,
    installment: input.installment,
    competency_month: input.competencyMonth,
    payment_date: input.paymentDate,
    amount: toNumber(input.amount),
    additional: toNumber(input.additional),
    other: toNumber(input.other),
    other_desc: input.otherDesc.trim(),
  }
  if (userId) {
    data.updated_by = userId
  }

  if (recordId) {
    await pb.collection('decimo_payments').update(recordId, data)
  } else {
    if (userId) data.created_by = userId
    await pb.collection('decimo_payments').create(data)
  }
}

/** Lançamentos do 13º por competências (nov/dez) das empresas selecionadas. */
export async function fetchDecimoPayments(
  companyIds: string[],
  year: number,
): Promise<DecimoPayment[]> {
  if (companyIds.length === 0) return []
  const companyFilter = companyIds.map((id) => `company_id = '${id}'`).join(' || ')
  const competencies = [installmentCompetency(year, 'first'), installmentCompetency(year, 'second')]
    .map((c) => `competency_month = '${c}'`)
    .join(' || ')
  return pb.collection('decimo_payments').getFullList({
    filter: `(${companyFilter}) && (${competencies})`,
    expand: 'employee_id,company_id',
    sort: '-created',
  }) as unknown as Promise<DecimoPayment[]>
}

/** Lançamentos do 13º por DATA DE PAGAMENTO dentro do mês (para /movimentacoes). */
export async function fetchDecimoPaymentsByPaymentDate(
  companyIds: string[],
  month: string,
): Promise<DecimoPayment[]> {
  if (companyIds.length === 0) return []
  const [year, mm] = month.split('-')
  const lastDay = new Date(parseInt(year), parseInt(mm), 0).getDate()
  const startDate = `${month}-01 00:00:00`
  const endDate = `${month}-${lastDay} 23:59:59`
  const companyFilter = companyIds.map((id) => `company_id = '${id}'`).join(' || ')
  return pb.collection('decimo_payments').getFullList({
    filter: `(${companyFilter}) && payment_date >= '${startDate}' && payment_date <= '${endDate}'`,
    expand: 'employee_id,company_id',
    sort: '-payment_date',
  }) as unknown as Promise<DecimoPayment[]>
}
