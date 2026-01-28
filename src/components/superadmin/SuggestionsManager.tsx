import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  MessageSquare,
  Mail,
  Phone,
  Building2,
  User,
  Calendar,
  Tag,
  CheckCircle,
  Eye,
  Archive,
  Clock,
  Send,
  Trash2,
  Loader2,
  RefreshCw,
  MessageSquarePlus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSuggestions, type Suggestion, type SuggestionStatus } from '@/hooks/useSuggestions';
import { useAuth } from '@/contexts/AuthContext';

const statusConfig: Record<SuggestionStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-500', icon: Clock },
  read: { label: 'Lido', color: 'bg-blue-500/10 text-blue-500', icon: Eye },
  responded: { label: 'Respondido', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
  archived: { label: 'Arquivado', color: 'bg-muted text-muted-foreground', icon: Archive },
};

const typeLabels: Record<string, string> = {
  improvement: 'Melhoria',
  bug: 'Bug',
  feature: 'Funcionalidade',
  other: 'Outro',
};

const sourceLabels: Record<string, string> = {
  landing: 'Página de Vendas',
  organization: 'Organização',
};

export function SuggestionsManager() {
  const { user } = useAuth();
  const {
    suggestions,
    isLoading,
    fetchSuggestions,
    updateSuggestionStatus,
    respondToSuggestion,
    deleteSuggestion,
  } = useSuggestions();

  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'landing' | 'organization'>('all');

  const filteredSuggestions = suggestions.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (sourceFilter !== 'all' && s.source !== sourceFilter) return false;
    return true;
  });

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;

  const handleOpenSuggestion = async (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setResponseText(suggestion.admin_response || '');
    
    // Mark as read if pending
    if (suggestion.status === 'pending') {
      await updateSuggestionStatus(suggestion.id, 'read');
    }
  };

  const handleRespond = async () => {
    if (!selectedSuggestion || !responseText.trim() || !user) return;

    setIsResponding(true);
    const success = await respondToSuggestion(
      selectedSuggestion.id,
      responseText.trim(),
      user.id
    );

    if (success) {
      setSelectedSuggestion(null);
      setResponseText('');
    }
    setIsResponding(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteSuggestion(deleteTarget);
    setDeleteTarget(null);
    if (selectedSuggestion?.id === deleteTarget) {
      setSelectedSuggestion(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" />
              Caixa de Sugestões
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} nova{pendingCount > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Gerencie sugestões e feedback de usuários e visitantes
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as SuggestionStatus | 'all')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(statusConfig).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Select
              value={sourceFilter}
              onValueChange={(v) => setSourceFilter(v as 'all' | 'landing' | 'organization')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                <SelectItem value="landing">Página de Vendas</SelectItem>
                <SelectItem value="organization">Organização</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Suggestions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma sugestão encontrada</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredSuggestions.map((suggestion) => {
                const StatusIcon = statusConfig[suggestion.status].icon;
                return (
                  <div
                    key={suggestion.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                      suggestion.status === 'pending' ? 'border-yellow-500/50 bg-yellow-500/5' : ''
                    }`}
                    onClick={() => handleOpenSuggestion(suggestion)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={statusConfig[suggestion.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[suggestion.status].label}
                          </Badge>
                          <Badge variant="outline">{typeLabels[suggestion.suggestion_type]}</Badge>
                          <Badge variant="secondary">{sourceLabels[suggestion.source]}</Badge>
                        </div>
                        <h4 className="font-medium truncate">{suggestion.subject}</h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {suggestion.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {suggestion.name}
                          </span>
                          {suggestion.organization_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {suggestion.organization_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(suggestion.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(suggestion.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
            {selectedSuggestion && (
              <>
                <DialogHeader className="shrink-0">
                  <DialogTitle>{selectedSuggestion.subject}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2">
                    <Badge className={statusConfig[selectedSuggestion.status].color}>
                      {statusConfig[selectedSuggestion.status].label}
                    </Badge>
                    <Badge variant="outline">
                      {typeLabels[selectedSuggestion.suggestion_type]}
                    </Badge>
                    <Badge variant="secondary">{sourceLabels[selectedSuggestion.source]}</Badge>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 overflow-y-auto flex-1">
                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedSuggestion.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${selectedSuggestion.email}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {selectedSuggestion.email}
                      </a>
                    </div>
                    {selectedSuggestion.whatsapp && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`https://wa.me/${selectedSuggestion.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {selectedSuggestion.whatsapp}
                        </a>
                      </div>
                    )}
                    {selectedSuggestion.organization_name && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedSuggestion.organization_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Mensagem</h4>
                    <p className="text-sm whitespace-pre-wrap p-4 bg-muted/30 rounded-lg">
                      {selectedSuggestion.message}
                    </p>
                  </div>

                  {/* Admin Response */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Resposta do Administrador</h4>
                    {selectedSuggestion.status === 'responded' ? (
                      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {selectedSuggestion.admin_response}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Respondido em{' '}
                          {format(
                            new Date(selectedSuggestion.responded_at!),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Digite sua resposta..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        rows={4}
                      />
                    )}
                  </div>

                  {/* Actions */}
                  {selectedSuggestion.status !== 'responded' && (
                    <div className="flex items-center justify-between pt-4 border-t shrink-0">
                      <Select
                        value={selectedSuggestion.status}
                        onValueChange={(v) =>
                          updateSuggestionStatus(selectedSuggestion.id, v as SuggestionStatus)
                        }
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([value, { label }]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        onClick={handleRespond}
                        disabled={!responseText.trim() || isResponding}
                      >
                        {isResponding ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Enviar Resposta
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Sugestão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta sugestão? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
