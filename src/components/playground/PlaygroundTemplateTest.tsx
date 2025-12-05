import { useState, useRef } from "react";
import { PlaygroundSplitView } from "./PlaygroundSplitView";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, X, Sparkles, Wand2, Loader2, AlertTriangle, 
  MessageSquare, Save, Copy, Download, CheckCircle2, 
  Image as ImageIcon, User, Users 
} from "lucide-react";
import { toast } from "sonner";
import { User as UserType, EventConfig, updateEvent } from "@/services/eventsApi";
import { processImageWithAI, downloadImageAsBase64, AI_MODELS, type AIModelKey } from "@/services/aiProcessor";
import { PromptHelper } from "@/components/PromptHelper";

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
      console.error("❌ processWithAI: missing or empty testImageBase64");
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

      setProcessedResult(result.imageUrl);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Template Test</h2>
        <p className="text-zinc-400">Test your AI templates with real images and prompts.</p>
      </div>

      {/* 1. Photo Source Section */}
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">1. Photo Source</span>
        </div>
        <CardContent className="p-4 space-y-4">
          {/* Upload Area */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            {testImage ? (
              <div className="flex items-center gap-4 p-3 bg-black/30 rounded-xl border border-white/10">
                <img src={testImage} alt="Test" className="w-16 h-16 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="text-xs text-zinc-300 mb-2 font-medium">Image loaded</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs border-white/20 text-zinc-300 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white"
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
                      className="h-7 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors bg-black/20 hover:bg-black/30 group"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                <p className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">Upload photo</p>
              </div>
            )}
          </div>

          {/* Sample Tabs */}
          <Tabs defaultValue="individual" className="w-full">
            <TabsList className="w-full bg-zinc-800/50 border border-white/5 h-8 p-0.5">
              <TabsTrigger value="individual" className="flex-1 text-[10px] h-7 data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 hover:text-zinc-200">Individual</TabsTrigger>
              <TabsTrigger value="group" className="flex-1 text-[10px] h-7 data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400 hover:text-zinc-200">Group</TabsTrigger>
            </TabsList>
            <TabsContent value="individual" className="mt-3">
              <div className="grid grid-cols-4 gap-2">
                {SAMPLE_IMAGES_INDIVIDUAL.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => useSampleImage(url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      testImage === url ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    <img src={url} alt="Sample" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="group" className="mt-3">
              <div className="grid grid-cols-4 gap-2">
                {SAMPLE_IMAGES_GROUP.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => useSampleImage(url)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      testImage === url ? 'border-purple-500 ring-2 ring-purple-500/20' : 'border-transparent hover:border-white/20'
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
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">2. Configuration</span>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Event</Label>
              <Select value={selectedEventId} onValueChange={(id) => {
                setSelectedEventId(id);
                setSelectedTemplateId('');
              }}>
                <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-xs text-zinc-200">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {events.map(e => (
                    <SelectItem key={e._id} value={e._id} className="text-xs text-zinc-200">{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId} disabled={!selectedEventId}>
                <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-xs text-zinc-200">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id} className="text-xs text-zinc-200">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">AI Model</Label>
            <Select value={selectedAiModel} onValueChange={(v: AIModelKey) => setSelectedAiModel(v)}>
              <SelectTrigger className="h-9 bg-zinc-800 border-zinc-700 text-xs text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {Object.entries(AI_MODELS).map(([key, model]) => (
                  <SelectItem key={key} value={key} className="text-xs text-zinc-200">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-zinc-400 ml-2 text-[10px]">({model.speed})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Processing Mode</Label>
            <div className="flex bg-zinc-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setIsGroupPhoto(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  !isGroupPhoto ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                }`}
              >
                <User className="w-3 h-3" />
                Individual
              </button>
              <button
                type="button"
                onClick={() => setIsGroupPhoto(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isGroupPhoto ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                }`}
              >
                <Users className="w-3 h-3" />
                Group
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Prompt Section */}
      <Card className="bg-zinc-900/50 border-white/10 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-200">3. Prompting</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-zinc-400">Custom</Label>
            <Switch 
              checked={useCustomPrompt} 
              onCheckedChange={setUseCustomPrompt} 
              className="scale-75 data-[state=checked]:bg-purple-600" 
            />
          </div>
        </div>
        <CardContent className="p-4 space-y-4">
          {useCustomPrompt ? (
            <div className="space-y-3">
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe the transformation..."
                rows={3}
                className="text-xs font-mono bg-black/30 border-white/10 resize-none text-zinc-300 placeholder:text-zinc-600"
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
                  className="w-full h-8 text-xs border-green-500/30 text-green-400 bg-green-500/5 hover:bg-green-500/10 hover:text-green-300 font-medium"
                >
                  <Save className="w-3 h-3 mr-2" />
                  Save to Template
                </Button>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-black/30 border border-white/5">
              <p className="text-xs text-zinc-400 font-medium mb-1">Using Template Prompt:</p>
              <p className="text-xs text-zinc-300 font-mono line-clamp-3">
                {isGroupPhoto && selectedTemplate?.groupPrompt
                  ? selectedTemplate.groupPrompt
                  : selectedTemplate?.prompt || "No prompt configured in template."}
              </p>
            </div>
          )}

          {/* Advanced Settings - Collapsed or small */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-500">Seed (Optional)</Label>
              <Input 
                type="number" 
                value={customSeed || ''} 
                onChange={e => setCustomSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Random"
                className="h-7 text-xs bg-black/20 border-white/10 text-zinc-300 placeholder:text-zinc-600"
              />
            </div>
            <div className="flex items-center justify-between pt-4">
              <Label className="text-[10px] text-zinc-500">Force Instructions</Label>
              <Switch 
                checked={forceInstructions} 
                onCheckedChange={setForceInstructions} 
                className="scale-75" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Action Section */}
      <div className="sticky bottom-0 pt-4 pb-8 bg-zinc-950 z-10 border-t border-white/5 mt-4">
        <Button
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02]"
          onClick={processWithAI}
          disabled={isProcessing || !selectedTemplate || !testImageBase64}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2 fill-current" />
              Generate Result
            </>
          )}
        </Button>
        <p className="text-[10px] text-center text-zinc-500 mt-2">
          Uses 1 token per generation.
        </p>
      </div>
    </div>
  );

  // --- Right Panel Content ---
  const PreviewPanel = (
    <div className="h-full flex flex-col">
      {/* Token Warning Banner - Minimalist */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-medium text-amber-200">Real token usage</span>
        </div>
        <span className="text-[10px] text-amber-200/70">Session: {tokensUsed} used</span>
      </div>

      <div className="flex-1 p-6 flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-800 relative overflow-hidden group">
          {processedResult ? (
            <>
              <img 
                src={processedResult} 
                alt="Result" 
                className="max-w-full max-h-full object-contain shadow-2xl" 
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                <Button onClick={downloadResult} size="sm" className="bg-white text-black hover:bg-zinc-200">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </>
          ) : isProcessing ? (
            <div className="text-center w-full max-w-xs">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-purple-500/30"></div>
                <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-purple-400 animate-pulse" />
              </div>
              <h3 className="text-white font-medium mb-2">Creating Magic...</h3>
              <Progress value={processingProgress} className="h-1.5 bg-zinc-800" indicatorClassName="bg-purple-500" />
              <p className="text-xs text-zinc-500 mt-2">{processingStatus}</p>
            </div>
          ) : (
            <div className="text-center text-zinc-500">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-zinc-400">No Result Yet</p>
              <p className="text-xs text-zinc-500">Configure and generate to see preview</p>
            </div>
          )}
        </div>

        {/* Result Info / Quick Actions */}
        {processedResult && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="bg-zinc-900 border border-white/5 p-3 rounded-xl">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Seed</span>
              <div className="flex items-center justify-between mt-1">
                <code className="text-xs text-purple-300 font-mono">{lastResultSeed}</code>
                <button 
                  onClick={() => {
                    if (lastResultSeed) {
                      setCustomSeed(lastResultSeed);
                      toast.success("Seed applied to settings");
                    }
                  }}
                  className="text-zinc-500 hover:text-white"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="bg-zinc-900 border border-white/5 p-3 rounded-xl">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Model</span>
              <p className="text-xs text-zinc-300 mt-1 truncate">{AI_MODELS[selectedAiModel].name}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <PlaygroundSplitView 
      leftPanel={ControlsPanel} 
      rightPanel={PreviewPanel} 
    />
  );
}

