import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  PlusCircle, 
  Image, 
  ShoppingBag, 
  CreditCard, 
  HelpCircle,
  LogOut,
  Settings,
  User as UserIcon,
  Sparkles
} from "lucide-react";
import { getCurrentUser, logoutUser, User } from "@/services/eventsApi";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const handleLogout = () => {
    logoutUser();
    navigate("/admin/auth");
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, path: '/creator/dashboard' },
    { id: 'create', label: 'Create', icon: PlusCircle, path: '/creator/create' },
    { id: 'templates', label: 'Templates', icon: ShoppingBag, path: '/creator/templates' },
    { id: 'assist', label: 'Assist', icon: Sparkles, path: '/creator/chat' },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Header / Navigation Tabs */}
      <header className="sticky top-0 z-50 bg-black border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => navigate('/creator/dashboard')}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <span className="font-bold text-white text-lg">P</span>
              </div>
              <span className="font-bold text-lg tracking-tight hidden sm:block">PictureMe</span>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive 
                        ? "text-white bg-white/10" 
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isActive && "text-indigo-400")} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
                <div className="text-xs font-medium text-zinc-300">
                    {user?.tokens_remaining || 0} Tokens
                </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative w-9 h-9 rounded-full bg-zinc-800 border border-white/10 overflow-hidden hover:border-indigo-500/50 transition-colors">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                      {user?.username?.substring(0, 2).toUpperCase() || 'ME'}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 text-white">
                <div className="px-2 py-1.5 border-b border-white/5 mb-1">
                  <p className="font-medium text-sm">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                </div>
                
                <DropdownMenuItem onClick={() => navigate('/creator/settings')} className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    const profileId = user?.username || user?.slug || user?.id;
                    if (profileId) navigate(`/profile/${profileId}`);
                  }} 
                  className="cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 mr-2" /> Public Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/creator/billing')} className="cursor-pointer">
                  <CreditCard className="w-4 h-4 mr-2" /> Billing
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation (Horizontal Scroll) */}
        <div className="md:hidden border-t border-white/5 overflow-x-auto">
          <div className="flex p-2 gap-2 min-w-max">
            {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive 
                        ? "text-white bg-white/10" 
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4", isActive && "text-indigo-400")} />
                    {item.label}
                  </button>
                );
              })}
          </div>
        </div>
      </header>

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

