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
import { Search, Plus, FilterX } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { EmployeeForm } from '@/components/EmployeeForm'
import { EmployeeHistory } from '@/components/EmployeeHistory'
import { EmployeePaymentHistory } from '@/components/EmployeePaymentHistory'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function Funcionarios() {
  const [employees, setEmployees] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedCompany, setSelectedCompany] = useState('all')
  const [searchName, setSearchName] = useState('')
  const [searchDepartment, setSearchDepartment] = useState('all')
  const [searchRole, setSearchRole] = useState('all')

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      const [empData, compData] = await Promise.all([
        pb.collection('employees').getFullList({ sort: 'name', expand: 'company_id' }),
        pb.collection('companies').getFullList({ sort: 'name' }),
      ])
      setEmployees(empData)
      setCompanies(compData)

      if (compData.length === 1 && selectedCompany === 'all') {
        setSelectedCompany(compData[0].id)
      }
    } catch {
      /* intentionally ignored */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('employees', loadData)

  const filtered = employees.filter((e) => {
    const matchCompany = selectedCompany === 'all' || e.company_id === selectedCompany
    const matchName = !searchName || e.name.toLowerCase().includes(searchName.toLowerCase())
    const matchDept = searchDepartment === 'all' || e.department === searchDepartment
    const matchRole = searchRole === 'all' || e.role === searchRole
    return matchCompany && matchName && matchDept && matchRole
  })

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).sort()
  const roles = Array.from(new Set(employees.map((e) => e.role).filter(Boolean))).sort()

  const clearFilters = () => {
    setSelectedCompany(companies.length === 1 ? companies[0].id : 'all')
    setSearchName('')
    setSearchDepartment('all')
    setSearchRole('all')
  }

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

      <div className="bg-card rounded-md border p-4 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Filtros
          </h3>
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
            <FilterX className="mr-2 h-4 w-4" /> Limpar Filtros
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Empresa</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas as empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                className="pl-9 h-9"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Departamento</Label>
            <Select value={searchDepartment} onValueChange={setSearchDepartment}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Cargo</Label>
            <Select value={searchRole} onValueChange={setSearchRole}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-md border bg-card w-full overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="whitespace-nowrap">Nome</TableHead>
                <TableHead className="whitespace-nowrap">Cargo / Depto</TableHead>
                <TableHead className="whitespace-nowrap">Admissão</TableHead>
                <TableHead className="whitespace-nowrap">Salário Base</TableHead>
                <TableHead className="whitespace-nowrap">Adicional</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando funcionários...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEdit(emp)}
                  >
                    <TableCell className="font-medium whitespace-nowrap">{emp.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{emp.role || '-'}</span>
                        <span className="text-xs text-muted-foreground">
                          {emp.department || '-'}
                          {emp.expand?.company_id?.name ? ` • ${emp.expand.company_id.name}` : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {emp.admission_date
                        ? new Date(emp.admission_date).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatCurrency(emp.base_salary)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatCurrency(emp.additional_amount || 0)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
