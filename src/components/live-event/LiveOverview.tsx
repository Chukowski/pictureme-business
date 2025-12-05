import { Card, CardContent } from "@/components/ui/card";
import { EventAlbumStats } from "@/services/eventsApi";
import { Users, BookOpen, CheckCircle2, CreditCard, Image, Activity } from "lucide-react";

interface LiveOverviewProps {
  stats: EventAlbumStats;
}

export function LiveOverview({ stats }: LiveOverviewProps) {
  const metrics = [
    { label: 'Visitors Active', value: stats.inProgressAlbums || 0, icon: Users, color: 'text-blue-400' },
    { label: 'Albums Completed', value: stats.completedAlbums || 0, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Total Photos', value: stats.totalPhotos || 0, icon: Image, color: 'text-purple-400' },
    { label: 'Pending Payment', value: stats.pendingApproval || 0, icon: CreditCard, color: 'text-amber-400' }, // Reusing pendingApproval field for now
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((metric, i) => (
        <Card key={i} className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 font-medium">{metric.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{metric.value}</p>
            </div>
            <div className={`p-3 rounded-xl bg-white/5 ${metric.color}`}>
              <metric.icon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

