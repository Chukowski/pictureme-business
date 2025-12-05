import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCurrentUser, logoutUser, updateUser } from "@/services/eventsApi";
import { LogOut, User, Sparkles, Clock, ShieldAlert, Edit2, Loader2, Upload, X, Camera, Settings, Users, ChevronDown, ExternalLink, Building2, Coins } from "lucide-react";
import { ENV } from "@/config/env";
import IndividualDashboard from "@/components/dashboard/IndividualDashboard";
import BusinessDashboard from "@/components/dashboard/BusinessDashboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Globe, Lock } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useMemo(() => {
    const user = getCurrentUser();
    console.log('👤 Current user loaded:', user);
    return user;
  }, []);

  // Default to individual if no role specified (backward compatibility)
  const userRole = currentUser?.role || 'individual';
  const isSuperAdmin = userRole === 'superadmin';
  
  // Dashboard view mode for superadmin (can switch between studio and business)
  const [dashboardMode, setDashboardMode] = useState<'studio' | 'business'>('studio');
  const [tokenStats, setTokenStats] = useState<{ current_tokens: number; tokens_total?: number; plan_tokens?: number } | null>(null);
  const [isTokenRefreshing, setIsTokenRefreshing] = useState(false);

  // Merge token stats into current user for display
  const displayedUser = useMemo(() => {
    if (!currentUser) return null;
    
    // Default total to 8000 if not present (Business Standard)
    const defaultTotal = 8000;
    
    return {
      ...currentUser,
      tokens_remaining: tokenStats?.current_tokens ?? currentUser.tokens_remaining,
      tokens_total: tokenStats?.tokens_total ?? currentUser.tokens_total ?? defaultTotal
    };
  }, [currentUser, tokenStats]);

  const fetchTokenStats = useCallback(async () => {
    const apiUrl = ENV.API_URL;
    if (!apiUrl) return;
    try {
      setIsTokenRefreshing(true);
      const authToken = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const response = await fetch(`${apiUrl}/api/tokens/stats`, {
        headers,
        credentials: 'include',
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setTokenStats(data);
    } catch (error) {
      console.error("Failed to load token stats", error);
    } finally {
      setIsTokenRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      navigate("/admin/auth");
      return;
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    fetchTokenStats();
    const interval = setInterval(fetchTokenStats, 60000);
    
    // Listen for token updates from AI processing
    const handleTokensUpdated = (e: CustomEvent<{ newBalance: number; tokensCharged: number }>) => {
      console.log("🪙 Tokens updated event received:", e.detail);
      setTokenStats(prev => prev ? { ...prev, current_tokens: e.detail.newBalance } : { current_tokens: e.detail.newBalance });
    };
    
    window.addEventListener("tokens-updated", handleTokensUpdated as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("tokens-updated", handleTokensUpdated as EventListener);
    };
  }, [fetchTokenStats]);

  const handleLogout = () => {
    logoutUser();
    toast.success("Logged out successfully");
    navigate("/admin/auth");
  };

  if (!currentUser) {
    return null;
  }

  // Pending Business Application View
  if (userRole === 'business_pending') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[100px] -z-10" />

        <div className="max-w-md w-full bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Application Under Review</h2>
          <p className="text-zinc-400 mb-8">
            Your application for a Business tier is currently being reviewed by our team. You will receive an email update at <span className="text-white">{currentUser.email}</span> once approved.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full border-white/10 hover:bg-white/5 text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white relative overflow-hidden flex flex-col">
      {/* Background Effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/5 via-black/0 to-black/0 -z-10 pointer-events-none" />

      <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 flex-1 min-h-0 flex flex-col relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {(isSuperAdmin ? dashboardMode === 'business' : userRole.startsWith('business')) 
                  ? 'Business Dashboard' 
                  : 'My Studio'}
              </h1>
              
              {/* SuperAdmin Dashboard Switcher */}
              {isSuperAdmin && (
                <div className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <button
                    onClick={() => setDashboardMode('studio')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      dashboardMode === 'studio' 
                        ? 'bg-white text-black' 
                        : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    Studio
                  </button>
                  <button
                    onClick={() => setDashboardMode('business')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      dashboardMode === 'business' 
                        ? 'bg-white text-black' 
                        : 'text-amber-400 hover:text-amber-300'
                    }`}
                  >
                    Business
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-zinc-400 ml-1">
              {(isSuperAdmin ? dashboardMode === 'business' : userRole.startsWith('business'))
                ? 'Manage your events, analytics, and business settings'
                : 'Create AI-powered images and videos'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {userRole === 'superadmin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/super-admin")}
                className="hidden md:flex border-amber-500/20 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Super Admin
              </Button>
            )}

            {/* User Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-white/10 backdrop-blur-sm hover:bg-zinc-800/50 transition-colors cursor-pointer">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium text-white leading-none">
                      {currentUser?.name || currentUser?.full_name || currentUser?.username || currentUser?.email}
                    </span>
                    <span className="text-[10px] text-zinc-500 leading-none mt-0.5 capitalize">
                      {userRole.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-1 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                    <Coins className="w-3 h-3 text-yellow-400" />
                    <span className="text-xs text-yellow-400 font-medium">
                      {(tokenStats?.current_tokens ?? currentUser?.tokens_remaining ?? 0).toLocaleString()}
                    </span>
                    {isTokenRefreshing && <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />}
                  </div>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-zinc-900 border-white/10 text-white p-2"
              >
                
                <DropdownMenuItem 
                  onClick={() => navigate(`/profile/${currentUser?.username || currentUser?.slug}`)}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 rounded-lg"
                >
                  <User className="w-4 h-4 text-zinc-400" />
                  <span>View profile</span>
                </DropdownMenuItem>
                
                {/* Business Settings - only for business users */}
                {userRole.startsWith('business') && userRole !== ('business_pending' as string) && (
                  <DropdownMenuItem 
                    onClick={() => navigate('/admin/business')}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 rounded-lg text-indigo-400"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Business Settings</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem 
                  onClick={() => navigate('/admin/settings')}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 rounded-lg text-lime-400"
                >
                  <Settings className="w-4 h-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => window.open('https://discord.gg/pictureme', '_blank')}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 rounded-lg"
                >
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span>Join our community</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/10" />
                
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white/5 rounded-lg"
                >
                  <LogOut className="w-4 h-4 text-zinc-400" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          {(isSuperAdmin ? dashboardMode === 'business' : userRole.startsWith('business')) ? (
            <BusinessDashboard currentUser={currentUser} />
          ) : (
            <IndividualDashboard currentUser={currentUser} />
          )}
        </div>
      </div>

    </div>
  );
}
