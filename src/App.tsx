import { lazy, Suspense, useEffect, useRef, useCallback, useState } from 'react';
import { SEO } from "./components/SEO";
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
import CreatorDashboard from "./pages/creator/CreatorDashboard";
import PublicProfile from "./pages/PublicProfile";

// Lazy-loaded routes
const SharePage = lazy(() => import("./pages/SharePage").then(module => ({ default: module.SharePage })));
const PhotoBoothPage = lazy(() => import("./pages/PhotoBoothPage").then(module => ({ default: module.PhotoBoothPage })));
const EventFeedPage = lazy(() => import("./pages/EventFeedPage").then(module => ({ default: module.EventFeedPage })));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AdminRegister = lazy(() => import("./pages/AdminRegister"));
const ApplyPage = lazy(() => import("./pages/ApplyPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminEvents = lazy(() => import("./pages/AdminEvents"));
const AdminEventForm = lazy(() => import("./pages/AdminEventForm"));
const AdminEventPhotos = lazy(() => import("./pages/AdminEventPhotos"));
const SuperAdminContent = lazy(() => import("./components/super-admin/SuperAdminContent"));
const SuperAdminLayout = lazy(() => import("./components/super-admin/SuperAdminLayout"));
const SuperAdminOverview = lazy(() => import("./components/super-admin/SuperAdminOverview"));
const SuperAdminUsers = lazy(() => import("./components/super-admin/SuperAdminUsers"));
const SuperAdminTiers = lazy(() => import("./components/super-admin/SuperAdminTiers"));
const SuperAdminApplications = lazy(() => import("./components/super-admin/SuperAdminApplications"));
const SuperAdminBilling = lazy(() => import("./components/super-admin/SuperAdminBilling"));
const SuperAdminEvents = lazy(() => import("./components/super-admin/SuperAdminEvents"));
const SuperAdminAIModels = lazy(() => import("./components/super-admin/SuperAdminAIModels"));
const SuperAdminMarketplace = lazy(() => import("./components/super-admin/SuperAdminMarketplace"));
const SuperAdminAnalytics = lazy(() => import("./components/super-admin/SuperAdminAnalytics"));
const SuperAdminSettings = lazy(() => import("./components/super-admin/SuperAdminSettings"));
const SuperAdminDevTools = lazy(() => import("./components/super-admin/SuperAdminDevTools"));
const AlbumFeedPage = lazy(() => import("./pages/AlbumFeedPage"));
const StaffDashboard = lazy(() => import("./pages/StaffDashboard"));
const ViewerDisplayPage = lazy(() => import("./pages/ViewerDisplayPage"));
const OrganizationSettingsPage = lazy(() => import("./pages/OrganizationSettingsPage"));
const BusinessSettingsPage = lazy(() => import("./pages/BusinessSettingsPage"));
const ViewerStationPage = lazy(() => import("./pages/ViewerStationPage"));
const BigScreenPage = lazy(() => import("./pages/BigScreenPage"));
const TermsPage = lazy(() => import("./pages/TermsPage").then(module => ({ default: module.TermsPage })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then(module => ({ default: module.PrivacyPage })));
const ShortUrlEventPage = lazy(() => import("./pages/ShortUrlEventPage"));
const PublicBusinessProfile = lazy(() => import("./pages/PublicBusinessProfile"));

// Creator Imports
import { CreatorLayout } from "./components/creator/CreatorLayout";
const CreatorPlaceholder = lazy(() => import("./pages/creator/CreatorPlaceholder"));
const CreatorCreatePage = lazy(() => import("./pages/creator/CreatorCreatePage"));
const BoothDashboard = lazy(() => import("./pages/creator/BoothDashboard"));
const CreatorBoothPage = lazy(() => import("./pages/creator/CreatorBoothPage"));
const CreatorBoothEditor = lazy(() => import("./pages/creator/CreatorBoothEditor"));
const PublicBoothRouter = lazy(() => import("./pages/creator/PublicBoothRouter"));
const PublicFeedRouter = lazy(() => import("./pages/creator/PublicFeedRouter"));
const CreatorStudioPage = lazy(() => import("./pages/creator/CreatorStudioPage"));
const CreatorTemplatesPage = lazy(() => import("./pages/creator/CreatorTemplatesPage"));
const CreatorBillingPage = lazy(() => import("./pages/creator/CreatorBillingPage"));
const CreatorSupportPage = lazy(() => import("./pages/creator/CreatorSupportPage"));
import { CreatorOnly } from "./components/routing/CreatorOnly";

// CopilotKit imports (self-hosted, no cloud required)
// import { CopilotKit } from "@copilotkit/react-core";
// import { AssistantCopilotActions } from "./components/AssistantCopilotActions";

const ChatPage = lazy(() => import("./pages/ChatPage"));
const AdminChatPage = lazy(() => import("./pages/AdminChatPage"));

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
      to={isBusiness ? "/business/settings" : "/creator/settings"}
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

  // Use the same enforceHttps logic from env.ts to be absolutely sure
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
  }

  return url;
};

// Wrapper component that conditionally includes CopilotKit
const AppContent = () => {
  const location = useLocation();
  const apiUrl = getApiUrl();
  const [copilotReady, setCopilotReady] = useState(false);

  // Only initialize CopilotKit on business, super-admin, creator, and auth pages
  const shouldInitCopilot = location.pathname.startsWith('/business') ||
    location.pathname.startsWith('/super-admin') ||
    location.pathname.startsWith('/creator') ||
    location.pathname.startsWith('/auth') ||
    location.pathname === '/register';

  // Check if backend is available before initializing CopilotKit
  useEffect(() => {
    // CopilotKit disabled as per user request
    /*
    if (!shouldInitCopilot || !apiUrl) return;

    // Quick health check to avoid CORS/503 errors blocking the UI
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    fetch(`${apiUrl}/health`, { signal: controller.signal })
      .then(res => {
        if (res.ok) setCopilotReady(true);
      })
      .catch(() => {
        console.log('⚠️ Backend not available, CopilotKit disabled');
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
    */
  }, [shouldInitCopilot, apiUrl]);

  // Check if user is on authenticated routes
  const isAuthenticatedRoute = shouldInitCopilot;

  // Initialize SSE for real-time updates (token balance, job status)
  // Only active on authenticated routes and when user has auth token
  const hasAuthToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');

  // Memoize SSE handlers to prevent reconnection on every route change/re-render
  const onTokenUpdate = useCallback((data: any) => {
    console.log('🪙 Token balance updated via SSE:', data.new_balance);
  }, []);

  const onJobUpdate = useCallback((data: any) => {
    console.log('📋 Job status updated via SSE:', data.job_id, data.status);
  }, []);

  const onConnected = useCallback(() => {
    console.log('✅ SSE connected for real-time updates');
  }, []);

  const onDisconnected = useCallback(() => {
    console.log('📡 SSE disconnected');
  }, []);

  useSSE({
    enabled: isAuthenticatedRoute && hasAuthToken,
    onTokenUpdate,
    onJobUpdate,
    onConnected,
    onDisconnected,
  });

  return (
    <>
      <SEO />
      {/* CopilotKit disabled as per user request */}
      {/* {shouldInitCopilot && apiUrl && copilotReady && (
        <CopilotKit
          runtimeUrl={`${apiUrl}/copilotkit`}
          properties={getUserProperties()}
        >
          <AssistantCopilotActions />
        </CopilotKit>
      )} */}
      <TopNavbar />
      <Suspense fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center animate-pulse">
              <div className="w-6 h-6 border-2 border-[#D1F349] border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 animate-pulse">Loading experience...</p>
          </div>
        </div>
      }>
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
            <Route path="gallery" element={<CreatorStudioPage defaultView="gallery" />} />
            <Route path="booth" element={<BoothDashboard />} />
            <Route path="booth/:eventId" element={<CreatorBoothPage />} />
            <Route path="booth/:eventId/edit" element={<CreatorBoothEditor />} />
            <Route path="studio" element={<CreatorStudioPage />} />
            <Route path="models" element={<CreatorTemplatesPage />} />
            <Route path="templates" element={<CreatorTemplatesPage />} />
            <Route path="billing" element={<CreatorBillingPage />} />
            <Route path="support" element={<CreatorSupportPage />} />
            <Route path="settings" element={<CreatorSettingsPage />} />
            <Route path="*" element={<CreatorPlaceholder />} />
          </Route>

          {/* AUTH ROUTES */}
          <Route path="/auth" element={<AdminAuth />} />
          <Route path="/register" element={<AdminRegister />} />

          {/* BUSINESS ROUTES */}
          {/* Main Business Redirect */}
          <Route path="/business" element={
            <Navigate to="/business/home" replace />
          } />

          <Route path="/business/home" element={
            <BusinessOnly>
              <HomeDashboard />
            </BusinessOnly>
          } />

          <Route path="/business/events" element={
            <BusinessOnly>
              <AdminDashboard />
            </BusinessOnly>
          } />
          <Route path="/business/events/create" element={
            <BusinessOnly>
              <AdminEventForm />
            </BusinessOnly>
          } />
          <Route path="/business/events/edit/:eventId" element={
            <BusinessOnly>
              <AdminEventForm />
            </BusinessOnly>
          } />
          <Route path="/business/events/:eventId/photos" element={
            <BusinessOnly>
              <AdminEventPhotos />
            </BusinessOnly>
          } />
          <Route path="/business/events/:eventId/live" element={
            <BusinessOnly>
              <LiveEventPage />
            </BusinessOnly>
          } />

          <Route path="/business/settings" element={
            <BusinessOnly>
              <BusinessSettingsPage />
            </BusinessOnly>
          } />
          {/* Billing and Tokens now redirect to Business Settings */}
          <Route path="/business/billing" element={<Navigate to="/business/settings" replace />} />
          <Route path="/business/tokens" element={<Navigate to="/business/settings" replace />} />
          <Route path="/business/marketplace" element={
            <BusinessOnly>
              <AdminDashboard />
            </BusinessOnly>
          } />
          <Route path="/business/chat" element={
            <BusinessOnly>
              <div className="min-h-screen bg-black pt-24 px-4 pb-32 md:pb-4">
                <div className="max-w-7xl mx-auto">
                  <AdminChatPage />
                </div>
              </div>
            </BusinessOnly>
          } />
          <Route path="/business/playground" element={
            <BusinessOnly>
              <PlaygroundPage />
            </BusinessOnly>
          } />
          <Route path="/business/analytics" element={
            <BusinessOnly>
              <AdminDashboard />
            </BusinessOnly>
          } />
          <Route path="/business/studio" element={
            <BusinessOnly>
              <AdminDashboard />
            </BusinessOnly>
          } />
          <Route path="/business/albums" element={
            <BusinessOnly>
              <AdminDashboard />
            </BusinessOnly>
          } />
          <Route path="/business/organization" element={
            <BusinessOnly>
              <OrganizationSettingsPage />
            </BusinessOnly>
          } />
          <Route path="/business/staff/:eventId" element={<StaffDashboard />} />
          {/* Catch-all for unknown business routes - show 404 */}
          <Route path="/business/*" element={<NotFound />} />

          {/* LEGACY REDIRECTS - Backward compatibility */}
          <Route path="/admin/auth" element={<Navigate to="/auth" replace />} />
          <Route path="/admin/register" element={<Navigate to="/register" replace />} />
          <Route path="/admin/login" element={<Navigate to="/auth" replace />} />
          <Route path="/admin" element={<Navigate to="/business/home" replace />} />
          <Route path="/admin/home" element={<Navigate to="/business/home" replace />} />
          <Route path="/admin/events" element={<Navigate to="/business/events" replace />} />
          <Route path="/admin/events/*" element={<Navigate to="/business/events" replace />} />
          <Route path="/admin/settings" element={<SettingsRedirect />} />
          <Route path="/admin/settings/business" element={<Navigate to="/business/settings" replace />} />
          <Route path="/admin/settings/creator" element={<Navigate to="/creator/settings" replace />} />
          <Route path="/admin/marketplace" element={<Navigate to="/business/marketplace" replace />} />
          <Route path="/admin/chat" element={<Navigate to="/business/chat" replace />} />
          <Route path="/admin/playground" element={<Navigate to="/business/playground" replace />} />
          <Route path="/admin/analytics" element={<Navigate to="/business/analytics" replace />} />
          <Route path="/admin/studio" element={<Navigate to="/business/studio" replace />} />
          <Route path="/admin/albums" element={<Navigate to="/business/albums" replace />} />
          <Route path="/admin/organization" element={<Navigate to="/business/organization" replace />} />
          <Route path="/admin/billing" element={<Navigate to="/business/settings" replace />} />
          <Route path="/admin/tokens" element={<Navigate to="/business/settings" replace />} />
          <Route path="/admin/staff/:eventId" element={<Navigate to="/business/staff/:eventId" replace />} />

          {/* Public Profile */}
          <Route path="/profile/:username" element={<PublicProfile />} />
          <Route path="/org/:slug" element={<PublicBusinessProfile />} />

          {/* Dynamic event routes - no sidebar */}
          {/* PublicBoothRouter intelligently routes to PublicCreatorBooth (is_booth=true) or PhotoBoothPage */}
          <Route path="/:userSlug/:eventSlug" element={<PublicBoothRouter />} />
          {/* PublicFeedRouter routes to CreatorBoothFeed (is_booth=true) or EventFeedPage */}
          <Route path="/:userSlug/:eventSlug/feed" element={<PublicFeedRouter />} />
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
        </Routes>
      </Suspense>
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
