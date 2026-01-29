import { Badge } from '@/components/ui/badge';
import { Check, Clock, FlaskConical, Construction } from 'lucide-react';

export type ImplementationStatus = 'ready' | 'beta' | 'coming_soon' | 'development';

interface ModuleStatusBadgeProps {
  status: ImplementationStatus;
  className?: string;
}

const statusConfig: Record<ImplementationStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  className: string;
}> = {
  ready: {
    label: 'Disponível',
    icon: Check,
    variant: 'default',
    className: 'bg-green-600 text-white hover:bg-green-700',
  },
  beta: {
    label: 'Beta',
    icon: FlaskConical,
    variant: 'secondary',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  coming_soon: {
    label: 'Em Breve',
    icon: Clock,
    variant: 'secondary',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
  development: {
    label: 'Em Desenvolvimento',
    icon: Construction,
    variant: 'outline',
    className: 'border-muted-foreground/30 text-muted-foreground',
  },
};

export function ModuleStatusBadge({ status, className }: ModuleStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.coming_soon;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} ${className || ''}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
