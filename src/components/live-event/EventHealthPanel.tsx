import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Cpu, Coins, Wifi, AlertTriangle, Zap } from "lucide-react";

interface EventHealthPanelProps {
  tokens?: number;
  model?: string;
  latency?: number;
  processorStatus?: 'online' | 'busy' | 'offline';
  errors?: number;
}

export function EventHealthPanel({ 
  tokens = 0, 
  model = "Unknown Model", 
  latency = 45, 
  processorStatus = 'online',
  errors = 0 
}: EventHealthPanelProps) {
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider px-1">System Health</h3>
      
      {/* Processor Status */}
      <Card className="bg-zinc-900 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">AI Processor</span>
            <div className={`flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full ${
              processorStatus === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 
              processorStatus === 'busy' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
            }`}>
              <Cpu className="w-3 h-3" />
              <span className="capitalize">{processorStatus}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
             <span>Active Model</span>
             <span className="text-zinc-300">{model}</span>
          </div>

          {/* Latency Sparkline Placeholder */}
          <div className="flex items-center justify-between">
             <span className="text-xs text-zinc-500 flex items-center gap-1">
               <Wifi className="w-3 h-3" /> Latency
             </span>
             <span className={`text-sm font-mono ${latency < 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {latency}ms
             </span>
          </div>
        </CardContent>
      </Card>

      {/* Tokens & Usage */}
      <Card className="bg-zinc-900 border-white/10">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
               <Coins className="w-4 h-4 text-yellow-500" />
               <span>Tokens Remaining</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{tokens.toLocaleString()}</div>
          
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
             <div className="bg-yellow-500 h-full w-[75%]" />
          </div>
        </CardContent>
      </Card>

      {/* Error Log Summary */}
      <Card className="bg-zinc-900 border-white/10">
        <CardContent className="p-4 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${errors > 0 ? 'text-red-400' : 'text-zinc-500'}`} />
              <span className="text-sm text-zinc-400">Recent Errors</span>
           </div>
           <span className={`text-lg font-bold ${errors > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
             {errors}
           </span>
        </CardContent>
      </Card>
      
      {/* Activity Pulse */}
      <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5 flex items-center justify-between">
         <span className="text-xs text-zinc-500">Activity (1h)</span>
         <div className="flex items-center gap-1">
             <Activity className="w-3 h-3 text-emerald-500" />
             <span className="text-xs text-emerald-400 font-medium">Healthy</span>
         </div>
      </div>
    </div>
  );
}

