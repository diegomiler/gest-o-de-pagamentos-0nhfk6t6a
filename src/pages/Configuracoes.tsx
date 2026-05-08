import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { ClientResponseError } from 'pocketbase'
import { CompanyForm } from '@/components/CompanyForm'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export default function Configuracoes() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [isNotFound, setIsNotFound] = useState(false)
  const invalidIdRef = useRef<string | null>(null)

  const loadCompany = async () => {
    if (!user) return

    // Evita loop recursivo de chamadas se o ID já for conhecido como inválido (404)
    if (user.company_id && user.company_id === invalidIdRef.current && isNotFound) {
      setCompanyId(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      if (user.company_id) {
        try {
          await pb.collection('companies').getOne(user.company_id)
          setCompanyId(user.company_id)
          setIsNotFound(false)
          invalidIdRef.current = null
        } catch (err: any) {
          if (err instanceof ClientResponseError && err.status === 404) {
            toast.error('Empresa não encontrada', {
              description:
                'O registro da empresa não foi encontrado. Por favor, crie uma nova configuração.',
            })
            setIsNotFound(true)
            invalidIdRef.current = user.company_id
            setCompanyId(null)
            try {
              const activeUserId = pb.authStore.record?.id || (pb.authStore as any).model?.id
              if (activeUserId && pb.authStore.isValid && activeUserId === user?.id) {
                await pb.collection('users').update(activeUserId, { company_id: null })
              }
            } catch (patchErr) {
              if (patchErr instanceof ClientResponseError && patchErr.status === 404) {
                /* silently ignore 404 to prevent console errors and bubbling */
              } else {
                console.error('Failed to clear user company_id:', patchErr)
              }
            }
          } else {
            toast.error('Erro ao carregar', {
              description: 'Não foi possível carregar as configurações da empresa.',
            })
            setCompanyId(user.company_id)
          }
        }
      } else {
        setCompanyId(null)
      }
    } catch (e) {
      console.error(e)
      setCompanyId(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCompany()
  }, [user?.company_id])

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
