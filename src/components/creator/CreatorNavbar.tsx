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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { TopUpModal } from "@/components/billing/TopUpModal";
import { UpgradePlanModal } from "@/components/billing/UpgradePlanModal";

interface CreatorNavbarProps {
    user: User | null;
}

export function CreatorNavbar({ user }: CreatorNavbarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showTopUp, setShowTopUp] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

                    {/* Credits Pill (Simple Popover) */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <div
                                className="hidden sm:flex items-center gap-2 bg-zinc-900/60 hover:bg-zinc-800/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 transition-all cursor-pointer hover:border-amber-500/50"
                                title={`${tokens.toLocaleString()} tokens remaining`}
                            >
                                <Zap className={cn(
                                    "w-4 h-4 fill-current",
                                    (user?.tokens_remaining || 0) <= 20 ? "text-amber-500" : "text-amber-400"
                                )} />
                                <span className="text-sm font-bold text-white">
                                    {user?.tokens_remaining?.toLocaleString() || 0}
                                </span>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 bg-[#09090b] border border-white/10 shadow-2xl p-0 rounded-2xl overflow-hidden mr-4" align="end" sideOffset={8}>
                            <div className="p-5 space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-1">Available Tokens</h4>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-white">{tokens.toLocaleString()}</span>
                                        <span className="text-zinc-500 text-sm">tokens</span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-zinc-500">
                                        <span>Monthly Usage</span>
                                        <span>{Math.min(100, Math.round((tokens / 1000) * 100))}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                                            style={{ width: `${Math.min(100, Math.round((tokens / 1000) * 100))}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setShowTopUp(true)}
                                        className="bg-[#D1F349] hover:bg-[#b0cc3d] text-black font-bold py-2 px-4 rounded-xl text-sm transition-colors"
                                    >
                                        Top Up
                                    </button>
                                    <button
                                        onClick={() => setShowUpgradeModal(true)}
                                        className="bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors"
                                    >
                                        Upgrade
                                    </button>
                                </div>
                            </div>

                            <div className="bg-zinc-900/50 p-4 border-t border-white/5 space-y-3">
                                <h5 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Recent Activity</h5>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-zinc-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            Image Generation
                                        </div>
                                        <span className="text-zinc-500 font-mono">-1</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-zinc-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            Video Render
                                        </div>
                                        <span className="text-zinc-500 font-mono">-4</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/creator/billing')}
                                    className="w-full text-center text-xs text-zinc-500 hover:text-white mt-2 transition-colors"
                                >
                                    View Full History
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>

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
            <UpgradePlanModal open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

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
