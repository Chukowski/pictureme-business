import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Camera, UserPlus, DollarSign } from "lucide-react";

export interface LogEntry {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'payment';
  message: string;
  timestamp: Date;
  source?: string;
}

interface LiveLogsProps {
  logs: LogEntry[];
}

export function LiveLogs({ logs }: LiveLogsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider px-1">Live Activity Log</h3>
      <div className="bg-card border border-white/10 rounded-xl overflow-hidden">
        <ScrollArea className="h-[250px] w-full p-4">
          <div className="space-y-4">
            {logs.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No activity recorded yet.
              </div>
            )}
            
            {logs.map((log) => (
              <div key={log.id} className="flex gap-3 items-start relative pb-4 last:pb-0 border-l border-white/10 ml-2 pl-4 last:border-0">
                 {/* Timeline Dot */}
                 <div className={`absolute -left-[5px] top-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                    log.type === 'success' ? 'bg-emerald-500' :
                    log.type === 'error' ? 'bg-red-500' :
                    log.type === 'payment' ? 'bg-blue-500' :
                    log.type === 'warning' ? 'bg-amber-500' : 'bg-zinc-500'
                 }`} />

                 <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                       <p className="text-sm text-zinc-200 font-medium">{log.message}</p>
                       <span className="text-[10px] text-zinc-500 font-mono">
                          {log.timestamp.toLocaleTimeString()}
                       </span>
                    </div>
                    {log.source && (
                       <Badge variant="outline" className="text-[10px] h-4 px-1 text-zinc-500 border-white/10">
                          {log.source}
                       </Badge>
                    )}
                 </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

