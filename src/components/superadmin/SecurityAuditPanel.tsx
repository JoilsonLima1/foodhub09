/**
 * SecurityAuditPanel - Painel de auditoria de segurança
 * 
 * Exibe logs de acesso e ações sensíveis:
 * - Access audit log
 * - Sensitive actions log
 * - LGPD requests
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Shield,
  AlertTriangle,
  Eye,
  Search,
  Loader2,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AccessLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  ip_address: string;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

interface SensitiveAction {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  risk_level: string;
  requires_review: boolean;
  reviewed_at: string | null;
  created_at: string;
}

interface DataSubjectRequest {
  id: string;
  tenant_id: string;
  requester_email: string;
  request_type: string;
  status: string;
  submitted_at: string;
  deadline_at: string;
  processed_at: string | null;
}

export function SecurityAuditPanel() {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch access logs
  const { data: accessLogs = [], isLoading: loadingAccess } = useQuery({
    queryKey: ['access-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as AccessLog[];
    },
  });

  // Fetch sensitive actions
  const { data: sensitiveActions = [], isLoading: loadingSensitive } = useQuery({
    queryKey: ['sensitive-actions-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sensitive_actions_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return (data || []) as SensitiveAction[];
    },
  });

  // Fetch LGPD requests
  const { data: lgpdRequests = [], isLoading: loadingLGPD } = useQuery({
    queryKey: ['data-subject-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_subject_requests')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data || []) as DataSubjectRequest[];
    },
  });

  // Risk level badge
  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">Alto</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Médio</Badge>;
      default:
        return <Badge variant="secondary">Baixo</Badge>;
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Concluído</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processando</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  // Filter functions
  const filteredAccessLogs = accessLogs.filter(log =>
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.resource?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSensitiveActions = sensitiveActions.filter(action =>
    action.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    action.target_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const pendingReviews = sensitiveActions.filter(a => a.requires_review && !a.reviewed_at).length;
  const criticalActions = sensitiveActions.filter(a => a.risk_level === 'critical').length;
  const pendingLGPD = lgpdRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Auditoria de Segurança
          </h2>
          <p className="text-sm text-muted-foreground">
            Logs de acesso, ações sensíveis e requisições LGPD
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Acessos (24h)</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessLogs.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendentes Revisão</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingReviews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ações Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalActions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">LGPD Pendentes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLGPD}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sensitive" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sensitive">
            Ações Sensíveis
            {pendingReviews > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {pendingReviews}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="access">Logs de Acesso</TabsTrigger>
          <TabsTrigger value="lgpd">
            Requisições LGPD
            {pendingLGPD > 0 && (
              <Badge className="ml-2 h-5 px-1.5 bg-amber-500">
                {pendingLGPD}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sensitive">
          <Card>
            <CardHeader>
              <CardTitle>Ações Sensíveis</CardTitle>
              <CardDescription>
                Operações de alto risco que requerem atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSensitive ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Alvo</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Revisão</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSensitiveActions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium">
                          {action.action}
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {action.target_type}
                          </span>
                          <br />
                          <span className="text-xs font-mono">
                            {action.target_id?.slice(0, 8)}...
                          </span>
                        </TableCell>
                        <TableCell>
                          {getRiskBadge(action.risk_level)}
                        </TableCell>
                        <TableCell>
                          {action.requires_review ? (
                            action.reviewed_at ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-500" />
                            )
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(action.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSensitiveActions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma ação sensível registrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Acesso</CardTitle>
              <CardDescription>
                Registro de acessos ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAccess ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Recurso</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccessLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.action}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.resource || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.ip_address || '-'}
                        </TableCell>
                        <TableCell>
                          {log.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAccessLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum log de acesso registrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lgpd">
          <Card>
            <CardHeader>
              <CardTitle>Requisições LGPD</CardTitle>
              <CardDescription>
                Solicitações de exportação e exclusão de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLGPD ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Solicitado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lgpdRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">
                          {req.request_type === 'export' ? 'Exportação' : 
                           req.request_type === 'deletion' ? 'Exclusão' : req.request_type}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {req.requester_email}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(req.status)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(req.deadline_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(req.submitted_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {lgpdRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma requisição LGPD
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
