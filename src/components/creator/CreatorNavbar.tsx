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
    Camera
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

interface CreatorNavbarProps {
    user: User | null;
}

export function CreatorNavbar({ user }: CreatorNavbarProps) {
    const navigate = useNavigate();
    const location = useLocation();

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

                    {/* Token Progress Bar */}
                    <div
                        className="hidden sm:flex items-center gap-3 bg-zinc-900/50 hover:bg-zinc-800/50 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 transition-all group cursor-help min-w-[140px]"
                        title={`${tokens.toLocaleString()} / ${(user?.tokens_total || 1000).toLocaleString()} tokens remaining`}
                    >
                        <div className="flex flex-col gap-0.5 flex-1">
                            <div className="flex items-center justify-between text-[10px] font-medium leading-none">
                                <span className="text-zinc-400 group-hover:text-zinc-300 transition-colors">Tokens</span>
                                <span className={cn(
                                    "transition-colors",
                                    (user?.tokens_remaining || 0) <= 20 ? "text-amber-500" : "text-indigo-400"
                                )}>
                                    {Math.round(((user?.tokens_remaining || 0) / (user?.tokens_total || 1000)) * 100)}%
                                </span>
                            </div>
                            {/* Progress Bar Track */}
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                {/* Progress Fill */}
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        (user?.tokens_remaining || 0) <= 20 ? "bg-amber-500" : "bg-indigo-500"
                                    )}
                                    style={{
                                        width: `${Math.min(100, Math.max(0, ((user?.tokens_remaining || 0) / (user?.tokens_total || 1000)) * 100))}%`
                                    }}
                                />
                            </div>
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
    );
}
