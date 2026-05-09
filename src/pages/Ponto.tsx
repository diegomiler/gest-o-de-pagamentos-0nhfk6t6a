import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { Clock } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { formatTimeOnBlur } from '@/lib/format'
import { usePeriod } from '@/hooks/use-period'
import { PeriodSelector } from '@/components/PeriodSelector'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
// Mock of common brazilian holidays for the logic (month-day)
const HOLIDAYS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25']

const calcDiff = (entry?: string, exit?: string) => {
  if (!entry || !exit) return 0
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  if (!timeRegex.test(entry) || !timeRegex.test(exit)) return 0
  const [eH, eM] = entry.split(':').map(Number)
  const [xH, xM] = exit.split(':').map(Number)
  let diff = xH * 60 + xM - (eH * 60 + eM)
  if (diff < 0) diff += 24 * 60 // Handle overnight shifts
  return diff
}

const formatMinToTime = (min: number) => {
  if (min === null || min === undefined || isNaN(min)) return '00:00'
  const isNegative = min < 0
  const absMin = Math.abs(min)
  const h = Math.floor(absMin / 60)
  const m = absMin % 60
  const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  return isNegative ? `- ${time}` : time
}

const formatBalance = (min: number) => {
  if (min === null || min === undefined || isNaN(min) || min === 0) return '00:00'
  const isNegative = min < 0
  const time = formatMinToTime(Math.abs(min))
  return isNegative ? `- ${time}` : `+ ${time}`
}

function TimeCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [val, setVal] = useState(value || '')

  useEffect(() => {
    setVal(value || '')
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '')
    if (digits.length > 4) digits = digits.substring(0, 4)

    let formatted = digits
    if (digits.length >= 3) {
      formatted = `${digits.substring(0, 2)}:${digits.substring(2)}`
    }
    setVal(formatted)
  }

  const handleBlur = () => {
    let formatted = val.trim() === '' ? '' : formatTimeOnBlur(val)

    if (formatted.length === 5) {
      const [h, m] = formatted.split(':')
      if (parseInt(h, 10) > 23 || parseInt(m, 10) > 59) {
        formatted = ''
      }
    }

    setVal(formatted)
    if (formatted !== (value || '')) {
      onChange(formatted)
    }
  }

  return (
    <Input
      className="w-16 h-8 px-1 text-center text-xs tabular-nums focus:ring-primary/40"
      value={val}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="--:--"
      maxLength={5}
    />
  )
}

function DayRow({
  dateStr,
  initialRecord,
  selectedEmployee,
  companyId,
  onTotalChange,
}: {
  dateStr: string
  initialRecord: any
  selectedEmployee: string
  companyId: string
  onTotalChange: (dateStr: string, total: number, extra: number) => void
}) {
  const [record, setRecord] = useState(initialRecord)
  const { toast } = useToast()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setRecord(initialRecord)
  }, [initialRecord])

  const dateObj = new Date(dateStr + 'T12:00:00Z')
  const dayOfWeek = dateObj.getDay()
  const isSunday = dayOfWeek === 0
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const monthDay = dateStr.substring(5) // MM-DD
  const isHoliday = HOLIDAYS.includes(monthDay)
  const isSpecialDay = isSunday || isHoliday

  const displayDate = format(dateObj, 'dd/MM')
  const displayDay = WEEKDAYS[dayOfWeek]

  const handleChange = (field: string, val: string) => {
    setRecord((prev: any) => {
      const updated = { ...prev, [field]: val }

      const diff1 = calcDiff(updated.entry_1, updated.exit_1)
      const diff2 = calcDiff(updated.entry_2, updated.exit_2)
      const diff3 = calcDiff(updated.entry_3, updated.exit_3)
      const total_minutes = Math.max(0, diff1) + Math.max(0, diff2) + Math.max(0, diff3)

      let overtime_minutes = 0
      const hasAnyEntry =
        updated.entry_1 ||
        updated.exit_1 ||
        updated.entry_2 ||
        updated.exit_2 ||
        updated.entry_3 ||
        updated.exit_3

      if (hasAnyEntry) {
        if (isSpecialDay) {
          overtime_minutes = total_minutes
        } else {
          overtime_minutes = total_minutes - 440 // 440 mins = 07:20
        }
      }

      updated.total_minutes = total_minutes
      updated.overtime_minutes = overtime_minutes

      onTotalChange(dateStr, total_minutes, overtime_minutes)

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        saveToDB(updated)
      }, 800)

      return updated
    })
  }

  const saveToDB = async (data: any) => {
    try {
      const recordDateObj = new Date(dateStr + 'T12:00:00Z')
      const payload = {
        employee_id: selectedEmployee,
        company_id: companyId,
        record_date: recordDateObj.toISOString(),
        entry_1: data.entry_1,
        exit_1: data.exit_1,
        entry_2: data.entry_2,
        exit_2: data.exit_2,
        entry_3: data.entry_3,
        exit_3: data.exit_3,
        total_minutes: data.total_minutes,
        overtime_minutes: data.overtime_minutes,
      }

      if (data.id) {
        await pb.collection('time_records').update(data.id, payload)
      } else {
        const saved = await pb.collection('time_records').create(payload)
        setRecord((prev: any) => ({ ...prev, id: saved.id }))
      }
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    }
  }

  const balanceColor =
    record.overtime_minutes > 0
      ? 'text-green-600 dark:text-green-500'
      : record.overtime_minutes < 0
        ? 'text-red-600 dark:text-red-500'
        : 'text-muted-foreground'

  return (
    <TableRow
      className={
        isSpecialDay
          ? 'bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
          : isWeekend
            ? 'bg-muted/30'
            : ''
      }
    >
      <TableCell className="font-medium whitespace-nowrap">
        {displayDate}
        {isHoliday && (
          <span className="ml-2 text-[10px] uppercase tracking-wider text-red-500 font-semibold bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
            Feriado
          </span>
        )}
      </TableCell>
      <TableCell
        className={`text-muted-foreground ${isSpecialDay ? 'text-red-600 dark:text-red-400 font-semibold' : isWeekend ? 'text-muted-foreground font-medium' : ''}`}
      >
        {displayDay}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <TimeCell value={record.entry_1} onChange={(v) => handleChange('entry_1', v)} />
          <span className="text-muted-foreground">-</span>
          <TimeCell value={record.exit_1} onChange={(v) => handleChange('exit_1', v)} />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <TimeCell value={record.entry_2} onChange={(v) => handleChange('entry_2', v)} />
          <span className="text-muted-foreground">-</span>
          <TimeCell value={record.exit_2} onChange={(v) => handleChange('exit_2', v)} />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <TimeCell value={record.entry_3} onChange={(v) => handleChange('entry_3', v)} />
          <span className="text-muted-foreground">-</span>
          <TimeCell value={record.exit_3} onChange={(v) => handleChange('exit_3', v)} />
        </div>
      </TableCell>
      <TableCell className="text-center font-bold tabular-nums text-primary/90">
        {formatMinToTime(record.total_minutes || 0)}
      </TableCell>
      <TableCell className={`text-center tabular-nums font-semibold ${balanceColor}`}>
        {record.overtime_minutes !== 0 ? formatBalance(record.overtime_minutes) : '-'}
      </TableCell>
    </TableRow>
  )
}

