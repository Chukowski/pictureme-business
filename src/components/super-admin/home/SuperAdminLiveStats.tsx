import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
    Activity, Users, Image as ImageIcon, Coins,
    DollarSign, PlayCircle, Terminal, Settings
} from "lucide-react";

interface SuperAdminLiveStatsProps {
    stats: {
        users: { total: number; active: number };
        photos: { total: number; today: number };
        tokens: { total_used: number; used_today: number };
        revenue?: { today: number; month: number };
        pending_applications: number;
    } | null;
}

export function SuperAdminLiveStats({ stats }: SuperAdminLiveStatsProps) {
    const navigate = useNavigate();

    return (
        <Card className="bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900 border-white/10 overflow-hidden relative">
            {/* Glow effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    {/* Left: Platform Status */}
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold text-white">PictureMe Platform</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                    Online
                                </span>
                                <span className="text-xs text-zinc-500">Started {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Center: Stats */}
                    <div className="flex items-center gap-6 md:gap-8">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Active</span>
                            <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-blue-400" />
                                <span className="text-xl font-bold text-white">{stats?.users.active || 0}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Photos</span>
                            <div className="flex items-center gap-1.5">
                                <ImageIcon className="w-4 h-4 text-pink-400" />
                                <span className="text-xl font-bold text-white">{stats?.photos.today || 0}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Tokens</span>
                            <div className="flex items-center gap-1.5">
                                <Coins className="w-4 h-4 text-yellow-400" />
                                <span className="text-xl font-bold text-white">{stats?.tokens.used_today?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Revenue</span>
                            <div className="flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                                <span className="text-xl font-bold text-white">${stats?.revenue?.today?.toFixed(0) || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={() => navigate("/super-admin/devtools")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4"
                        >
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Live Monitor
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/super-admin/logs")}
                            className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs h-9"
                        >
                            <Terminal className="w-4 h-4 mr-1.5" />
                            Logs
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/super-admin/settings")}
                            className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs h-9"
                        >
                            <Settings className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
