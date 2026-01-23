import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    ArrowRight, AlertCircle, Users, Calendar,
    Clock, TrendingUp, Coins
} from "lucide-react";

interface SuperAdminInsightsPanelProps {
    stats: {
        users: { total: number; new_today: number };
        events: { total: number; active: number };
        tokens: { total_used: number; avg_per_day: number };
        pending_applications: number;
        revenue?: { total: number; month: number };
    } | null;
}

export function SuperAdminInsightsPanel({ stats }: SuperAdminInsightsPanelProps) {
    const navigate = useNavigate();

    return (
        <div className="space-y-6">
            {/* Pending Tasks Card */}
            {stats && stats.pending_applications > 0 && (
                <Card className="bg-gradient-to-br from-amber-900/20 to-[#101112] border-amber-500/20 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <AlertCircle className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">Pending Tasks</h3>
                                <p className="text-xs text-zinc-500">Requires your attention</p>
                            </div>
                        </div>
                        <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-zinc-400">Business Applications</span>
                                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-0">
                                    {stats.pending_applications}
                                </Badge>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={() => navigate("/super-admin/applications")}
                        >
                            Review Now <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Platform Metrics */}
            <Card className="bg-gradient-to-br from-zinc-900 to-[#101112] border-white/10">
                <CardContent className="p-5 space-y-5">
                    <h3 className="text-sm font-medium text-zinc-300">Platform Metrics</h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-400" />
                                <span className="text-xs text-zinc-400">Total Users</span>
                            </div>
                            <span className="text-sm font-bold text-white">
                                {stats?.users.total.toLocaleString() || 0}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-purple-400" />
                                <span className="text-xs text-zinc-400">Active Events</span>
                            </div>
                            <span className="text-sm font-bold text-white">
                                {stats?.events.active || 0} / {stats?.events.total || 0}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Coins className="w-4 h-4 text-yellow-400" />
                                <span className="text-xs text-zinc-400">Tokens/Day (avg)</span>
                            </div>
                            <span className="text-sm font-bold text-white">
                                {stats?.tokens.avg_per_day?.toLocaleString() || 0}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs text-zinc-400">Monthly Revenue</span>
                            </div>
                            <span className="text-sm font-bold text-emerald-400">
                                ${stats?.revenue?.month?.toFixed(0) || 0}
                            </span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-zinc-500">New Users Today</span>
                            <span className="text-white">{stats?.users.new_today || 0}</span>
                        </div>
                        <Progress
                            value={Math.min((stats?.users.new_today || 0) * 10, 100)}
                            className="h-1.5 bg-zinc-800"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="bg-card/30 border-white/10">
                <CardContent className="p-4 space-y-2">
                    <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Quick Links</h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/5 h-8 text-xs"
                        onClick={() => navigate("/super-admin/analytics")}
                    >
                        <TrendingUp className="w-3 h-3 mr-2" /> View Full Analytics
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/5 h-8 text-xs"
                        onClick={() => navigate("/super-admin/content")}
                    >
                        <Clock className="w-3 h-3 mr-2" /> Manage Announcements
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
