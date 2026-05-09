import { useState, useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { formatTimeOnBlur } from '@/lib/format'

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const timeOptional = z
  .string()
  .optional()
  .refine((val) => !val || timeRegex.test(val), 'Formato HH:mm')

const formSchema = z
  .object({
    employee_id: z.string().min(1, 'Selecione um funcionário'),
    record_date: z.string().min(1, 'Data obrigatória'),
    entry_1: timeOptional,
    exit_1: timeOptional,
    entry_2: timeOptional,
    exit_2: timeOptional,
    entry_3: timeOptional,
    exit_3: timeOptional,
  })
  .superRefine((data, ctx) => {
    const checkPair = (entry?: string, exit?: string, prefix: string = '1') => {
      if ((entry && !exit) || (!entry && exit)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Preencha o par Entrada/Saída ${prefix}`,
          path: [`exit_${prefix}`],
        })
      }
      if (entry && exit && timeRegex.test(entry) && timeRegex.test(exit)) {
        const [eH, eM] = entry.split(':').map(Number)
        const [xH, xM] = exit.split(':').map(Number)
        if (xH * 60 + xM <= eH * 60 + eM) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Saída ${prefix} inválida (menor ou igual a entrada)`,
            path: [`exit_${prefix}`],
          })
        }
      }
    }
    checkPair(data.entry_1, data.exit_1, '1')
    checkPair(data.entry_2, data.exit_2, '2')
    checkPair(data.entry_3, data.exit_3, '3')
  })

type FormData = z.infer<typeof formSchema>

export default function Ponto() {
  const [employees, setEmployees] = useState<any[]>([])
  const { toast } = useToast()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: '',
      record_date: format(new Date(), 'yyyy-MM-dd'),
      entry_1: '',
      exit_1: '',
      entry_2: '',
      exit_2: '',
      entry_3: '',
      exit_3: '',
    },
  })

  useEffect(() => {
    pb.collection('employees')
      .getFullList({ filter: "status = 'active'", sort: 'name' })
      .then((res) => setEmployees(res))
      .catch(console.error)
  }, [])

  const watchAll = form.watch()

  const calcDiff = (entry?: string, exit?: string) => {
    if (!entry || !exit) return 0
    if (!timeRegex.test(entry) || !timeRegex.test(exit)) return 0
    const [eH, eM] = entry.split(':').map(Number)
    const [xH, xM] = exit.split(':').map(Number)
    return xH * 60 + xM - (eH * 60 + eM)
  }

  const totals = useMemo(() => {
    const diff1 = calcDiff(watchAll.entry_1, watchAll.exit_1)
    const diff2 = calcDiff(watchAll.entry_2, watchAll.exit_2)
    const diff3 = calcDiff(watchAll.entry_3, watchAll.exit_3)

    const total_minutes = Math.max(0, diff1) + Math.max(0, diff2) + Math.max(0, diff3)
    const overtime_minutes = Math.max(0, total_minutes - 440) // 07:20 = 440 minutes

    return { total_minutes, overtime_minutes }
  }, [
    watchAll.entry_1,
    watchAll.exit_1,
    watchAll.entry_2,
    watchAll.exit_2,
    watchAll.entry_3,
    watchAll.exit_3,
  ])

  const formatMinToTime = (min: number) => {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  }

  const onSubmit = async (data: FormData) => {
    try {
      const employee = employees.find((e) => e.id === data.employee_id)
      if (!employee) return

      const existing = await pb.collection('time_records').getList(1, 1, {
        filter: `employee_id = '${data.employee_id}' && record_date ~ '${data.record_date}'`,
      })

      // Store at 12:00Z to avoid timezone day shifts when saving/reading date string
      const recordDateObj = new Date(data.record_date + 'T12:00:00Z')
      const payload = {
        ...data,
        company_id: employee.company_id,
        record_date: recordDateObj.toISOString(),
        total_minutes: totals.total_minutes,
        overtime_minutes: totals.overtime_minutes,
      }

      if (existing.items.length > 0) {
        await pb.collection('time_records').update(existing.items[0].id, payload)
        toast({ title: 'Ponto atualizado com sucesso!' })
      } else {
        await pb.collection('time_records').create(payload)
        toast({ title: 'Ponto salvo com sucesso!' })
      }

      const currentEmployee = data.employee_id
      const currentDate = data.record_date
      form.reset({
        employee_id: currentEmployee,
        record_date: currentDate,
        entry_1: '',
        exit_1: '',
        entry_2: '',
        exit_2: '',
        entry_3: '',
        exit_3: '',
      })
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    }
  }

  const handleTimeBlur = (field: keyof FormData, e: any) => {
    if (e.target.value) {
      form.setValue(field, formatTimeOnBlur(e.target.value), { shouldValidate: true })
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Folha de Ponto</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lançamento Diário</CardTitle>
          <CardDescription>
            Registre as entradas e saídas do funcionário para calcular as horas trabalhadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Funcionário</Label>
                <Controller
                  name="employee_id"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.employee_id && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.employee_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Data do Registro</Label>
                <Input type="date" {...form.register('record_date')} />
                {form.formState.errors.record_date && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.record_date.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-medium text-lg">Horários</h3>
              <div className="grid gap-6">
                {[1, 2, 3].map((num) => (
                  <div
                    key={num}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start bg-muted/40 p-4 rounded-lg"
                  >
                    <div className="space-y-2 md:col-span-1">
                      <Label>Entrada {num}</Label>
                      <Input
                        placeholder="00:00"
                        {...form.register(`entry_${num}` as keyof FormData)}
                        onBlur={(e) => handleTimeBlur(`entry_${num}` as keyof FormData, e)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-1">
                      <Label>Saída {num}</Label>
                      <Input
                        placeholder="00:00"
                        {...form.register(`exit_${num}` as keyof FormData)}
                        onBlur={(e) => handleTimeBlur(`exit_${num}` as keyof FormData, e)}
                      />
                    </div>
                    <div className="col-span-2 text-sm text-red-500 mt-2 md:mt-8">
                      {form.formState.errors[`exit_${num}` as keyof FormData]?.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-around text-center gap-6">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Trabalhado</p>
                <p className="text-3xl font-bold">{formatMinToTime(totals.total_minutes)}</p>
              </div>
              <div className="w-px h-12 bg-border hidden sm:block"></div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Jornada Padrão</p>
                <p className="text-3xl font-bold text-muted-foreground">07:20</p>
              </div>
              <div className="w-px h-12 bg-border hidden sm:block"></div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Horas Extras</p>
                <p
                  className={`text-3xl font-bold ${totals.overtime_minutes > 0 ? 'text-green-600 dark:text-green-500' : 'text-muted-foreground'}`}
                >
                  {formatMinToTime(totals.overtime_minutes)}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Registro'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
