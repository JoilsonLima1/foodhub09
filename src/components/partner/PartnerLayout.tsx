/**
 * PartnerLayout - Main layout for partner panel
 */

import { Outlet } from 'react-router-dom';
import { PartnerSidebar } from './PartnerSidebar';

export function PartnerLayout() {
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
