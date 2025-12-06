import { Activity, CheckCircle2, LayoutTemplate } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventConfig } from "@/services/eventsApi";

interface ActivitySystemBlockProps {
  events: EventConfig[];
  isLoading: boolean;
}

export function ActivitySystemBlock({ events, isLoading }: ActivitySystemBlockProps) {
  const recentEvents = events.slice(0, 3);

  return (
    <Card className="bg-zinc-900/30 border-white/10 h-full">
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
              {[1, 2].map(i => (
                <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : recentEvents.length > 0 ? (
            <div className="space-y-0 relative">
              {/* Timeline line */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-white/10" />
              
              {recentEvents.map((event, i) => (
                <div key={event._id} className="relative pl-6 py-2 group">
                  <div className="absolute left-0 top-3 w-4 h-4 rounded-full bg-zinc-900 border-2 border-zinc-700 flex items-center justify-center z-10 group-hover:border-indigo-500 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 group-hover:bg-indigo-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-200 group-hover:text-white transition-colors font-medium">
                      Updated "{event.title}"
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(event.start_date || Date.now()).toLocaleDateString()} • Event Config
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-zinc-500">No recent activity</p>
            </div>
          )}
        </div>

        {/* System Status */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">System Health</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/20 rounded-lg p-2 flex items-center justify-between border border-white/5">
              <span className="text-xs text-zinc-400">AI Processor</span>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Operational
              </span>
            </div>
            <div className="bg-black/20 rounded-lg p-2 flex items-center justify-between border border-white/5">
              <span className="text-xs text-zinc-400">Latency</span>
              <span className="text-[10px] text-zinc-300 font-mono">~450ms</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

