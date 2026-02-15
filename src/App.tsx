import { lazy, Suspense, useEffect, useCallback, useState } from 'react';
import { SEO } from "./components/SEO";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import PublicProfile from "./pages/PublicProfile";

// Lazy-loaded routes — bundle-dynamic-imports: load heavy pages on demand
const SharePage = lazy(() => import("./pages/SharePage").then(module => ({ default: module.SharePage })));
const PhotoBoothPage = lazy(() => import("./pages/PhotoBoothPage").then(module => ({ default: module.PhotoBoothPage })));
const EventFeedPage = lazy(() => import("./pages/EventFeedPage").then(module => ({ default: module.EventFeedPage })));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminEventForm = lazy(() => import("./pages/AdminEventForm"));
const AdminEventPhotos = lazy(() => import("./pages/AdminEventPhotos"));

// Super Admin — lazy-loaded
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
const SuperAdminAlE = lazy(() => import("./components/super-admin/SuperAdminAlE"));

// Public pages — lazy-loaded
const AlbumFeedPage = lazy(() => import("./pages/AlbumFeedPage"));
const StaffDashboard = lazy(() => import("./pages/StaffDashboard"));
const ViewerStationPage = lazy(() => import("./pages/ViewerStationPage"));
const BigScreenPage = lazy(() => import("./pages/BigScreenPage"));
const TermsPage = lazy(() => import("./pages/TermsPage").then(module => ({ default: module.TermsPage })));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage").then(module => ({ default: module.PrivacyPage })));
const ShortUrlEventPage = lazy(() => import("./pages/ShortUrlEventPage"));
const PublicBusinessProfile = lazy(() => import("./pages/PublicBusinessProfile"));
const PublicBoothRouter = lazy(() => import("./pages/creator/PublicBoothRouter"));
const PublicFeedRouter = lazy(() => import("./pages/creator/PublicFeedRouter"));
const OrganizationSettingsPage = lazy(() => import("./pages/OrganizationSettingsPage"));
const BusinessSettingsPage = lazy(() => import("./pages/BusinessSettingsPage"));
const ChatPage = lazy(() => import("./pages/AdminChatPage"));

import { ENV } from "@/config/env";
import { getCurrentUser } from "@/services/eventsApi";
import PlaygroundPage from "./pages/PlaygroundPage";
import LiveEventPage from "./pages/LiveEventPage";
import HomeDashboard from "./pages/HomeDashboard";

import { TopNavbar } from "./components/TopNavbar";
import { BusinessOnly } from "./components/routing/BusinessOnly";
import { UserTierProvider } from "./services/userTier";
import { useSSE } from "./hooks/useSSE";

const queryClient = new QueryClient();

/**
 * Auth-aware root redirect.
 * - Authenticated business/superadmin → /business/home (or /super-admin)
 * - Not authenticated → /auth
 */
const RootRedirect = () => {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (user.role === 'superadmin') {
    return <Navigate to="/super-admin" replace />;
  }

  return <Navigate to="/business/home" replace />;
};

// Settings redirect for legacy /admin/settings
const SettingsRedirect = () => (
  <Navigate to="/business/settings" replace />
);

// Get API URL with HTTPS enforcement for production
const getApiUrl = (): string => {
  const url = ENV.API_URL;
  if (!url && import.meta.env.DEV) {
    return "http://localhost:3002";
  }

  // js-early-exit: enforce HTTPS only for non-local URLs
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1') && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }

  return url;
};

