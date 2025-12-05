import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FolderKanban, BarChart3, ShoppingBag, BookOpen, Gamepad2, Settings, Menu } from "lucide-react";
import { getCurrentUser } from "@/services/eventsApi";
import { hasFeature } from "@/lib/planFeatures";
import { cn } from "@/lib/utils";

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const lastInteraction = useRef(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentUser = getCurrentUser();
  const hasAlbumTracking = hasFeature(currentUser?.role, 'albumTracking');

  // Define workspaces where auto-hide is active
  const isWorkspace = [
    '/playground',
    '/edit',
    '/create',
    '/live',
    '/staff',
    '/booth',
    '/registration',
    '/viewer',
    '/bigscreen'
  ].some(path => location.pathname.includes(path));

  // Handle Auto-Hide Logic
  useEffect(() => {
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
  }, [isWorkspace, isHovered]);

  // Handle Mouse Interaction
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Trigger area: Top-Left 40x40px
      if (e.clientX <= 40 && e.clientY <= 40) {
        setIsVisible(true);
        lastInteraction.current = Date.now();
      }
      
      // Also show if close to top on mobile (simple check)
      if (e.clientY <= 15) {
        setIsVisible(true);
        lastInteraction.current = Date.now();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleInteraction = () => {
    lastInteraction.current = Date.now() + 1500; // Add extra buffer
    setIsVisible(true);
  };

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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed top-4 left-4 z-[100]"
          onMouseEnter={() => {
            setIsHovered(true);
            handleInteraction();
          }}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="flex items-center gap-2 p-1 bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-full shadow-2xl shadow-black/50">
            
            {/* Brand / Home Trigger */}
            <button 
              onClick={() => navigate('/admin/home')}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg ml-1"
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
      )}
    </AnimatePresence>
  );
}

