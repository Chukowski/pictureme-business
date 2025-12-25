import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
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
import SuperAdminContent from "./components/super-admin/SuperAdminContent";
import SuperAdminLayout from "./components/super-admin/SuperAdminLayout";
import SuperAdminOverview from "./components/super-admin/SuperAdminOverview";
import SuperAdminUsers from "./components/super-admin/SuperAdminUsers";
import SuperAdminTiers from "./components/super-admin/SuperAdminTiers";
import SuperAdminApplications from "./components/super-admin/SuperAdminApplications";
import SuperAdminBilling from "./components/super-admin/SuperAdminBilling";
import SuperAdminEvents from "./components/super-admin/SuperAdminEvents";
import SuperAdminAIModels from "./components/super-admin/SuperAdminAIModels";
import SuperAdminMarketplace from "./components/super-admin/SuperAdminMarketplace";
import SuperAdminAnalytics from "./components/super-admin/SuperAdminAnalytics";
import SuperAdminSettings from "./components/super-admin/SuperAdminSettings";
import SuperAdminDevTools from "./components/super-admin/SuperAdminDevTools";
import PublicProfile from "./pages/PublicProfile";
import AlbumFeedPage from "./pages/AlbumFeedPage";
import StaffDashboard from "./pages/StaffDashboard";
import ViewerDisplayPage from "./pages/ViewerDisplayPage";
import OrganizationSettingsPage from "./pages/OrganizationSettingsPage";
import BusinessSettingsPage from "./pages/BusinessSettingsPage";
import ViewerStationPage from "./pages/ViewerStationPage";
import BigScreenPage from "./pages/BigScreenPage";
import { TermsPage } from "./pages/TermsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import ShortUrlEventPage from "./pages/ShortUrlEventPage";

// Creator Imports
import { CreatorLayout } from "./components/creator/CreatorLayout";
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import CreatorPlaceholder from "./pages/creator/CreatorPlaceholder";
import CreatorCreatePage from "./pages/creator/CreatorCreatePage";
import BoothDashboard from "./pages/creator/BoothDashboard";
import CreatorBoothPage from "./pages/creator/CreatorBoothPage";
import CreatorBoothEditor from "./pages/creator/CreatorBoothEditor";
import CreatorStudioPage from "./pages/creator/CreatorStudioPage";
import CreatorTemplatesPage from "./pages/creator/CreatorTemplatesPage";
import CreatorBillingPage from "./pages/creator/CreatorBillingPage";
import CreatorSupportPage from "./pages/creator/CreatorSupportPage";
import { CreatorOnly } from "./components/routing/CreatorOnly";

// CopilotKit imports (self-hosted, no cloud required)
import { CopilotKit } from "@copilotkit/react-core";
import { AkitoCopilotActions } from "./components/AkitoCopilotActions";

import ChatPage from "./pages/ChatPage";

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

const SettingsRedirect = () => {
  const user = getCurrentUser();
  const isBusiness = user?.role?.startsWith("business") && user.role !== "business_pending";
  return (
    <Navigate
      to={isBusiness ? "/admin/settings/business" : "/admin/settings/creator"}
      replace
    />
  );
};

import { ENV } from "@/config/env";
import { getCurrentUser } from "@/services/eventsApi";

import PlaygroundPage from "./pages/PlaygroundPage";
import LiveEventPage from "./pages/LiveEventPage";
import HomeDashboard from "./pages/HomeDashboard";
import CreatorSettingsPage from "./pages/settings/CreatorSettingsPage";

import { TopNavbar } from "./components/TopNavbar";
import { BusinessOnly } from "./components/routing/BusinessOnly";
import { UserTierProvider } from "./services/userTier";
import { useSSE } from "./hooks/useSSE";

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
const getApiUrl = (): string => {
  const url = ENV.API_URL;
  if (!url && import.meta.env.DEV) {
    return "http://localhost:3002";
  }
  return url;
};

