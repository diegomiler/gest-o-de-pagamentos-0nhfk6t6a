import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Calculator } from 'lucide-react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { signUp, user, loading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    const { error } = await signUp({ name, email, password, company_name: companyName })
    setIsSubmitting(false)

    if (error) {
      const errorMessage =
        error?.response?.message || 'Falha ao realizar o cadastro. Verifique os dados fornecidos.'
      toast({
        title: 'Erro de Cadastro',
        description: errorMessage,
        variant: 'destructive',
      })
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 bg-primary rounded-full flex items-center justify-center shadow-sm">
              <Calculator className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Crie sua conta</CardTitle>
          <CardDescription>
            Registre sua empresa no GestãoPay e comece a gerenciar sua folha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium">Nome da Empresa</label>
              <Input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder="Minha Empresa LTDA"
                className="bg-background"
              />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium">Seu Nome Completo</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="João da Silva"
                className="bg-background"
              />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium">E-mail Profissional</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="joao@empresa.com"
                className="bg-background"
              />
            </div>
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-background"
                placeholder="Mínimo de 8 caracteres"
              />
            </div>
            <Button type="submit" className="w-full font-medium" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar e Entrar'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t p-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Fazer login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
