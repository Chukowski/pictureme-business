import { useState, useEffect } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENV } from "@/config/env";
import { toast } from "sonner";
import { getCurrentUser } from "@/services/eventsApi";

// New modular components
import { SuperAdminToolsGrid } from "./home/SuperAdminToolsGrid";
import { SuperAdminLiveStats } from "./home/SuperAdminLiveStats";
import { SuperAdminActivityBlock } from "./home/SuperAdminActivityBlock";
import { SuperAdminInsightsPanel } from "./home/SuperAdminInsightsPanel";
import { SuperAdminPublicFeed } from "./home/SuperAdminPublicFeed";

interface SystemStats {
    users: {
        total: number;
        active: number;
        new_today: number;
    };
    events: {
        total: number;
        active: number;
    };
    photos: {
        total: number;
        today: number;
    };
    tokens: {
        total_used: number;
        used_today: number;
        avg_per_day: number;
    };
    albums: {
        total: number;
        completed: number;
        pending_payment: number;
    };
    revenue: {
        total: number;
        today: number;
        month: number;
    };
    pending_applications: number;
}

export default function SuperAdminOverview() {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const currentUser = getCurrentUser();

    const fetchStats = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("auth_token");

            const response = await fetch(`${ENV.API_URL}/api/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
                setLastRefresh(new Date());
            } else {
                toast.error("Failed to load stats");
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
            toast.error("Failed to load stats");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading && !stats) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="relative min-h-full space-y-8">
            {/* Background Effects */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] -z-10 pointer-events-none" />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                        Welcome back, {currentUser?.username || 'Admin'}
                    </h1>
                    <p className="text-sm text-zinc-500">Platform overview and system management.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchStats}
                        disabled={isLoading}
                        className="border-white/10 bg-card/50 hover:bg-white/5"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Live Platform Stats Card */}
            <SuperAdminLiveStats stats={stats} />

            {/* Quick Access Tools Grid */}
            <SuperAdminToolsGrid />

            {/* Public Feed Monitor */}
            <SuperAdminPublicFeed />

            {/* Main Grid: Activity + Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Activity (8/12) */}
                <div className="lg:col-span-8">
                    <SuperAdminActivityBlock />
                </div>

                {/* Right Column - Insights Panel (4/12) */}
                <div className="lg:col-span-4">
                    <SuperAdminInsightsPanel stats={stats} />
                </div>
            </div>

            {/* Tips Box */}
            <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <h3 className="font-medium text-indigo-400 mb-2">💡 Super Admin Tips</h3>
                <ul className="text-sm text-zinc-400 space-y-1">
                    <li>• <strong>Users:</strong> Manage all users, add tokens, set custom pricing for enterprise clients</li>
                    <li>• <strong>AI Models:</strong> Control default token costs that apply to all users</li>
                    <li>• <strong>Public Feed:</strong> Monitor and moderate public creations</li>
                    <li>• <strong>Applications:</strong> Review pending business tier applications</li>
                </ul>
            </div>
        </div>
    );
}
