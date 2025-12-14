import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { CreatorNavbar } from "@/components/creator/CreatorNavbar";
import { getCurrentUser, logoutUser, User } from "@/services/eventsApi";
import { cn } from "@/lib/utils";

export function CreatorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate("/admin/auth");
      return;
    }
    setUser(currentUser);
  }, [navigate]);



  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Header / Navigation Tabs */}
      <CreatorNavbar user={user} />

      {/* Main Content */}
      <main className={cn(
        "flex-1 w-full mx-auto",
        location.pathname.includes('/settings') || location.pathname.includes('/studio') ? "p-0" : "max-w-7xl px-4 sm:px-6 py-8"
      )}>
        <Outlet />
      </main>
    </div>
  );
}

