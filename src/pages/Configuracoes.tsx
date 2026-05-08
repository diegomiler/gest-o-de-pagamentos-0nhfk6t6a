import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Link } from 'react-router-dom'

export default function Configuracoes() {
  return (
    <div className="max-w-6xl space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">Gerencie as preferências e regras do sistema.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Regras de Horas Extras</CardTitle>
            <CardDescription>
              Configure limites e porcentagens para cálculos de horas extras.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/configuracoes/regras-horas-extras">Acessar Regras</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
