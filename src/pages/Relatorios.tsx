import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HoleritesView } from '@/components/HoleritesView'
import { FechamentoView } from '@/components/FechamentoView'
import { AuditLogsView } from '@/components/AuditLogsView'

export default function Relatorios() {
  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:hidden">
        <h1 className="text-2xl font-bold">Relatórios</h1>
      </div>

      <Tabs
        defaultValue="holerites"
        className="flex-1 flex flex-col min-h-0 print:block print:overflow-visible"
      >
        <TabsList className="w-fit print-hidden print:hidden flex-shrink-0">
          <TabsTrigger value="holerites">Holerites</TabsTrigger>
          <TabsTrigger value="fechamento">Fechamento do Mês</TabsTrigger>
          <TabsTrigger value="logs">Logs de Alterações</TabsTrigger>
        </TabsList>
        <TabsContent
          value="holerites"
          className="flex-1 data-[state=active]:flex data-[state=active]:flex-col mt-2 min-h-0 print:mt-0"
        >
          <HoleritesView />
        </TabsContent>
        <TabsContent
          value="fechamento"
          className="flex-1 data-[state=active]:flex data-[state=active]:flex-col mt-2 min-h-0 print:mt-0"
        >
          <FechamentoView />
        </TabsContent>
        <TabsContent
          value="logs"
          className="flex-1 data-[state=active]:flex data-[state=active]:flex-col mt-2 min-h-0 print:mt-0"
        >
          <AuditLogsView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
