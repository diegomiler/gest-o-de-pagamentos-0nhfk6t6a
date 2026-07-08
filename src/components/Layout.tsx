import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useCallback, useRef } from 'react'
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Building2,
  Users,
  Calculator,
  FileText,
  Settings,
  LogOut,
  Clock,
  User,
  Shield,
  ArrowLeftRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'

const getNavItems = (role: string) => [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  ...(role === 'admin' ? [{ title: 'Empresas', url: '/empresas', icon: Building2 }] : []),
  { title: 'Funcionários', url: '/funcionarios', icon: Users },
  { title: 'Folha de Ponto', url: '/ponto', icon: Clock },
  { title: 'Folha de Pagamento', url: '/folha', icon: Calculator },
  ...(role === 'admin' || role === 'manager'
    ? [{ title: 'Movimentações Financeiras', url: '/movimentacoes', icon: ArrowLeftRight }]
    : []),
  { title: 'Holerites e Relatórios', url: '/relatorios', icon: FileText },
  ...(role === 'admin'
    ? [
        { title: 'Auditoria', url: '/auditoria', icon: Shield },
        { title: 'Configurações', url: '/configuracoes', icon: Settings },
      ]
    : []),
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user } = useAuth()

  const NAV_ITEMS = getNavItems(user?.role || 'editor')

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(
      () => {
        signOut()
        navigate('/login?expired=true')
      },
      30 * 60 * 1000,
    )
  }, [signOut, navigate])

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    const handleActivity = () => resetTimer()

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true)
    })

    resetTimer()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [resetTimer])

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    editor: 'Editor',
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen print:h-auto print:block w-full bg-background print:bg-white overflow-hidden print:overflow-visible text-foreground">
        <Sidebar className="print-hidden print:hidden">
          <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border px-4">
            <div className="font-bold text-lg text-sidebar-primary-foreground truncate w-full flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="not-italic text-black">Esfhera Folhas</span>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="mt-4">
                  {NAV_ITEMS.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                        <Link to={item.url} className="h-10 text-[15px]">
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col h-full overflow-hidden print:overflow-visible print:h-auto">
          <header className="h-16 border-b bg-card flex items-center justify-between px-6 print-hidden print:hidden shrink-0">
            <div className="flex items-center gap-4 flex-1"></div>
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-auto flex items-center gap-2 pl-2 pr-4 rounded-full border"
                  >
                    <div className="h-7 w-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col items-start hidden sm:flex text-left">
                      <span className="text-sm font-medium leading-none">{user?.name}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold">
                        {roleLabels[user?.role] || 'Usuário'}
                      </span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/perfil" className="cursor-pointer w-full flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      <span>Meu Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={signOut}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-8 relative print:overflow-visible print:p-0 print:block print:w-full">
            <div className="animate-fade-in-up h-full print:h-auto print:animate-none print:block print:w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
