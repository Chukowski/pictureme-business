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
    loadUser();
  }, [navigate]);



  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
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
        "flex-1 w-full mx-auto",
        // Add bottom padding on mobile for the fixed bottom nav
        "pb-20 md:pb-8",
        location.pathname.includes('/settings') ||
          location.pathname.includes('/studio') ||
          (location.pathname.includes('/booth/') && location.pathname.includes('/edit'))
          ? "p-0"
          : "max-w-7xl px-4 sm:px-6 py-8"
      )}>
        <Outlet />
      </main>
    </div>
  );
}

