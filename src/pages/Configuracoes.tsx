import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { CompanyForm } from '@/components/CompanyForm'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

export default function Configuracoes() {
  const { toast } = useToast()
  const [view, setView] = useState<'list' | 'form'>('list')
  const [companies, setCompanies] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)

  const loadCompanies = async () => {
    setIsLoading(true)
    try {
      const data = await pb.collection('companies').getFullList({ sort: '-created' })
      setCompanies(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  useRealtime('companies', () => {
    loadCompanies()
  })

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Tem certeza que deseja excluir esta empresa?')) return
    try {
      await pb.collection('companies').delete(id)
      toast({ title: 'Sucesso', description: 'Empresa excluída.' })
      loadCompanies()
    } catch (err) {
      toast({ title: 'Erro', description: 'Erro ao excluir empresa.', variant: 'destructive' })
    }
  }

  if (view === 'form') {
    return (
      <CompanyForm
        companyId={selectedCompanyId}
        onBack={() => setView('list')}
        onSaved={() => {
          setView('list')
          loadCompanies()
        }}
      />
    )
  }

  return (
    <div className="max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Empresas</h2>
          <p className="text-muted-foreground">Gerencie as empresas cadastradas no sistema.</p>
        </div>
        <Button
          onClick={() => {
            setSelectedCompanyId(null)
            setView('form')
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[114px] w-full" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/20">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhuma empresa encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Cadastre a primeira empresa para começar.
          </p>
          <Button
            onClick={() => {
              setSelectedCompanyId(null)
              setView('form')
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Cadastrar Empresa
          </Button>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Logo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow
                    key={company.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedCompanyId(company.id)
                      setView('form')
                    }}
                  >
                    <TableCell>
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center overflow-hidden border">
                        {company.logo ? (
                          <img
                            src={pb.files.getURL(company, company.logo)}
                            alt={company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground/50" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{company.name || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{company.cnpj || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCompanyId(company.id)
                            setView('form')
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDelete(company.id, e)}
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
    </div>
  )
}
