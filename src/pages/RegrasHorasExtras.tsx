import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Box, ArrowLeft, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const formSchema = z.object({
  id: z.string().optional(),
  company_id: z.string().min(1, 'Selecione uma empresa'),
  limit_hours: z.coerce.number().min(0.01, 'Deve ser maior que 0'),
  percentage: z.coerce.number().min(0, 'Min: 0').max(500, 'Max: 500'),
})

type FormValues = z.infer<typeof formSchema>

export default function RegrasHorasExtras() {
  const { toast } = useToast()
  const [rules, setRules] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      id: '',
      company_id: '',
      limit_hours: '' as any,
      percentage: '' as any,
    },
  })

  const loadData = async () => {
    setIsLoading(true)
    setError(false)
    try {
      const comps = await pb.collection('companies').getFullList({ sort: 'name' })
      setCompanies(comps)

      if (comps.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(comps[0].id)
      }

      const targetCompany = selectedCompanyId || (comps.length > 0 ? comps[0].id : '')
      if (targetCompany) {
        const data = await pb.collection('overtime_rules').getFullList({
          filter: `company_id = "${targetCompany}"`,
          sort: 'limit_hours',
        })
        setRules(data)
      } else {
        setRules([])
      }
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedCompanyId])

  useRealtime('overtime_rules', () => {
    loadData()
  })

  const openModal = (rule?: any) => {
    if (rule) {
      form.reset({
        id: rule.id,
        company_id: rule.company_id,
        limit_hours: rule.limit_hours,
        percentage: rule.percentage,
      })
    } else {
      form.reset({
        id: '',
        company_id: selectedCompanyId,
        limit_hours: '' as any,
        percentage: '' as any,
      })
    }
    setIsModalOpen(true)
  }

  const onSubmit = async (data: FormValues) => {
    try {
      if (data.id) {
        await pb.collection('overtime_rules').update(data.id, data)
      } else {
        await pb.collection('overtime_rules').create(data)
      }
      toast({ title: 'Sucesso', description: 'Regra salva com sucesso' })
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          form.setError(field as keyof FormValues, { message: msg as string })
        })
      } else {
        toast({ title: 'Erro', description: 'Erro ao salvar regra', variant: 'destructive' })
      }
    }
  }

  const handleDelete = async () => {
    if (!ruleToDelete) return
    try {
      await pb.collection('overtime_rules').delete(ruleToDelete)
      toast({ title: 'Sucesso', description: 'Regra salva com sucesso' })
      loadData()
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao excluir regra', variant: 'destructive' })
    } finally {
      setRuleToDelete(null)
    }
  }

  if (error) {
    return (
      <div className="max-w-4xl space-y-6 animate-fade-in">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>Ocorreu um erro ao carregar as regras.</AlertDescription>
        </Alert>
        <Button onClick={loadData}>Tentar novamente</Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in relative pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="mr-2">
          <Link to="/configuracoes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Regras de Horas Extras</h2>
          <p className="text-muted-foreground">
            Configure os percentuais por faixa de horas extras.
          </p>
        </div>
      </div>

      <div className="w-full sm:w-72">
        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId} disabled={isLoading}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a empresa" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/20">
          <Box className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhuma regra configurada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione as faixas de horas extras para esta empresa.
          </p>
          <Button onClick={() => openModal()}>Adicionar primeira regra</Button>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Até (horas)</TableHead>
                  <TableHead>Acréscimo (%)</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {rule.limit_hours >= 999 ? 'Acima das anteriores' : rule.limit_hours}
                    </TableCell>
                    <TableCell>{rule.percentage}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openModal(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setRuleToDelete(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {selectedCompanyId && (
        <Button
          className="fixed bottom-8 right-8 rounded-full w-14 h-14 shadow-lg p-0 transition-transform hover:scale-105"
          onClick={() => openModal()}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.getValues('id') ? 'Editar Regra' : 'Nova Regra'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="limit_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Até quantas horas</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual de acréscimo (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!form.formState.isValid}>
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!ruleToDelete} onOpenChange={(open) => !open && setRuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A regra será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
