import { ComandasManager } from '@/components/comandas/ComandasManager';
import { ServiceCallsPanel } from '@/components/comandas/ServiceCallsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, Bell } from 'lucide-react';

export default function Comandas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="h-6 w-6" />
          Comandas
        </h1>
        <p className="text-muted-foreground">
          Gerencie comandas, pedidos e chamados de serviço
        </p>
      </div>

      <Tabs defaultValue="comandas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comandas" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Comandas
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Chamados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="comandas">
          <ComandasManager />
        </TabsContent>

        <TabsContent value="calls">
          <ServiceCallsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
