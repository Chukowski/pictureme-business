import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { CreatorNavbar } from "@/components/creator/CreatorNavbar";
import { CreatorBottomNav } from "@/components/creator/CreatorBottomNav";
import { getCurrentUser, getTokenStats, User } from "@/services/eventsApi";
import { cn } from "@/lib/utils";

export function CreatorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [creatingCount, setCreatingCount] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        navigate("/auth");
        return;
      }

      // Optimistically set cached user first
      setUser(currentUser);

      // Fetch fresh stats to update Navbar
      try {
        const stats = await getTokenStats();
        if (stats) {
          setUser(prev => prev ? ({
            ...prev,
            tokens_remaining: stats.current_tokens,
            tokens_total: stats.tokens_total || prev.tokens_total
          }) : null);
        }
      } catch (error) {
        console.error("Failed to refresh token stats:", error);
      }
    };

    const handleTokensUpdated = (event: any) => {
      const { newBalance } = event.detail;
      console.log("🪙 [Layout] Token update received:", newBalance);
      setUser(prev => prev ? ({ ...prev, tokens_remaining: newBalance }) : null);
    };

    const handleCreatingCountUpdated = (event: any) => {
      const { count } = event.detail;
      setCreatingCount(count);
    };

    const handleAuthChange = () => {
      console.log("👤 [Layout] Auth change detected, refreshing user");
      loadUser();
    };

    loadUser();

    window.addEventListener('tokens-updated', handleTokensUpdated);
    window.addEventListener('creating-count-updated', handleCreatingCountUpdated);
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('tokens-updated', handleTokensUpdated);
      window.removeEventListener('creating-count-updated', handleCreatingCountUpdated);
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [navigate]);


  const isFullBleed = location.pathname.includes('/settings') ||
    location.pathname.includes('/studio') ||
    location.pathname.includes('/gallery') ||
    location.pathname.includes('/chat') ||
    (location.pathname.includes('/templates/') && (location.pathname.includes('/new') || location.pathname.includes('/edit'))) ||
    (location.pathname.includes('/booth/') && location.pathname.includes('/edit'));

  return (
    <div className={cn(
      "bg-[#101112] text-white flex flex-col",
      isFullBleed ? "h-[100dvh] overflow-hidden" : "min-h-screen"
    )}>
      {/* Top Navigation Bar - Now visible on all screens */}
      <div>
        <CreatorNavbar user={user} creatingCount={creatingCount} />
      </div>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <div className="md:hidden">
        {!location.pathname.includes('/studio') && !location.pathname.includes('/chat') && !location.pathname.includes('/edit') && <CreatorBottomNav />}
      </div>

      {/* Main Content */}
      <main className={cn(
        "flex-1 w-full mx-auto relative",
        isFullBleed
          ? cn("flex flex-col p-0 pt-16 md:pb-0 overflow-hidden", (!location.pathname.includes('/studio') && !location.pathname.includes('/chat') && !location.pathname.includes('/edit') && !location.pathname.includes('/templates/')) ? "pb-32" : "pb-0")
          : "max-w-7xl px-4 sm:px-6 py-8 pt-20 md:pt-24 pb-32 md:pb-8"
      )}>
        <Outlet />
      </main>
    </div>
  );
}

