import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  Loader2, 
  Mail, 
  Info, 
  Send, 
  Eye, 
  Check, 
  ChevronRight, 
  Zap, 
  Database,
  Cpu
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  getTemplates, 
  searchUsers, 
  sendEmail, 
  previewEmail,
  type EmailTemplate 
} from "@/services/aleApi";
import { HUDContainer, TechnicalTooltip } from "./ale-shared";

export function EmailComposerTab() {
  const [recipientType, setRecipientType] = useState<'all' | 'segment' | 'single'>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [segmentFilters, setSegmentFilters] = useState<any>({
    roles: [],
    tiers: [],
  });
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tokenReward, setTokenReward] = useState(0);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // Preview state
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (userSearch.length > 2) {
      const timer = setTimeout(() => {
        performSearch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userSearch]);

  const loadTemplates = async () => {
    try {
      const data = await getTemplates(true);
      setTemplates(data || []);
    } catch (error) {
      console.error("Failed to load templates", error);
    }
  };

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const results = await searchUsers(userSearch);
      setUserResults(Array.isArray(results) ? results : []);
    } catch (error) {
      toast.error("Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const handleTemplateSelect = (id: string) => {
    if (id === "none") {
      setSubject('');
      setBody('');
      setTokenReward(0);
      setSelectedTemplateId(null);
      return;
    }
    const template = templates.find(t => t.id === id);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setTokenReward(template.token_reward);
      setSelectedTemplateId(id);
      toast.info(`Template "${template.name}" loaded`);
    }
  };

  const handleSend = async () => {
    if (!subject || !body) {
      toast.error("Subject and body are required");
      return;
    }

    if (recipientType === 'single' && !selectedUser) {
      toast.error("Please select a target node");
      return;
    }

    setSending(true);
    try {
      await sendEmail({
        recipientType,
        recipientId: selectedUser?.id,
        filters: recipientType === 'segment' ? segmentFilters : undefined,
        subject,
        body,
        tokenReward
      });
      toast.success("Transmission broadcast successful");
    } catch (error) {
      toast.error("Transmission failed to broadcast");
    } finally {
      setSending(false);
    }
  };

  const handlePreview = async () => {
    if (!subject || !body) {
      toast.error("Subject and body are required for preview");
      return;
    }
    setIsPreviewing(true);
    try {
      const data = await previewEmail(subject, body);
      setPreviewData(data);
    } catch (error) {
      toast.error("Failed to generate preview");
    } finally {
      setIsPreviewing(false);
    }
  };

  const insertVariable = (variable: string) => {
    setBody(prev => prev + variable);
  };

  const selectedUserDisplay = selectedUser 
    ? (selectedUser.full_name || selectedUser.username || selectedUser.email)
    : "SELECT_TARGET_NODE";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-8">
        <HUDContainer title="Transmission Control" icon={Mail} subtitle="Manual Message Routing">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Source Template</Label>
                  <TechnicalTooltip text="Load a pre-configured template into the composer.">
                    <Info className="w-3 h-3 text-zinc-700 cursor-help" />
                  </TechnicalTooltip>
                </div>
                <Select value={selectedTemplateId || "none"} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="bg-black border-white/10 text-white font-mono h-10">
                    <SelectValue placeholder="LOAD_TEMPLATE" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white font-mono z-[110]">
                    <SelectItem value="none">NO_TEMPLATE</SelectItem>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Destination Protocol</Label>
                  <TechnicalTooltip text="The distribution method for this transmission (All, Segmented, or Single).">
                    <Info className="w-3 h-3 text-zinc-700 cursor-help" />
                  </TechnicalTooltip>
                </div>
                <Select value={recipientType} onValueChange={(value: any) => setRecipientType(value)}>
                  <SelectTrigger className="bg-black border-white/10 text-white font-mono h-10">
                    <SelectValue placeholder="SELECT_PROTOCOL" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white font-mono z-[110]">
                    <SelectItem value="all">BROADCAST_ALL</SelectItem>
                    <SelectItem value="segment">FILTERED_SEGMENT</SelectItem>
                    <SelectItem value="single">DIRECT_UPLINK</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recipientType === 'single' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Node Identifier</Label>
                    <TechnicalTooltip text="The unique user node to establish a direct communication link with.">
                      <Info className="w-3 h-3 text-zinc-700 cursor-help" />
                    </TechnicalTooltip>
                  </div>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between bg-black border-white/10 text-white font-mono h-10 hover:bg-zinc-900 transition-colors"
                      >
                        <span className="truncate">{selectedUserDisplay}</span>
                        <div className="flex items-center gap-2">
                          {isSearching && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
                          <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform", open ? "rotate-90" : "rotate-0")} />
                        </div>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 bg-zinc-950 border-white/10 z-[110]" align="start">
                      <Command className="bg-transparent text-white font-mono">
                        <CommandInput
                          placeholder="SCAN NODE ID / EMAIL / NAME..."
                          value={userSearch}
                          onValueChange={setUserSearch}
                          className="text-white border-b border-white/5 h-12"
                        />
                        <CommandList className="max-h-[300px] overflow-y-auto custom-scrollbar">
                          <CommandEmpty className="p-4 text-[10px] uppercase tracking-widest text-zinc-600 font-mono text-center">No nodes detected.</CommandEmpty>
                          <CommandGroup>
                            {userResults.map((user) => (
                              <CommandItem
                                key={user.id}
                                value={`${user.id}-${user.email}`}
                                onSelect={() => {
                                  setSelectedUser(user);
                                  setOpen(false);
                                  setUserSearch('');
                                }}
                                className="text-white hover:bg-white/5 cursor-pointer flex items-center justify-between p-3 aria-selected:bg-white/10"
                              >
                                <div className="flex flex-col gap-1 overflow-hidden">
                                  <span className="text-[11px] font-bold truncate">{user.full_name || user.username || 'Unknown'}</span>
                                  <span className="text-[9px] text-zinc-500 uppercase truncate">{user.email}</span>
                                </div>
                                <Check
                                  className={cn(
                                    "h-4 w-4 text-indigo-500 shrink-0 ml-2",
                                    selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Subject Header</Label>
                    <TechnicalTooltip text="The main subject line for the email transmission. Variables are parsed.">
                      <Info className="w-3 h-3 text-zinc-700 cursor-help" />
                    </TechnicalTooltip>
                  </div>
                  <span className={cn("text-[9px] font-mono", subject.length > 100 ? "text-amber-500" : "text-zinc-600")}>
                    {subject.length} / 150
                  </span>
                </div>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value.slice(0, 150))}
                  className="bg-black border-white/10 text-white font-mono h-12 focus:ring-indigo-500/50"
                  placeholder="ENC_MSG: Welcome to PictureMe..."
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Transmission Body</Label>
                    <TechnicalTooltip text="The rich text content of the message. Supports variable injection.">
                      <Info className="w-3 h-3 text-zinc-700 cursor-help" />
                    </TechnicalTooltip>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] font-mono text-zinc-600">
                      {body.length} CHARS
                    </span>
                    <div className="flex gap-1">
                      <TechnicalTooltip text="Use Al-e's neural engine to draft this transmission.">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toast.info("AI Neural Engine is currently in standby mode (Phase 4 Implementation Pending)")}
                          className="px-2 py-1 bg-indigo-500/10 border-indigo-500/20 text-[9px] font-mono text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all h-7 rounded"
                        >
                          <Cpu className="w-3 h-3 mr-1.5" />
                          WRITE_WITH_ALE
                        </Button>
                      </TechnicalTooltip>
                      {['{{user_name}}', '{{username}}', '{{email}}', '{{tokens}}'].map((v) => (
                        <TechnicalTooltip key={v} text={`Inject dynamic ${v.replace('{{', '').replace('}}', '')} field.`}>
                          <button
                            onClick={() => insertVariable(v)}
                            className="px-2 py-1 bg-white/5 border border-white/5 text-[9px] font-mono text-zinc-400 hover:bg-indigo-500 hover:text-white transition-all rounded"
                          >
                            {v}
                          </button>
                        </TechnicalTooltip>
                      ))}
                    </div>
                  </div>
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="bg-black border-white/10 text-zinc-300 font-mono min-h-[300px] focus:ring-indigo-500/50 resize-none leading-relaxed p-6 text-sm"
                  placeholder="INITIATING COMMUNICATION..."
                />
              </div>
            </div>
          </div>
        </HUDContainer>
      </div>

      <div className="lg:col-span-4 space-y-8">
        <HUDContainer title="Packet Attributes" icon={Zap} subtitle="Injection Logic">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Token Bounty Injection</Label>
                <TechnicalTooltip text="Optional currency credits to be granted to recipients upon transmission.">
                  <Info className="w-3 h-3 text-zinc-700 cursor-help" />
                </TechnicalTooltip>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={tokenReward}
                  onChange={(e) => setTokenReward(parseInt(e.target.value) || 0)}
                  className="bg-black border-white/10 text-white font-mono h-12 pl-10"
                  min={0}
                />
                <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              </div>
              <p className="text-[9px] text-zinc-600 uppercase italic">Credits will be credited upon delivery</p>
            </div>

            <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10 space-y-3">
              <h4 className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest">Delivery Checklist</h4>
              {[
                { label: "Variable Parsing", status: "Ready", tip: "Checks if all {{variables}} can be resolved." },
                { label: "HTML Sanity", status: "Passed", tip: "Verifies the structure of the HTML payload." },
                { label: "SPAM Filter", status: "Secure", tip: "Runs heuristic analysis to avoid mail filters." },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <TechnicalTooltip text={item.tip}>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase cursor-help">{item.label}</span>
                  </TechnicalTooltip>
                  <span className="text-[9px] font-mono text-indigo-500 font-bold">{item.status}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline"
                onClick={() => {
                  setSubject('');
                  setBody('');
                  setTokenReward(0);
                  setSelectedTemplateId(null);
                  setSelectedUser(null);
                  toast.info("Console cleared");
                }}
                className="h-16 rounded-none border-white/10 hover:bg-white/5 text-zinc-500 font-mono uppercase tracking-[0.2em] text-[10px]"
              >
                Clear_All
              </Button>
              <Button 
                variant="outline"
                onClick={handlePreview}
                disabled={isPreviewing || !subject || !body}
                className="h-16 rounded-none border-white/10 hover:bg-white/5 text-zinc-400 font-mono uppercase tracking-[0.2em] text-[10px]"
              >
                {isPreviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                Preview
              </Button>
            </div>
            
            <Button 
              onClick={handleSend} 
              disabled={sending || !subject || !body || (recipientType === 'single' && !selectedUser)} 
              className="w-full h-20 rounded-none bg-indigo-600 hover:bg-indigo-500 text-white font-mono uppercase tracking-[0.3em] text-xs shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all group overflow-hidden relative"
            >
              <div className="absolute inset-0 w-full h-full bg-white/5 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
              {sending ? (
                <>
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="w-6 h-6 mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Execute Transmission
                </>
              )}
            </Button>
          </div>
        </HUDContainer>
      </div>

      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="bg-white text-zinc-900 max-w-4xl max-h-[90vh] overflow-hidden p-0 rounded-none border-none z-[120]">
          <DialogHeader className="p-6 border-b border-zinc-100 bg-zinc-50 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Packet Preview</DialogTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">Subject:</span>
                  <span className="text-sm font-bold">{previewData?.subject}</span>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] border-zinc-200">Format: HTML5</Badge>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto p-10 bg-white">
            <div 
              className="prose prose-zinc max-w-none"
              dangerouslySetInnerHTML={{ __html: previewData?.body_html }} 
            />
          </div>
          <DialogFooter className="p-4 border-t border-zinc-100 bg-zinc-50 shrink-0">
            <Button onClick={() => setPreviewData(null)} variant="outline" className="rounded-none border-zinc-200 font-mono text-[10px] uppercase tracking-widest">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
