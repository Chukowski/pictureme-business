import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    BarChart3, TrendingUp, Users, ImageIcon, Coins, Calendar,
    Loader2, RefreshCw, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { ENV } from "@/config/env";
import { toast } from "sonner";

interface AnalyticsData {
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
    };
    eventsSummary?: Array<{
        event_id: string;
        title: string;
        tokens_used: number;
        photo_count: number;
        album_count: number;
        owner_email?: string;
    }>;
}

export default function SuperAdminAnalytics() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("auth_token");
            
            const response = await fetch(`${ENV.API_URL}/api/admin/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const stats = await response.json();
                setData(stats);
            } else {
                toast.error("Failed to load analytics");
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
            toast.error("Failed to load analytics");
        } finally {
            setIsLoading(false);
        }
    };

    const topEvents = data?.eventsSummary?.slice(0, 10) || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Global Analytics</h1>
                    <p className="text-zinc-400">Deep dive into system performance and growth metrics.</p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchAnalytics}
                    disabled={isLoading}
                    className="border-white/10"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : data ? (
                <>
                    {/* Key Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-zinc-900/50 border-white/10">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-zinc-400">Total Users</p>
                                        <p className="text-3xl font-bold text-white mt-1">
                                            {data.users.total.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                            <ArrowUpRight className="w-3 h-3" />
                                            {data.users.active} active
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-blue-500/10">
                                        <Users className="w-6 h-6 text-blue-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900/50 border-white/10">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-zinc-400">Total Photos</p>
                                        <p className="text-3xl font-bold text-white mt-1">
                                            {data.photos.total.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                            <ArrowUpRight className="w-3 h-3" />
                                            {data.photos.today} today
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-pink-500/10">
                                        <ImageIcon className="w-6 h-6 text-pink-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900/50 border-white/10">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-zinc-400">Tokens Used</p>
                                        <p className="text-3xl font-bold text-white mt-1">
                                            {data.tokens.total_used.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                                            <Coins className="w-3 h-3" />
                                            {data.tokens.used_today} today
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-yellow-500/10">
                                        <Coins className="w-6 h-6 text-yellow-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900/50 border-white/10">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-zinc-400">Active Events</p>
                                        <p className="text-3xl font-bold text-white mt-1">
                                            {data.events.active.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {data.events.total} total
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-purple-500/10">
                                        <Calendar className="w-6 h-6 text-purple-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Token Usage Breakdown */}
                        <Card className="bg-zinc-900/50 border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    Token Usage Stats
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 rounded-lg bg-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-zinc-400">Daily Average</span>
                                        <span className="font-mono text-white">
                                            {Math.round(data.tokens.avg_per_day).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full"
                                            style={{ width: `${Math.min((data.tokens.avg_per_day / 1000) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-zinc-400">Used Today</span>
                                        <span className="font-mono text-yellow-400">
                                            {data.tokens.used_today.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                                            style={{ width: `${Math.min((data.tokens.used_today / data.tokens.avg_per_day) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-zinc-400">Total Used</span>
                                        <span className="font-mono text-white">
                                            {data.tokens.total_used.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Albums Stats */}
                        <Card className="bg-zinc-900/50 border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-purple-400" />
                                    Album Statistics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-white/5 text-center">
                                        <p className="text-3xl font-bold text-white">
                                            {data.albums.total.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-1">Total Albums</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-white/5 text-center">
                                        <p className="text-3xl font-bold text-emerald-400">
                                            {data.albums.completed.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-1">Completed</p>
                                    </div>
                                </div>
                                {data.albums.total > 0 && (
                                    <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                        <p className="text-sm text-zinc-300">Completion Rate</p>
                                        <p className="text-2xl font-bold text-emerald-400">
                                            {((data.albums.completed / data.albums.total) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top Events by Token Usage */}
                    {topEvents.length > 0 && (
                        <Card className="bg-zinc-900/50 border-white/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                                    Top Events by Token Usage
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {topEvents.map((event, index) => (
                                        <div 
                                            key={event.event_id}
                                            className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className={`
                                                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                                    ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                      index === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                                                      index === 2 ? 'bg-amber-600/20 text-amber-500' :
                                                      'bg-zinc-700/50 text-zinc-500'}
                                                `}>
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-white">{event.title || 'Untitled'}</p>
                                                    <p className="text-xs text-zinc-500">{event.owner_email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6 text-sm">
                                                <div className="text-right">
                                                    <p className="font-mono text-yellow-400">
                                                        {event.tokens_used.toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">tokens</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono text-white">
                                                        {event.photo_count.toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">photos</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono text-white">
                                                        {event.album_count.toLocaleString()}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">albums</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            ) : (
                <div className="text-center py-12 text-zinc-500">
                    <p>No analytics data available</p>
                </div>
            )}
        </div>
    );
}
