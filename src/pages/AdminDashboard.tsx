import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCurrentUser, logoutUser } from "@/services/eventsApi";
import { LogOut, Sparkles, Clock, ShieldAlert } from "lucide-react";
import { ENV } from "@/config/env";
import IndividualDashboard from "@/components/dashboard/IndividualDashboard";
import BusinessDashboard from "@/components/dashboard/BusinessDashboard";

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
      <div className="min-h-screen bg-[#101112] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[100px] -z-10" />

        <div className="max-w-md w-full bg-card/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
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
    <div className="h-screen bg-[#101112] text-white relative overflow-hidden flex flex-col">
      {/* Background Effects */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/5 via-[#101112]/0 to-[#101112]/0 -z-10 pointer-events-none" />

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
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${dashboardMode === 'studio'
                      ? 'bg-white text-black'
                      : 'text-amber-400 hover:text-amber-300'
                      }`}
                  >
                    Studio
                  </button>
                  <button
                    onClick={() => setDashboardMode('business')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${dashboardMode === 'business'
                      ? 'bg-white text-black'
                      : 'text-amber-400 hover:text-amber-300'
                      }`}
                  >
                    Business
                  </button>
                </div>
              )}
            </div>
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
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          {(isSuperAdmin ? dashboardMode === 'business' : userRole.startsWith('business')) ? (
            <BusinessDashboard currentUser={displayedUser || currentUser} />
          ) : (
            <IndividualDashboard currentUser={displayedUser || currentUser} />
          )}
        </div>
      </div>

    </div>
  );
}
