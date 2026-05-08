import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { CompanyForm } from '@/components/CompanyForm'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export default function Configuracoes() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const loadCompany = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      if (user.company_id) {
        try {
          await pb.collection('companies').getOne(user.company_id)
          setCompanyId(user.company_id)
        } catch (err: any) {
          if (err.status === 404) {
            toast.error('Empresa não encontrada', {
              description:
                'O registro da empresa não foi encontrado. Por favor, crie uma nova configuração.',
            })
            try {
              await pb.collection('users').update(user.id, { company_id: null })
            } catch (updateErr) {
              console.error('Falha ao limpar company_id do usuário', updateErr)
            }
          }
          setCompanyId(null)
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
 