import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Search, Shield, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { getAccessLogs, type AccessLog } from '@/services/access_logs'

export default function Auditoria() {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [emailFilter, setEmailFilter] = useState('')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>()
  const [loading, setLoading] = useState(false)

  const [debouncedEmail, setDebouncedEmail] = useState('')
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedEmail(emailFilter), 500)
    return () => clearTimeout(handler)
  }, [emailFilter])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await getAccessLogs(page, 20, {
        email: debouncedEmail,
        startDate: dateRange?.from,
        endDate: dateRange?.to,
      })
      setLogs(result.items)
      setTotalPages(result.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [page, debouncedEmail, dateRange])

  useRealtime('access_logs', () => {
    if (page === 1) {
      loadLogs()
    }
  })

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Auditoria
          </h1>
          <p className="text-muted-foreground mt-1">Monitoramento de acessos ao sistema</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por email..."
            className="w-full pl-9"
            value={emailFilter}
            onChange={(e) => {
              setEmailFilter(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-[300px] justify-start text-left font-normal',
                !dateRange?.from && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                  </>
                ) : (
                  format(dateRange.from, 'dd/MM/yyyy')
                )
              ) : (
                <span>Filtrar por período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={{ from: dateRange?.from, to: dateRange?.to }}
              onSelect={(range: any) => {
                setDateRange(range)
                setPage(1)
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        {(emailFilter || dateRange?.from) && (
          <Button
            variant="ghost"
            onClick={() => {
              setEmailFilter('')
              setDateRange(undefined)
              setPage(1)
            }}
            className="text-muted-foreground"
          >
            Limpar Filtros
          </Button>
        )}
      </div>

      <div className="border rounded-md bg-card flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Nome do Usuário</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.access_time), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{log.expand?.user_id?.name || '—'}</TableCell>
                  <TableCell>{log.email}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Página {page} de {totalPages || 1}
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading || totalPages === 0}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
