import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Settings as SettingsIcon, 
  Zap, 
  Shield, 
  Info 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  getAlESettings, 
  updateAlESettings, 
  type AlESettings 
} from "@/services/aleApi";
import { HUDContainer, TechnicalTooltip } from "./ale-shared";

export function AlESettingsTab() {
  const [settings, setSettings] = useState<AlESettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getAlESettings();
      setSettings(data);
    } catch (error) {
      toast.error("Failed to load Al-e settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (updates: Partial<AlESettings>) => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateAlESettings({ ...settings, ...updates });
      setSettings(updated);
      toast.success("Al-e core configuration updated");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-7 space-y-8">
        <HUDContainer title="CORE_SYSTEM_PROTOCOLS" icon={SettingsIcon} subtitle="Global Behavioral Directives">
          <div className="space-y-8">
            <div className="flex items-center justify-between p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-mono font-bold text-white uppercase tracking-widest">Global Al-e Engine</h3>
                  <TechnicalTooltip text="The master switch for the Al-e CRM system. When disabled, no automated communications are sent.">
                    <Info className="w-3 h-3 text-zinc-800 cursor-help" />
                  </TechnicalTooltip>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Main communication uplink status</p>
              </div>
              <Switch
                checked={settings?.is_enabled}
                onCheckedChange={(checked) => handleUpdate({ is_enabled: checked })}
                disabled={saving}
                className="data-[state=checked]:bg-indigo-500 scale-125"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Global Al-e Insight</Label>
                <TechnicalTooltip text="The signature Al-e uses across all communications.">
                  <Info className="w-3 h-3 text-zinc-800 cursor-help" />
                </TechnicalTooltip>
              </div>
              <div className="relative">
                <Input
                  value={settings?.signature || ''}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, signature: e.target.value } : null)}
                  className="bg-black border-white/10 text-white font-mono h-12 pl-4 focus:ring-indigo-500/50"
                  placeholder="Al-e Signature"
                />
                <Button 
                  onClick={() => handleUpdate({ signature: settings?.signature })}
                  disabled={saving}
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 bg-zinc-900 text-[9px] uppercase font-mono tracking-widest border border-white/5 hover:bg-zinc-800"
                >
                  Sync
                </Button>
              </div>
            </div>
          </div>
        </HUDContainer>
      </div>

      <div className="lg:col-span-5 space-y-8">
        <HUDContainer title="System Telemetry" icon={Zap} subtitle="Real-time Status">
          <div className="space-y-6">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-500 uppercase">Engine Status</span>
              <span className={cn("px-2 py-0.5 rounded", settings?.is_enabled ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                {settings?.is_enabled ? "OPTIMAL_UPTIME" : "STANDBY_MODE"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-500 uppercase">Security Protocol</span>
              <span className="text-indigo-400">ENCRYPTED_SHA256</span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-500 uppercase">Neural Load</span>
              <span className="text-zinc-400 italic">2.4ms LATENCY</span>
            </div>
          </div>
        </HUDContainer>

        <HUDContainer title="Safety Guardrails" icon={Shield} subtitle="Risk Mitigation">
          <div className="space-y-4">
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded text-[10px] font-mono leading-relaxed text-amber-500/80">
              <span className="font-bold block mb-1">WARNING_304:</span>
              System suggests limiting mass broadcasts to once per 24h cycle per user node to maintain reputation.
            </div>
            <p className="text-[9px] text-zinc-600 uppercase italic">All transmissions are logged to the Communication Stream.</p>
          </div>
        </HUDContainer>
      </div>
    </div>
  );
}
