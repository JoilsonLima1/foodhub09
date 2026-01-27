import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';
import { usePreparingAlerts } from '@/hooks/usePreparingAlerts';
import { TrialExpirationBanner } from '@/components/trial/TrialExpirationBanner';

export function AppLayout() {
  // Enable low stock alerts globally
  useLowStockAlerts();
  
  // Enable preparing order alerts globally
  usePreparingAlerts();

  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <main className="flex-1 md:ml-64">
        <div className="p-4 md:p-6 lg:p-8">
          <TrialExpirationBanner />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
