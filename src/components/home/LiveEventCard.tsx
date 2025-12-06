import { useNavigate } from "react-router-dom";
import { EventConfig } from "@/services/eventsApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, QrCode, Monitor, Users, DollarSign, Layers } from "lucide-react";

interface LiveEventCardProps {
  event: EventConfig;
}

export function LiveEventCard({ event }: LiveEventCardProps) {
  const navigate = useNavigate();

  if (!event.is_active) return null;

  const openStation = (type: string) => {
    if (!event.user_slug || !event.slug) return;
    const url = `${window.location.origin}/${event.user_slug}/${event.slug}/${type}`;
    window.open(url, '_blank');
  };

  return (
    <Card className="bg-zinc-900 bg-gradient-to-r from-emerald-950/30 to-zinc-900 border-emerald-500/20 overflow-hidden relative group mb-8">
      {/* Live Status Badge - Positioned relatively on mobile to avoid overlap */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase shadow-sm backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live Now
        </div>
      </div>
      
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start lg:items-center justify-between">
          
          {/* Event Info */}
          <div className="space-y-2 w-full lg:w-auto pr-24 lg:pr-0">
            <h3 className="text-2xl font-bold text-white tracking-tight truncate max-w-[300px]">{event.title}</h3>
            <div className="flex flex-col gap-1 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-400 font-medium">Online</span>
              </div>
              <p>Started {new Date(event.start_date || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
          </div>

          {/* Live Metrics - Stack on mobile, Row on tablet/desktop */}
          <div className="flex w-full lg:w-auto justify-start gap-8 sm:gap-12 border-t border-b lg:border-y-0 lg:border-l border-white/5 py-4 lg:py-0 lg:pl-8 lg:pr-8">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Active</p>
              <p className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-600" /> 12
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Queue</p>
              <p className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-zinc-600" /> 3
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500/50" /> 0
              </p>
            </div>
          </div>

          {/* Quick Actions - Full width on mobile, auto on desktop */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto lg:justify-end">
            <Button 
              className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 font-medium shadow-lg shadow-emerald-900/20 w-full sm:w-auto"
              onClick={() => navigate(`/admin/events/${event._id}/live`)}
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              Open Live Mode
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline"
                className="flex-1 sm:flex-none bg-zinc-800/50 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                onClick={() => openStation('registration')}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Scan
              </Button>
              <Button 
                variant="outline"
                className="flex-1 sm:flex-none bg-zinc-800/50 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                onClick={() => navigate(`/admin/events/${event._id}/live?tab=overview`)}
              >
                <Monitor className="w-4 h-4 mr-2" />
                Stations
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
