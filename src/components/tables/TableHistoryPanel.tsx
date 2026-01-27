import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Receipt, 
  Calendar,
  Clock,
  User,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TableHistoryPanelProps {
  tableId: string;
  tableNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoricalSession {
  id: string;
  customer_name: string | null;
  opened_at: string;
  closed_at: string | null;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  items: {
    id: string;
    product_name: string;
    variation_name: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

export function TableHistoryPanel({ tableId, tableNumber, open, onOpenChange }: TableHistoryPanelProps) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['table-history', tableId],
    queryFn: async (): Promise<HistoricalSession[]> => {
      // Get closed sessions for this table
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('table_sessions')
        .select('*')
        .eq('table_id', tableId)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(50);

      if (sessionsError) throw sessionsError;

      // Get items for all sessions
      const sessionIds = sessionsData?.map(s => s.id) || [];
      let itemsMap: Record<string, HistoricalSession['items']> = {};

      if (sessionIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('table_session_items')
          .select('id, session_id, product_name, variation_name, quantity, unit_price, total_price')
          .in('session_id', sessionIds)
          .order('added_at');

        if (itemsError) throw itemsError;

        itemsMap = (itemsData || []).reduce((acc, item) => {
          const sid = (item as any).session_id;
          if (!acc[sid]) acc[sid] = [];
          acc[sid].push({
            id: item.id,
            product_name: item.product_name,
            variation_name: item.variation_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          });
          return acc;
        }, {} as Record<string, HistoricalSession['items']>);
      }

      return (sessionsData || []).map(s => ({
        id: s.id,
        customer_name: s.customer_name,
        opened_at: s.opened_at,
        closed_at: s.closed_at,
        subtotal: s.subtotal || 0,
        discount: s.discount || 0,
        total: s.total || 0,
        status: s.status,
        items: itemsMap[s.id] || [],
      }));
    },
    enabled: open,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="flex items-center gap-3">
            <Receipt className="h-5 w-5" />
            Histórico - Mesa {tableNumber}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Últimas 50 comandas fechadas
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          {isLoading ? (
            <div className="space-y-4 pb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum histórico encontrado</p>
              <p className="text-sm">As comandas fechadas aparecerão aqui</p>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {sessions.map((session) => (
                <Collapsible
                  key={session.id}
                  open={expandedSession === session.id}
                  onOpenChange={(isOpen) => 
                    setExpandedSession(isOpen ? session.id : null)
                  }
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {session.closed_at && formatDateTime(session.closed_at)}
                          </span>
                        </div>
                        
                        {session.customer_name && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                            <User className="h-3 w-3" />
                            <span>{session.customer_name}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {session.items.length} {session.items.length === 1 ? 'item' : 'itens'}
                          </Badge>
                          {session.discount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Desc: {formatCurrency(session.discount)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="font-bold text-lg">
                          {formatCurrency(session.total)}
                        </span>
                        <ChevronRight 
                          className={`h-4 w-4 mt-2 mx-auto text-muted-foreground transition-transform ${
                            expandedSession === session.id ? 'rotate-90' : ''
                          }`} 
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="ml-4 mt-2 p-3 rounded-lg bg-background border">
                      <p className="text-sm font-medium mb-2">Itens consumidos:</p>
                      <div className="space-y-1">
                        {session.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.quantity}x {item.product_name}
                              {item.variation_name && ` (${item.variation_name})`}
                            </span>
                            <span>{formatCurrency(item.total_price)}</span>
                          </div>
                        ))}
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(session.subtotal)}</span>
                      </div>
                      {session.discount > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Desconto:</span>
                          <span>-{formatCurrency(session.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold mt-1">
                        <span>Total:</span>
                        <span>{formatCurrency(session.total)}</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}