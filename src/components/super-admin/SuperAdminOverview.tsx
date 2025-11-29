import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Users, Calendar, Image as ImageIcon, Coins, DollarSign, Activity, 
    AlertTriangle, TrendingUp, RefreshCw, Loader2, Clock, CheckCircle,
    XCircle, Zap
} from "lucide-react";
import { ENV } from "@/config/env";
import { toast } from "sonner";

interface EventSummary {
    event_id: string;
    title: string;
    slug?: string;
    user_slug?: string;
    owner_email?: string;
    owner_name?: string;
    album_count: number;
    photo_count: number;
    tokens_used: number;
    created_at?: string;
}

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
    eventsSummary?: EventSummary[];
}

export default function SuperAdminOverview() {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

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
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const kpis = stats ? [
        { 
            label: "Total Users", 
            value: stats.users.total.toLocaleString(), 
            subValue: `${stats.users.active} active`,
            icon: Users, 
            color: "text-blue-400", 
            bg: "bg-blue-500/10" 
        },
        { 
            label: "Active Events", 
            value: stats.events.active.toLocaleString(), 
            subValue: `${stats.events.total} total`,
            icon: Calendar, 
            color: "text-purple-400", 
            bg: "bg-purple-500/10" 
        },
        { 
            label: "Photos Today", 
            value: stats.photos.today.toLocaleString(), 
            subValue: `${stats.photos.total.toLocaleString()} total`,
            icon: ImageIcon, 
            color: "text-pink-400", 
            bg: "bg-pink-500/10" 
        },
        { 
            label: "Tokens Used Today", 
            value: (stats.tokens?.used_today || 0).toLocaleString(), 
            subValue: `${(stats.tokens?.total_used || 0).toLocaleString()} total`,
            icon: Coins, 
            color: "text-yellow-400", 
            bg: "bg-yellow-500/10" 
        },
        { 
            label: "Albums Created", 
            value: (stats.albums?.total || 0).toLocaleString(), 
            subValue: `${stats.albums?.completed || 0} completed`,
            icon: Zap, 
            color: "text-emerald-400", 
            bg: "bg-emerald-500/10" 
        },
        { 
            label: "Pending Applications", 
            value: stats.pending_applications.toString(), 
            subValue: "awaiting review",
            icon: Clock, 
            color: "text-orange-400", 
            bg: "bg-orange-500/10" 
        },
    ] : [];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">System Overview</h1>
                    <p className="text-zinc-400">Global metrics and system health status.</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-500">
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fetchStats}
                        disabled={isLoading}
                        className="border-white/10 bg-zinc-900/50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>

            {/* KPIs Grid */}
            {isLoading && !stats ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {kpis.map((kpi, index) => (
                        <Card key={index} className="bg-zinc-900/50 border-white/10 backdrop-blur-sm hover:bg-zinc-900/80 transition-colors">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl ${kpi.bg}`}>
                                        <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-400">{kpi.label}</p>
                                    <h3 className="text-2xl font-bold text-white mt-1">{kpi.value}</h3>
                                    <p className="text-xs text-zinc-500 mt-1">{kpi.subValue}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* System Health */}
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            System Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                <div>
                                    <p className="text-sm font-medium text-white">API Server</p>
                                    <p className="text-xs text-zinc-400">Operational</p>
                                </div>
                            </div>
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Online</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                <div>
                                    <p className="text-sm font-medium text-white">Database</p>
                                    <p className="text-xs text-zinc-400">PostgreSQL + CouchDB</p>
                                </div>
                            </div>
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Healthy</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                <div>
                                    <p className="text-sm font-medium text-white">FAL.ai Integration</p>
                                    <p className="text-xs text-zinc-400">AI Processing</p>
                                </div>
                            </div>
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Connected</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                                <div>
                                    <p className="text-sm font-medium text-white">S3 Storage</p>
                                    <p className="text-xs text-zinc-400">AWS S3</p>
                                </div>
                            </div>
                            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">Available</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-indigo-400" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button 
                            variant="outline" 
                            className="w-full justify-start border-white/10 bg-white/5 hover:bg-white/10"
                            onClick={() => window.location.href = '/super-admin/users'}
                        >
                            <Users className="w-4 h-4 mr-2 text-blue-400" />
                            Manage Users
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start border-white/10 bg-white/5 hover:bg-white/10"
                            onClick={() => window.location.href = '/super-admin/models'}
                        >
                            <Coins className="w-4 h-4 mr-2 text-yellow-400" />
                            Configure AI Model Costs
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start border-white/10 bg-white/5 hover:bg-white/10"
                            onClick={() => window.location.href = '/super-admin/billing'}
                        >
                            <DollarSign className="w-4 h-4 mr-2 text-emerald-400" />
                            Manage Token Packages
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start border-white/10 bg-white/5 hover:bg-white/10"
                            onClick={() => window.location.href = '/super-admin/applications'}
                        >
                            <Clock className="w-4 h-4 mr-2 text-orange-400" />
                            Review Applications
                            {stats && stats.pending_applications > 0 && (
                                <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {stats.pending_applications}
                                </span>
                            )}
                        </Button>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start border-white/10 bg-white/5 hover:bg-white/10"
                            onClick={() => window.location.href = '/super-admin/settings'}
                        >
                            <Activity className="w-4 h-4 mr-2 text-purple-400" />
                            System Settings
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {stats?.eventsSummary && stats.eventsSummary.length > 0 && (
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Event Analytics</span>
                            <span className="text-xs text-zinc-500">
                                Top {Math.min(stats.eventsSummary.length, 25)} events by tokens usage
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="text-zinc-500 text-xs uppercase tracking-wide">
                                    <th className="py-2">Event</th>
                                    <th className="py-2">Owner</th>
                                    <th className="py-2 text-right">Tokens Used</th>
                                    <th className="py-2 text-right">Albums</th>
                                    <th className="py-2 text-right">Photos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.eventsSummary.map((event) => (
                                    <tr key={event.event_id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="py-3">
                                            <div className="flex flex-col">
                                                <span className="text-white font-medium">{event.title || 'Untitled Event'}</span>
                                                <span className="text-xs text-zinc-500">
                                                    {(event.user_slug && event.slug) ? `${event.user_slug}/${event.slug}` : `ID: ${event.event_id}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex flex-col">
                                                <span className="text-white text-sm">{event.owner_name || event.owner_email || 'Unknown'}</span>
                                                <span className="text-xs text-zinc-500">{event.owner_email}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 text-right font-mono text-yellow-400">
                                            {event.tokens_used.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right text-zinc-300">
                                            {event.album_count.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right text-zinc-300">
                                            {event.photo_count.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}

            {/* Info Box */}
            <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <h3 className="font-medium text-indigo-400 mb-2">💡 Super Admin Tips</h3>
                <ul className="text-sm text-zinc-400 space-y-1">
                    <li>• <strong>Users:</strong> Manage all users, add tokens, set custom pricing for enterprise clients</li>
                    <li>• <strong>AI Models:</strong> Control default token costs that apply to all users</li>
                    <li>• <strong>Billing:</strong> Create and manage token packages available for purchase</li>
                    <li>• <strong>Settings:</strong> Configure system-wide settings like maintenance mode</li>
                </ul>
            </div>
        </div>
    );
}
