import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { StoneTenantPanel } from '@/components/stone/StoneTenantPanel';

export default function StoneTenantPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/settings?tab=payments')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para Pagamentos
      </Button>
      <StoneTenantPanel />
    </div>
  );
}
