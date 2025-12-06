import { useNavigate } from "react-router-dom";
import { EventConfig } from "@/services/eventsApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, QrCode, Monitor, Users, CreditCard, Layers } from "lucide-react";

interface LiveEventCardProps {
  event: EventConfig;
}

export function LiveEventCard({ event }: LiveEventCardProps) {
  const navigate = useNavigate();

  if (!event.is_active) return null;

  return (
    <Card className="bg-zinc-900 bg-gradient-to-r from-emerald-900/30 to-zinc-900 border-emerald-500/30 overflow-hidden relative group mb-8">
      <div className="absolute top-0 right-0 p-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          LIVE
        </div>
      </div>
      
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">{event.title}</h3>
            <p className="text-zinc-400 text-xs flex items-center gap-2">
              <span className="text-emerald-400">● Online</span> 
              <span>Started {new Date(event.start_date || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </p>
          </div>

          {/* Live Metrics (Mocked for visual representation as requested, connect to real stats if available) */}
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Active</p>
              <p className="text-xl font-bold text-white flex items-center justify-center gap-1">
                <Users className="w-3 h-3 text-zinc-500" /> 12
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Queue</p>
              <p className="text-xl font-bold text-white flex items-center justify-center gap-1">
                <Layers className="w-3 h-3 text-zinc-500" /> 3
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Revenue</p>
              <p className="text-xl font-bold text-emerald-400 flex items-center justify-center gap-1">
                <CreditCard className="w-3 h-3 text-emerald-500/50" /> $0
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              onClick={() => navigate(`/admin/events/${event._id}/live`)}
            >
              <Play className="w-3.5 h-3.5 mr-2 fill-current" />
              Open Live Mode
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="bg-zinc-800/50 border-white/10 text-zinc-300 hover:text-white"
              onClick={() => navigate(`/admin/events/${event._id}/live`)}
            >
              <QrCode className="w-3.5 h-3.5 mr-2" />
              Scan Badge
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="bg-zinc-800/50 border-white/10 text-zinc-300 hover:text-white"
              onClick={() => navigate(`/admin/events/${event._id}/live`)}
            >
              <Monitor className="w-3.5 h-3.5 mr-2" />
              Stations
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

