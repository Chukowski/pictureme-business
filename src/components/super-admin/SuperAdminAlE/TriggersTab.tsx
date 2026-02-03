import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Database, Info, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  getTriggers, 
  updateTrigger, 
  getTemplates, 
  type Trigger, 
  type EmailTemplate 
} from "@/services/aleApi";
import { TechnicalTooltip } from "./ale-shared";

export function TriggersTab() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [triggerData, templateData] = await Promise.all([
        getTriggers(),
        getTemplates(true) // active only
      ]);
      setTriggers(triggerData || []);
      setTemplates(templateData || []);
    } catch (error) {
      console.error("❌ Failed to load Al-e data:", error);
      toast.error("Failed to load triggers/templates");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Trigger>) => {
    try {
      await updateTrigger(id, updates);
      toast.success("Trigger updated");
      // Refresh local state instead of full reload for smoother UX
      setTriggers(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    } catch (error) {
      toast.error("Failed to update trigger");
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
    <div className="space-y-8">
      <div className="border-b border-white/5 pb-6">
        <h2 className="text-2xl font-mono font-bold text-white uppercase tracking-tight">Neural Link Matrix</h2>
        <p className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest mt-1">Autonomous Event-to-Action Protocols</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {triggers.map((trigger, i) => (
          <motion.div
            key={trigger.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className={cn(
              "bg-black border-white/5 ring-1 transition-all overflow-hidden relative",
              trigger.is_enabled ? "ring-indigo-500/20" : "ring-white/5 opacity-60"
            )}>
              {trigger.is_enabled && (
                <div className="absolute top-0 right-0 p-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[8px] font-mono text-green-500 uppercase font-bold tracking-widest">Active</span>
                  </div>
                </div>
              )}
              <CardHeader className="p-6 pb-2 relative z-20">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-mono text-white uppercase tracking-[0.2em]">{trigger.name}</CardTitle>
                    {trigger.description && (
                      <CardDescription className="text-[9px] text-zinc-600 font-mono uppercase leading-relaxed max-w-[250px]">{trigger.description}</CardDescription>
                    )}
                  </div>
                  <Switch
                    checked={trigger.is_enabled}
                    onCheckedChange={(checked) => handleUpdate(trigger.id, { is_enabled: checked })}
                    className="data-[state=checked]:bg-indigo-500"
                  />
                </div>
              </CardHeader>
              
              <CardContent className="p-6 pt-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3 h-3 text-zinc-500" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Email Uplink</span>
                        <TechnicalTooltip text="Automatically send an email transmission when this event occurs.">
                          <Info className="w-2.5 h-2.5 text-zinc-800 cursor-help" />
                        </TechnicalTooltip>
                      </div>
                    </div>
                    <Switch
                      checked={trigger.send_email}
                      onCheckedChange={(checked) => handleUpdate(trigger.id, { send_email: checked })}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded">
                    <div className="flex items-center gap-2">
                      <Database className="w-3 h-3 text-zinc-500" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Token Injection</span>
                        <TechnicalTooltip text="Automatically grant tokens to the user when this event occurs.">
                          <Info className="w-2.5 h-2.5 text-zinc-800 cursor-help" />
                        </TechnicalTooltip>
                      </div>
                    </div>
                    <Switch
                      checked={trigger.grant_tokens}
                      onCheckedChange={(checked) => handleUpdate(trigger.id, { grant_tokens: checked })}
                      className="scale-75"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {trigger.send_email && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Protocol Template</Label>
                        <TechnicalTooltip text="Select which email template Al-e should use for this specific trigger.">
                          <Info className="w-2.5 h-2.5 text-zinc-800 cursor-help" />
                        </TechnicalTooltip>
                      </div>
                      <Select 
                        value={trigger.template_id || "none"} 
                        onValueChange={(val) => handleUpdate(trigger.id, { template_id: val === "none" ? undefined : val })}
                      >
                        <SelectTrigger className="h-9 bg-black border-white/10 text-white font-mono text-[10px] uppercase">
                          <SelectValue placeholder="SELECT_TEMPLATE" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-white/10 text-white font-mono text-[10px] uppercase z-[110]">
                          <SelectItem value="none">NO_TEMPLATE</SelectItem>
                          {templates.map(tpl => (
                            <SelectItem key={tpl.id} value={tpl.id}>{tpl.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {trigger.grant_tokens && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Injection Payload</Label>
                        <TechnicalTooltip text="The amount of tokens to grant per execution of this trigger.">
                          <Info className="w-2.5 h-2.5 text-zinc-800 cursor-help" />
                        </TechnicalTooltip>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={trigger.token_amount}
                          onChange={(e) => handleUpdate(trigger.id, { token_amount: parseInt(e.target.value) || 0 })}
                          className="h-8 bg-black border-white/10 text-white font-mono text-xs w-24"
                          min={0}
                        />
                        <span className="text-[9px] font-mono text-zinc-500 uppercase">Tokens per unit</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">Transmission Delay</Label>
                      <TechnicalTooltip text="The wait period before executing the transmission after the event is detected.">
                        <Info className="w-2.5 h-2.5 text-zinc-800 cursor-help" />
                      </TechnicalTooltip>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        value={trigger.delay_minutes}
                        onChange={(e) => handleUpdate(trigger.id, { delay_minutes: parseInt(e.target.value) || 0 })}
                        className="h-8 bg-black border-white/10 text-white font-mono text-xs w-24"
                        min={0}
                      />
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Minutes after event</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {!trigger.is_enabled && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                  <div className="p-4 border border-white/10 bg-black/80 flex items-center gap-3">
                    <Zap className="w-4 h-4 text-zinc-800" />
                    <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Neural Link Severed</span>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
