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
    Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser, logoutUser } from "@/services/eventsApi";
import { toast } from "sonner";

export default function SuperAdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const currentUser = getCurrentUser();

    useEffect(() => {
        if (!currentUser || currentUser.role !== 'superadmin') {
            toast.error("Unauthorized access");
            navigate("/admin/auth");
        }
    }, [currentUser, navigate]);

    const handleLogout = () => {
        logoutUser();
        toast.success("Logged out successfully");
        navigate("/admin/auth");
    };

    const navItems = [
        { icon: LayoutDashboard, label: "Overview", path: "/super-admin" },
        { icon: Users, label: "Users", path: "/super-admin/users" },
        { icon: FileText, label: "Applications", path: "/super-admin/applications" },
        { icon: CreditCard, label: "Billing", path: "/super-admin/billing" },
        { icon: Calendar, label: "Global Events", path: "/super-admin/events" },
        { icon: Cpu, label: "AI Models", path: "/super-admin/models" },
        { icon: ShoppingBag, label: "Marketplace", path: "/super-admin/marketplace" },
        { icon: Layers, label: "Tiers", path: "/super-admin/tiers" },
        { icon: Megaphone, label: "Content", path: "/super-admin/content" },
        { icon: Bell, label: "Announcements", path: "/super-admin/announcements" },
        { icon: AlertTriangle, label: "System Logs", path: "/super-admin/logs" },
        { icon: BarChart3, label: "Analytics", path: "/super-admin/analytics" },
        { icon: Settings, label: "Settings", path: "/super-admin/settings" },
        { icon: Terminal, label: "Dev Tools", path: "/super-admin/devtools" },
    ];

    if (!currentUser) return null;

    return (
        <div className="min-h-screen w-full flex bg-black font-sans">
            {/* Sidebar */}
            <aside
                className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-white/10 flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
        `}
            >
                <div className="h-14 flex items-center justify-between px-4 border-b border-white/10 bg-zinc-950 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center">
                            <Settings className="w-3.5 h-3.5 text-indigo-400" />
                        </div>
                        <span className="font-bold text-sm tracking-wide text-zinc-200">SUPER ADMIN</span>
                    </div>
                    <button
                        className="md:hidden text-zinc-400 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4 px-2">Management</h2>
                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`
                                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative overflow-hidden text-left
                                      ${isActive
                                            ? "bg-zinc-800 text-white shadow-lg shadow-black/20"
                                            : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"}
                                    `}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                                    )}
                                    <item.icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-4 border-t border-white/10 bg-zinc-950">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-zinc-400">SA</span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-medium text-zinc-300 truncate">{currentUser.username}</p>
                            <p className="text-[10px] text-zinc-600 truncate">System Owner</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full h-8 bg-zinc-900 border border-white/5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-xs transition-all justify-start px-3"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-3.5 h-3.5 mr-2" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-zinc-900 overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-white/10 bg-zinc-950 shrink-0">
                    <span className="font-bold text-sm tracking-wide text-zinc-200">SUPER ADMIN</span>
                    <button onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu className="w-5 h-5 text-zinc-400" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 relative scrollbar-hide">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
