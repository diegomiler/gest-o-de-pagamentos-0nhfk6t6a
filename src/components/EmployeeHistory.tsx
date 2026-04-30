import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { formatCurrency } from '@/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function EmployeeHistory({ employeeId }: { employeeId: string }) {
  const [history, setHistory] = useState<any[]>([])

  const loadHistory = async () => {
    try {
      const records = await pb.collection('employee_history').getFullList({
        filter: `employee_id = "${employeeId}"`,
        sort: '-created',
      })
      setHistory(records)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [employeeId])

  useRealtime('employee_history', loadHistory)

  const formatValue = (type: string, value: string) => {
    if (!value) return '-'
    if (type === 'base_salary' || type === 'additional_amount') {
      const num = parseFloat(value)
      return isNaN(num) ? '-' : formatCurrency(num)
    }
    return value
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'base_salary':
        return 'Salário Base'
      case 'role':
        return 'Cargo'
      case 'additional_amount':
        return 'Valor Adicional'
      default:
        return type
    }
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">Nenhum histórico encontrado.</div>
    )
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Alteração</TableHead>
            <TableHead>Anterior</TableHead>
            <TableHead>Atual</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="whitespace-nowrap">
                {new Date(record.created).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell>{getTypeLabel(record.change_type)}</TableCell>
              <TableCell>{formatValue(record.change_type, record.old_value)}</TableCell>
              <TableCell>{formatValue(record.change_type, record.new_value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
