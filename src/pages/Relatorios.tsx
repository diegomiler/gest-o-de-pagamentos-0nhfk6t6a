import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HoleritesView } from '@/components/HoleritesView'
import { FechamentoView } from '@/components/FechamentoView'
import { Button } from '@/components/ui/button'
import { FileDown, Printer } from 'lucide-react'
import { usePeriod } from '@/hooks/use-period'
import { usePayrollData } from '@/hooks/use-payroll-data'
import { format } from 'date-fns'

export default function Relatorios() {
  const periodData = usePeriod() as any
  const period =
    periodData?.period ||
    periodData?.month ||
    periodData?.selectedMonth ||
    format(new Date(), 'yyyy-MM')
  const { employees, payrollEntries, userCompany, isLoading } = usePayrollData(period)

  const companyEmployees = employees.filter((e) => e.company_id === userCompany?.id)

  const handleExportCSV = () => {
    let csvContent = 'Employee Name,Entry Date,Category,Description,Quantity,Amount\n'

    companyEmployees.forEach((emp) => {
      const empEntries = payrollEntries.filter((e) => e.employee_id === emp.id)
      const earnings = empEntries.filter((e) => e.amount >= 0)
      const deductions = empEntries.filter((e) => e.amount < 0)
      const sortedEntries = [...earnings, ...deductions]

      sortedEntries.forEach((entry) => {
        csvContent += `"${emp.name}","${format(new Date(entry.entry_date), 'yyyy-MM-dd')}","${entry.category}","${entry.description || ''}","${entry.quantity || ''}","${entry.amount}"\n`
      })

      const additional = emp.additional_amount || 0
      const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0) + additional
      const totalDeductions = deductions.reduce((sum, e) => sum + e.amount, 0)
      const netTotal = totalEarnings + totalDeductions

      csvContent += `"${emp.name}",,,"Fixed Additional",,"${additional}"\n`
      csvContent += `"${emp.name}",,,"Total Earnings",,"${totalEarnings}"\n`
      csvContent += `"${emp.name}",,,"Total Deductions",,"${totalDeductions}"\n`
      csvContent += `"${emp.name}",,,"Final Net Amount",,"${netTotal}"\n\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `payroll_report_${period}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintPDF = () => {
    window.print()
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={isLoading}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handlePrintPDF} disabled={isLoading}>
            <Printer className="mr-2 h-4 w-4" />
            Print PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="holerites" className="flex-1 flex flex-col min-h-0 print:hidden">
        <TabsList className="w-fit">
          <TabsTrigger value="holerites">Holerites</TabsTrigger>
          <TabsTrigger value="fechamento">Fechamento do Mês</TabsTrigger>
        </TabsList>
        <TabsContent value="holerites" className="flex-1 mt-4 min-h-0">
          <HoleritesView />
        </TabsContent>
        <TabsContent value="fechamento" className="flex-1 mt-4 min-h-0">
          <FechamentoView />
        </TabsContent>
      </Tabs>

      <div className="hidden print:block w-full text-black bg-white min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Relatório de Pagamentos</h1>
          <p className="text-gray-600">Período: {period}</p>
        </div>

        {companyEmployees.map((emp) => {
          const empEntries = payrollEntries.filter((e) => e.employee_id === emp.id)
          const earnings = empEntries.filter((e) => e.amount >= 0)
          const deductions = empEntries.filter((e) => e.amount < 0)

          const additional = emp.additional_amount || 0
          const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0) + additional
          const totalDeductions = deductions.reduce((sum, e) => sum + e.amount, 0)
          const netTotal = totalEarnings + totalDeductions

          return (
            <div key={emp.id} className="mb-8 break-inside-avoid border-b pb-4">
              <h2 className="text-xl font-bold border-b pb-2 mb-4">{emp.name}</h2>
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 w-24">Data</th>
                    <th className="text-left py-1">Categoria</th>
                    <th className="text-left py-1">Descrição</th>
                    <th className="text-right py-1 w-16">Qtd</th>
                    <th className="text-right py-1 w-32">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((e) => (
                    <tr key={e.id}>
                      <td className="py-1">{format(new Date(e.entry_date), 'dd/MM/yyyy')}</td>
                      <td className="py-1">{e.category}</td>
                      <td className="py-1">{e.description || '-'}</td>
                      <td className="text-right py-1">{e.quantity || '-'}</td>
                      <td className="text-right py-1">{e.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {deductions.map((e) => (
                    <tr key={e.id}>
                      <td className="py-1">{format(new Date(e.entry_date), 'dd/MM/yyyy')}</td>
                      <td className="py-1">{e.category}</td>
                      <td className="py-1">{e.description || '-'}</td>
                      <td className="text-right py-1">{e.quantity || '-'}</td>
                      <td className="text-right py-1 text-red-600">{e.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                  {empEntries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-2 text-center text-gray-500">
                        Nenhum lançamento no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Sum of Variable Earnings:</span>
                  <span>R$ {(totalEarnings - additional).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Fixed Additional Amount:</span>
                  <span>R$ {additional.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 font-semibold">
                  <span>Total Proventos (Variable + Fixed):</span>
                  <span className="text-green-600">R$ {totalEarnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1 font-semibold">
                  <span>Total Descontos:</span>
                  <span className="text-red-600">R$ {totalDeductions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold border-t mt-2">
                  <span>Valor Líquido (Net Value):</span>
                  <span>R$ {netTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )
        })}

        {companyEmployees.length === 0 && !isLoading && (
          <p className="text-gray-500">Nenhum funcionário encontrado para esta empresa.</p>
        )}
      </div>
    </div>
  )
}
