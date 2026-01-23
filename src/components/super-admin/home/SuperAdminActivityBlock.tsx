import { Activity, CheckCircle, Server, Database, Cpu, Cloud, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
    id: string;
    type: 'user_registered' | 'application_submitted' | 'event_created' | 'photo_generated';
    title: string;
    description: string;
    timestamp: string;
}

interface SuperAdminActivityBlockProps {
    recentActivity?: ActivityItem[];
    isLoading?: boolean;
}

export function SuperAdminActivityBlock({ recentActivity = [], isLoading = false }: SuperAdminActivityBlockProps) {
    // Mock recent activity if not provided
    const activities: ActivityItem[] = recentActivity.length > 0 ? recentActivity : [
        { id: '1', type: 'user_registered', title: 'New user registered', description: 'john@example.com', timestamp: '2 min ago' },
        { id: '2', type: 'application_submitted', title: 'Business application', description: 'From events@corp.com', timestamp: '15 min ago' },
        { id: '3', type: 'photo_generated', title: 'Batch processed', description: '24 photos generated', timestamp: '1 hour ago' },
    ];

    const systemServices = [
        { name: 'API Server', status: 'online', icon: Server },
        { name: 'PostgreSQL', status: 'healthy', icon: Database },
        { name: 'FAL.ai', status: 'connected', icon: Cpu },
        { name: 'S3 Storage', status: 'available', icon: Cloud },
    ];

    return (
        <Card className="bg-card/30 border-white/10 h-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Activity & System
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Recent Activity Feed */}
                <div className="space-y-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Recent Activity</p>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-0 relative">
                            {/* Timeline line */}
                            <div className="absolute left-2 top-2 bottom-2 w-px bg-white/10" />

                            {activities.map((item) => (
                                <div key={item.id} className="relative pl-6 py-2 group">
                                    <div className="absolute left-0 top-3 w-4 h-4 rounded-full bg-card border-2 border-zinc-700 flex items-center justify-center z-10 group-hover:border-indigo-500 transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 group-hover:bg-indigo-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-zinc-200 group-hover:text-white transition-colors font-medium">
                                            {item.title}
                                        </span>
                                        <span className="text-[10px] text-zinc-500">
                                            {item.timestamp} • {item.description}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* System Health */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">System Health</p>
                    <div className="grid grid-cols-2 gap-2">
                        {systemServices.map((service) => (
                            <div key={service.name} className="bg-[#101112]/40 rounded-lg p-2.5 flex items-center justify-between border border-white/5">
                                <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                                    <service.icon className="w-3.5 h-3.5" />
                                    {service.name}
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {service.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
