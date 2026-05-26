import { useState, useMemo, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Printer, Check, ChevronsUpDown, X } from 'lucide-react'
import { HoleritePrint } from '@/components/HoleritePrint'
import { usePayrollData } from '@/hooks/use-payroll-data'
import { usePeriod } from '@/hooks/use-period'
import { PeriodSelector } from '@/components/PeriodSelector'
import { cn } from '@/lib/utils'

export function HoleritesView() {
  const { selectedMonth } = usePeriod()
  const [selectedEmp, setSelectedEmp] = useState('all')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [openEmp, setOpenEmp] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!openEmp) {
      setTimeout(() => setSearchQuery(''), 200)
    }
  }, [openEmp])

  const { employees, payrollEntries, companies, userCompany, isLoading } =
    usePayrollData(selectedMonth)

  useEffect(() => {
    if (userCompany && !selectedCompanyId) {
      setSelectedCompanyId(userCompany.id)
    } else if (companies.length > 0 && !selectedCompanyId && !userCompany) {
      setSelectedCompanyId(companies[0].id)
    }
  }, [userCompany, companies, selectedCompanyId])

  useEffect(() => {
    setSelectedEmp('all')
  }, [selectedCompanyId])

  const activeCompany = useMemo(() => {
    return companies.find((c) => c.id === selectedCompanyId) || userCompany
  }, [selectedCompanyId, userCompany, companies])

  const companyEmployees = useMemo(() => {
    if (!activeCompany) return []
    return employees.filter((e) => e.company_id === activeCompany.id)
  }, [employees, activeCompany])

  const printableData = useMemo(() => {
    if (!activeCompany) return []
    const grouped = companyEmployees
      .map((emp) => {
        const empEntries = payrollEntries.filter((e) => e.employee_id === emp.id)
        if (empEntries.length === 0) return null

        return {
          employee: emp,
          entries: empEntries,
          month: selectedMonth,
        }
      })
      .filter(Boolean)

    return grouped.filter((data) => selectedEmp === 'all' || data?.employee.id === selectedEmp)
  }, [selectedMonth, selectedEmp, payrollEntries, companyEmployees, activeCompany])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between gap-4 print-hidden bg-card p-4 rounded-lg border">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="space-y-1">
            <label className="text-sm font-medium">Mês/Ano</label>
            <PeriodSelector />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Empresa</label>
            <Select
              value={selectedCompanyId}
              onValueChange={setSelectedCompanyId}
              disabled={isLoading && companies.length === 0}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder={isLoading ? 'Carregando...' : 'Selecione uma empresa'} />
              </SelectTrigger>
              <SelectContent>
                {companies.length === 0 && !isLoading ? (
                  <SelectItem value="empty" disabled>
                    Nenhuma empresa encontrada
                  </SelectItem>
                ) : (
                  companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Funcionário</label>
            <Popover open={openEmp} onOpenChange={setOpenEmp}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openEmp}
                  className="w-[250px] justify-between font-normal bg-background"
                  disabled={!activeCompany || companyEmployees.length === 0}
                >
                  <span className="truncate">
                    {selectedEmp === 'all'
                      ? 'Todos os Funcionários'
                      : companyEmployees.find((e) => e.id === selectedEmp)?.name || 'Selecione...'}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[250px] p-0">
                <Command
                  filter={(value, search) => {
                    const normalizedValue = value
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .toLowerCase()
                    const normalizedSearch = search
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .toLowerCase()
                    if (normalizedValue.includes(normalizedSearch)) return 1
                    return 0
                  }}
                >
                  <div className="relative">
                    <CommandInput
                      placeholder="Buscar funcionário..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setSearchQuery('')
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                        aria-label="Limpar busca"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <CommandList>
                    <CommandEmpty>Nenhum funcionário encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all Todos os Funcionários"
                        onSelect={() => {
                          setSelectedEmp('all')
                          setOpenEmp(false)
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedEmp === 'all' ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        Todos os Funcionários
                      </CommandItem>
                      {companyEmployees.map((e) => (
                        <CommandItem
                          key={e.id}
                          value={`${e.name} ${e.id}`}
                          onSelect={() => {
                            setSelectedEmp(e.id)
                            setOpenEmp(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedEmp === e.id ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          {e.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex items-end">
          <Button
            onClick={handlePrint}
            disabled={printableData.length === 0 || !activeCompany}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir ({printableData.length})
          </Button>
        </div>
      </div>

      <div className="print-hidden mb-4 border-l-4 border-primary pl-4 py-2 text-muted-foreground bg-muted/30 rounded-r-md text-sm">
        Visualização em formato 80mm (bobina térmica). Clique em imprimir para gerar os recibos.
      </div>

      <div className="flex-1 overflow-auto print:overflow-visible pb-10 relative">
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-background/50 backdrop-blur-sm flex items-start pt-20 justify-center print-hidden">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        <div className="flex flex-wrap gap-8 print:block print:w-[80mm] print:m-0 print:p-0">
          {printableData.length === 0 && !isLoading && (
            <div className="text-center p-12 bg-card border rounded-lg w-full print-hidden">
              Nenhum dado encontrado para os filtros selecionados.
            </div>
          )}

          {activeCompany &&
            !isLoading &&
            printableData.map((data: any) => (
              <div
                key={data.employee.id}
                className="print:page-break-after-always last:print:page-break-after-auto shrink-0"
              >
                <HoleritePrint
                  employee={data.employee}
                  entries={data.entries}
                  month={data.month}
                  company={activeCompany}
                />
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
