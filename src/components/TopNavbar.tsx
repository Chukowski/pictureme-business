import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban, BarChart3, ShoppingBag, BookOpen, Gamepad2, Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Settings,
  CreditCard,
  LayoutDashboard,
  Sparkles,
  Globe,
  Shield,
  Image,
  Video,
  Coins,
  Users,
  Building2,
  Radio,
  UserCog,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUser, logoutUser, getUserEvents, type EventConfig } from "@/services/eventsApi";
import { hasFeature } from "@/lib/planFeatures";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MediaLibrary } from "@/components/MediaLibrary";
import { ENV } from "@/config/env";

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const lastInteraction = useRef(Date.now());
  const [tokenStats, setTokenStats] = useState<{ current_tokens: number } | null>(null);
  const [userEvents, setUserEvents] = useState<EventConfig[]>([]);
  const [eventsDropdownOpen, setEventsDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isForcedHidden, setIsForcedHidden] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);

  useEffect(() => {
    const handleVisibility = (e: any) => {
      setIsForcedHidden(!e.detail.visible);
    };
    window.addEventListener('navbar-visibility', handleVisibility);
    return () => window.removeEventListener('navbar-visibility', handleVisibility);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || 'individual';
  const hasAlbumTracking = hasFeature(userRole, 'albumTracking');
  const isBusinessUser = userRole.startsWith('business') && userRole !== 'business_pending';

  // Paths where navbar should be completely hidden
  const isHiddenPath =
    location.pathname === '/' ||
    location.pathname === '/terms' ||
    location.pathname === '/privacy' ||
    location.pathname === '/apply' ||
    location.pathname === '/auth' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/creator') || // Hide in creator dashboard
    location.pathname.startsWith('/super-admin') || // Hide in super admin dashboard
    [
      '/registration',
      '/booth',
      '/viewer',
      '/display', // Big Screen
      '/feed'
    ].some(path => location.pathname.endsWith(path)) ||
    // Check for dynamic event routes that are not business routes
    (location.pathname.split('/').length >= 3 &&
      !location.pathname.startsWith('/business') &&
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

  // Load user events for Live Mode shortcuts
  useEffect(() => {
    if (isHiddenPath) return;

    const loadEvents = async () => {
      try {
        const events = await getUserEvents();
        setUserEvents(events || []);
      } catch (error) {
        console.error("Failed to load events", error);
      }
    };

    loadEvents();
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
      const isTop = e.clientY <= 40; // Simplified detection area

      if (isTop) {
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
    navigate("/auth");
  };

  const handleExitImpersonation = () => {
    const recoveryToken = localStorage.getItem('admin_recovery_token');
    const recoveryUser = localStorage.getItem('admin_recovery_user');

    if (recoveryToken) {
      localStorage.setItem('auth_token', recoveryToken);
      if (recoveryUser) {
        localStorage.setItem('user', recoveryUser);
      }

      // Clean up recovery keys
      localStorage.removeItem('admin_recovery_token');
      localStorage.removeItem('admin_recovery_user');

      // Notify app of auth change
      window.dispatchEvent(new Event("auth-change"));

      // Redirect back to super admin users
      window.location.href = '/super-admin/users';
      toast.success("Restored super admin session");
    }
  };

  const adminRecoveryToken = localStorage.getItem('admin_recovery_token');

  if (isHiddenPath || !isBusinessUser && !adminRecoveryToken) return null;

  const navItems = isBusinessUser ? [
    { id: 'events', label: 'Events', icon: FolderKanban, path: '/business/events' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/business/analytics' },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, path: '/business/marketplace' },
    { id: 'assist', label: 'Assist', icon: Sparkles, path: '/business/chat' },
    { id: 'playground', label: 'Playground', icon: Gamepad2, path: '/business/playground' },
  ] : [];

  const isActive = (path: string) => {
    if (path === '/business/events' && (location.pathname === '/business' || location.pathname === '/business/events')) return true;
    return location.pathname.startsWith(path);
  };

  // Get display values
  const tokens = tokenStats?.current_tokens ?? currentUser?.tokens_remaining ?? 0;

  // Get active/live events for quick access
  const activeEvents = userEvents.filter(e => e.is_active !== false).slice(0, 3);

  return (
    <AnimatePresence>
      {isVisible && !isForcedHidden && (
        <motion.div
          key="top-navbar"
          initial={{ opacity: 0, y: isMobile ? 20 : -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: isMobile ? 20 : -20, x: "-50%" }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed bottom-3 md:top-4 md:bottom-auto left-1/2 z-[100] flex items-center justify-center -translate-x-1/2"
          onMouseEnter={() => {
            setIsHovered(true);
            handleInteraction();
          }}
          onMouseLeave={() => setIsHovered(false)}
        >
          {adminRecoveryToken && (
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <div className="flex items-center gap-2 px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full backdrop-blur-md shadow-xl animate-in slide-in-from-top-4">
                <UserCog className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-200 font-medium">
                  Viewing as {currentUser?.email}
                </span>
                <div className="h-3 w-px bg-red-500/20 mx-1" />
                <button
                  onClick={handleExitImpersonation}
                  className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1 transition-colors"
                >
                  Exit View <LogOut className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-1 bg-card/80 backdrop-blur-md border border-white/10 rounded-full shadow-2xl shadow-black/50">

            {/* Home Shortcut */}
            <button
              onClick={() => navigate(isBusinessUser ? '/business/home' : '/creator/dashboard')}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg ml-1 hover:scale-105 transition-transform"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-white/10 mx-1" />

            {/* Nav Items */}
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.path);

                // Special handling for Events - make it a dropdown
                if (item.id === 'events') {
                  return (
                    <DropdownMenu key={item.id} open={eventsDropdownOpen} onOpenChange={setEventsDropdownOpen}>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                            active
                              ? "bg-white/10 text-white shadow-inner"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                          )}
                        >
                          <item.icon className={cn("w-3.5 h-3.5", active && "text-indigo-400")} />
                          <span className={cn(
                            "hidden sm:inline-block whitespace-nowrap transition-all duration-300",
                            !active && "opacity-0 w-0 overflow-hidden group-hover:opacity-100 group-hover:w-auto"
                          )}>
                            {item.label}
                          </span>
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side={isMobile ? "top" : "bottom"}
                        sideOffset={15}
                        align="start"
                        className="w-56 bg-card border-white/10 text-white p-2"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            navigate('/business/events');
                            setEventsDropdownOpen(false);
                            handleInteraction();
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                        >
                          <FolderKanban className="w-4 h-4 text-zinc-400" />
                          <span>All Events</span>
                        </DropdownMenuItem>

                        {activeEvents.length > 0 && (
                          <>
                            <DropdownMenuSeparator className="bg-white/10 my-1" />
                            <div className="px-2 py-1 text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                              Quick Access
                            </div>
                            {activeEvents.map((event) => (
                              <DropdownMenuItem
                                key={event._id}
                                onClick={() => {
                                  navigate(`/business/events/${event._id}/live`);
                                  setEventsDropdownOpen(false);
                                  handleInteraction();
                                }}
                                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white text-emerald-400"
                              >
                                <Radio className="w-4 h-4" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs truncate">{event.title}</div>
                                  <div className="text-[10px] text-zinc-500">Live Mode</div>
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                // Regular nav items
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

            <div className="h-4 w-px bg-white/10 mx-1" />

            {/* User Dropdown - Minimized */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative h-8 w-auto flex items-center gap-2 pl-1 pr-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 group outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {/* Avatar */}
                  <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-sm">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt="User"
                        className="w-full h-full object-cover opacity-100 group-hover:opacity-0 transition-opacity absolute inset-0"
                      />
                    ) : (
                      <span className="text-[9px] font-bold opacity-100 group-hover:opacity-0 transition-opacity absolute inset-0 flex items-center justify-center">
                        {currentUser?.username?.substring(0, 2).toUpperCase() || 'ME'}
                      </span>
                    )}
                    <Settings className="w-3 h-3 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Minimized Token Count - Business Only (inside button) */}
                  {isBusinessUser && (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-300">
                      <span className="w-1 h-1 rounded-full bg-green-500" />
                      <span className="text-yellow-500 flex items-center gap-0.5">
                        <Coins className="w-2.5 h-2.5" />
                        {tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>

              {/* Individual Token Display - Circular Percentage (outside button) */}
              {!isBusinessUser && (
                <div className="flex items-center justify-center p-1" title={`${tokens} tokens remaining`}>
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        className="text-white/10"
                        strokeWidth="2"
                        fill="none"
                        stroke="currentColor"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        className={cn(
                          "transition-all duration-500",
                          tokens > 20 ? "text-indigo-500" : "text-amber-500"
                        )}
                        strokeWidth="2"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={63} // Circumference of r=10 is ~62.8
                        strokeDashoffset={63 - (63 * (Math.min(tokens, 100) / 100))}
                        strokeLinecap="round"
                      />
                    </svg>
                    <Zap className="w-2.5 h-2.5 absolute text-white/50" />
                  </div>
                </div>
              )}
              <DropdownMenuContent
                side={isMobile ? "top" : "bottom"}
                sideOffset={15}
                align="end"
                className="w-56 bg-card border-white/10 text-white p-2 mt-2"
              >
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-white">{currentUser?.name || currentUser?.full_name || currentUser?.username || 'User'}</p>
                  <p className="text-xs text-zinc-500 truncate">{currentUser?.email}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-400">
                    <span className="capitalize bg-white/5 px-1.5 py-0.5 rounded">{userRole.replace(/_/g, ' ')}</span>
                    {isBusinessUser && (
                      <span className="text-yellow-500 flex items-center gap-1">
                        <Coins className="w-3 h-3" /> {tokens.toLocaleString()} Tokens
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  onClick={() => navigate(isBusinessUser ? '/business/home' : '/creator/dashboard')}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                >
                  <Menu className="w-4 h-4 text-zinc-400" />
                  <span>Home</span>
                </DropdownMenuItem>

                {(currentUser?.slug || currentUser?.username) && (
                  <DropdownMenuItem
                    onClick={() => {
                      const profilePath = isBusinessUser
                        ? `/org/${currentUser?.slug || currentUser?.username}`
                        : `/profile/${currentUser?.slug || currentUser?.username}`;
                      navigate(profilePath);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                  >
                    <User className="w-4 h-4 text-zinc-400" />
                    <span>View Profile</span>
                  </DropdownMenuItem>
                )}

                {isBusinessUser ? (
                  <DropdownMenuItem
                    onClick={() => navigate('/business/settings')}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white text-indigo-400"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Business Settings</span>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => navigate('/creator/settings')}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                  >
                    <Settings className="w-4 h-4 text-zinc-400" />
                    <span>Account Settings</span>
                  </DropdownMenuItem>
                )}

                {isBusinessUser && (
                  <DropdownMenuItem
                    onClick={() => navigate('/business/studio?view=assets')}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                  >
                    <Image className="w-4 h-4 text-zinc-400" />
                    <span>Assets</span>
                  </DropdownMenuItem>
                )}

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
      )}

    </AnimatePresence>
  );
}

