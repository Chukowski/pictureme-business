import { Card, CardContent } from "@/components/ui/card";
import { EventAlbumStats } from "@/services/eventsApi";
import { Users, CheckCircle2, CreditCard, Image, TrendingUp } from "lucide-react";

interface LiveOverviewProps {
  stats: EventAlbumStats;
}

export function LiveOverview({ stats }: LiveOverviewProps) {
  const metrics = [
    { 
      label: 'Visitors Active', 
      value: stats.inProgressAlbums || 0, 
      icon: Users, 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10',
      trend: '+12%' 
    },
    { 
      label: 'Albums Completed', 
      value: stats.completedAlbums || 0, 
      icon: CheckCircle2, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-500/10',
      trend: '+5%' 
    },
    { 
      label: 'Pending Payment', 
      value: stats.pendingApproval || 0, 
      icon: CreditCard, 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10',
      trend: '2 pending' 
    },
     { 
      label: 'Total Photos', 
      value: stats.totalPhotos || 0, 
      icon: Image, 
      color: 'text-purple-400', 
      bg: 'bg-purple-500/10',
      trend: '+24' 
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {metrics.map((metric, i) => (
        <div 
          key={i} 
          className="relative overflow-hidden rounded-2xl bg-card/40 border border-white/5 p-5 hover:bg-card/60 transition-colors group"
        >
           {/* Semantic Color Top Bar */}
           <div className={`absolute top-0 left-0 w-full h-1 ${metric.status === 'alert' ? 'bg-red-500' : 'bg-transparent'}`} />

          <div className="flex justify-between items-start mb-2">
             <div className={`p-2 rounded-xl ${metric.bg} ${metric.color}`}>
               <metric.icon className="w-5 h-5" />
             </div>
             {/* Trend or Sparkline placeholder */}
             <div className="flex items-center gap-1 text-[10px] text-zinc-500 bg-white/5 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" />
                {metric.trend}
             </div>
          </div>
          
          <div>
            <div className="text-4xl font-bold text-white tracking-tight mb-1">{metric.value}</div>
            <div className="text-sm font-medium text-zinc-400 uppercase tracking-wide">{metric.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
