import { EventsManager } from '@/components/events/EventsManager';
import { CalendarDays } from 'lucide-react';

export default function Events() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          Eventos e Ingressos
        </h1>
        <p className="text-muted-foreground">
          Gerencie eventos, venda de ingressos e couvert artístico
        </p>
      </div>

      <EventsManager />
    </div>
  );
}
