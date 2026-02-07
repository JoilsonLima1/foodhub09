import { PartnerNotificationTemplates } from '@/components/partner/PartnerNotificationTemplates';

export default function PartnerNotificationsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Notificações</h1>
        <p className="text-muted-foreground">
          Gerencie os templates de notificação para sua marca
        </p>
      </div>
      <PartnerNotificationTemplates />
    </div>
  );
}
