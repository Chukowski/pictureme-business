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
      setUser(currentUser);
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

    const handleTokensUpdated = (event: CustomEvent<{ newBalance: number }>) => {
      const { newBalance } = event.detail;
      setUser(prev => prev ? ({ ...prev, tokens_remaining: newBalance }) : null);
    };

    const handleCreatingCountUpdated = (event: CustomEvent<{ count: number }>) => {
      const { count } = event.detail;
      setCreatingCount(count);
    };

    const handleAuthChange = () => {
      loadUser();
    };

    loadUser();

    window.addEventListener('tokens-updated', handleTokensUpdated as EventListener);
    window.addEventListener('creating-count-updated', handleCreatingCountUpdated as EventListener);
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('tokens-updated', handleTokensUpdated as EventListener);
      window.removeEventListener('creating-count-updated', handleCreatingCountUpdated as EventListener);
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [navigate]);

  return (
    <>
      <CreatorNavbar user={user} creatingCount={creatingCount} />
      <main className={cn(
        "w-full pt-16 md:pt-24",
        location.pathname.includes('/dashboard') ? "px-0" : "px-4 md:px-8",
        (!location.pathname.includes('/studio') && !location.pathname.includes('/chat') && !location.pathname.includes('/edit')) ? "pb-24" : "pb-0"
      )}>
        <Outlet />
      </main>
      <div className="md:hidden">
        {!location.pathname.includes('/studio') && !location.pathname.includes('/chat') && !location.pathname.includes('/edit') && <CreatorBottomNav />}
      </div>
    </>
  );
}
