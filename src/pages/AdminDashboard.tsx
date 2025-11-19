import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getCurrentUser, logoutUser } from "@/services/eventsApi";
import { LayoutDashboard, FolderKanban, BarChart3, LogOut, User, Sparkles } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import AdminEventsTab from "@/components/admin/AdminEventsTab";
import AdminAnalyticsTab from "@/components/admin/AdminAnalyticsTab";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "events");

  useEffect(() => {
    if (!currentUser) {
      navigate("/admin/auth");
      return;
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["events", "analytics"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const handleLogout = () => {
    logoutUser();
    toast.success("Logged out successfully");
    navigate("/admin/auth");
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/5 via-black/0 to-black/0 -z-10 pointer-events-none" />

      <div className="max-w-[1600px] mx-auto p-6 md:p-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <LayoutDashboard className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            </div>
            <p className="text-zinc-400 ml-1">
              Manage your photo booth events and view performance
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900/50 border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white leading-none">
                  {currentUser?.full_name || currentUser?.username}
                </span>
                <span className="text-xs text-zinc-500 leading-none mt-1">Administrator</span>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-white/10 bg-black/20 hover:bg-white/5 hover:text-white text-zinc-400"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-8">
          <TabsList className="inline-flex h-auto p-1 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl">
            <TabsTrigger
              value="events"
              className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
            >
              <FolderKanban className="w-4 h-4" />
              <span>Events Management</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-0 focus-visible:outline-none">
            <AdminEventsTab currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
            <AdminAnalyticsTab currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
