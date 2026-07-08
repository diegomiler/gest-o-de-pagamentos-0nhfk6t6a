import { useState, useEffect, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PeriodSelector } from '@/components/PeriodSelector'
import { usePeriod } from '@/hooks/use-period'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/format'
import { Search, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

const changeTypeLabels: Record<string, string> = {
  base_salary: 'Salário Base',
  role: 'Cargo',
  additional_amount: 'Adicional Fixo',
}

export function AuditLogsView() {
  const { selectedMonth } = usePeriod()
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [employeeSearch, setEmployeeSearch] = useState('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const [year, month] = selectedMonth.split('-')
      const lastDay = new Date(Number(year), Number(month), 0).getDate()
      const startDate = `${selectedMonth}-01 00:00:00`
      const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')} 23:59:59`

      const records = await pb.collection('employee_history').getFullList({
        filter: `created >= '${startDate}' && created <= '${endDate}'`,
        sort: '-created',
        expand: 'employee_id,created_by',
      })

      let filtered = records
      if (user?.role !== 'admin' && user?.company_id) {
        filtered = records.filter((r) => r.expand?.employee_id?.company_id === user.company_id)
      }
      setLogs(filtered)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, user?.role, user?.company_id])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  useRealtime('employee_history', () => loadLogs())

  const formatValue = (type: string, value: string) => {
    if (!value) return '-'
    if (type === 'base_salary' || type === 'additional_amount') {
      const num = parseFloat(value)
      return isNaN(num) ? '-' : formatCurrency(num)
    }
    return value
  }

  const filteredLogs = useMemo(() => {
    if (!employeeSearch.trim()) return logs
    const search = employeeSearch.toLowerCase()
    return logs.filter((log) => {
      const empName = log.expand?.employee_id?.name || ''
      return empName.toLowerCase().includes(search)
    })
  }, [logs, employeeSearch])

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Logs de Alterações</h2>
          <p className="text-sm text-muted-foreground">
            Histórico de modificações em dados de funcionários e adicionais fixos.
          </p>
        </div>
        <PeriodSelector />
      </div>

      <div className="relative w-full sm:w-80">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por funcionário..."
          className="w-full pl-9"
          value={employeeSearch}
          onChange={(e) => setEmployeeSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Funcionário</TableHead>
              <TableHead>Tipo de Alteração</TableHead>
              <TableHead>Valor Anterior</TableHead>
              <TableHead>Novo Valor</TableHead>
              <TableHead>Justificativa</TableHead>
              <TableHead>Alterado por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhum registro encontrado para o período selecionado.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(log.created).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>{log.expand?.employee_id?.name || '—'}</TableCell>
                  <TableCell>{changeTypeLabels[log.change_type] || log.change_type}</TableCell>
                  <TableCell>{formatValue(log.change_type, log.old_value)}</TableCell>
                  <TableCell>{formatValue(log.change_type, log.new_value)}</TableCell>
                  <TableCell className="max-w-[250px] truncate" title={log.reason || ''}>
                    {log.reason || '-'}
                  </TableCell>
                  <TableCell>{log.expand?.created_by?.name || '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
