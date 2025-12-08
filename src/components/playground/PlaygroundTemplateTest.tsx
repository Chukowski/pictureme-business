import { useState, useRef } from "react";
import { PlaygroundSplitView } from "./PlaygroundSplitView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, Sparkles, Loader2, AlertTriangle, 
  MessageSquare, Save, Copy, Download,
  Image as ImageIcon, User, Users, Info, 
  RotateCcw, SplitSquareHorizontal, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { User as UserType, EventConfig, updateEvent } from "@/services/eventsApi";
import { processImageWithAI, downloadImageAsBase64, AI_MODELS, type AIModelKey } from "@/services/aiProcessor";
import { PromptHelper } from "@/components/PromptHelper";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Sample test images
const SAMPLE_IMAGES_INDIVIDUAL = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop&crop=face",
];

const SAMPLE_IMAGES_GROUP = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&h=400&fit=crop",
];

interface PlaygroundTemplateTestProps {
  events: EventConfig[];
  currentUser: UserType;
  onReloadEvents: () => Promise<void>;
}

export function PlaygroundTemplateTest({ events, currentUser, onReloadEvents }: PlaygroundTemplateTestProps) {
  // State
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedAiModel, setSelectedAiModel] = useState<AIModelKey>('nanoBanana');
  const [isGroupPhoto, setIsGroupPhoto] = useState(false);
  
  // Image State
  const [testImage, setTestImage] = useState<string | null>(null);
  const [testImageBase64, setTestImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prompt State
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [forceInstructions, setForceInstructions] = useState(false);
  const [customSeed, setCustomSeed] = useState<number | undefined>(undefined);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete' | 'error'>('idle');
  const [processedResult, setProcessedResult] = useState<string | null>(null);
  const [lastResultSeed, setLastResultSeed] = useState<number | null>(null);
  const [tokensUsed, setTokensUsed] = useState(0);

  // Derived State
  const selectedEvent = events.find(e => e._id === selectedEventId);
  const templates = selectedEvent?.templates || [];
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Handlers
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setTestImage(result);
        setTestImageBase64(result); // For local file, it is already base64
      };
      reader.readAsDataURL(file);
    }
  };

  const useSampleImage = async (url: string) => {
    setTestImage(url);
    setTestImageBase64(null); // Reset base64, will fetch on process
    
    // Fetch and convert to base64 immediately for smoother UX
    try {
      const base64 = await downloadImageAsBase64(url);
      setTestImageBase64(base64);
    } catch (error) {
      console.error("Failed to load sample image", error);
      toast.error("Failed to load sample image");
    }
  };

  const processWithAI = async () => {
    if (!selectedTemplate || !selectedEvent || !testImageBase64 || testImageBase64.length < 100) {
      toast.error("Please upload or select a test image first");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('processing');
    setProcessingProgress(10);
    setProcessedResult(null);

    // Progress simulation
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 500);

    try {
      const promptToUse = useCustomPrompt 
        ? customPrompt 
        : isGroupPhoto && selectedTemplate.groupPrompt 
          ? selectedTemplate.groupPrompt 
          : selectedTemplate.prompt || '';

      const result = await processImageWithAI({
        userPhotoBase64: testImageBase64,
        backgroundPrompt: promptToUse,
        backgroundImageUrls: selectedTemplate.images || [],
        includeBranding: false,
        aspectRatio: selectedTemplate.aspectRatio || "2:3",
        aiModel: AI_MODELS[selectedAiModel].id,
        forceInstructions: forceInstructions,
        seed: customSeed,
        eventId: selectedEvent.postgres_event_id,
        billingContext: isGroupPhoto ? 'playground-group' : 'playground-individual',
        eventSlug: selectedEvent.slug,
        userSlug: selectedEvent.user_slug,
      });

      const outputUrl = result.imageUrl 
        || (result as any).processedImageUrl 
        || (result as any).url 
        || (result as any).images?.[0] 
        || (result as any).data?.image_url 
        || (result as any).data?.images?.[0];

      if (!outputUrl) {
        throw new Error("AI returned no image URL");
      }

      setProcessedResult(outputUrl);
      setLastResultSeed(result.seed);
      setTokensUsed(prev => prev + 1);
      setProcessingStatus('complete');
      setProcessingProgress(100);
      toast.success("Image processed successfully!");
    } catch (error: any) {
      console.error("AI Processing error:", error);
      setProcessingStatus('error');
      toast.error(error.message || "Failed to process image");
    } finally {
      clearInterval(interval);
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (processedResult) {
      const link = document.createElement('a');
      link.href = processedResult;
      link.download = `ai-result-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- Left Panel Content ---
  const ControlsPanel = (
    <div className="space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Template Test</h2>
        <p className="text-zinc-400">Test and refine your AI templates with real-time feedback.</p>
      </div>

      {/* 1. Photo Source Section */}
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">1</div>
          <span className="text-base font-medium text-zinc-200">Photo Source</span>
        </div>
        <CardContent className="p-6 space-y-6">
          {/* Upload Area */}
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            {testImage ? (
              <div className="flex items-center gap-5 p-4 bg-black/30 rounded-xl border border-white/10">
                <img src={testImage} alt="Test" className="w-20 h-20 rounded-lg object-cover shadow-md" />
                <div className="flex-1">
                  <p className="text-sm text-zinc-300 mb-3 font-medium">Source Image Loaded</p>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs border-white/20 text-zinc-300 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white"
                    >
                      Change
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setTestImage(null);
                        setTestImageBase64(null);
                      }}
                      className="h-8 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500/50 transition-all bg-black/20 hover:bg-black/30 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/20 transition-colors">
                   <Upload className="w-6 h-6 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <p className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">Click to upload photo</p>
                <p className="text-xs text-zinc-500 mt-1">or drag and drop</p>
              </div>
            )}
          </div>

          {/* Sample Tabs */}
          <Tabs defaultValue="individual" className="w-full">
            <TabsList className="w-full bg-zinc-800/50 border border-white/5 h-10 p-1 rounded-lg">
              <TabsTrigger value="individual" className="flex-1 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 hover:text-zinc-200 rounded-md">Individual Samples</TabsTrigger>
              <TabsTrigger value="group" className="flex-1 text-xs data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 hover:text-zinc-200 rounded-md">Group Samples</TabsTrigger>
            </TabsList>
            <TabsContent value="individual" className="mt-4">
              <div className="grid grid-cols-4 gap-3">
                {SAMPLE_IMAGES_INDIVIDUAL.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => useSampleImage(url)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                      testImage === url ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-500/10' : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    <img src={url} alt="Sample" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="group" className="mt-4">
              <div className="grid grid-cols-4 gap-3">
                {SAMPLE_IMAGES_GROUP.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => useSampleImage(url)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${
                      testImage === url ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-lg shadow-purple-500/10' : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    <img src={url} alt="Sample" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 2. Template & Model Section */}
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">2</div>
          <span className="text-base font-medium text-zinc-200">Configuration</span>
        </div>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">Event</Label>
              <Select value={selectedEventId} onValueChange={(id) => {
                setSelectedEventId(id);
                setSelectedTemplateId('');
              }}>
                <SelectTrigger className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-200 focus:ring-purple-500/20">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {events.map(e => (
                    <SelectItem key={e._id} value={e._id} className="text-zinc-200">{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={!selectedEventId}>
                <SelectTrigger className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-200 focus:ring-purple-500/20">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-zinc-200">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">AI Model</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-zinc-500 hover:text-zinc-300" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-800 border-white/10 text-xs">
                    Choose higher quality models for final results, or faster models for testing.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={selectedAiModel} onValueChange={(v: AIModelKey) => setSelectedAiModel(v)}>
              <SelectTrigger className="h-10 bg-zinc-800 border-zinc-700 text-sm text-zinc-200 focus:ring-purple-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {Object.entries(AI_MODELS).map(([key, model]) => (
                  <SelectItem key={key} value={key} className="text-zinc-200">
                    <div className="flex flex-col py-1">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-zinc-500 text-[10px]">{model.speed} • High Quality</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase tracking-wide font-semibold">Processing Mode</Label>
            <div className="flex bg-zinc-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setIsGroupPhoto(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  !isGroupPhoto ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                }`}
              >
                <User className="w-4 h-4" />
                Individual
              </button>
              <button
                type="button"
                onClick={() => setIsGroupPhoto(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                  isGroupPhoto ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                }`}
              >
                <Users className="w-4 h-4" />
                Group
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Prompt Section */}
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden shadow-lg">
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">3</div>
            <span className="text-base font-medium text-zinc-200">Prompting</span>
          </div>
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
            <Label className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wide cursor-pointer" htmlFor="custom-prompt">Custom</Label>
            <Switch 
              id="custom-prompt"
              checked={useCustomPrompt} 
              onCheckedChange={setUseCustomPrompt} 
              className="scale-75 data-[state=checked]:bg-emerald-500" 
            />
          </div>
        </div>
        <CardContent className="p-6 space-y-6">
          {useCustomPrompt ? (
            <div className="space-y-4">
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe the transformation..."
                rows={4}
                className="text-sm font-mono bg-black/30 border-white/10 resize-none text-zinc-300 placeholder:text-zinc-600 focus:border-emerald-500/30"
              />
              <PromptHelper
                onSelectPrompt={setCustomPrompt}
                currentPrompt={customPrompt}
                section="template"
                placeholder="Ask AI to improve prompt..."
              />
              {selectedTemplate && selectedEvent && customPrompt && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Save prompt logic
                    const updatedTemplates = selectedEvent.templates?.map(t => 
                      t.id === selectedTemplate.id 
                        ? { ...t, [isGroupPhoto ? 'groupPrompt' : 'prompt']: customPrompt }
                        : t
                    ) || [];
                    await updateEvent(selectedEvent._id, { templates: updatedTemplates });
                    await onReloadEvents();
                    toast.success('Prompt saved to template!');
                  }}
                  className="w-full h-9 text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 hover:text-emerald-300 font-medium"
                >
                  <Save className="w-3 h-3 mr-2" />
                  Save to Template
                </Button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-black/30 border border-white/5">
              <p className="text-xs text-zinc-400 font-medium mb-2 uppercase tracking-wide">Using Template Prompt:</p>
              <p className="text-sm text-zinc-300 font-mono leading-relaxed">
                {isGroupPhoto && selectedTemplate?.groupPrompt
                  ? selectedTemplate.groupPrompt
                  : selectedTemplate?.prompt || "No prompt configured in template."}
              </p>
            </div>
          )}

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/5">
            <div className="space-y-2">
              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Seed (Optional)</Label>
              <Input 
                type="number" 
                value={customSeed || ''} 
                onChange={e => setCustomSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Random"
                className="h-8 text-xs bg-black/20 border-white/10 text-zinc-300 placeholder:text-zinc-600 font-mono"
              />
            </div>
            <div className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-2">
                 <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Force Instructions</Label>
                 <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-800 border-white/10 text-xs">
                        Stronger adherence to prompt instructions.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
              </div>
              <Switch 
                checked={forceInstructions} 
                onCheckedChange={setForceInstructions} 
                className="scale-75" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Action Section - Sticky */}
      <div className="sticky bottom-0 pt-4 pb-8 bg-zinc-950 z-20 border-t border-white/5 mt-8">
        <Button
          className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-900/20 transition-all hover:scale-[1.01] rounded-xl"
          onClick={processWithAI}
          disabled={isProcessing || !selectedTemplate || !testImageBase64}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              Processing Magic...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-3 fill-current" />
              Generate Result
            </>
          )}
        </Button>
        <p className="text-[10px] text-center text-zinc-500 mt-3 flex items-center justify-center gap-2">
          <span>Uses 1 token per generation</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700" />
          <span>~12s avg. time</span>
        </p>
      </div>
    </div>
  );

  // --- Right Panel Content (Canvas Overlay) ---
  const CanvasOverlay = (
    <>
      {/* HUD Widget */}
      <div className="absolute top-4 right-4 pointer-events-auto z-10">
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-64 overflow-hidden ring-1 ring-white/5">
           {/* Header */}
           <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Live Session</span>
              </div>
              <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-5 w-5 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-full" 
                 title="Reset Session"
                 onClick={() => {
                   setProcessedResult(null);
                   setTestImage(null);
                   setTestImageBase64(null);
                   setTokensUsed(0);
                 }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
           </div>
           
           <div className="p-4 space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Tokens</span>
                    <div className="flex items-baseline gap-1">
                       <span className="text-lg font-mono font-medium text-white">{tokensUsed}</span>
                       <span className="text-[10px] text-zinc-600">used</span>
                    </div>
                 </div>
                 <div className="space-y-1">
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Model</span>
                    <div className="text-xs font-medium text-white truncate" title={AI_MODELS[selectedAiModel].name}>
                       {AI_MODELS[selectedAiModel].name.split('(')[0].trim()}
                    </div>
                 </div>
              </div>

              {/* Seed Info */}
              {lastResultSeed && (
                <div className="pt-3 border-t border-white/5">
                   <div className="flex items-center justify-between group">
                      <div className="space-y-0.5">
                         <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide block">Last Seed</span>
                         <code className="text-xs text-indigo-300 font-mono block">{lastResultSeed}</code>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-500 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setCustomSeed(lastResultSeed);
                          toast.success("Seed copied to settings");
                        }}
                        title="Use this seed"
                      >
                         <Copy className="w-3 h-3" />
                      </Button>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Run Again Bar - Only visible when result exists */}
      {processedResult && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
           <div className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur-xl p-2 rounded-full border border-white/10 shadow-2xl ring-1 ring-black/50">
              <Button 
                onClick={processWithAI} 
                disabled={isProcessing}
                className="rounded-full bg-white text-black hover:bg-zinc-200 h-9 px-4 font-medium"
              >
                 <RotateCcw className="w-3.5 h-3.5 mr-2" />
                 Regenerate
              </Button>
              <div className="w-px h-4 bg-white/20 mx-1" />
              <Button 
                variant="ghost"
                onClick={downloadResult}
                className="rounded-full text-zinc-300 hover:text-white hover:bg-white/10 h-9 w-9 p-0"
                title="Download"
              >
                 <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost"
                className="rounded-full text-zinc-300 hover:text-white hover:bg-white/10 h-9 w-9 p-0"
                title="Compare (Coming Soon)"
              >
                 <SplitSquareHorizontal className="w-4 h-4" />
              </Button>
           </div>
        </div>
      )}
    </>
  );

  // --- Right Panel Content (Inside Phone) ---
  const PreviewPanel = (
    <div className="h-full flex flex-col relative group">
      {/* Visual Feedback Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
           <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
              <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-indigo-400 animate-pulse" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">Creating Magic</h3>
           <p className="text-sm text-zinc-400 mb-6">Applying style transfer...</p>
           <Progress value={processingProgress} className="h-1.5 w-48 bg-white/10" indicatorClassName="bg-indigo-500" />
        </div>
      )}

      <div className="flex-1 flex items-center justify-center bg-zinc-900/50 relative overflow-hidden">
        {processedResult ? (
          <img 
            src={processedResult} 
            alt="Result" 
            className="w-full h-full object-contain" 
          />
        ) : (
          <div className="text-center text-zinc-600 p-8">
            <div className="w-20 h-20 rounded-3xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-4 border border-white/5">
              <ImageIcon className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-sm font-medium text-zinc-400">No Result Yet</p>
            <p className="text-xs text-zinc-500 mt-1">Configure settings and click generate</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <PlaygroundSplitView 
      leftPanel={ControlsPanel} 
      rightPanel={PreviewPanel} 
      canvasOverlay={CanvasOverlay}
    />
  );
}
