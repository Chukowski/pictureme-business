import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FolderKanban, BarChart3, ShoppingBag, BookOpen, Gamepad2, Settings, Menu, LogOut, User, Building2, Users, Coins } from "lucide-react";
import { getCurrentUser, logoutUser } from "@/services/eventsApi";
import { hasFeature } from "@/lib/planFeatures";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ENV } from "@/config/env";

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const lastInteraction = useRef(Date.now());
  const [tokenStats, setTokenStats] = useState<{ current_tokens: number } | null>(null);
  
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || 'individual';
  const hasAlbumTracking = hasFeature(userRole, 'albumTracking');

  // Paths where navbar should be completely hidden
  const isHiddenPath = 
    location.pathname === '/' ||
    location.pathname === '/terms' ||
    location.pathname === '/privacy' ||
    location.pathname === '/apply' ||
    location.pathname === '/admin/auth' ||
    location.pathname === '/admin/register' ||
    [
    '/registration',
    '/booth',
    '/viewer',
    '/display', // Big Screen
    '/feed'
  ].some(path => location.pathname.endsWith(path)) || 
  // Check for dynamic event routes that are not admin routes
  (location.pathname.split('/').length >= 3 && 
   !location.pathname.startsWith('/admin') && 
   !location.pathname.startsWith('/super-admin') &&
   !location.pathname.startsWith('/profile'));

  // Define workspaces where auto-hide is active
  const isWorkspace = [
    '/playground',
    '/edit',
    '/create',
    '/live',
    '/staff',
    '/bigscreen'
  ].some(path => location.pathname.includes(path));

  // Token Stats Logic
  useEffect(() => {
    if (isHiddenPath) return; // Don't fetch stats on public pages

    const fetchTokenStats = async () => {
      const apiUrl = ENV.API_URL;
      if (!apiUrl) return;
      try {
        const authToken = localStorage.getItem('auth_token');
        const headers: Record<string, string> = {};
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        const response = await fetch(`${apiUrl}/api/tokens/stats`, {
          headers,
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setTokenStats(data);
        }
      } catch (error) {
        console.error("Failed to load token stats", error);
      }
    };

    fetchTokenStats();
    const interval = setInterval(fetchTokenStats, 60000);
    
    // Listen for token updates
    const handleTokensUpdated = (e: CustomEvent<{ newBalance: number }>) => {
      setTokenStats({ current_tokens: e.detail.newBalance });
    };
    
    window.addEventListener("tokens-updated", handleTokensUpdated as EventListener);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("tokens-updated", handleTokensUpdated as EventListener);
    };
  }, [isHiddenPath]);

  // Handle Auto-Hide Logic
  useEffect(() => {
    if (isHiddenPath) {
      setIsVisible(false);
      return;
    }

    if (!isWorkspace) {
      setIsVisible(true);
      return;
    }

    const checkInactivity = () => {
      const now = Date.now();
      // 1.5s inactivity to hide, but keep visible for 3s if recently interacted
      const timeSinceInteraction = now - lastInteraction.current;
      
      if (!isHovered && timeSinceInteraction > 1500) {
        setIsVisible(false);
      }
    };

    const interval = setInterval(checkInactivity, 500);
    return () => clearInterval(interval);
  }, [isWorkspace, isHovered, isHiddenPath]);

  // Handle Mouse Interaction
  useEffect(() => {
    if (isHiddenPath) return;

    const handleMouseMove = (e: MouseEvent) => {
      const isTopLeft = e.clientX <= 40 && e.clientY <= 40;
      const isTopRight = e.clientX >= window.innerWidth - 40 && e.clientY <= 40;
      
      if (isTopLeft || isTopRight) {
        setIsVisible(true);
        lastInteraction.current = Date.now();
      }
      
      if (e.clientY <= 15) {
        setIsVisible(true);
        lastInteraction.current = Date.now();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isHiddenPath]);

  const handleInteraction = () => {
    lastInteraction.current = Date.now() + 1500; // Add extra buffer
    setIsVisible(true);
  };

  const handleLogout = () => {
    logoutUser();
    navigate("/admin/auth");
  };

  if (isHiddenPath) return null;

  const navItems = [
    { id: 'events', label: 'Events', icon: FolderKanban, path: '/admin/events' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, path: '/admin/marketplace' },
    ...(hasAlbumTracking ? [{ id: 'albums', label: 'Albums', icon: BookOpen, path: '/admin/albums' }] : []),
    { id: 'playground', label: 'Playground', icon: Gamepad2, path: '/admin/playground' },
  ];

  const isActive = (path: string) => {
    if (path === '/admin/events' && (location.pathname === '/admin' || location.pathname === '/admin/events')) return true;
    return location.pathname.startsWith(path);
  };

  // Get display values
  const tokens = tokenStats?.current_tokens ?? currentUser?.tokens_remaining ?? 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* LEFT NAVBAR: Navigation */}
          <motion.div
            key="left-navbar"
            initial={{ opacity: 0, y: -20, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed top-4 left-4 z-[100]"
            onMouseEnter={() => {
              setIsHovered(true);
              handleInteraction();
            }}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-center gap-2 p-1 bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-full shadow-2xl shadow-black/50">
              
              {/* Home Shortcut */}
              <button 
                onClick={() => navigate('/admin/home')}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg ml-1 hover:scale-105 transition-transform"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-white/10 mx-1" />

              {/* Nav Items */}
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.path);
                        handleInteraction();
                      }}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        active 
                          ? "bg-white/10 text-white shadow-inner" 
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                      )}
                    >
                      <item.icon className={cn("w-3.5 h-3.5", active && "text-indigo-400")} />
                      <span className={cn(
                        "hidden sm:inline-block whitespace-nowrap transition-all duration-300", 
                        !active && "opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-auto group-hover:ml-1"
                      )}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Settings Shortcut */}
              <div className="h-4 w-px bg-white/10 mx-1" />
              
              <button
                onClick={() => navigate('/admin/settings')}
                className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>

            </div>
          </motion.div>

          {/* RIGHT NAVBAR: User Profile & Tokens */}
          <motion.div
            key="right-navbar"
            initial={{ opacity: 0, y: -20, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed top-4 right-4 z-[100]"
            onMouseEnter={() => {
              setIsHovered(true);
              handleInteraction();
            }}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex items-center gap-2 p-1 bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-full shadow-2xl shadow-black/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className="relative h-9 flex items-center pl-1 pr-4 rounded-full bg-black/40 hover:bg-black/60 transition-colors border border-white/5 group outline-none focus:ring-2 focus:ring-indigo-500/50 gap-3"
                  >
                    {/* Avatar */}
                    <div className="relative w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-md">
                      {currentUser?.avatar_url ? (
                        <img 
                          src={currentUser.avatar_url} 
                          alt="User" 
                          className="w-full h-full object-cover opacity-100 group-hover:opacity-0 transition-opacity absolute inset-0" 
                        />
                      ) : (
                        <span className="text-[10px] font-bold opacity-100 group-hover:opacity-0 transition-opacity absolute inset-0 flex items-center justify-center">
                          {currentUser?.username?.substring(0, 2).toUpperCase() || 'ME'}
                        </span>
                      )}
                      <Settings className="w-3.5 h-3.5 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* User Info & Tokens */}
                    <div className="flex flex-col items-start text-xs">
                      <span className="font-medium text-white leading-none mb-0.5">
                        {currentUser?.name || currentUser?.full_name?.split(' ')[0] || currentUser?.username || 'User'}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 leading-none">
                         <span className="capitalize">{userRole.replace(/_/g, ' ')}</span>
                         <span className="w-0.5 h-0.5 rounded-full bg-zinc-600" />
                         <div className="flex items-center gap-0.5 text-yellow-500">
                           <Coins className="w-2.5 h-2.5" />
                           <span>{tokens.toLocaleString()}</span>
                         </div>
                      </div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-white/10 text-white p-2 mr-2">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium text-white">{currentUser?.name || currentUser?.full_name || currentUser?.username || 'User'}</p>
                    <p className="text-xs text-zinc-500 truncate">{currentUser?.email}</p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/10" />
                  
                  <DropdownMenuItem 
                    onClick={() => navigate('/admin/home')}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                  >
                    <Menu className="w-4 h-4 text-zinc-400" />
                    <span>Home</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onClick={() => navigate(`/profile/${currentUser?.username || currentUser?.slug}`)}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                  >
                    <User className="w-4 h-4 text-zinc-400" />
                    <span>View Profile</span>
                  </DropdownMenuItem>
                  
                  {userRole.startsWith('business') && userRole !== 'business_pending' && (
                    <DropdownMenuItem 
                      onClick={() => navigate('/admin/business')}
                      className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white text-indigo-400"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Business Settings</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem 
                    onClick={() => navigate('/admin/settings')}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                  >
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => window.open('https://discord.gg/pictureme', '_blank')}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                  >
                    <Users className="w-4 h-4 text-zinc-400" />
                    <span>Community</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-white/10" />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white text-red-400 hover:text-red-300"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
