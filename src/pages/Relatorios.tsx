import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HoleritesView } from '@/components/HoleritesView'
import { FechamentoView } from '@/components/FechamentoView'

export default function Relatorios() {
  return (
    <div className="flex flex-col h-full space-y-4">
      <h1 className="text-2xl font-bold print-hidden">Relatórios</h1>
      <Tabs defaultValue="holerites" className="flex-1 flex flex-col min-h-0">
        <TabsList className="print-hidden w-fit">
          <TabsTrigger value="holerites">Holerites</TabsTrigger>
          <TabsTrigger value="fechamento">Fechamento do Mês</TabsTrigger>
        </TabsList>
        <TabsContent value="holerites" className="flex-1 mt-4 min-h-0">
          <HoleritesView />
        </TabsContent>
        <TabsContent value="fechamento" className="flex-1 mt-4 min-h-0">
          <FechamentoView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
