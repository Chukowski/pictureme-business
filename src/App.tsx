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
import AdminDashboard from "./pages/AdminDashboard";
import AdminEvents from "./pages/AdminEvents";
import AdminEventForm from "./pages/AdminEventForm";
import AdminEventPhotos from "./pages/AdminEventPhotos";

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
            <Route path="/admin/auth" element={<AdminAuth />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/events" element={<AdminDashboard />} />
            <Route path="/admin/events/create" element={<AdminEventForm />} />
            <Route path="/admin/events/edit/:eventId" element={<AdminEventForm />} />
            <Route path="/admin/events/:eventId/photos" element={<AdminEventPhotos />} />

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
