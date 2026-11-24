import { formatCurrency, formatDateBR, formatCNPJ, parcelLabel } from '@/lib/format'
import type { DecimoPayment } from '@/services/decimo_payments'

interface DecimoReceiptPrintProps {
  employee: { name: string; role?: string }
  company: { name: string; cnpj?: string }
  payments: DecimoPayment[]
  year: number
}

export function DecimoReceiptPrint({ employee, company, payments, year }: DecimoReceiptPrintProps) {
  const sorted = [...payments].sort(
    (a, b) => (a.installment === 'first' ? 0 : 1) - (b.installment === 'first' ? 0 : 1),
  )
  const total = sorted.reduce(
    (sum, p) => sum + (p.amount || 0) + (p.additional || 0) + (p.other || 0),
    0,
  )
  const lastPaymentDate =
    sorted
      .map((p) => p.payment_date)
      .filter(Boolean)
      .sort()
      .pop() || ''

  return (
    <div className="receipt-80mm">
      <div className="text-center">
        <p className="font-bold text-[11px] uppercase">Recibo de 13º Salário</p>
        <p className="text-[10px] mt-1">{company?.name || '—'}</p>
        {company?.cnpj && <p className="text-[9px]">CNPJ: {formatCNPJ(company.cnpj)}</p>}
      </div>

      <div className="my-1 border-t border-dashed border-black/60" />

      <p className="text-[10px]">
        Recebi de <strong>{company?.name || '—'}</strong> o pagamento do 13º salário
        {employee?.role ? ` — ${employee.role}` : ''}, referente ao exercício {year}, no valor total
        de <strong>{formatCurrency(total)}</strong>, conforme discriminação abaixo:
      </p>

      <div className="my-1 border-t border-dashed border-black/60" />

      <table className="w-full text-[9px]">
        <thead>
          <tr className="border-b border-black/60">
            <th className="text-left py-0.5">Discriminação</th>
            <th className="text-right py-0.5">Valor</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={2} className="py-1 text-center">
                Sem lançamentos.
              </td>
            </tr>
          )}
          {sorted.map((p) => {
            const label = parcelLabel(p.installment as 'first' | 'second')
            return (
              <>
                {(p.amount || 0) !== 0 && (
                  <tr key={`${p.id}-a`}>
                    <td className="py-0.5">{label}</td>
                    <td className="text-right py-0.5">{formatCurrency(p.amount || 0)}</td>
                  </tr>
                )}
                {(p.additional || 0) !== 0 && (
                  <tr key={`${p.id}-b`}>
                    <td className="py-0.5">{label} — Adicional</td>
                    <td className="text-right py-0.5">{formatCurrency(p.additional || 0)}</td>
                  </tr>
                )}
                {(p.other || 0) !== 0 && (
                  <tr key={`${p.id}-c`}>
                    <td className="py-0.5">
                      {label} — Outros{p.other_desc ? ` (${p.other_desc})` : ''}
                    </td>
                    <td className="text-right py-0.5">{formatCurrency(p.other || 0)}</td>
                  </tr>
                )}
              </>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-black/60">
            <td className="py-0.5 font-bold">TOTAL</td>
            <td className="py-0.5 text-right font-bold">{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="my-1 border-t border-dashed border-black/60" />

      <p className="text-[10px]">
        Data de pagamento: <strong>{formatDateBR(lastPaymentDate)}</strong>
      </p>
      <p className="text-[9px] text-muted-foreground print:text-black">
        Competências: novembro/{year} (1ª parcela) e dezembro/{year} (2ª parcela).
      </p>

      <div className="mt-8 text-center">
        <p className="text-[10px]">_________________________________</p>
        <p className="text-[10px]">{employee?.name || '—'}</p>
      </div>

      <p className="text-center text-[8px] mt-2">Documento gerado por Gestão de Pagamentos</p>
    </div>
  )
}
