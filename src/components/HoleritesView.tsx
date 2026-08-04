import { useState, useMemo, useEffect } from 'react'
import { Printer, Search, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PeriodSelector } from '@/components/PeriodSelector'
import { HoleritePrint } from '@/components/HoleritePrint'
import { useAuth } from '@/hooks/use-auth'
import { usePeriod } from '@/hooks/use-period'
import { usePayrollData } from '@/hooks/use-payroll-data'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { formatCurrency } from '@/lib/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function HoleritesView() {
  const { user } = useAuth()
  const { period } = usePeriod()
  const [employees, setEmployees] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [company, setCompany] = useState<any>(null)

  const { entriesByEmployee, loading } = usePayrollData(period)

  const loadEmployees = async () => {
    if (!user) return
    const filter = user.role === 'admin' ? '' : `company_id = "${user.company_id}"`
    const list = await pb.collection('employees').getFullList({
      filter,
      sort: 'name',
    })
    setEmployees(list)
    if (list.length && !selectedId) setSelectedId(list[0].id)
  }

  const loadCompany = async () => {
    if (!user?.company_id) return
    try {
      const c = await pb.collection('companies').getOne(user.company_id)
      setCompany(c)
    } catch {
      setCompany(null)
    }
  }

  useEffect(() => {
    loadEmployees()
    loadCompany()
  }, [user])

  useRealtime('employees', () => loadEmployees())
  useRealtime('payroll_entries', () => loadEmployees())

  const filtered = useMemo(
    () => employees.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())),
    [employees, search],
  )

  const selected = employees.find((e) => e.id === selectedId)
  const entries = selectedId ? entriesByEmployee[selectedId] || [] : []

  const handlePrint = () => window.print()

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0 print:block">
      <div className="lg:w-80 flex flex-col gap-3 print:hidden">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Holerites</h2>
          <PeriodSelector />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar funcionário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um funcionário" />
          </SelectTrigger>
          <SelectContent>
            {filtered.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 flex gap-2">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Selecione um funcionário para visualizar e imprimir o holerite no formato de impressora
            térmica 80mm.
          </span>
        </div>

        <Button onClick={handlePrint} disabled={!selected} className="w-full">
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Holerite
        </Button>

        <div className="flex-1 overflow-auto rounded-md border min-h-0">
          {filtered.map((e) => {
            const total = (entriesByEmployee[e.id] || []).reduce(
              (s, x) => (x.category === 'base_net' || x.category === 'commission' ? s : s),
              0,
            )
            return (
              <button
                key={e.id}
                onClick={() => setSelectedId(e.id)}
                className={`w-full text-left px-3 py-2 border-b last:border-0 hover:bg-muted/50 transition-colors ${
                  e.id === selectedId ? 'bg-muted' : ''
                }`}
              >
                <div className="font-medium text-sm">{e.name}</div>
                <div className="text-xs text-muted-foreground">
                  {e.role || '-'} · {formatCurrency(e.base_salary || 0)}
                </div>
              </button>
            )
          })}
          {!loading && filtered.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Nenhum funcionário encontrado.
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/30 rounded-lg p-4 print:p-0 print:bg-white print:overflow-visible print:block">
        {selected ? (
          <HoleritePrint
            employee={selected}
            entries={entries}
            month={period}
            company={{
              id: company?.id,
              name: company?.name || 'Empresa',
              tax_id: company?.cnpj || '',
              logo: company?.logo,
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground print:hidden">
            Selecione um funcionário para visualizar o holerite.
          </div>
        )}
      </div>
    </div>
  )
}
