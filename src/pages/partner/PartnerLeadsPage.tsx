/**
 * PartnerLeadsPage - Lead management for partners
 * 
 * Displays leads captured from public partner profile page.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePartnerContext } from '@/contexts/PartnerContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  Loader2,
  Download,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Lead {
  id: string;
  name: string;
  contact: string;
  message: string | null;
  source_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface LeadsResponse {
  success: boolean;
  leads: Lead[];
  total: number;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Novo', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contatado', color: 'bg-yellow-500' },
  { value: 'qualified', label: 'Qualificado', color: 'bg-purple-500' },
  { value: 'converted', label: 'Convertido', color: 'bg-green-500' },
  { value: 'closed', label: 'Fechado', color: 'bg-gray-500' },
];

function getStatusBadge(status: string) {
  const option = STATUS_OPTIONS.find(o => o.value === status);
  return (
    <Badge variant="outline" className="gap-1">
      <span className={`h-2 w-2 rounded-full ${option?.color || 'bg-gray-500'}`} />
      {option?.label || status}
    </Badge>
  );
}

export default function PartnerLeadsPage() {
  const { currentPartner } = usePartnerContext();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');

  // Fetch leads
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['partner-leads', currentPartner?.id, statusFilter],
    queryFn: async () => {
      if (!currentPartner?.id) return null;
      
      const { data, error } = await supabase
        .rpc('get_partner_leads', {
          p_partner_id: currentPartner.id,
          p_status: statusFilter === 'all' ? null : statusFilter,
          p_limit: 100,
          p_offset: 0,
        });
      
      if (error) throw error;
      return data as unknown as LeadsResponse;
    },
    enabled: !!currentPartner?.id,
  });

  // Update lead status
  const updateLead = useMutation({
    mutationFn: async ({ leadId, status, notes }: { leadId: string; status: string; notes?: string }) => {
      const { data, error } = await supabase
        .rpc('update_partner_lead_status', {
          p_lead_id: leadId,
          p_status: status,
          p_notes: notes || null,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Lead atualizado');
      queryClient.invalidateQueries({ queryKey: ['partner-leads'] });
      setSelectedLead(null);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });

  const handleUpdateLead = () => {
    if (!selectedLead || !updateStatus) return;
    updateLead.mutate({
      leadId: selectedLead.id,
      status: updateStatus,
      notes: updateNotes,
    });
  };

  const openUpdateDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setUpdateStatus(lead.status);
    setUpdateNotes(lead.notes || '');
  };

  // Filter leads by search
  const filteredLeads = data?.leads?.filter(lead => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.contact.toLowerCase().includes(query) ||
      lead.message?.toLowerCase().includes(query)
    );
  }) || [];

  // Export to CSV
  const handleExport = () => {
    if (!filteredLeads.length) return;
    
    const headers = ['Nome', 'Contato', 'Mensagem', 'Status', 'Data'];
    const rows = filteredLeads.map(lead => [
      lead.name,
      lead.contact,
      lead.message || '',
      lead.status,
      format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm'),
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Leads
          </h1>
          <p className="text-muted-foreground">
            Potenciais clientes do seu perfil público
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!filteredLeads.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, contato ou mensagem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{data?.total || 0}</div>
            <p className="text-sm text-muted-foreground">Total de leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">
              {data?.leads?.filter(l => l.status === 'new').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Novos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-500">
              {data?.leads?.filter(l => l.status === 'qualified').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Qualificados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">
              {data?.leads?.filter(l => l.status === 'converted').length || 0}
            </div>
            <p className="text-sm text-muted-foreground">Convertidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum lead encontrado</p>
              <p className="text-sm">Leads aparecerão quando visitantes preencherem seu formulário público.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {lead.contact.includes('@') ? (
                          <Mail className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Phone className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-sm">{lead.contact}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {lead.message || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(lead.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => openUpdateDialog(lead)}
                      >
                        Atualizar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Lead</DialogTitle>
            <DialogDescription>
              {selectedLead?.name} - {selectedLead?.contact}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Anotações</Label>
              <Textarea
                placeholder="Adicione observações sobre este lead..."
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLead(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateLead} disabled={updateLead.isPending}>
              {updateLead.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
