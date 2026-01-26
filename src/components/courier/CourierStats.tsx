import { Card, CardContent } from '@/components/ui/card';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';

interface CourierStatsProps {
  total: number;
  pending: number;
  inRoute: number;
  completed: number;
}

export function CourierStats({ total, pending, inRoute, completed }: CourierStatsProps) {
  const stats = [
    {
      label: 'Total',
      value: total,
      icon: Package,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Pendentes',
      value: pending,
      icon: Clock,
      color: 'text-warning bg-warning/10',
    },
    {
      label: 'Em Rota',
      value: inRoute,
      icon: Truck,
      color: 'text-info bg-info/10',
    },
    {
      label: 'Entregues',
      value: completed,
      icon: CheckCircle,
      color: 'text-success bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-3 text-center">
            <div className={`mx-auto mb-2 h-8 w-8 rounded-full ${stat.color} flex items-center justify-center`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
