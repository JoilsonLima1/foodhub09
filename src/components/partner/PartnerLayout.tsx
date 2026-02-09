/**
 * PartnerLayout - Main layout for partner panel
 * MUST NOT import AppLayout, AppSidebar, or any tenant components.
 */

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PartnerSidebar } from './PartnerSidebar';

export function PartnerLayout() {
  const location = useLocation();

  useEffect(() => {
    console.info('[PARTNER_LAYOUT]', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex w-full bg-background">
      <PartnerSidebar />
      <main className="flex-1 ml-64 overflow-y-auto max-h-screen">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
