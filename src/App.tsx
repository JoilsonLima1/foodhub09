import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessCategoryProvider } from "@/contexts/BusinessCategoryContext";
import { ActiveStoreProvider } from "@/contexts/ActiveStoreContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ModuleRouteGuard } from "@/components/auth/ModuleRouteGuard";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";

import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import POS from "./pages/POS";
import Kitchen from "./pages/Kitchen";
import Deliveries from "./pages/Deliveries";
import Products from "./pages/Products";
import Stock from "./pages/Stock";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import CourierDashboard from "./pages/CourierDashboard";
import SuperAdmin from "./pages/SuperAdmin";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import NotFound from "./pages/NotFound";
import Tables from "./pages/Tables";
import PublicMenu from "./pages/PublicMenu";
import TrackOrder from "./pages/TrackOrder";
import Stores from "./pages/Stores";
import Comandas from "./pages/Comandas";
import Events from "./pages/Events";
import Marketing from "./pages/Marketing";

const queryClient = new QueryClient();

// Component that applies the dynamic favicon
function DynamicFaviconHandler() {
  useDynamicFavicon();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DynamicFaviconHandler />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BusinessCategoryProvider>
            <ActiveStoreProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/checkout/success" element={<CheckoutSuccess />} />
                
                {/* Public Menu - accessible without auth */}
                <Route path="/menu/:tenantId" element={<PublicMenu />} />
                
                {/* Order Tracking - accessible without auth */}
                <Route path="/rastrear" element={<TrackOrder />} />
                <Route path="/rastrear/:tenantId" element={<TrackOrder />} />
                
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/pos" element={<POS />} />
                  <Route path="/tables" element={<Tables />} />
                  {/* Module-gated routes */}
                  <Route path="/comandas" element={<ModuleRouteGuard><Comandas /></ModuleRouteGuard>} />
                  <Route path="/events" element={<ModuleRouteGuard><Events /></ModuleRouteGuard>} />
                  <Route path="/kitchen" element={<ModuleRouteGuard><Kitchen /></ModuleRouteGuard>} />
                  <Route path="/deliveries" element={<ModuleRouteGuard><Deliveries /></ModuleRouteGuard>} />
                  <Route path="/stores" element={<ModuleRouteGuard><Stores /></ModuleRouteGuard>} />
                  <Route path="/marketing" element={<ModuleRouteGuard><Marketing /></ModuleRouteGuard>} />
                  {/* Standard routes */}
                  <Route path="/products" element={<Products />} />
                  <Route path="/stock" element={<Stock />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/courier-dashboard" element={<CourierDashboard />} />
                  <Route path="/super-admin" element={<SuperAdmin />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ActiveStoreProvider>
          </BusinessCategoryProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
