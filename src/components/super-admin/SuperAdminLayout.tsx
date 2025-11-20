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
    X
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
        { icon: BarChart3, label: "Analytics", path: "/super-admin/analytics" },
        { icon: Settings, label: "Settings", path: "/super-admin/settings" },
        { icon: Terminal, label: "Dev Tools", path: "/super-admin/devtools" },
    ];

    if (!currentUser) return null;

    return (
        <div className="min-h-screen bg-black text-white flex">
            {/* Sidebar */}
            <aside
                className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900/80 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0
        `}
            >
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                            <Settings className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Super Admin</span>
                    </div>
                    <button
                        className="md:hidden text-zinc-400 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="px-4 py-2 space-y-1">
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
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive
                                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                        : "text-zinc-400 hover:bg-white/5 hover:text-white"}
                `}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-zinc-900/50">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">SA</span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{currentUser.username}</p>
                            <p className="text-xs text-zinc-500 truncate">System Owner</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full bg-white/5 border border-white/5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/50 backdrop-blur-md">
                    <span className="font-bold text-lg">Super Admin</span>
                    <button onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu className="w-6 h-6 text-white" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    {/* Background Effects */}
                    <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px] -z-10 pointer-events-none" />

                    <Outlet />
                </div>
            </main>
        </div>
    );
}
