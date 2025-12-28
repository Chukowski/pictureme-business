import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    ShoppingBag,
    Image as ImageIcon,
    Video,
    Sparkles,
    User,
    Menu,
    LogOut,
    Settings,
    CreditCard,
    Plus
} from "lucide-react";
import { getCurrentUser, logoutUser } from "@/services/eventsApi";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CreatorMobileNav() {
    const location = useLocation();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);
    const currentUser = getCurrentUser();

    // Paths where navbar should be completely hidden
    const isHiddenPath =
        location.pathname === '/' ||
        location.pathname === '/terms' ||
        location.pathname === '/privacy' ||
        location.pathname === '/apply' ||
        location.pathname === '/admin/auth' ||
        location.pathname === '/admin/register' ||
        location.pathname.startsWith('/super-admin') ||
        // Only hide for PUBLIC booth experiences (not /creator/booth)
        (location.pathname.endsWith('/booth') && !location.pathname.startsWith('/creator')) ||
        location.pathname.endsWith('/registration') ||
        location.pathname.endsWith('/viewer') ||
        location.pathname.endsWith('/display') ||
        location.pathname.endsWith('/feed') ||
        // Check for dynamic event routes that are not admin/creator routes
        (location.pathname.split('/').length >= 3 &&
            !location.pathname.startsWith('/admin') &&
            !location.pathname.startsWith('/super-admin') &&
            !location.pathname.startsWith('/creator') &&
            !location.pathname.startsWith('/profile'));

    useEffect(() => {
        setIsVisible(!isHiddenPath);
    }, [isHiddenPath]);

    const isActive = (path: string) => {
        if (path === '/creator/dashboard' && (location.pathname === '/creator' || location.pathname === '/creator/dashboard')) return true;
        return location.pathname.startsWith(path);
    };

    const handleLogout = () => {
        logoutUser();
        navigate("/admin/auth");
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50">
            {/* Gradient Line Top */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Navbar Container */}
            <div className="bg-[#101112]/85 backdrop-blur-xl pb-safe pt-2 px-2">
                <div className="flex items-end justify-between max-w-lg mx-auto h-16 relative">

                    {/* 1. Home */}
                    <button
                        onClick={() => navigate('/creator')}
                        className="flex-1 flex flex-col items-center justify-center gap-1 h-full w-16"
                    >
                        <div className={cn(
                            "p-1.5 rounded-xl transition-all duration-300",
                            isActive('/creator') ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}>
                            <LayoutDashboard strokeWidth={isActive('/creator') ? 2.5 : 2} className="w-6 h-6" />
                        </div>
                        <span className={cn(
                            "text-[10px] font-medium transition-colors",
                            isActive('/creator') ? "text-white" : "text-zinc-500"
                        )}>
                            Home
                        </span>
                    </button>

                    {/* 2. Templates */}
                    <button
                        onClick={() => navigate('/creator/templates')}
                        className="flex-1 flex flex-col items-center justify-center gap-1 h-full w-16"
                    >
                        <div className={cn(
                            "p-1.5 rounded-xl transition-all duration-300",
                            isActive('/creator/templates') ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}>
                            <ShoppingBag strokeWidth={isActive('/creator/templates') ? 2.5 : 2} className="w-6 h-6" />
                        </div>
                        <span className={cn(
                            "text-[10px] font-medium transition-colors",
                            isActive('/creator/templates') ? "text-white" : "text-zinc-500"
                        )}>
                            Store
                        </span>
                    </button>

                    {/* 3. CENTER ACTION BUTTON - Create */}
                    <div className="flex-1 flex flex-col items-center justify-end h-full relative -top-4 w-16">
                        <button
                            onClick={() => navigate('/creator/create')}
                            className="group relative w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300 border-2 border-black"
                        >
                            <Plus className="w-8 h-8 text-white stroke-[3]" />

                            {/* Pulse Effect */}
                            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-0 group-hover:opacity-100" />
                        </button>
                        <span className={cn(
                            "text-[10px] font-medium mt-1 transition-colors",
                            isActive('/creator/create') ? "text-white" : "text-zinc-400"
                        )}>
                            Create
                        </span>
                    </div>

                    {/* 4. My Booths */}
                    <button
                        onClick={() => navigate('/creator/booth')}
                        className="flex-1 flex flex-col items-center justify-center gap-1 h-full w-16"
                    >
                        <div className={cn(
                            "p-1.5 rounded-xl transition-all duration-300",
                            isActive('/creator/booth') ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}>
                            <Video strokeWidth={isActive('/creator/booth') ? 2.5 : 2} className="w-6 h-6" />
                        </div>
                        <span className={cn(
                            "text-[10px] font-medium transition-colors",
                            isActive('/creator/booth') ? "text-white" : "text-zinc-500"
                        )}>
                            Booths
                        </span>
                    </button>

                    {/* 5. Menu / Profile */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex-1 flex flex-col items-center justify-center gap-1 h-full w-16 outline-none">
                                <div className={cn(
                                    "p-0.5 rounded-full transition-all duration-300 border-2",
                                    isActive('/creator/settings') ? "border-indigo-500" : "border-transparent"
                                )}>
                                    <div className="w-7 h-7 rounded-full bg-zinc-800 overflow-hidden relative">
                                        {currentUser?.avatar_url ? (
                                            <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-400 text-[10px] font-bold">
                                                {currentUser?.username?.substring(0, 2).toUpperCase() || <User className="w-4 h-4" />}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-medium transition-colors",
                                    isActive('/creator/settings') ? "text-white" : "text-zinc-500"
                                )}>
                                    Profile
                                </span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-card border-white/10 text-white mb-2 pb-2">
                            <div className="px-2 py-2 border-b border-white/5 mb-1">
                                <p className="font-medium text-sm">{currentUser?.full_name || currentUser?.username}</p>
                                <p className="text-xs text-zinc-500 truncate">{currentUser?.email}</p>
                            </div>

                            <DropdownMenuItem onClick={() => navigate('/creator/chat')} className="cursor-pointer">
                                <Sparkles className="w-4 h-4 mr-2 text-indigo-400" /> AI Assistant
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => navigate('/creator/settings')} className="cursor-pointer">
                                <Settings className="w-4 h-4 mr-2" /> Settings
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
        </div>
    );
}
