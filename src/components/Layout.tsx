import { Outlet, Link, useLocation } from 'react-router-dom'
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
  Search,
  LogOut,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

const NAV_ITEMS = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Empresas', url: '/empresas', icon: Building2 },
  { title: 'Funcionários', url: '/funcionarios', icon: Users },
  { title: 'Folha de Pagamento', url: '/folha', icon: Calculator },
  { title: 'Holerites e Relatórios', url: '/relatorios', icon: FileText },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const { signOut, user } = useAuth()

  return (
    <SidebarProvider>
      <div className="flex h-screen print:h-auto print:block w-full bg-background print:bg-white overflow-hidden print:overflow-visible text-foreground">
        <Sidebar className="print-hidden print:hidden">
          <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border px-4">
            <div className="font-bold text-lg text-sidebar-primary-foreground truncate w-full flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span>Esfhera Folhas</span>
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
            <div className="flex items-center gap-4 flex-1">
              <div className="relative w-full max-w-sm hidden md:flex">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar funcionário..."
                  className="w-full pl-9 bg-muted/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium hidden sm:inline-block">{user?.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={signOut}
                title="Sair"
              >
                <LogOut className="h-5 w-5 text-muted-foreground" />
              </Button>
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
