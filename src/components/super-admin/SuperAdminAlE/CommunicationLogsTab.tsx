import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  History, 
  Database, 
  FileText, 
  ChevronRight, 
  Info 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  getCommunicationLogs, 
  type CommunicationLog 
} from "@/services/aleApi";
import { TechnicalTooltip } from "./ale-shared";

export function CommunicationLogsTab() {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getCommunicationLogs({ limit, offset: page * limit });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-mono font-bold text-white uppercase tracking-tight text-indigo-500">Black Box Stream</h2>
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest">Real-time Telemetry of AI-Human Interactions</p>
            <TechnicalTooltip text="The immutable audit log of all communications sent by the Al-e engine.">
              <Info className="w-3 h-3 text-zinc-800 cursor-help" />
            </TechnicalTooltip>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Global Packets</div>
          <div className="text-xl font-mono font-bold text-white">{total || 0}</div>
        </div>
      </div>

      <div className="border border-white/5 bg-black/40 backdrop-blur-md rounded-none overflow-hidden ring-1 ring-white/5">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left font-mono">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Timestamp</th>
                <th className="p-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Node</th>
                <th className="p-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Vector</th>
                <th className="p-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Trigger_ID</th>
                <th className="p-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4">
                    <div className="text-[10px] text-zinc-400">
                      {new Date(log.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-[9px] text-zinc-600 mt-0.5">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-white font-bold">{log.email || 'System'}</span>
                      <span className="text-[8px] text-zinc-600 uppercase tracking-tighter">ID: {log.user_id?.slice(0, 8) || 'SYSTEM'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span className="text-[10px] text-zinc-300 uppercase">EMAIL</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px] font-mono border-white/10 text-zinc-500 uppercase rounded-none">
                        {log.trigger_type || 'MANUAL'}
                      </Badge>
                      {log.template_id && <FileText className="w-3 h-3 text-zinc-700" />}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {log.token_reward > 0 && (
                        <div className="flex items-center gap-1 text-amber-500">
                          <Database className="w-3 h-3" />
                          <span className="text-[10px] font-bold">+{log.token_reward}</span>
                        </div>
                      )}
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-indigo-400">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {logs.length === 0 && (
          <div className="py-20 text-center space-y-3">
            <History className="w-10 h-10 text-zinc-800 mx-auto" />
            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.2em]">No telemetry data recorded in current buffer</p>
          </div>
        )}

        {total > limit && (
          <div className="p-4 border-t border-white/5 bg-white/5 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="text-[10px] uppercase font-mono border-white/10 h-8 rounded-none"
            >
              Previous_Buffer
            </Button>
            <div className="text-[10px] font-mono text-zinc-500 uppercase">
              Buffer {page + 1} / {Math.ceil(total / limit)}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * limit >= total}
              onClick={() => setPage(p => p + 1)}
              className="text-[10px] uppercase font-mono border-white/10 h-8 rounded-none"
            >
              Next_Buffer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
