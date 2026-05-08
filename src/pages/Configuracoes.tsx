import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Building2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { CompanyForm } from '@/components/CompanyForm'

export default function Configuracoes() {
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Card
              key={company.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => {
                setSelectedCompanyId(company.id)
                setView('form')
              }}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                  {company.logo ? (
                    <img
                      src={pb.files.getURL(company, company.logo)}
                      alt={company.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-semibold text-lg truncate" title={company.name}>
                    {company.name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {company.tax_id || 'CNPJ não informado'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
