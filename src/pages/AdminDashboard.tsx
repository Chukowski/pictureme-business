import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getCurrentUser, logoutUser } from "@/services/eventsApi";
import { LayoutDashboard, FolderKanban, BarChart3, LogOut, User } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-dark">
      <div className="max-w-[1600px] mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your photo booth events, view analytics, and more
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/50 border border-white/10">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {currentUser?.full_name || currentUser?.username}
              </span>
            </div>
            <DarkModeToggle />
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full max-w-[600px] grid-cols-2 h-auto p-1 bg-black/40 backdrop-blur-sm border border-white/10 mb-8">
            <TabsTrigger
              value="events"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <FolderKanban className="w-4 h-4" />
              <span>Events Management</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-3"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-0">
            <AdminEventsTab currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <AdminAnalyticsTab currentUser={currentUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

