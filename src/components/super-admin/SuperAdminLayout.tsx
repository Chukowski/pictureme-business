import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    FileText,
    CreditCard,
    Calendar,
    Cpu,
    ShoppingBag,
    BarChart3,
    Settings,
    Terminal,
    LogOut,
    Menu,
    X,
    Megaphone,
    Layers,
    AlertTriangle,
    Bell,
    ChevronDown,
    Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logoutUser } from "@/services/eventsApi";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function SuperAdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const currentUser = getCurrentUser();

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'superadmin') {
            toast.error("Unauthorized access");
            navigate("/auth");
        }
    }, [currentUser, navigate]);

    const handleLogout = () => {
        logoutUser();
        toast.success("Logged out successfully");
        navigate("/auth");
    };

    const navItems = [
        { icon: LayoutDashboard, label: "Overview", path: "/super-admin" },
        { icon: Users, label: "Users", path: "/super-admin/users" },
        { icon: FileText, label: "Applications", path: "/super-admin/applications" },
        { icon: CreditCard, label: "Billing", path: "/super-admin/billing" },
        { icon: Calendar, label: "Events", path: "/super-admin/events" },
        { icon: Cpu, label: "AI Models", path: "/super-admin/models" },
        { icon: ShoppingBag, label: "Marketplace", path: "/super-admin/marketplace" },
        { icon: Layers, label: "Tiers", path: "/super-admin/tiers" },
        { icon: Megaphone, label: "Content", path: "/super-admin/content" },
        { icon: BarChart3, label: "Analytics", path: "/super-admin/analytics" },
        { icon: Settings, label: "Settings", path: "/super-admin/settings" },
        { icon: Terminal, label: "Dev Tools", path: "/super-admin/devtools" },
    ];

    const isActive = (path: string) => {
        if (path === '/super-admin') return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    if (!currentUser) return null;

    return (
        <div className="min-h-screen w-full bg-[#101112] font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
            <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/5 via-[#101112]/0 to-[#101112]/0 -z-10 pointer-events-none" />

            {/* Top Navbar */}
            <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
                <nav className="flex items-center gap-2 p-1.5 bg-card/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl shadow-black/50">
                    {/* Home Button */}
                    <button
                        onClick={() => navigate('/business/home')}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg hover:scale-105 transition-transform ml-1"
                        title="Back to Dashboard"
                    >
                        <Home className="w-4 h-4" />
                    </button>

                    <div className="h-5 w-px bg-white/10 mx-1" />

                    {/* Main Nav Items */}
                    <div className="hidden md:flex items-center gap-1">
                        {navItems.slice(0, 6).map((item) => {
                            const active = isActive(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={cn(
                                        "group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                        active
                                            ? "bg-white/10 text-white shadow-inner"
                                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className={cn("w-3.5 h-3.5", active && "text-amber-400")} />
                                    <span className={cn(
                                        "hidden lg:inline-block whitespace-nowrap transition-all duration-300",
                                        !active && "lg:opacity-0 lg:w-0 lg:overflow-hidden lg:group-hover:opacity-100 lg:group-hover:w-auto"
                                    )}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* More Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all">
                                <Menu className="w-3.5 h-3.5" />
                                <span>More</span>
                                <ChevronDown className="w-3 h-3 opacity-50" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="bottom"
                            sideOffset={15}
                            align="end"
                            className="w-48 bg-card border-white/10 text-white p-2"
                        >
                            {navItems.slice(6).map((item) => (
                                <DropdownMenuItem
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={cn(
                                        "flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md focus:bg-white/5 focus:text-white",
                                        isActive(item.path) ? "bg-white/5 text-white" : "hover:bg-white/5"
                                    )}
                                >
                                    <item.icon className="w-4 h-4 text-zinc-400" />
                                    <span>{item.label}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="h-5 w-px bg-white/10 mx-1" />

                    {/* User Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="relative h-8 flex items-center gap-2 pl-1 pr-3 rounded-full bg-amber-500/10 hover:bg-amber-500/20 transition-colors border border-amber-500/20 group outline-none">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-[9px] font-bold text-white">
                                    SA
                                </div>
                                <span className="text-xs font-medium text-amber-400">Admin</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="bottom"
                            sideOffset={15}
                            align="end"
                            className="w-56 bg-card border-white/10 text-white p-2"
                        >
                            <div className="px-2 py-1.5">
                                <p className="text-sm font-medium text-white">{currentUser.username}</p>
                                <p className="text-xs text-zinc-500 truncate">{currentUser.email}</p>
                                <span className="inline-block mt-1.5 text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
                                    Super Admin
                                </span>
                            </div>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem
                                onClick={() => navigate('/super-admin/settings')}
                                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                            >
                                <Settings className="w-4 h-4 text-zinc-400" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => navigate('/super-admin/devtools')}
                                className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/5 rounded-md focus:bg-white/5 focus:text-white"
                            >
                                <Terminal className="w-4 h-4 text-zinc-400" />
                                <span>Dev Tools</span>
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

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-zinc-400"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                </nav>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 right-0 mt-2 p-2 bg-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
                        <div className="grid grid-cols-3 gap-2">
                            {navItems.map((item) => {
                                const active = isActive(item.path);
                                return (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            navigate(item.path);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={cn(
                                            "flex flex-col items-center gap-1 p-3 rounded-xl text-xs transition-all",
                                            active
                                                ? "bg-white/10 text-white"
                                                : "text-zinc-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon className={cn("w-5 h-5", active && "text-amber-400")} />
                                        <span className="truncate text-[10px]">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content */}
            <main className="min-h-screen pt-24 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
