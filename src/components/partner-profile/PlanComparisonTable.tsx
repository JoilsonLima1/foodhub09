import { CheckCircle2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Plan {
  id: string;
  name: string;
  is_free?: boolean;
  monthly_price?: number;
  is_featured?: boolean;
  max_users?: number;
  max_products?: number;
  max_orders_per_month?: number;
  included_modules?: string[];
  trial_days?: number;
}

interface PlanComparisonTableProps {
  plans: Plan[];
}

const FEATURES = [
  { key: 'price', label: 'Preço mensal' },
  { key: 'max_users', label: 'Usuários' },
  { key: 'max_products', label: 'Produtos' },
  { key: 'max_orders_per_month', label: 'Pedidos/mês' },
  { key: 'modules', label: 'Módulos inclusos' },
  { key: 'trial', label: 'Teste grátis' },
];

function CellValue({ plan, featureKey }: { plan: Plan; featureKey: string }) {
  switch (featureKey) {
    case 'price':
      return plan.is_free
        ? <span className="font-bold text-primary">Grátis</span>
        : <span className="font-bold">R$ {Number(plan.monthly_price).toFixed(2).replace('.', ',')}</span>;
    case 'max_users':
      return plan.max_users ? <span>{plan.max_users}</span> : <span className="text-muted-foreground">Ilimitado</span>;
    case 'max_products':
      return plan.max_products ? <span>{plan.max_products}</span> : <span className="text-muted-foreground">Ilimitado</span>;
    case 'max_orders_per_month':
      return plan.max_orders_per_month ? <span>{plan.max_orders_per_month}</span> : <span className="text-muted-foreground">Ilimitado</span>;
    case 'modules':
      return (plan.included_modules || []).length > 0
        ? <span>{plan.included_modules!.length} módulos</span>
        : <X className="h-4 w-4 text-muted-foreground mx-auto" />;
    case 'trial':
      return plan.trial_days && plan.trial_days > 0
        ? <span>{plan.trial_days} dias</span>
        : <X className="h-4 w-4 text-muted-foreground mx-auto" />;
    default:
      return null;
  }
}

export function PlanComparisonTable({ plans }: PlanComparisonTableProps) {
  if (plans.length < 2) return null;

  return (
    <section className="py-16">
      <div className="container px-4 mx-auto max-w-4xl">
        <h2 className="text-3xl font-bold text-center mb-10">Comparar Planos</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Recurso</th>
                {plans.map(plan => (
                  <th key={plan.id} className="p-4 text-center font-semibold">
                    <div className="flex flex-col items-center gap-1">
                      {plan.name}
                      {plan.is_featured && (
                        <Badge variant="default" className="text-xs">Popular</Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature, i) => (
                <tr key={feature.key} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                  <td className="p-4 font-medium">{feature.label}</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="p-4 text-center">
                      <CellValue plan={plan} featureKey={feature.key} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
