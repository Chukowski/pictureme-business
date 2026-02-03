import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { 
  Loader2, 
  Activity, 
  Eye, 
  Database, 
  Shield 
} from "lucide-react";
import { toast } from "sonner";
import { 
  createTemplate, 
  updateTemplate, 
  previewEmail, 
  type EmailTemplate 
} from "@/services/aleApi";

export function TemplateDialog({ template, open, onClose, onSave }: { template: EmailTemplate | null; open: boolean; onClose: () => void; onSave: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tokenReward, setTokenReward] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setSubject(template.subject);
      setBody(template.body);
      setTokenReward(template.token_reward);
    } else {
      setName('');
      setDescription('');
      setSubject('');
      setBody('');
      setTokenReward(0);
    }
    setShowPreview(false);
    setPreviewData(null);
  }, [template, open]);

  const handleSave = async () => {
    if (!name || !subject || !body) {
      toast.error("Name, subject, and body are required");
      return;
    }

    setSaving(true);
    try {
      if (template) {
        await updateTemplate(template.id, { name, description, subject, body, token_reward: tokenReward });
        toast.success("Template updated");
      } else {
        await createTemplate({ name, description, subject, body, token_reward: tokenReward });
        toast.success("Template created");
      }
      onSave();
    } catch (error) {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = async () => {
    if (!subject || !body) {
      toast.error("Subject and body are required for preview");
      return;
    }
    setLoadingPreview(true);
    try {
      const data = await previewEmail(subject, body);
      setPreviewData(data);
      setShowPreview(true);
    } catch (error) {
      toast.error("Failed to generate preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  const insertVariable = (v: string) => {
    setBody(prev => prev + v);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#0a0a0b] border-white/5 text-white max-w-4xl font-mono ring-1 ring-white/5 z-[100] flex flex-col h-[90vh]">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
        <DialogHeader className="pt-4 shrink-0">
          <DialogTitle className="uppercase tracking-[0.2em] text-sm flex items-center justify-between">
            <span>{template ? 'Modify Data Entry' : 'Initialize Data Entry'}</span>
            <Badge variant="outline" className="text-[8px] border-indigo-500/30 text-indigo-400 uppercase">Vault_Access</Badge>
          </DialogTitle>
          <DialogDescription className="text-[10px] uppercase tracking-widest text-zinc-500">
            Define reusable transmission protocols
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 py-4 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Identifier</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-black border-white/10 text-white h-10"
                    placeholder="TEMPLATE_NAME"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Metadata (Optional)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-black border-white/10 text-white h-10"
                    placeholder="DESC_PROTO"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Subject String</Label>
                  <span className="text-[9px] text-zinc-600 font-mono">{subject.length} / 150</span>
                </div>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value.slice(0, 150))}
                  className="bg-black border-white/10 text-white h-10"
                  placeholder="STR_HEADER"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Transmission Body</Label>
                  <div className="flex gap-1">
                    {['{{user_name}}', '{{username}}', '{{email}}', '{{tokens}}'].map((v) => (
                      <button
                        key={v}
                        onClick={() => insertVariable(v)}
                        className="px-1.5 py-0.5 bg-white/5 border border-white/5 text-[8px] font-mono text-zinc-500 hover:bg-indigo-500 hover:text-white transition-all rounded"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="bg-black border-white/10 text-zinc-300 min-h-[300px] resize-none text-sm p-4 leading-relaxed"
                  placeholder="INIT_BLOCK..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Token Reward Injection</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={tokenReward}
                    onChange={(e) => setTokenReward(parseInt(e.target.value) || 0)}
                    className="bg-black border-white/10 text-white w-full h-10 pl-10"
                    min={0}
                  />
                  <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Heuristic Preview</Label>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={generatePreview}
                  disabled={loadingPreview}
                  className="h-7 text-[9px] uppercase font-mono border-white/10 bg-white/5"
                >
                  {loadingPreview ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3 mr-1.5" />}
                  Refresh_Preview
                </Button>
              </div>
              
              <div className="h-full border border-white/5 rounded-lg overflow-hidden bg-zinc-900/50 flex flex-col min-h-[500px]">
                {showPreview && previewData ? (
                  <div className="flex-1 flex flex-col bg-white overflow-hidden">
                    <div className="p-4 border-b border-zinc-200 bg-zinc-50 shrink-0">
                      <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Subject:</div>
                      <div className="text-zinc-900 font-bold text-sm">{previewData.subject}</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                      <div 
                        className="prose prose-sm prose-zinc max-w-none text-zinc-900"
                        dangerouslySetInnerHTML={{ __html: previewData.body_html }} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 p-10 text-center">
                    <Eye className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-[10px] uppercase tracking-[0.2em]">Awaiting Data Input for Visualization</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-white/5 pt-6 shrink-0">
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="rounded-none uppercase tracking-widest text-[10px] hover:bg-white/5 text-zinc-500 hover:text-white"
          >
            Abort
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="rounded-none bg-indigo-600 hover:bg-indigo-500 text-white uppercase tracking-widest text-[10px] px-8 h-10 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
            Commit to Vault
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
