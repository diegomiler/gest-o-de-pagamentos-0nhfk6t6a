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
import { useNavigate, Link, Navigate, useSearchParams } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { useEffect } from 'react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, user, loading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      toast({
        title: 'Sessão Expirada',
        description: 'Sua sessão expirou por inatividade. Por favor, faça login novamente.',
        variant: 'destructive',
      })
      window.history.replaceState({}, document.title, '/login')
    }
  }, [searchParams, toast])

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await signIn(email, password)
    if (error) {
      toast({
        title: 'Erro',
        description: 'E-mail ou senha inválidos. Por favor, tente novamente.',
        variant: 'destructive',
      })
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-muted">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 bg-primary rounded-full flex items-center justify-center shadow-sm">
              <Calculator className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Bem-vindo ao GestãoPay
          </CardTitle>
          <CardDescription>Faça login para acessar o painel de controle</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@empresa.com"
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
                className="bg-background"
              />
            </div>
            <Button type="submit" className="w-full font-medium" size="lg">
              Entrar
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t p-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Não possui uma conta?{' '}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Cadastre sua empresa
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
