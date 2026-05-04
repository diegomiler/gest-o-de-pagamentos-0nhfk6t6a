import { formatCurrency, formatMonthYear } from '@/lib/format'
import pb from '@/lib/pocketbase/client'

type Props = {
  employee: any
  entry: any
  company: { id?: string; name: string; tax_id: string; logo?: string }
}

export function HoleritePrint({ employee, entry, company }: Props) {
  const additions =
    (entry.base_net || 0) +
    (entry.commissions || 0) +
    (entry.bonuses || 0) +
    (entry.other_addition || 0)
  const deductions =
    (entry.pharmacy || 0) +
    (entry.advances || 0) +
    (entry.cash_shortage || 0) +
    (entry.negative_hours || 0) +
    (entry.partner_agreement || 0) +
    (entry.store_agreement || 0) +
    (entry.other_discount || 0)
  const net = additions - deductions

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
        Ref: {formatMonthYear(entry.month)}
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
          <tr>
            <td className="py-1">Salário Líquido (Base)</td>
            <td className="py-1 text-right">{formatCurrency(entry.base_net || 0)}</td>
            <td className="py-1 text-right"></td>
          </tr>
          {entry.commissions > 0 && (
            <tr>
              <td className="py-1">Comissões</td>
              <td className="py-1 text-right">{formatCurrency(entry.commissions)}</td>
              <td className="py-1 text-right"></td>
            </tr>
          )}
          {entry.bonuses > 0 && (
            <tr>
              <td className="py-1">Adicionais</td>
              <td className="py-1 text-right">{formatCurrency(entry.bonuses)}</td>
              <td className="py-1 text-right"></td>
            </tr>
          )}
          {entry.other_addition > 0 && (
            <tr>
              <td className="py-1">Outros Acréscimos</td>
              <td className="py-1 text-right">{formatCurrency(entry.other_addition)}</td>
              <td className="py-1 text-right"></td>
            </tr>
          )}
          {entry.pharmacy > 0 && (
            <tr>
              <td className="py-1">Farmácia</td>
              <td className="py-1 text-right"></td>
              <td className="py-1 text-right">{formatCurrency(entry.pharmacy)}</td>
            </tr>
          )}
          {entry.advances > 0 && (
            <tr>
              <td className="py-1">Vales</td>
              <td className="py-1 text-right"></td>
              <td className="py-1 text-right">{formatCurrency(entry.advances)}</td>
            </tr>
          )}
          {entry.cash_shortage > 0 && (
            <tr>
              <td className="py-1">Furo de Caixa</td>
              <td className="py-1 text-right"></td>
              <td className="py-1 text-right">{formatCurrency(entry.cash_shortage)}</td>
            </tr>
          )}
          {entry.negative_hours > 0 && (
            <tr>
              <td className="py-1">Horas Negativas</td>
              <td className="py-1 text-right"></td>
              <td className="py-1 text-right">{formatCurrency(entry.negative_hours)}</td>
            </tr>
          )}
          {entry.partner_agreement > 0 && (
            <tr>
              <td className="py-1">Convênio Parceiros</td>
              <td className="py-1 text-right"></td>
              <td className="py-1 text-right">{formatCurrency(entry.partner_agreement)}</td>
            </tr>
          )}
          {entry.store_agreement > 0 && (
            <tr>
              <td className="py-1">Convênios Loja</td>
              <td className="py-1 text-right"></td>
              <td className="py-1 text-right">{formatCurrency(entry.store_agreement)}</td>
            </tr>
          )}
          {entry.other_discount > 0 && (
            <tr>
              <td className="py-1">Outros Descontos</td>
              <td className="py-1 text-right"></td>
              <td className="py-1 text-right">{formatCurrency(entry.other_discount)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="space-y-1 text-[11px] mb-4">
        <div className="flex justify-between">
          <span>Total Vencimentos:</span>
          <span>{formatCurrency(additions)}</span>
        </div>
        <div className="flex justify-between">
          <span>Total Descontos:</span>
          <span>{formatCurrency(deductions)}</span>
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
        Gerado por GestãoPay
      </div>
    </div>
  )
}
