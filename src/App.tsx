import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import { SharePage } from "./pages/SharePage";
import { PhotoBoothPage } from "./pages/PhotoBoothPage";
import { EventFeedPage } from "./pages/EventFeedPage";
import NotFound from "./pages/NotFound";
import AdminAuth from "./pages/AdminAuth";
import AdminRegister from "./pages/AdminRegister";
import ApplyPage from "./pages/ApplyPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminEvents from "./pages/AdminEvents";
import AdminEventForm from "./pages/AdminEventForm";
import AdminEventPhotos from "./pages/AdminEventPhotos";
import SuperAdminLayout from "./components/super-admin/SuperAdminLayout";
import SuperAdminOverview from "./components/super-admin/SuperAdminOverview";
import SuperAdminUsers from "./components/super-admin/SuperAdminUsers";
import SuperAdminApplications from "./components/super-admin/SuperAdminApplications";
import SuperAdminBilling from "./components/super-admin/SuperAdminBilling";
import SuperAdminEvents from "./components/super-admin/SuperAdminEvents";
import SuperAdminAIModels from "./components/super-admin/SuperAdminAIModels";
import SuperAdminMarketplace from "./components/super-admin/SuperAdminMarketplace";
import SuperAdminAnalytics from "./components/super-admin/SuperAdminAnalytics";
import SuperAdminSettings from "./components/super-admin/SuperAdminSettings";
import SuperAdminDevTools from "./components/super-admin/SuperAdminDevTools";
import PublicProfile from "./pages/PublicProfile";
import AccountSettings from "./pages/AccountSettings";
import AlbumFeedPage from "./pages/AlbumFeedPage";
import StaffDashboard from "./pages/StaffDashboard";
import OrganizationSettingsPage from "./pages/OrganizationSettingsPage";
import BusinessSettingsPage from "./pages/BusinessSettingsPage";
import ViewerStationPage from "./pages/ViewerStationPage";
import BigScreenPage from "./pages/BigScreenPage";

// CopilotKit imports (self-hosted, no cloud required)
import { CopilotKit } from "@copilotkit/react-core";
import { AkitoCopilotActions } from "./components/AkitoCopilotActions";
import { AkitoWidget } from "./components/AkitoWidget";

const queryClient = new QueryClient();

const FloatingSidebarToggle = () => {
  const { state } = useSidebar();
  if (state !== "collapsed") return null;
  return (
    <div className="hidden md:flex fixed top-3 left-3 z-30">
      <SidebarTrigger className="shadow-card" />
    </div>
  );
};

import { ENV } from "@/config/env";

// Get user info for CopilotKit context
const getUserProperties = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        user_id: user.id,
        user_role: user.role || "guest",
        user_name: user.full_name || user.username || "Guest",
      };
    }
  } catch {
    // Ignore parse errors
  }
  return { user_id: null, user_role: "guest", user_name: "Guest" };
};

// Get API URL with HTTPS enforcement for production
// This is a function to ensure it's evaluated when needed, not at module load time
const getApiUrl = (): string => {
  // Try window.ENV first (runtime config from config.js)
  let url = '';
  
  if (typeof window !== 'undefined' && window.ENV?.VITE_API_URL) {
    url = window.ENV.VITE_API_URL;
  } else {
    url = ENV.API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
  }
  
  // Enforce HTTPS in production (non-localhost)
  if (url && url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    console.warn('🔒 [App] Forcing HTTPS for API URL:', url);
    url = url.replace('http://', 'https://');
  }
  
  return url;
};

const App = () => {
  // Get API URL dynamically inside the component
  const apiUrl = getApiUrl();
  
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* CopilotKit Provider - Self-hosted, connects to our FastAPI backend */}
          <CopilotKit
            runtimeUrl={`${apiUrl}/copilotkit`}
            properties={getUserProperties()}
          >
            {/* Register frontend actions for Akito */}
            <AkitoCopilotActions />
            {/* Custom Akito Widget with our branding */}
            <AkitoWidget />
          </CopilotKit>
          <Routes>
            {/* Root shows Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Share page - no sidebar, clean display */}
            <Route path="/share/:shareCode" element={<SharePage />} />

            {/* Admin routes - no sidebar */}
            <Route path="/apply" element={<ApplyPage />} />

            {/* Super Admin Routes */}
            <Route path="/super-admin" element={<SuperAdminLayout />}>
              <Route index element={<SuperAdminOverview />} />
              <Route path="users" element={<SuperAdminUsers />} />
              <Route path="applications" element={<SuperAdminApplications />} />
              <Route path="billing" element={<SuperAdminBilling />} />
              <Route path="events" element={<SuperAdminEvents />} />
              <Route path="models" element={<SuperAdminAIModels />} />
              <Route path="marketplace" element={<SuperAdminMarketplace />} />
              <Route path="analytics" element={<SuperAdminAnalytics />} />
              <Route path="settings" element={<SuperAdminSettings />} />
              <Route path="devtools" element={<SuperAdminDevTools />} />
              <Route path="*" element={<SuperAdminOverview />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin/auth" element={<AdminAuth />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/events" element={<AdminDashboard />} />
            <Route path="/admin/events/create" element={<AdminEventForm />} />
            <Route path="/admin/events/edit/:eventId" element={<AdminEventForm />} />
            <Route path="/admin/events/:eventId/photos" element={<AdminEventPhotos />} />
            <Route path="/admin/settings" element={<AccountSettings />} />
            {/* Billing and Tokens now redirect to Business Settings */}
            <Route path="/admin/billing" element={<Navigate to="/admin/business" replace />} />
            <Route path="/admin/tokens" element={<Navigate to="/admin/business" replace />} />
            <Route path="/admin/marketplace" element={<AdminDashboard />} />
            <Route path="/admin/playground" element={<AdminDashboard />} />
            <Route path="/admin/analytics" element={<AdminDashboard />} />
            <Route path="/admin/studio" element={<AdminDashboard />} />
            <Route path="/admin/albums" element={<AdminDashboard />} />
            <Route path="/admin/organization" element={<OrganizationSettingsPage />} />
            <Route path="/admin/business" element={<BusinessSettingsPage />} />
            {/* Catch-all for unknown admin routes - show 404 */}
            <Route path="/admin/*" element={<NotFound />} />

            {/* Public Profile */}
            <Route path="/profile/:username" element={<PublicProfile />} />

            {/* Dynamic event routes - no sidebar */}
            <Route path="/:userSlug/:eventSlug" element={<PhotoBoothPage />} />
            <Route path="/:userSlug/:eventSlug/feed" element={<EventFeedPage />} />
            <Route path="/:userSlug/:eventSlug/album/:albumId" element={<AlbumFeedPage />} />
            <Route path="/:userSlug/:eventSlug/staff" element={<StaffDashboard />} />
            
            {/* Station-specific routes for multi-station flow */}
            <Route path="/:userSlug/:eventSlug/registration" element={<PhotoBoothPage />} />
            <Route path="/:userSlug/:eventSlug/booth" element={<PhotoBoothPage />} />
            <Route path="/:userSlug/:eventSlug/playground" element={<PhotoBoothPage />} />
            <Route path="/:userSlug/:eventSlug/viewer" element={<ViewerStationPage />} />
            <Route path="/:userSlug/:eventSlug/bigscreen" element={<BigScreenPage />} />

            {/* Legacy Index page (if needed) */}
            <Route path="/legacy" element={<Index />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

// Note: AkitoWidget uses our custom branding with CopilotKit backend actions

export default App;
