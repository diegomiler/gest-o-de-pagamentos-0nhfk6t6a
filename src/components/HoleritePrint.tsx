import { formatCurrency, formatMonthYear, decimalToTime } from '@/lib/format'
import pb from '@/lib/pocketbase/client'

type Props = {
  employee: any
  entries: any[]
  month: string
  company: { id?: string; name: string; tax_id: string; logo?: string }
}

export function HoleritePrint({ employee, entries, month, company }: Props) {
  const getCategoryTotals = (category: string) => {
    const cats = entries.filter((e) => e.category === category)
    return {
      amount: cats.reduce((acc, curr) => acc + (curr.amount || 0), 0),
      quantity: cats.reduce((acc, curr) => acc + (curr.quantity || 0), 0),
    }
  }

  const baseNetEntry = entries.find((e) => e.category === 'base_net')
  const baseValue = baseNetEntry ? baseNetEntry.amount : 0

  const employeeAdditionalAmount = employee.additional_amount || 0

  const earnings = []
  earnings.push({ label: 'Salário Base', amount: baseValue })

  if (employeeAdditionalAmount > 0) {
    earnings.push({ label: 'Adicional (Fixo)', amount: employeeAdditionalAmount })
  }

  const comm = getCategoryTotals('commission')
  if (comm.amount > 0) earnings.push({ label: 'Comissões', amount: comm.amount })

  const bon = getCategoryTotals('bonus')
  if (bon.amount > 0) earnings.push({ label: 'Premiação', amount: bon.amount })

  const mv = getCategoryTotals('market_voucher')
  if (mv.amount > 0)
    earnings.push({ label: 'Vale Mercado', amount: mv.amount, excludeFromTotal: true })

  const additionalEntries = entries.filter((e) => e.category === 'additional')
  let variableAddAmount = 0
  let fixedOmitted = false

  for (const entry of additionalEntries) {
    if (!fixedOmitted && entry.amount === employeeAdditionalAmount) {
      fixedOmitted = true
    } else {
      variableAddAmount += entry.amount || 0
    }
  }

  if (variableAddAmount > 0) {
    earnings.push({ label: 'Adicional', amount: variableAddAmount })
  }

  const over = getCategoryTotals('overtime')
  if (over.amount > 0) {
    earnings.push({
      label: 'Horas Extras',
      amount: over.amount,
      quantity: over.quantity ? decimalToTime(over.quantity) : undefined,
    })
  }

  const othAdd = getCategoryTotals('other_addition')
  if (othAdd.amount > 0) earnings.push({ label: 'Outros Acréscimos', amount: othAdd.amount })

  const deductions = []
  const pharm = getCategoryTotals('pharmacy_discount')
  if (pharm.amount > 0) deductions.push({ label: 'Farmácia', amount: pharm.amount })

  const adv = getCategoryTotals('advance')
  if (adv.amount > 0) deductions.push({ label: 'Vales / Adiantamentos', amount: adv.amount })

  const short = getCategoryTotals('cash_shortage')
  if (short.amount > 0) deductions.push({ label: 'Furo de Caixa', amount: short.amount })

  const neg = getCategoryTotals('negative_hours')
  if (neg.amount > 0) {
    deductions.push({
      label: 'Horas Negativas',
      amount: neg.amount,
      quantity: neg.quantity ? decimalToTime(neg.quantity) : undefined,
    })
  }

  const part = getCategoryTotals('partner_agreement')
  if (part.amount > 0) deductions.push({ label: 'Convênio Parceiros', amount: part.amount })

  const store = getCategoryTotals('store_agreement')
  if (store.amount > 0) deductions.push({ label: 'Convênios Loja', amount: store.amount })

  const othDesc = getCategoryTotals('other_discount')
  if (othDesc.amount > 0) deductions.push({ label: 'Outros Descontos', amount: othDesc.amount })

  const totalEarnings = earnings.reduce(
    (sum, item) => sum + (item.excludeFromTotal ? 0 : item.amount),
    0,
  )
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0)
  const net = totalEarnings - totalDeductions

  const logoUrl =
    company.logo && company.id
      ? pb.files.getURL({ collectionId: 'companies', id: company.id } as any, company.logo)
      : null

  return (
    <div className="bg-white text-black font-mono text-[12px] leading-snug w-full max-w-[80mm] mx-auto p-4 print:p-2 print:m-0 print:w-[80mm] print:max-w-[80mm] border shadow-sm print:shadow-none print:border-none break-inside-avoid">
      {logoUrl && (
        <div className="flex justify-center mb-3">
          <img
            src={logoUrl}
            alt="Logo"
            className="max-w-[50mm] max-h-[25mm] object-contain grayscale"
          />
        </div>
      )}

      <div className="text-center border-b border-black border-dashed pb-2 mb-2">
        <div className="font-bold text-[14px] uppercase leading-tight">{company.name}</div>
        {company.tax_id && <div>CNPJ: {company.tax_id}</div>}
      </div>

      <div className="text-center font-bold text-[13px] mb-2 uppercase leading-tight">
        Recibo de Pagamento
        <br />
        Ref: {formatMonthYear(month)}
      </div>

      <div className="border-b border-black border-dashed pb-2 mb-2 leading-tight">
        <div>
          <span className="font-bold">Cód:</span> {employee.id.substring(0, 8)}
        </div>
        <div>
          <span className="font-bold">Func:</span> {employee.name}
        </div>
        <div>
          <span className="font-bold">Cargo:</span> {employee.role || '-'}
        </div>
      </div>

      <table className="w-full text-[11px] mb-2 border-b border-black border-dashed pb-2">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left font-bold py-1">Descrição</th>
            <th className="text-right font-bold py-1 w-16">Venc</th>
            <th className="text-right font-bold py-1 w-16">Desc</th>
          </tr>
        </thead>
        <tbody>
          {earnings.map((item, idx) => (
            <tr key={`earn-${idx}`}>
              <td className="py-1">
                {item.label}
                {item.quantity ? <span className="ml-1 text-[10px]">({item.quantity})</span> : null}
              </td>
              <td className="py-1 text-right">{formatCurrency(item.amount)}</td>
              <td className="py-1 text-right"></td>
            </tr>
          ))}
          {deductions.map((item, idx) => (
            <tr key={`ded-${idx}`}>
              <td className="py-1">
                {item.label}
                {item.quantity ? <span className="ml-1 text-[10px]">({item.quantity})</span> : null}
              </td>
              <td className="py-1 text-right"></td>
              <td className="py-1 text-right">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 text-[11px] mb-4">
        <div className="flex justify-between">
          <span>Total Vencimentos:</span>
          <span>{formatCurrency(totalEarnings)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Descontos:</span>
          <span>{formatCurrency(totalDeductions)}</span>
        </div>
        <div className="flex justify-between font-bold text-[14px] pt-1 border-t border-black border-dashed mt-1">
          <span>Líquido:</span>
          <span>{formatCurrency(net)}</span>
        </div>
      </div>

      <div className="mt-8 pt-2 border-t border-black text-center text-[10px] uppercase">
        Assinatura do Funcionário
      </div>

      <div className="text-center text-[9px] mt-4 text-gray-500 print:text-black">
        Gerado por Esfhera Folhas
      </div>
    </div>
  )
}
