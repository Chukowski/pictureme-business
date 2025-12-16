import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    PlusCircle,
    ShoppingBag,
    CreditCard,
    LogOut,
    Settings,
    User as UserIcon,
    Sparkles,
    Camera,
    Zap
} from "lucide-react";
import { logoutUser, User } from "@/services/eventsApi";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TopUpModal } from "@/components/billing/TopUpModal";

interface CreatorNavbarProps {
    user: User | null;
}

export function CreatorNavbar({ user }: CreatorNavbarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showTopUp, setShowTopUp] = useState(false);

    const handleLogout = () => {
        logoutUser();
        navigate("/admin/auth");
    };

    const navItems = [
        { id: 'overview', label: 'Home', icon: LayoutDashboard, path: '/creator/dashboard' },
        { id: 'create', label: 'Create', icon: PlusCircle, path: '/creator/create' },
        { id: 'templates', label: 'Templates', icon: ShoppingBag, path: '/creator/templates' },
        { id: 'booth', label: 'My Booth', icon: Camera, path: '/creator/booth' },
        { id: 'assist', label: 'Assist', icon: Sparkles, path: '/creator/chat' },
    ];

    const tokens = user?.tokens_remaining || 0;

    return (
        <header className="sticky top-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">

                {/* Logo / Brand */}
                <div className="flex items-center gap-6 z-50">
                    <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => navigate('/creator/dashboard')}
                    >
                        <span className="font-bold text-xl tracking-tight text-white group-hover:text-indigo-100 transition-colors drop-shadow-md">PictureMe</span>
                    </div>
                </div>

                {/* Navigation Toggle (Central - Absolute Center) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block z-40">
                    <div className="bg-black/40 p-1 rounded-full border border-white/10 flex items-center backdrop-blur-xl shadow-xl">
                        <button
                            onClick={() => navigate('/creator/dashboard')}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                                location.pathname === '/creator/dashboard'
                                    ? "bg-zinc-800/90 text-white shadow-lg border border-white/5"
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            Explore
                        </button>
                        <button
                            onClick={() => navigate('/creator/studio')}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300",
                                location.pathname !== '/creator/dashboard'
                                    ? "bg-zinc-800/90 text-white shadow-lg border border-white/5"
                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            My Studio
                        </button>
                    </div>
                </div>

                {/* User Profile & Credits */}
                <div className="flex items-center gap-4 z-50">

                    {/* Credits Pill (Simple) */}
                    <div
                        className="hidden sm:flex items-center gap-2 bg-zinc-900/60 hover:bg-zinc-800/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 transition-all cursor-pointer hover:border-amber-500/50"
                        title={`${tokens.toLocaleString()} tokens remaining`}
                        onClick={() => setShowTopUp(true)}
                    >
                        <Zap className={cn(
                            "w-4 h-4 fill-current",
                            (user?.tokens_remaining || 0) <= 20 ? "text-amber-500" : "text-amber-400"
                        )} />
                        <span className="text-sm font-bold text-white">
                            {user?.tokens_remaining?.toLocaleString() || 0}
                        </span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="relative w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/10 overflow-hidden hover:border-white/30 transition-all shadow-lg">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                                        {user?.username?.substring(0, 2).toUpperCase() || 'ME'}
                                    </span>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-zinc-900/95 backdrop-blur-xl border-white/10 text-white shadow-2xl">
                            <div className="px-2 py-1.5 border-b border-white/5 mb-1">
                                <p className="font-medium text-sm text-white">{user?.full_name || user?.username}</p>
                                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                            </div>

                            <DropdownMenuItem onClick={() => navigate('/creator/settings')} className="cursor-pointer focus:bg-white/10 focus:text-white">
                                <Settings className="w-4 h-4 mr-2" /> Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    const profileId = user?.username || user?.slug || user?.id;
                                    if (profileId) navigate(`/profile/${profileId}`);
                                }}
                                className="cursor-pointer focus:bg-white/10 focus:text-white"
                            >
                                <UserIcon className="w-4 h-4 mr-2" /> Public Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/creator/billing')} className="cursor-pointer focus:bg-white/10 focus:text-white">
                                <CreditCard className="w-4 h-4 mr-2" /> Billing
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer">
                                <LogOut className="w-4 h-4 mr-2" /> Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <TopUpModal open={showTopUp} onClose={() => setShowTopUp(false)} />

            {/* Mobile Navigation (Horizontal Scroll) - UPDATED FOR TOGGLE */}
            <div className="md:hidden border-t border-white/5 p-2 flex justify-center">
                <div className="bg-zinc-900/50 p-1 rounded-full border border-white/10 flex items-center">
                    <button
                        onClick={() => navigate('/creator/dashboard')}
                        className={cn(
                            "px-6 py-1.5 rounded-full text-sm font-medium transition-all",
                            location.pathname === '/creator/dashboard'
                                ? "bg-zinc-800 text-white shadow-sm border border-white/5"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        Explore
                    </button>
                    <button
                        onClick={() => navigate('/creator/studio')}
                        className={cn(
                            "px-6 py-1.5 rounded-full text-sm font-medium transition-all",
                            location.pathname !== '/creator/dashboard'
                                ? "bg-zinc-800 text-white shadow-sm border border-white/5"
                                : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        My Studio
                    </button>
                </div>
            </div>
        </header>
    );
}
