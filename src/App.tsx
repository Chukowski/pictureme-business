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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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

            {/* Public Profile */}
            <Route path="/profile/:username" element={<PublicProfile />} />

            {/* Dynamic event routes - no sidebar */}
            <Route path="/:userSlug/:eventSlug" element={<PhotoBoothPage />} />
            <Route path="/:userSlug/:eventSlug/feed" element={<EventFeedPage />} />

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

export default App;
