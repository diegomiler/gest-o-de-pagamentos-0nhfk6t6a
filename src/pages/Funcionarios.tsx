import { useState, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { EmployeeForm } from '@/components/EmployeeForm'
import { EmployeeHistory } from '@/components/EmployeeHistory'
import { EmployeePaymentHistory } from '@/components/EmployeePaymentHistory'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function Funcionarios() {
  const [employees, setEmployees] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const data = await pb.collection('employees').getFullList({ sort: 'name' })
      setEmployees(data)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('employees', loadData)

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.department && e.department.toLowerCase().includes(search.toLowerCase())),
  )

  const handleSave = async (data: any) => {
    try {
      if (editingEmployee) {
        await pb.collection('employees').update(editingEmployee.id, data)
        toast({ title: 'Sucesso', description: 'Funcionário atualizado com sucesso!' })
      } else {
        await pb.collection('employees').create(data)
        toast({ title: 'Sucesso', description: 'Novo funcionário adicionado.' })
      }
      setIsSheetOpen(false)
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Verifique os dados informados.',
        variant: 'destructive',
      })
    }
  }

  const openNew = () => {
    setEditingEmployee(null)
    setIsSheetOpen(true)
  }

  const openEdit = (emp: any) => {
    setEditingEmployee(emp)
    setIsSheetOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight">Funcionários</h2>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo Funcionário
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou depto..."
            className="pl-9 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo / Depto</TableHead>
              <TableHead>Admissão</TableHead>
              <TableHead>Salário Base</TableHead>
              <TableHead>Adicional</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum funcionário encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((emp) => (
              <TableRow
                key={emp.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => openEdit(emp)}
              >
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{emp.role || '-'}</span>
                    <span className="text-xs text-muted-foreground">{emp.department || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {emp.admission_date
                    ? new Date(emp.admission_date).toLocaleDateString('pt-BR')
                    : '-'}
                </TableCell>
                <TableCell>{formatCurrency(emp.base_salary)}</TableCell>
                <TableCell>{formatCurrency(emp.additional_amount || 0)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      emp.status === 'active'
                        ? 'default'
                        : emp.status === 'on_leave'
                          ? 'secondary'
                          : 'destructive'
                    }
                  >
                    {emp.status === 'active'
                      ? 'Ativo'
                      : emp.status === 'on_leave'
                        ? 'Férias'
                        : 'Desligado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingEmployee ? 'Detalhes do Funcionário' : 'Novo Funcionário'}
            </SheetTitle>
          </SheetHeader>

          {editingEmployee ? (
            <Tabs defaultValue="dados" className="w-full mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="dados">Dados</TabsTrigger>
                <TabsTrigger value="historico">Cadastral</TabsTrigger>
                <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
              </TabsList>
              <TabsContent value="dados" className="mt-4">
                <EmployeeForm
                  initialData={editingEmployee}
                  onSubmit={handleSave}
                  onCancel={() => setIsSheetOpen(false)}
                />
              </TabsContent>
              <TabsContent value="historico" className="mt-4">
                <EmployeeHistory employeeId={editingEmployee.id} />
              </TabsContent>
              <TabsContent value="pagamentos" className="mt-4">
                <EmployeePaymentHistory employeeId={editingEmployee.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <EmployeeForm onSubmit={handleSave} onCancel={() => setIsSheetOpen(false)} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
