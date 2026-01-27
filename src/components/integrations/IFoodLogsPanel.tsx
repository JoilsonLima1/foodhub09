import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IFoodLog {
  id: string;
  event_type: string;
  direction: string;
  endpoint: string | null;
  status_code: number | null;
  error_message: string | null;
  created_at: string;
}

export function IFoodLogsPanel() {
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['ifood-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ifood_logs')
        .select('id, event_type, direction, endpoint, status_code, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as IFoodLog[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Logs iFood</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Logs de Integração
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum log registrado</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {logs.map((log) => {
                const isInbound = log.direction === 'inbound';
                const isSuccess = log.status_code && log.status_code >= 200 && log.status_code < 300;
                
                return (
                  <div 
                    key={log.id} 
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 text-sm"
                  >
                    <div className={`p-1.5 rounded ${isInbound ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                      {isInbound ? (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{log.event_type}</span>
                        {log.status_code && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${isSuccess ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'}`}
                          >
                            {log.status_code}
                          </Badge>
                        )}
                      </div>
                      {log.endpoint && (
                        <p className="text-xs text-muted-foreground truncate">
                          {log.endpoint}
                        </p>
                      )}
                      {log.error_message && (
                        <p className="text-xs text-red-500 truncate">
                          {log.error_message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSuccess ? (
                        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      ) : log.error_message ? (
                        <XCircle className="w-3.5 h-3.5 text-red-500" />
                      ) : null}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
