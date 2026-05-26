import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Eye } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { formatCNPJ } from '@/lib/format'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CompanyForm } from '@/components/CompanyForm'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export default function Empresas() {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const loadCompanies = async () => {
    if (!user) return
    try {
      const records = await pb.collection('companies').getFullList({ sort: '-created' })
      setCompanies(records)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar empresas', {
        description: 'Verifique sua conexão ou tente novamente mais tarde.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadCompanies()
    } else {
      setLoading(false)
    }
  }, [user])

  useRealtime('companies', () => {
    if (user) {
      loadCompanies()
    }
  })

  const filteredCompanies = companies.filter((c) => {
    const query = search.toLowerCase()
    return (
      c.name?.toLowerCase().includes(query) ||
      c.cnpj?.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
    )
  })

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">Gerencie as unidades de negócio.</p>
        </div>
        {user?.role === 'admin' && (
          <Button
            onClick={() => {
              setEditingCompany(null)
              setIsSheetOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Empresa
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-sm shrink-0">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md flex-1 overflow-hidden flex flex-col bg-card">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/50 z-10 shadow-sm">
              <TableRow>
                <TableHead className="w-[80px]">Logo</TableHead>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando empresas...
                  </TableCell>
                </TableRow>
              ) : filteredCompanies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {search ? 'Nenhuma empresa encontrada.' : 'Nenhuma empresa cadastrada.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10 border rounded-md bg-muted/50">
                        <AvatarImage
                          src={company.logo ? pb.files.getURL(company, company.logo) : undefined}
                          className="object-contain p-1"
                        />
                        <AvatarFallback className="rounded-md bg-transparent text-xs font-semibold">
                          {company.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{formatCNPJ(company.cnpj || '')}</TableCell>
                    <TableCell>
                      {[company.city, company.state].filter(Boolean).join(' - ') || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCompany(company)
                          setIsSheetOpen(true)
                        }}
                      >
                        {user?.role === 'admin' ? (
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>
              {editingCompany
                ? user?.role === 'admin'
                  ? 'Editar Empresa'
                  : 'Detalhes da Empresa'
                : 'Nova Empresa'}
            </SheetTitle>
            <SheetDescription>
              {user?.role === 'admin'
                ? 'Preencha os dados da empresa abaixo.'
                : 'Informações da empresa.'}
            </SheetDescription>
          </SheetHeader>
          {isSheetOpen && (
            <CompanyForm
              company={editingCompany}
              onSaved={() => setIsSheetOpen(false)}
              onCancel={() => setIsSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