// Wrapper component that conditionally includes CopilotKit
const AppContent = () => {
  const location = useLocation();
  const apiUrl = getApiUrl();

  // Only initialize CopilotKit on admin, super-admin, and creator pages
  const shouldInitCopilot = location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/super-admin') ||
    location.pathname.startsWith('/creator');

  // Check if user is on authenticated routes
  const isAuthenticatedRoute = shouldInitCopilot;

  // Initialize SSE for real-time updates (token balance, job status)
  // Only active on authenticated routes and when user has auth token
  const hasAuthToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');

  useSSE({
    enabled: isAuthenticatedRoute && hasAuthToken,
    onTokenUpdate: (data) => {
      console.log('🪙 Token balance updated via SSE:', data.new_balance);
      // The hook already updates localStorage and dispatches 'tokens-updated' event
    },
    onJobUpdate: (data) => {
      console.log('📋 Job status updated via SSE:', data.job_id, data.status);
      // The hook dispatches 'job-updated' event for components to listen
    },
    onConnected: () => {
      console.log('✅ SSE connected for real-time updates');
    },
    onDisconnected: () => {
      console.log('📡 SSE disconnected');
    },
  });

  return (
    <>
      {shouldInitCopilot && apiUrl && (
        <CopilotKit
          runtimeUrl={`${apiUrl}/copilotkit/`}
          properties={getUserProperties()}
        >
          <AkitoCopilotActions />
        </CopilotKit>
      )}
      <TopNavbar />
      <Routes>
        {/* Root shows Landing Page */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        {/* Share page - no sidebar, clean display */}
        <Route path="/share/:shareCode" element={<SharePage />} />

        {/* Short URL event routes - /e/:eventId/:eventSlug */}
        <Route path="/e/:eventId/:eventSlug" element={<ShortUrlEventPage />} />
        <Route path="/e/:eventId/:eventSlug/*" element={<ShortUrlEventPage />} />

        {/* Admin routes - no sidebar */}
        <Route path="/apply" element={<ApplyPage />} />

        {/* Super Admin Routes */}
        <Route path="/super-admin" element={<SuperAdminLayout />}>
          <Route index element={<SuperAdminOverview />} />
          <Route path="users" element={<SuperAdminUsers />} />
          <Route path="tiers" element={<SuperAdminTiers />} />
          <Route path="applications" element={<SuperAdminApplications />} />
          <Route path="billing" element={<SuperAdminBilling />} />
          <Route path="events" element={<SuperAdminEvents />} />
          <Route path="models" element={<SuperAdminAIModels />} />
          <Route path="marketplace" element={<SuperAdminMarketplace />} />
          <Route path="content" element={<SuperAdminContent />} />
          <Route path="analytics" element={<SuperAdminAnalytics />} />
          <Route path="settings" element={<SuperAdminSettings />} />
          <Route path="devtools" element={<SuperAdminDevTools />} />
          <Route path="*" element={<SuperAdminOverview />} />
        </Route>

        {/* CREATOR ROUTES (INDIVIDUAL) */}
        <Route path="/creator" element={
          <CreatorOnly>
            <CreatorLayout />
          </CreatorOnly>
        }>
          <Route index element={<Navigate to="/creator/dashboard" replace />} />
          <Route path="dashboard" element={<CreatorDashboard />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="create" element={<Navigate to="/creator/studio" replace />} />
          <Route path="booth" element={<BoothDashboard />} />
          <Route path="booth/:eventId" element={<CreatorBoothPage />} />
          <Route path="booth/:eventId/edit" element={<CreatorBoothEditor />} />
          <Route path="studio" element={<CreatorStudioPage />} />
          <Route path="templates" element={<CreatorTemplatesPage />} />
          <Route path="billing" element={<CreatorBillingPage />} />
          <Route path="support" element={<CreatorSupportPage />} />
          <Route path="settings" element={<CreatorSettingsPage />} />
          <Route path="*" element={<CreatorPlaceholder />} />
        </Route>

        {/* ADMIN ROUTES (BUSINESS) */}
        <Route path="/admin/auth" element={<AdminAuth />} />
        <Route path="/admin/register" element={<AdminRegister />} />

        {/* Main Admin Redirect */}
        <Route path="/admin" element={
          // If business, go to home. If creator, go to creator dashboard.
          // We can use a component to check this or just rely on guards.
          // For now, redirect to home, and let HomeDashboard redirect creator if needed, 
          // OR explicit check here.
          <Navigate to="/admin/home" replace />
        } />

        <Route path="/admin/home" element={
          <BusinessOnly>
            <HomeDashboard />
          </BusinessOnly>
        } />

        <Route path="/admin/events" element={
          <BusinessOnly>
            <AdminDashboard />
          </BusinessOnly>
        } />
        <Route path="/admin/events/create" element={
          <BusinessOnly>
            <AdminEventForm />
          </BusinessOnly>
        } />
        <Route path="/admin/events/edit/:eventId" element={
          <BusinessOnly>
            <AdminEventForm />
          </BusinessOnly>
        } />
        <Route path="/admin/events/:eventId/photos" element={
          <BusinessOnly>
            <AdminEventPhotos />
          </BusinessOnly>
        } />
        <Route path="/admin/events/:eventId/live" element={
          <BusinessOnly>
            <LiveEventPage />
          </BusinessOnly>
        } />

        <Route path="/admin/settings" element={<SettingsRedirect />} />
        {/* Removed CreatorSettingsPage from here, moved to /creator/settings */}
        {/* But keep it here temporarily for transition if needed, but safer to force separate paths */}
        <Route path="/admin/settings/creator" element={<Navigate to="/creator/settings" replace />} />

        <Route
          path="/admin/settings/business"
          element={
            <BusinessOnly>
              <BusinessSettingsPage />
            </BusinessOnly>
          }
        />
        {/* Billing and Tokens now redirect to Business Settings */}
        <Route path="/admin/billing" element={<Navigate to="/admin/settings/business" replace />} />
        <Route path="/admin/tokens" element={<Navigate to="/admin/settings/business" replace />} />
        <Route path="/admin/marketplace" element={
          <BusinessOnly>
            <AdminDashboard />
          </BusinessOnly>
        } />
        <Route path="/admin/chat" element={
          <BusinessOnly>
            <div className="min-h-screen bg-black pt-24 px-4 pb-4">
              <div className="max-w-7xl mx-auto">
                <ChatPage />
              </div>
            </div>
          </BusinessOnly>
        } />
        <Route path="/admin/playground" element={
          <BusinessOnly>
            <PlaygroundPage />
          </BusinessOnly>
        } />
        <Route path="/admin/analytics" element={
          <BusinessOnly>
            <AdminDashboard />
          </BusinessOnly>
        } />
        <Route path="/admin/studio" element={
          <BusinessOnly>
            <AdminDashboard />
          </BusinessOnly>
        } />
        <Route path="/admin/albums" element={
          <BusinessOnly>
            <AdminDashboard />
          </BusinessOnly>
        } />
        <Route path="/admin/organization" element={
          <BusinessOnly>
            <OrganizationSettingsPage />
          </BusinessOnly>
        } />
        <Route path="/admin/business" element={<Navigate to="/admin/settings/business" replace />} />
        <Route path="/admin/staff/:eventId" element={<StaffDashboard />} />
        {/* Catch-all for unknown admin routes - show 404 */}
        <Route path="/admin/*" element={<NotFound />} />

        {/* Public Profile */}
        <Route path="/profile/:username" element={<PublicProfile />} />

        {/* Dynamic event routes - no sidebar */}
        <Route path="/:userSlug/:eventSlug" element={<PhotoBoothPage />} />
        <Route path="/:userSlug/:eventSlug/feed" element={<EventFeedPage />} />
        <Route path="/:userSlug/:eventSlug/album/:albumId" element={<AlbumFeedPage />} />
        <Route path="/:userSlug/:eventSlug/staff" element={<StaffDashboard />} />
        <Route path="/:userSlug/:eventSlug/display" element={<Navigate to="../bigscreen" replace />} />

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
      </Routes >
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <UserTierProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </UserTierProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Note: AkitoWidget uses our custom branding with CopilotKit backend actions

export default App;