// Wrapper component for app content
const AppContent = () => {
  const location = useLocation();

  // Determine if user is on authenticated routes for SSE
  const isAuthenticatedRoute =
    location.pathname.startsWith('/business') ||
    location.pathname.startsWith('/super-admin') ||
    location.pathname.startsWith('/auth') ||
    location.pathname === '/register';

  // Initialize SSE for real-time updates (token balance, job status)
  const hasAuthToken = typeof window !== 'undefined' && !!localStorage.getItem('auth_token');

  // rerender-functional-setstate: stable callbacks with useCallback, no deps needed
  const onTokenUpdate = useCallback((data: any) => {
    console.log('Token balance updated via SSE:', data.new_balance);
  }, []);

  const onJobUpdate = useCallback((data: any) => {
    console.log('Job status updated via SSE:', data.job_id, data.status);
  }, []);

  const onConnected = useCallback(() => {
    console.log('SSE connected for real-time updates');
  }, []);

  const onDisconnected = useCallback(() => {
    console.log('SSE disconnected');
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
          {/* Root: auth-aware redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          {/* Share page */}
          <Route path="/share/:shareCode" element={<SharePage />} />

          {/* Short URL event routes */}
          <Route path="/e/:eventId/:eventSlug" element={<ShortUrlEventPage />} />
          <Route path="/e/:eventId/:eventSlug/*" element={<ShortUrlEventPage />} />

          {/* AUTH ROUTES */}
          <Route path="/auth" element={<AdminAuth />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />

          {/* SUPER ADMIN ROUTES */}
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
            <Route path="ale" element={<SuperAdminAlE />} />
            <Route path="analytics" element={<SuperAdminAnalytics />} />
            <Route path="settings" element={<SuperAdminSettings />} />
            <Route path="devtools" element={<SuperAdminDevTools />} />
            <Route path="*" element={<SuperAdminOverview />} />
          </Route>

          {/* BUSINESS ROUTES */}
          <Route path="/business" element={<Navigate to="/business/home" replace />} />

          <Route path="/business/home" element={
            <BusinessOnly><HomeDashboard /></BusinessOnly>
          } />
          <Route path="/business/events" element={
            <BusinessOnly><AdminDashboard /></BusinessOnly>
          } />
          <Route path="/business/events/create" element={
            <BusinessOnly><AdminEventForm /></BusinessOnly>
          } />
          <Route path="/business/events/edit/:eventId" element={
            <BusinessOnly><AdminEventForm /></BusinessOnly>
          } />
          <Route path="/business/events/:eventId/photos" element={
            <BusinessOnly><AdminEventPhotos /></BusinessOnly>
          } />
          <Route path="/business/events/:eventId/live" element={
            <BusinessOnly><LiveEventPage /></BusinessOnly>
          } />
          <Route path="/business/settings" element={
            <BusinessOnly><BusinessSettingsPage /></BusinessOnly>
          } />
          <Route path="/business/billing" element={<Navigate to="/business/settings" replace />} />
          <Route path="/business/tokens" element={<Navigate to="/business/settings" replace />} />
          <Route path="/business/marketplace" element={
            <BusinessOnly><AdminDashboard /></BusinessOnly>
          } />
          <Route path="/business/chat" element={
            <BusinessOnly>
              <div className="min-h-screen bg-black pt-24 px-4 pb-32 md:pb-4">
                <div className="max-w-7xl mx-auto">
                  <ChatPage />
                </div>
              </div>
            </BusinessOnly>
          } />
          <Route path="/business/playground" element={
            <BusinessOnly><PlaygroundPage /></BusinessOnly>
          } />
          <Route path="/business/analytics" element={
            <BusinessOnly><AdminDashboard /></BusinessOnly>
          } />
          <Route path="/business/studio" element={
            <BusinessOnly><AdminDashboard /></BusinessOnly>
          } />
          <Route path="/business/albums" element={
            <BusinessOnly><AdminDashboard /></BusinessOnly>
          } />
          <Route path="/business/organization" element={
            <BusinessOnly><OrganizationSettingsPage /></BusinessOnly>
          } />
          <Route path="/business/staff/:eventId" element={<StaffDashboard />} />
          <Route path="/business/*" element={<NotFound />} />

          {/* LEGACY REDIRECTS — /admin/* → /business/* */}
          <Route path="/admin/auth" element={<Navigate to="/auth" replace />} />
          <Route path="/admin/register" element={<Navigate to="/auth" replace />} />
          <Route path="/admin/login" element={<Navigate to="/auth" replace />} />
          <Route path="/admin" element={<Navigate to="/business/home" replace />} />
          <Route path="/admin/home" element={<Navigate to="/business/home" replace />} />
          <Route path="/admin/events" element={<Navigate to="/business/events" replace />} />
          <Route path="/admin/events/*" element={<Navigate to="/business/events" replace />} />
          <Route path="/admin/settings" element={<SettingsRedirect />} />
          <Route path="/admin/settings/business" element={<Navigate to="/business/settings" replace />} />
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

          {/* Public event routes (shared by both apps) */}
          <Route path="/:userSlug/:eventSlug" element={<PublicBoothRouter />} />
          <Route path="/:userSlug/:eventSlug/feed" element={<PublicFeedRouter />} />
          <Route path="/:userSlug/:eventSlug/album/:albumId" element={<AlbumFeedPage />} />
          <Route path="/:userSlug/:eventSlug/staff" element={<StaffDashboard />} />
          <Route path="/:userSlug/:eventSlug/display" element={<Navigate to="../bigscreen" replace />} />
          <Route path="/:userSlug/:eventSlug/registration" element={<PhotoBoothPage />} />
          <Route path="/:userSlug/:eventSlug/booth" element={<PhotoBoothPage />} />
          <Route path="/:userSlug/:eventSlug/playground" element={<PhotoBoothPage />} />
          <Route path="/:userSlug/:eventSlug/viewer" element={<ViewerStationPage />} />
          <Route path="/:userSlug/:eventSlug/bigscreen" element={<BigScreenPage />} />

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

export default App;
