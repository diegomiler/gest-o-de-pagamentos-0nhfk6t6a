import { formatCurrency, formatMonthYear } from '@/lib/format'

type Props = {
  employee: any
  entry: any
  company: { name: string; tax_id: string }
}

export function HoleritePrint({ employee, entry, company }: Props) {
  const additions = employee.base_salary + entry.commissions + entry.bonuses
  const deductions = entry.pharmacy + entry.advances
  const net = additions - deductions

  return (
    <div className="border-2 border-slate-800 p-6 bg-white text-black font-mono text-[13px] max-w-4xl mx-auto mb-8 shadow-sm print:shadow-none print:mb-0 print:border-none print:w-full">
      <div className="flex justify-between border-b-2 border-slate-800 pb-3 mb-3">
        <div>
          <div className="font-bold text-base uppercase">{company.name}</div>
          <div>CNPJ: {company.tax_id}</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-base uppercase">Recibo de Pagamento de Salário</div>
          <div>Mês Referência: {formatMonthYear(entry.month)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-b-2 border-slate-800 pb-3 mb-3">
        <div>
          <div>
            <span className="font-bold">Cód:</span> {employee.id}
          </div>
          <div>
            <span className="font-bold">Nome:</span> {employee.name}
          </div>
        </div>
        <div>
          <div>
            <span className="font-bold">Cargo:</span> {employee.role || '-'}
          </div>
          <div>
            <span className="font-bold">Admissão:</span>{' '}
            {employee.admission_date
              ? new Date(employee.admission_date).toLocaleDateString('pt-BR')
              : '-'}
          </div>
        </div>
      </div>

      <div className="min-h-[250px] border-b-2 border-slate-800 pb-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-400">
              <th className="text-left py-1 w-16">Cód</th>
              <th className="text-left py-1">Descrição</th>
              <th className="text-right py-1 w-32">Ref</th>
              <th className="text-right py-1 w-32">Vencimentos</th>
              <th className="text-right py-1 w-32">Descontos</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1">001</td>
              <td className="py-1 uppercase">Salário Base</td>
              <td className="py-1 text-right">30 dias</td>
              <td className="py-1 text-right">{formatCurrency(employee.base_salary)}</td>
              <td className="py-1 text-right"></td>
            </tr>
            {entry.commissions > 0 && (
              <tr>
                <td className="py-1">002</td>
                <td className="py-1 uppercase">Comissões</td>
                <td className="py-1 text-right">-</td>
                <td className="py-1 text-right">{formatCurrency(entry.commissions)}</td>
                <td className="py-1 text-right"></td>
              </tr>
            )}
            {entry.bonuses > 0 && (
              <tr>
                <td className="py-1">003</td>
                <td className="py-1 uppercase">Adicionais/Bônus</td>
                <td className="py-1 text-right">-</td>
                <td className="py-1 text-right">{formatCurrency(entry.bonuses)}</td>
                <td className="py-1 text-right"></td>
              </tr>
            )}
            {entry.pharmacy > 0 && (
              <tr>
                <td className="py-1">101</td>
                <td className="py-1 uppercase">Convênio Farmácia</td>
                <td className="py-1 text-right">-</td>
                <td className="py-1 text-right"></td>
                <td className="py-1 text-right">{formatCurrency(entry.pharmacy)}</td>
              </tr>
            )}
            {entry.advances > 0 && (
              <tr>
                <td className="py-1">102</td>
                <td className="py-1 uppercase">Adiantamento Salarial</td>
                <td className="py-1 text-right">-</td>
                <td className="py-1 text-right"></td>
                <td className="py-1 text-right">{formatCurrency(entry.advances)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between pt-3">
        <div className="w-1/2 flex flex-col justify-end pr-8">
          <div className="border-t border-slate-600 pt-1 mt-10 text-center uppercase text-xs">
            Assinatura do Funcionário
          </div>
        </div>
        <div className="w-1/2">
          <div className="flex justify-between py-1">
            <span className="font-bold">Total Vencimentos:</span>
            <span>{formatCurrency(additions)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="font-bold">Total Descontos:</span>
            <span>{formatCurrency(deductions)}</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-slate-800 mt-2 font-bold text-base">
            <span>Líquido a Receber:</span>
            <span>{formatCurrency(net)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
