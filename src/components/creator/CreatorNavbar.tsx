import { useState, useEffect, useRef } from "react";
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
    Zap,
    ChevronDown,
    ImageIcon,
    Video,
    Menu,
    X,
    Home,
    GalleryHorizontal,
    Bot,
    CheckCircle2,
    LayoutTemplate,
    Palette
} from "lucide-react";
import { logoutUser, User } from "@/services/eventsApi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";
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
    creatingCount?: number;
}

export function CreatorNavbar({ user, creatingCount = 0 }: CreatorNavbarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const [showTopUp, setShowTopUp] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const prevCreatingCount = useRef(creatingCount);

    // Track when jobs complete to show the "Done" indicator
    useEffect(() => {
        if (prevCreatingCount.current > creatingCount && creatingCount === 0) {
            setShowCompleted(true);
            const timer = setTimeout(() => setShowCompleted(false), 5000); // Show for 5 seconds
            return () => clearTimeout(timer);
        }
        prevCreatingCount.current = creatingCount;
    }, [creatingCount]);

    const handleLogout = () => {
        logoutUser();
        navigate("/auth");
    };

    const navItems = [
        { id: 'overview', label: 'Home', icon: LayoutDashboard, path: '/creator/dashboard' },
        { id: 'create', label: 'Create', icon: PlusCircle, path: '/creator/create' },
        { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag, path: '/creator/marketplace' },
        { id: 'booth', label: 'My Booth', icon: Camera, path: '/creator/booth' },
        { id: 'assist', label: 'Assist', icon: Sparkles, path: '/creator/chat' },
    ];

    const tokens = user?.tokens_remaining || 0;

    return (
        <header className="fixed top-0 w-full z-50 bg-[#101112]/30 backdrop-blur-xl border-b border-white/5">
            <div className="w-full px-4 md:px-8 h-16 flex items-center justify-between">

                {/* Left Side: Hamburger (Mobile) & Logo */}
                <div className="flex items-center gap-2 md:gap-8 z-50">
                    {/* Mobile Hamburger Menu - Moved to Left */}
                    <div className="md:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-12 w-12 -ml-2">
                                    <Menu className="w-8 h-8" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="bg-[#101112]/95 backdrop-blur-xl border-white/5 text-white p-0 z-[200]" overlayClassName="z-[200]">
                                <div className="flex flex-col h-full">
                                    {/* Logo in Menu Header */}
                                    <div className="px-6 pt-10 pb-6 border-b border-white/5 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-[.4rem] overflow-hidden bg-white shadow-lg shadow-black/20 shrink-0">
                                            <img src="/PicturemeIconv2.png" alt="Pictureme" className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-xl font-bold tracking-tight text-white whitespace-nowrap">PictureMe</span>
                                    </div>
                                    <div className="px-6 py-4 space-y-6 flex-1 overflow-y-auto scrollbar-hide">
                                        {/* Featured Section */}
                                        <div className="space-y-3">
                                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Creators Tools</h3>
                                            <SheetClose asChild>
                                                <button
                                                    onClick={() => { navigate('/creator/studio'); }}
                                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#D1F349]/10 border border-[#D1F349]/20 hover:bg-[#D1F349]/20 transition-all text-left"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-[#D1F349] flex items-center justify-center shadow-lg shadow-[#D1F349]/20">
                                                            <Sparkles className="w-6 h-6 text-black" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-white">Create in Studio</h4>
                                                            <p className="text-[10px] text-zinc-400">Professional AI snapshots</p>
                                                        </div>
                                                    </div>
                                                    <ChevronDown className="w-4 h-4 text-zinc-600 -rotate-90" />
                                                </button>
                                            </SheetClose>

                                            <SheetClose asChild>
                                                <button
                                                    onClick={() => { navigate('/creator/booth'); }}
                                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-left"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                                            <Camera className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-white">My Booths</h4>
                                                            <p className="text-[10px] text-zinc-400">Manage real-time events</p>
                                                        </div>
                                                    </div>
                                                    <ChevronDown className="w-4 h-4 text-zinc-600 -rotate-90" />
                                                </button>
                                            </SheetClose>

                                            <SheetClose asChild>
                                                <button
                                                    onClick={() => { navigate('/creator/chat'); }}
                                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all text-left"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                            <Bot className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-white">AI Assistant</h4>
                                                            <p className="text-[10px] text-zinc-400">Your creative companion</p>
                                                        </div>
                                                    </div>
                                                    <ChevronDown className="w-4 h-4 text-zinc-600 -rotate-90" />
                                                </button>
                                            </SheetClose>
                                        </div>

                                        {/* Main Navigation */}
                                        <div className="space-y-1">
                                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1 mb-3">Navigation</h3>
                                            <SheetClose asChild>
                                                <button
                                                    onClick={() => navigate('/creator/dashboard')}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all",
                                                        location.pathname === '/creator/dashboard' ? "bg-white/5 text-white" : "text-zinc-400 hover:text-white"
                                                    )}
                                                >
                                                    <Home className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Explore Home</span>
                                                </button>
                                            </SheetClose>
                                            <SheetClose asChild>
                                                <button
                                                    onClick={() => navigate('/creator/studio')}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all",
                                                        location.pathname === '/creator/studio' ? "bg-white/5 text-white" : "text-zinc-400 hover:text-white"
                                                    )}
                                                >
                                                    <Sparkles className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Creator Studio</span>
                                                </button>
                                            </SheetClose>
                                            <SheetClose asChild>
                                                <button
                                                    onClick={() => navigate('/creator/gallery')}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all",
                                                        location.pathname === '/creator/gallery' ? "bg-white/5 text-white" : "text-zinc-400 hover:text-white"
                                                    )}
                                                >
                                                    <GalleryHorizontal className="w-5 h-5" />
                                                    <span className="text-sm font-medium">My Gallery</span>
                                                </button>
                                            </SheetClose>
                                            <SheetClose asChild>
                                                <button
                                                    onClick={() => navigate('/creator/booth')}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all",
                                                        location.pathname === '/creator/booth' ? "bg-white/5 text-white" : "text-zinc-400 hover:text-white"
                                                    )}
                                                >
                                                    <Camera className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Booth Events</span>
                                                </button>
                                            </SheetClose>
                                            <SheetClose asChild>
                                                <button
                                                    onClick={() => navigate('/creator/marketplace')}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all",
                                                        location.pathname === '/creator/marketplace' ? "bg-white/5 text-white" : "text-zinc-400 hover:text-white"
                                                    )}
                                                >
                                                    <ShoppingBag className="w-5 h-5" />
                                                    <span className="text-sm font-medium">Marketplace</span>
                                                </button>
                                            </SheetClose>
                                        </div>

                                        {/* Bottom Actions */}
                                        <div className="pt-6 border-t border-white/5 space-y-2">
                                            <SheetClose asChild>
                                                <button
                                                    onClick={() => navigate('/creator/settings')}
                                                    className="w-full h-12 flex items-center gap-4 px-3 rounded-xl text-zinc-400 hover:text-white transition-all text-sm font-medium"
                                                >
                                                    <Settings className="w-5 h-5" />
                                                    Settings
                                                </button>
                                            </SheetClose>
                                            <SheetClose asChild>
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full h-12 flex items-center gap-4 px-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium"
                                                >
                                                    <LogOut className="w-5 h-5" />
                                                    Sign out
                                                </button>
                                            </SheetClose>
                                        </div>
                                    </div>

                                    {/* User Section at bottom */}
                                    <div className="p-6 bg-white/5 border-t border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                                                {(user?.avatar_url || user?.image) ? (
                                                    <img src={user.avatar_url || user.image} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500">
                                                        {user?.username?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{user?.full_name || user?.username}</p>
                                                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Logo - Desktop Only */}
                    <div
                        className={cn(
                            "hidden md:flex items-center gap-2 cursor-pointer group",
                            "md:relative md:left-auto md:translate-x-0"
                        )}
                        onClick={() => navigate('/creator/dashboard')}
                    >
                        <div className="w-10 h-10 rounded-[.4rem] overflow-hidden bg-white shadow-lg shadow-black/20 group-hover:bg-transparent transition-colors duration-300">
                            <img src="/PicturemeIconv2.png" alt="Pictureme" className="w-full h-full object-cover group-hover:hidden" />
                            <img src="/PicturemeIconv2white.png" alt="Pictureme" className="w-full h-full object-cover hidden group-hover:block" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-white">PictureMe</span>
                    </div>

                    {/* Navigation Links (Desktop Only) */}
                    <div className="hidden md:flex items-center gap-6">
                        <button
                            onClick={() => navigate('/creator/dashboard')}
                            className={cn(
                                "text-sm font-bold transition-all duration-300",
                                location.pathname === '/creator/dashboard'
                                    ? "text-zinc-100"
                                    : "text-zinc-500 hover:text-white"
                            )}
                        >
                            Explore
                        </button>

                        {/* Studio Dropdown */}
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={cn(
                                        "text-sm font-bold transition-all duration-300 flex items-center gap-1",
                                        location.pathname === '/creator/studio'
                                            ? "text-zinc-100"
                                            : "text-zinc-500 hover:text-white"
                                    )}
                                >
                                    Studio
                                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 bg-card border-zinc-900 p-2 z-[100] rounded-2xl shadow-2xl">
                                <DropdownMenuItem
                                    onClick={() => navigate('/creator/studio?view=create&mode=image')}
                                    className="flex items-center gap-3 py-3 rounded-xl cursor-pointer focus:bg-card group"
                                >
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                                        <ImageIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[13px] text-white">Create Image</span>
                                        <span className="text-[10px] text-zinc-500">Professional AI snapshots</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => navigate('/creator/studio?view=create&mode=video')}
                                    className="flex items-center gap-3 py-3 rounded-xl cursor-pointer focus:bg-card group"
                                >
                                    <div className="p-2 rounded-lg bg-[#D1F349]/10 text-[#D1F349] group-hover:bg-[#D1F349]/20 transition-colors">
                                        <Video className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[13px] text-white">Create Video</span>
                                        <span className="text-[10px] text-zinc-500">Cinematic AI animations</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => navigate('/creator/studio?view=create&mode=booth')}
                                    className="flex items-center gap-3 py-3 rounded-xl cursor-pointer focus:bg-card group"
                                >
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                                        <Camera className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[13px] text-white">Photo Booth</span>
                                        <span className="text-[10px] text-zinc-500">Real-time AI sessions</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => navigate('/creator/chat')}
                                    className="flex items-center gap-3 py-3 rounded-xl cursor-pointer focus:bg-card group"
                                >
                                    <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500 group-hover:bg-pink-500/20 transition-colors">
                                        <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[13px] text-white">Assistant</span>
                                        <span className="text-[10px] text-zinc-500">AI Creative Partner</span>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <button
                            onClick={() => navigate('/creator/gallery')}
                            className={cn(
                                "text-sm font-bold transition-all duration-300",
                                location.pathname === '/creator/gallery'
                                    ? "text-zinc-100"
                                    : "text-zinc-500 hover:text-white"
                            )}
                        >
                            Gallery
                        </button>
                        <button
                            onClick={() => navigate('/creator/booth')}
                            className={cn(
                                "text-sm font-bold transition-all duration-300",
                                location.pathname === '/creator/booth'
                                    ? "text-zinc-100"
                                    : "text-zinc-500 hover:text-white"
                            )}
                        >
                            Booths
                        </button>
                        {/* Marketplace Dropdown */}
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className={cn(
                                        "text-sm font-bold transition-all duration-300 flex items-center gap-1",
                                        location.pathname.includes('/marketplace') || location.pathname.includes('/templates')
                                            ? "text-zinc-100"
                                            : "text-zinc-500 hover:text-white"
                                    )}
                                >
                                    Marketplace
                                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56 bg-card border-zinc-900 p-2 z-[100] rounded-2xl shadow-2xl">
                                <DropdownMenuItem
                                    onClick={() => navigate('/creator/marketplace')}
                                    className="flex items-center gap-3 py-3 rounded-xl cursor-pointer focus:bg-card group"
                                >
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                                        <ShoppingBag className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[13px] text-white">Marketplace</span>
                                        <span className="text-[10px] text-zinc-500">Discover AI templates</span>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => navigate('/creator/templates')}
                                    className="flex items-center gap-3 py-3 rounded-xl cursor-pointer focus:bg-card group"
                                >
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                                        <Palette className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[13px] text-white">My Styles</span>
                                        <span className="text-[10px] text-zinc-500">Manage your templates</span>
                                    </div>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Right side Actions (Credits & Profile) */}
                <div className="flex items-center gap-2 sm:gap-4 z-50">
                    {/* Empty div to keep alignment if needed, or just let justifying work */}
                    <div className="md:hidden w-0 h-0" />

                    {/* Minimal Generation Indicator (Desktop Only) */}
                    {(creatingCount > 0 || showCompleted) && (
                        <div
                            className={cn(
                                "hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all duration-500 cursor-pointer overflow-hidden",
                                creatingCount > 0
                                    ? "bg-white/5 border border-white/10 text-[#D1F349]"
                                    : "bg-green-500/10 border border-green-500/20 text-green-400"
                            )}
                            onClick={() => navigate('/creator/studio?view=gallery')}
                        >
                            {creatingCount > 0 ? (
                                <>
                                    <div className="w-4 h-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24">
                                            <rect width="7.33" height="7.33" x="1" y="1" fill="currentColor">
                                                <animate id="SVGzjrPLenI" attributeName="x" begin="0;SVGXAURnSRI.end+0.2s" dur="0.6s" values="1;4;1" />
                                                <animate attributeName="y" begin="0;SVGXAURnSRI.end+0.2s" dur="0.6s" values="1;4;1" />
                                                <animate attributeName="width" begin="0;SVGXAURnSRI.end+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
                                                <animate attributeName="height" begin="0;SVGXAURnSRI.end+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
                                            </rect>
                                            <rect width="7.33" height="7.33" x="8.33" y="1" fill="currentColor">
                                                <animate attributeName="x" begin="SVGzjrPLenI.begin+0.1s" dur="0.6s" values="8.33;11.33;8.33" />
                                                <animate attributeName="y" begin="SVGzjrPLenI.begin+0.1s" dur="0.6s" values="1;4;1" />
                                                <animate attributeName="width" begin="SVGzjrPLenI.begin+0.1s" dur="0.6s" values="7.33;1.33;7.33" />
                                                <animate attributeName="height" begin="SVGzjrPLenI.begin+0.1s" dur="0.6s" values="7.33;1.33;7.33" />
                                            </rect>
                                            <rect width="7.33" height="7.33" x="1" y="8.33" fill="currentColor">
                                                <animate attributeName="x" begin="SVGzjrPLenI.begin+0.1s" dur="0.6s" values="1;4;1" />
                                                <animate attributeName="y" begin="SVGzjrPLenI.begin+0.1s" dur="0.6s" values="8.33;11.33;8.33" />
                                                <animate attributeName="width" begin="SVGzjrPLenI.begin+0.1s" dur="0.6s" values="7.33;1.33;7.33" />
                                                <animate attributeName="height" begin="SVGzjrPLenI.begin+0.1s" dur="0.6s" values="7.33;1.33;7.33" />
                                            </rect>
                                            <rect width="7.33" height="7.33" x="15.66" y="1" fill="currentColor">
                                                <animate attributeName="x" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="15.66;18.66;15.66" />
                                                <animate attributeName="y" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="1;4;1" />
                                                <animate attributeName="width" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
                                                <animate attributeName="height" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
                                            </rect>
                                            <rect width="7.33" height="7.33" x="8.33" y="8.33" fill="currentColor">
                                                <animate attributeName="x" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="8.33;11.33;8.33" />
                                                <animate attributeName="y" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="8.33;11.33;8.33" />
                                                <animate attributeName="width" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
                                                <animate attributeName="height" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
                                            </rect>
                                            <rect width="7.33" height="7.33" x="1" y="15.66" fill="currentColor">
                                                <animate attributeName="x" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="1;4;1" />
                                                <animate attributeName="y" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="15.66;18.66;15.66" />
                                                <animate attributeName="width" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
                                                <animate attributeName="height" begin="SVGzjrPLenI.begin+0.2s" dur="0.6s" values="7.33;1.33;7.33" />
                                            </rect>
                                            <rect width="7.33" height="7.33" x="15.66" y="8.33" fill="currentColor">
                                                <animate attributeName="x" begin="SVGzjrPLenI.begin+0.3s" dur="0.6s" values="15.66;18.66;15.66" />
                                                <animate attributeName="y" begin="SVGzjrPLenI.begin+0.3s" dur="0.6s" values="8.33;11.33;8.33" />
                                                <animate attributeName="width" begin="SVGzjrPLenI.begin+0.3s" dur="0.6s" values="7.33;1.33;7.33" />
                                                <animate attributeName="height" begin="SVGzjrPLenI.begin+0.3s" dur="0.6s" values="7.33;1.33;7.33" />
                                            </rect>
                                            <rect width="7.33" height="7.33" x="8.33" y="15.66" fill="currentColor">
                                                <animate attributeName="x" begin="SVGzjrPLenI.begin+0.3s" dur="0.6s" values="8.33;11.33;8.33" />
                                                <animate attributeName="y" begin="SVGzjrPLenI.begin+0.3s" dur="0.6s" values="15.66;18.66;15.66" />
                                                <animate attributeName="width" begin="SVGzjrPLenI.begin+0.3s" dur="0.6s" values="7.33;1.33;7.33" />
                                                <animate attributeName="height" begin="SVGzjrPLenI.begin+0.3s" dur="0.6s" values="7.33;1.33;7.33" />
                                            </rect>
                                            <rect width="7.33" height="7.33" x="15.66" y="15.66" fill="currentColor">
                                                <animate id="SVGXAURnSRI" attributeName="x" begin="SVGzjrPLenI.begin+0.4s" dur="0.6s" values="15.66;18.66;15.66" />
                                                <animate attributeName="y" begin="SVGzjrPLenI.begin+0.4s" dur="0.6s" values="15.66;18.66;15.66" />
                                                <animate attributeName="width" begin="SVGzjrPLenI.begin+0.4s" dur="0.6s" values="7.33;1.33;7.33" />
                                                <animate attributeName="height" begin="SVGzjrPLenI.begin+0.4s" dur="0.6s" values="7.33;1.33;7.33" />
                                            </rect>
                                        </svg>
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest">{creatingCount} Creating</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-[11px] font-black uppercase tracking-widest">Done</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Credits Pill (Simple Popover) */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <div
                                className="flex items-center gap-1.5 sm:gap-2 bg-card/60 hover:bg-zinc-800/80 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1 sm:px-4 sm:py-2 transition-all cursor-pointer hover:border-amber-500/50"
                                title={`${tokens.toLocaleString()} tokens remaining`}
                            >
                                <Zap className={cn(
                                    "w-4 h-4 fill-current",
                                    (user?.tokens_remaining || 0) <= 20 ? "text-amber-500" : "text-amber-400"
                                )} />
                                <span className="text-xs sm:text-sm font-bold text-white">
                                    {(user?.tokens_remaining || 0) >= 10000
                                        ? `${Math.floor((user?.tokens_remaining || 0) / 1000)}k`
                                        : user?.tokens_remaining?.toLocaleString() || 0}
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

                            <div className="bg-card/50 p-4 border-t border-white/5 space-y-3">
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
                            </div>
                            <button
                                onClick={() => navigate('/creator/billing')}
                                className="w-full text-center text-xs text-zinc-500 hover:text-white mt-2 transition-colors"
                            >
                                View Full History
                            </button>
                        </PopoverContent>
                    </Popover>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="relative w-10 h-10 rounded-full bg-zinc-800 border-2 border-white/10 overflow-hidden hover:border-white/30 transition-all shadow-lg">
                                {(user?.avatar_url || user?.image) ? (
                                    <img src={user.avatar_url || user.image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                                        {user?.username?.substring(0, 2).toUpperCase() || 'ME'}
                                    </span>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-xl border-white/10 text-white shadow-2xl">
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

        </header>
    );
}
