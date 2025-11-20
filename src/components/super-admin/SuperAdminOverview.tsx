import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Image as ImageIcon, Coins, DollarSign, Activity, AlertTriangle, TrendingUp } from "lucide-react";

export default function SuperAdminOverview() {
    // Mock Data
    const kpis = [
        { label: "Total Users", value: "1,248", change: "+12%", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
        { label: "Active Events", value: "86", change: "+5%", icon: Calendar, color: "text-purple-400", bg: "bg-purple-500/10" },
        { label: "Photos Today", value: "3,402", change: "+28%", icon: ImageIcon, color: "text-pink-400", bg: "bg-pink-500/10" },
        { label: "Tokens Spent", value: "45.2k", change: "+15%", icon: Coins, color: "text-yellow-400", bg: "bg-yellow-500/10" },
        { label: "Revenue Today", value: "$1,250", change: "+8%", icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        { label: "System Profit", value: "$890", change: "+12%", icon: TrendingUp, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">System Overview</h1>
                <p className="text-zinc-400">Global metrics and system health status.</p>
            </div>

            {/* KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kpis.map((kpi, index) => (
                    <Card key={index} className="bg-zinc-900/50 border-white/10 backdrop-blur-sm hover:bg-zinc-900/80 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-xl ${kpi.bg}`}>
                                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                                </div>
                                <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                                    {kpi.change}
                                </span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-400">{kpi.label}</p>
                                <h3 className="text-2xl font-bold text-white mt-1">{kpi.value}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* System Alerts */}
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                            System Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                <Activity className="w-4 h-4 text-amber-400 mt-1" />
                                <div>
                                    <p className="text-sm font-medium text-white">High API Latency Detected</p>
                                    <p className="text-xs text-zinc-400">FAL.ai response time &gt; 2s for the last 5 mins.</p>
                                </div>
                                <span className="text-xs text-zinc-500 ml-auto">2m ago</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Top Resellers */}
                <Card className="bg-zinc-900/50 border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-400" />
                            Top Resellers
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                                        TR
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">TechReseller Inc.</p>
                                        <p className="text-xs text-zinc-400">15k tokens used</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-white">$450</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