export default function Ponto() {
  const [employees, setEmployees] = useState<any[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const { selectedMonth } = usePeriod()
  const [records, setRecords] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const [totals, setTotals] = useState<Record<string, { total: number; extra: number }>>({})

  useEffect(() => {
    pb.collection('employees')
      .getFullList({ filter: "status = 'active'", sort: 'name' })
      .then((res) => setEmployees(res))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedEmployee || !selectedMonth) {
      setRecords({})
      setTotals({})
      return
    }

    const fetchRecords = async () => {
      setLoading(true)
      try {
        const [yearStr, monthStr] = selectedMonth.split('-')
        const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate()
        const startDateStr = `${yearStr}-${monthStr.padStart(2, '0')}-01`
        const endDateStr = `${yearStr}-${monthStr.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`

        const res = await pb.collection('time_records').getFullList({
          filter: `employee_id = '${selectedEmployee}' && record_date >= '${startDateStr} 00:00:00' && record_date <= '${endDateStr} 23:59:59'`,
        })

        const newRecords: Record<string, any> = {}
        const newTotals: Record<string, { total: number; extra: number }> = {}
        res.forEach((r) => {
          const dateStr = r.record_date.substring(0, 10)
          newRecords[dateStr] = r
          newTotals[dateStr] = {
            total: r.total_minutes || 0,
            extra: r.overtime_minutes || 0,
          }
        })
        setRecords(newRecords)
        setTotals(newTotals)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchRecords()
  }, [selectedEmployee, selectedMonth])

  const handleTotalChange = useCallback((dateStr: string, total: number, extra: number) => {
    setTotals((prev) => ({
      ...prev,
      [dateStr]: { total, extra },
    }))
  }, [])

  const [yearStr, monthStr] = selectedMonth.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const daysInMonth = new Date(year, month, 0).getDate()

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    return `${yearStr}-${monthStr.padStart(2, '0')}-${day.toString().padStart(2, '0')}`
  })

  const employee = employees.find((e) => e.id === selectedEmployee)
  const monthTotal = Object.values(totals).reduce((sum, t) => sum + t.total, 0)
  const monthExtra = Object.values(totals).reduce((sum, t) => sum + t.extra, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Folha de Ponto</h1>
            <p className="text-muted-foreground">Gerenciamento mensal de horas</p>
          </div>
        </div>
        <PeriodSelector />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Funcionário</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um funcionário..." />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Horas (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMinToTime(monthTotal)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo de Horas (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${monthExtra > 0 ? 'text-green-600 dark:text-green-500' : monthExtra < 0 ? 'text-red-600 dark:text-red-500' : ''}`}
            >
              {formatBalance(monthExtra)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[120px]">Data</TableHead>
                  <TableHead className="w-[80px]">Dia</TableHead>
                  <TableHead>Turno 1 (Ent - Sai)</TableHead>
                  <TableHead>Turno 2 (Ent - Sai)</TableHead>
                  <TableHead>Turno 3 (Ent - Sai)</TableHead>
                  <TableHead className="text-center w-[120px]">Horas Realizadas</TableHead>
                  <TableHead className="text-center w-[130px]">Saldo (Faltas/Extras)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Carregando dados do mês...
                    </TableCell>
                  </TableRow>
                ) : !selectedEmployee ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      Selecione um funcionário para visualizar a folha de ponto.
                    </TableCell>
                  </TableRow>
                ) : (
                  days.map((dateStr) => {
                    const record = records[dateStr] || {
                      entry_1: '',
                      exit_1: '',
                      entry_2: '',
                      exit_2: '',
                      entry_3: '',
                      exit_3: '',
                      total_minutes: 0,
                      overtime_minutes: 0,
                    }
                    return (
                      <DayRow
                        key={dateStr}
                        dateStr={dateStr}
                        initialRecord={record}
                        selectedEmployee={selectedEmployee}
                        companyId={employee?.company_id}
                        onTotalChange={handleTotalChange}
                      />
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
