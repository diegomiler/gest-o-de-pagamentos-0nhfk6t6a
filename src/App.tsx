import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { PeriodProvider } from '@/hooks/use-period'

import Layout from './components/Layout'
import Index from './pages/Index'
import Funcionarios from './pages/Funcionarios'
import Folha from './pages/Folha'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import RegrasHorasExtras from './pages/RegrasHorasExtras'
import Empresas from './pages/Empresas'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Signup from './pages/Signup'

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <PeriodProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              element={
                <RequireAuth>
                  <Layout />
                </RequireAuth>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/funcionarios" element={<Funcionarios />} />
              <Route path="/folha" element={<Folha />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/configuracoes/regras-horas-extras" element={<RegrasHorasExtras />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </PeriodProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
