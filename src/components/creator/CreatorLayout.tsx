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

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        navigate("/admin/auth");
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
      setUser(prev => prev ? ({
        ...prev,
        tokens_remaining: newBalance
      }) : null);
    };

    loadUser();

    window.addEventListener('tokens-updated', handleTokensUpdated);
    return () => {
      window.removeEventListener('tokens-updated', handleTokensUpdated);
    };
  }, [navigate]);


  const isFullBleed = location.pathname.includes('/settings') ||
    location.pathname.includes('/studio') ||
    (location.pathname.includes('/booth/') && location.pathname.includes('/edit'));

  return (
    <div className={cn(
      "bg-[#101112] text-white flex flex-col",
      isFullBleed ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      {/* Desktop Navigation Bar - Hidden on mobile */}
      <div className="hidden md:block">
        <CreatorNavbar user={user} />
      </div>

      {/* Mobile Floating Navigation - Hidden on desktop */}
      <div className="md:hidden">
        {!location.pathname.includes('/studio') && <CreatorBottomNav />}
      </div>

      {/* Main Content */}
      <main className={cn(
        "flex-1 w-full mx-auto relative",
        isFullBleed
          ? "p-0 pt-16 pb-0 md:pb-0"
          : "max-w-7xl px-4 sm:px-6 py-8 pt-24 md:pt-24 pb-20 md:pb-8"
      )}>
        <Outlet />
      </main>
    </div>
  );
}

