import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Database, 
  Loader2, 
  Info 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  getTemplates, 
  deleteTemplate, 
  type EmailTemplate 
} from "@/services/aleApi";
import { TechnicalTooltip } from "./ale-shared";
import { TemplateDialog } from "./TemplateDialog";

export function TemplatesTab() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTemplates();
      setTemplates(data || []);
    } catch (error) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await deleteTemplate(id);
      toast.success("Template deleted");
      loadTemplates();
    } catch (error) {
      toast.error("Failed to delete template");
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
      <div className="flex justify-between items-center border-b border-white/5 pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-mono font-bold text-white uppercase tracking-tight">Template Vault</h2>
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase font-mono text-zinc-500 tracking-widest">Global Data Structures for AI Transmissions</p>
            <TechnicalTooltip text="Stored configurations for reusable email bodies and subjects.">
              <Info className="w-3 h-3 text-zinc-800 cursor-help" />
            </TechnicalTooltip>
          </div>
        </div>
        <Button 
          onClick={() => { setEditingTemplate(null); setShowDialog(true); }}
          className="bg-white text-black hover:bg-zinc-200 rounded-none font-mono uppercase tracking-widest text-[10px] h-10 px-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          Initialize New Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template, i) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="bg-black/40 border-white/5 ring-1 ring-white/5 hover:ring-indigo-500/30 transition-all group overflow-hidden h-full flex flex-col">
              <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-transparent opacity-50" />
              <CardHeader className="p-5 pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-mono text-white group-hover:text-indigo-400 transition-colors uppercase tracking-widest">{template.name}</CardTitle>
                    {template.description && (
                      <CardDescription className="text-[9px] text-zinc-600 font-mono uppercase truncate max-w-[200px]">{template.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => { setEditingTemplate(template); setShowDialog(true); }}
                      className="p-1.5 bg-white/5 hover:bg-indigo-500 hover:text-white transition-all text-zinc-500"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(template.id)}
                      className="p-1.5 bg-white/5 hover:bg-red-500 hover:text-white transition-all text-zinc-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest block">Header String:</span>
                    <p className="text-[11px] text-zinc-300 font-mono truncate">{template.subject}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest block">Body Snippet:</span>
                    <p className="text-[10px] text-zinc-500 font-mono line-clamp-3 italic leading-relaxed">{template.body}</p>
                  </div>
                </div>
                
                <div className="pt-6 mt-auto flex items-center justify-between border-t border-white/5">
                  <div className="flex items-center gap-2">
                    {template.token_reward > 0 ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded">
                        <Database className="w-2.5 h-2.5 text-amber-500" />
                        <span className="text-[9px] font-mono text-amber-500 font-bold">{template.token_reward} BOUNTY</span>
                      </div>
                    ) : (
                      <span className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest italic">No Reward Injection</span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[8px] font-mono uppercase tracking-widest",
                    template.is_active ? "text-green-500" : "text-zinc-600"
                  )}>
                    {template.is_active ? "[SYSTEM_ACTIVE]" : "[OFFLINE]"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        
        {templates.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl bg-white/[0.01]">
            <Database className="w-12 h-12 text-zinc-800 mb-4" />
            <p className="text-zinc-600 font-mono text-xs uppercase tracking-[0.3em]">No templates detected in vault</p>
          </div>
        )}
      </div>

      <TemplateDialog
        template={editingTemplate}
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSave={() => { loadTemplates(); setShowDialog(false); }}
      />
    </div>
  );
}
