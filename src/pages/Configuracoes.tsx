import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { CompanyForm } from '@/components/CompanyForm'

export default function Configuracoes() {
  const [isLoading, setIsLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const loadCompany = async () => {
    setIsLoading(true)
    try {
      const data = await pb.collection('companies').getList(1, 1, { sort: 'created' })
      if (data.items.length > 0) {
        setCompanyId(data.items[0].id)
      } else {
        setCompanyId(null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCompany()
  }, [])

  return (
    <div className="max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">Gerencie as configurações da sua empresa.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" asChild>
            <Link to="/configuracoes/regras-horas-extras">Regras de Horas Extras</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="max-w-4xl space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <CompanyForm
          companyId={companyId}
          onSaved={() => {
            loadCompany()
          }}
        />
      )}
    </div>
  )
}
