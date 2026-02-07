import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Mail, 
  MessageSquare, 
  Bell, 
  Smartphone,
  Pencil,
  Eye,
  Save,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { 
  useNotificationTemplates, 
  type NotificationTemplate, 
  type NotificationChannel 
} from '@/hooks/useNotifications';

const CHANNEL_ICONS: Record<NotificationChannel, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  inapp: <Bell className="h-4 w-4" />,
  sms: <Smartphone className="h-4 w-4" />,
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  inapp: 'In-App',
  sms: 'SMS',
};

interface TemplateEditorProps {
  template: NotificationTemplate | null;
  templateKey: string;
  channel: NotificationChannel;
  onSave: (data: { subject?: string; body: string; is_active: boolean }) => void;
  isSaving: boolean;
}

function TemplateEditor({ template, templateKey, channel, onSave, isSaving }: TemplateEditorProps) {
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body, setBody] = useState(template?.body ?? '');
  const [isActive, setIsActive] = useState(template?.is_active ?? true);

  return (
    <div className="space-y-4">
      {channel === 'email' && (
        <div className="space-y-2">
          <Label htmlFor="subject">Assunto</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Assunto do e-mail"
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="body">Corpo da mensagem</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Conteúdo da notificação (HTML para e-mail)"
          rows={12}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Use variáveis como <code className="bg-muted px-1 rounded">{"{{tenant_name}}"}</code> para personalização.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="active">Ativo</Label>
        </div>
        
        <Button onClick={() => onSave({ subject, body, is_active: isActive })} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Template
        </Button>
      </div>
    </div>
  );
}

interface TemplatePreviewDialogProps {
  templateKey: string;
  channel: NotificationChannel;
  previewFn: (key: string, channel: NotificationChannel, payload: Record<string, string>) => Promise<any>;
  variables: string[];
}

function TemplatePreviewDialog({ templateKey, channel, previewFn, variables }: TemplatePreviewDialogProps) {
  const [preview, setPreview] = useState<any>(null);
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handlePreview = async () => {
    setIsLoading(true);
    const result = await previewFn(templateKey, channel, payload);
    setPreview(result);
    setIsLoading(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1" /> Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview: {templateKey}</DialogTitle>
          <DialogDescription>Preencha as variáveis para visualizar o template renderizado.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {variables.map((v) => (
              <div key={v} className="space-y-1">
                <Label htmlFor={v} className="text-xs">{v}</Label>
                <Input
                  id={v}
                  value={payload[v] ?? ''}
                  onChange={(e) => setPayload({ ...payload, [v]: e.target.value })}
                  placeholder={`Valor de ${v}`}
                />
              </div>
            ))}
          </div>
          
          <Button onClick={handlePreview} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
            Gerar Preview
          </Button>
          
          {preview && (
            <div className="space-y-3 border rounded-lg p-4">
              {preview.is_default && (
                <Badge variant="secondary">Usando template padrão da plataforma</Badge>
              )}
              {channel === 'email' && (
                <div>
                  <Label className="text-xs text-muted-foreground">Assunto renderizado:</Label>
                  <p className="font-medium">{preview.rendered_subject}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Corpo renderizado:</Label>
                <div 
                  className="border rounded p-3 bg-muted/30 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: preview.rendered_body }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PartnerNotificationTemplates() {
  const { templates, groupedTemplates, isLoading, upsertTemplate, previewTemplate, partnerId } = useNotificationTemplates();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel>('email');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const templateKeys = Object.keys(groupedTemplates);

  const handleSave = async (data: { subject?: string; body: string; is_active: boolean }) => {
    if (!editingKey) return;
    await upsertTemplate.mutateAsync({
      channel: editingChannel,
      template_key: editingKey,
      subject: data.subject,
      body: data.body,
      is_active: data.is_active,
    });
    setEditingKey(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Templates de Notificação
          </CardTitle>
          <CardDescription>
            Personalize os templates de e-mail e notificações para sua marca. 
            Templates não configurados usarão o padrão da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Variáveis disponíveis</AlertTitle>
            <AlertDescription>
              Use <code className="bg-muted px-1 rounded">{"{{variavel}}"}</code> para inserir dados dinâmicos como nome do cliente, valor, etc.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="email">
            <TabsList>
              {Object.entries(CHANNEL_LABELS).map(([channel, label]) => (
                <TabsTrigger key={channel} value={channel} className="flex items-center gap-2">
                  {CHANNEL_ICONS[channel as NotificationChannel]}
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(CHANNEL_LABELS).map((channel) => (
              <TabsContent key={channel} value={channel} className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Personalizado</TableHead>
                      <TableHead className="w-[200px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templateKeys.map((key) => {
                      const group = groupedTemplates[key];
                      const partnerTemplate = group.partner;
                      const defaultTemplate = group.default;
                      const activeTemplate = partnerTemplate || defaultTemplate;
                      const isCustomized = !!partnerTemplate;
                      
                      // Filter by channel
                      if (activeTemplate?.channel !== channel) return null;

                      return (
                        <TableRow key={key}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{key}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {activeTemplate?.subject || '(sem assunto)'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {activeTemplate?.is_active ? (
                              <Badge variant="default"><Check className="h-3 w-3 mr-1" />Ativo</Badge>
                            ) : (
                              <Badge variant="secondary"><X className="h-3 w-3 mr-1" />Inativo</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isCustomized ? (
                              <Badge variant="outline" className="text-primary border-primary">Personalizado</Badge>
                            ) : (
                              <Badge variant="secondary">Padrão</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <TemplatePreviewDialog
                                templateKey={key}
                                channel={channel as NotificationChannel}
                                previewFn={previewTemplate}
                                variables={(activeTemplate?.variables as string[]) || []}
                              />
                              <Dialog open={editingKey === key && editingChannel === channel} onOpenChange={(o) => !o && setEditingKey(null)}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => { setEditingKey(key); setEditingChannel(channel as NotificationChannel); }}
                                  >
                                    <Pencil className="h-4 w-4 mr-1" /> Editar
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Editar Template: {key}</DialogTitle>
                                    <DialogDescription>
                                      {isCustomized 
                                        ? 'Editando seu template personalizado.' 
                                        : 'Criando personalização a partir do template padrão.'}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <TemplateEditor
                                    template={partnerTemplate || defaultTemplate}
                                    templateKey={key}
                                    channel={channel as NotificationChannel}
                                    onSave={handleSave}
                                    isSaving={upsertTemplate.isPending}
                                  />
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
