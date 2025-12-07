import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Sparkles,
  Upload,
  Clock,
  Ratio,
  BoxSelect,
  Pencil,
  X,
  Store,
  Search,
  LayoutGrid,
  List as ListIcon,
  Filter,
  MoreHorizontal,
  Loader2,
  Library,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getCurrentUser } from "@/services/eventsApi";
import { CameraCapture } from "@/components/CameraCapture";
import { processImageWithAI, AspectRatio } from "@/services/aiProcessor";
import { ENV } from "@/config/env";
import { SaveTemplateModal } from "@/components/templates/SaveTemplateModal";
import { useMyTemplates, UserTemplate } from "@/hooks/useMyTemplates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Mode = "image" | "video";
type ViewState = "create" | "templates";

// --- AI Models Configuration ---
const IMAGE_MODELS = [
  { id: "nano-banana", name: "Nano Banana (Fast)", description: "Fast, good quality" },
  { id: "seedream-v4", name: "Seedream v4", description: "Best for LEGO/artistic" },
  { id: "flux-realism", name: "Flux Realism", description: "Photorealistic" },
];

const VIDEO_MODELS = [
  { id: "kling-2.6-pro", name: "Kling 2.6 Pro", description: "High quality video" },
  { id: "wan-v2", name: "Wan v2", description: "Fast video generation" },
];

// --- Categories for browsing ---
const CATEGORIES = ["All", "Fantasy", "Portrait", "Cinematic", "Product", "UGC"];

// --- Marketplace Template Interface ---
interface MarketplaceTemplate {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  images?: string[];
  preview_images?: string[];
  backgrounds?: string[];
  ai_model?: string;
  aspectRatio?: string;
  type?: "image" | "video";
  category?: string;
  is_public?: boolean;
  tags?: string[];
  pipeline_config?: {
    imageModel?: string;
    videoModel?: string;
    videoEnabled?: boolean;
  };
}

const ProcessingCard = ({ status }: { status: string }) => {
  const messages = [
    "Teaching AI the concept of beauty...",
    "Mixing pixels with magic dust...",
    "Consulting the digital oracle...",
    "Rendering your masterpiece...",
    "Adding that special sparkle...",
  ];
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="group relative break-inside-avoid rounded-xl overflow-hidden bg-zinc-900/50 border border-indigo-500/30 shadow-xl animate-pulse">
        <div className="aspect-[3/4] bg-zinc-800/50 relative flex flex-col items-center justify-center p-6 text-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-purple-500/5" />
            
            <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="w-12 h-12 relative">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                    <div className="relative bg-zinc-900 border border-indigo-500/30 rounded-full w-full h-full flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-indigo-400 animate-spin-slow" />
                    </div>
                </div>
                
                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">Generating...</h3>
                    <p className="text-xs text-zinc-400 transition-opacity duration-300">
                        {status || messages[msgIndex]}
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

interface HistoryItem {
    id: string;
    url: string; // remote asset URL (persisted)
    previewUrl?: string; // optional base64/preview for immediate display
    type: 'image' | 'video';
    timestamp: number;
    prompt?: string;
    model?: string;
    ratio?: string;
    duration?: string;
    shareCode?: string;
}

export default function CreatorStudioPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { templates: myTemplates, saveTemplate } = useMyTemplates();

  // View State
  const [viewState, setViewState] = useState<ViewState>("create");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [templateTab, setTemplateTab] = useState<"library" | "marketplace">("marketplace");

  // Marketplace Templates
  const [marketplaceTemplates, setMarketplaceTemplates] = useState<MarketplaceTemplate[]>([]);
  const [myLibraryTemplates, setMyLibraryTemplates] = useState<MarketplaceTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Creation State
  const [mode, setMode] = useState<Mode>("image");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("nano-banana");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [duration, setDuration] = useState("5s");
  const [audioOn, setAudioOn] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
  
  // Input Media
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Processing & Result
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Preparing...");
  
  // History / Feed - Initialize from localStorage
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Load templates from API
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const [marketplaceRes, libraryRes] = await Promise.all([
        fetch(`${ENV.API_URL}/api/marketplace/templates?is_public=true`, { headers }),
        token ? fetch(`${ENV.API_URL}/api/marketplace/my-library`, { headers }) : Promise.resolve(null)
      ]);

      if (marketplaceRes.ok) {
        const data = await marketplaceRes.json();
        setMarketplaceTemplates(data || []);
      }

      if (libraryRes?.ok) {
        const data = await libraryRes.json();
        setMyLibraryTemplates(data || []);
      }
    } catch (e) {
      console.error("Failed to load templates:", e);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Load templates when switching to templates view
  useEffect(() => {
    if (viewState === "templates" && marketplaceTemplates.length === 0) {
      fetchTemplates();
    }
  }, [viewState]);

  // Load history from localStorage on mount
  useEffect(() => {
    if (!user) {
      navigate("/admin/auth");
      return;
    }
    
    // Reset history loaded state when user changes
    setHistoryLoaded(false);
    
    const storageKey = `studio_history_${user.id}`;
    try {
      const saved = localStorage.getItem(storageKey);
      console.log(`Loading history from ${storageKey}:`, saved ? 'found' : 'empty');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
          console.log(`Loaded ${parsed.length} items from history`);
        }
      } else {
        setHistory([]); // Reset history if nothing saved
      }
    } catch (e) {
      console.error('Failed to load history:', e);
      setHistory([]);
    }
    setHistoryLoaded(true);
  }, [navigate, user?.id]); // Use user.id specifically

  // Save history to localStorage whenever it changes (only after initial load)
  useEffect(() => {
    if (user && historyLoaded) {
      const storageKey = `studio_history_${user.id}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(history));
        console.log(`Saved ${history.length} items to ${storageKey}`);
      } catch (e) {
        console.error("Failed to persist history to localStorage", e);
      }
    }
  }, [history, user?.id, historyLoaded]);

  // Get preview image from template
  const getTemplateImage = (tpl: MarketplaceTemplate): string | undefined => {
    return tpl.images?.[0] || tpl.preview_images?.[0] || tpl.backgrounds?.[0];
  };

  // Filter templates based on mode and search
  const filteredMarketplaceTemplates = useMemo(() => {
    return marketplaceTemplates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === "All" || t.category === activeCategory;
      // For now, show all templates regardless of type since most are image-based
      return matchesSearch && matchesCategory;
    });
  }, [marketplaceTemplates, searchQuery, activeCategory]);

  const filteredLibraryTemplates = useMemo(() => {
    return myLibraryTemplates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [myLibraryTemplates, searchQuery]);

  const handleFileUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setInputImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const applyTemplate = (tpl: MarketplaceTemplate) => {
    setSelectedTemplate(tpl);
    setPrompt(tpl.prompt || "");
    // Use model from template or default based on mode
    const templateModel = tpl.ai_model || tpl.pipeline_config?.imageModel;
    if (templateModel) {
      setModel(templateModel);
    } else {
      setModel(mode === "video" ? "kling-2.6-pro" : "nano-banana");
    }
    if (tpl.aspectRatio) setAspectRatio(tpl.aspectRatio);
    setViewState("create");
    toast.success(`Style "${tpl.name}" applied`);
  };

  const addToHistory = (item: HistoryItem) => {
      setHistory(prev => [item, ...prev]);
  };

  const handleGenerate = async () => {
    if (mode === "image" && !inputImage) {
        toast.error("Please upload or capture an image first");
        return;
    }
    
    setIsProcessing(true);
    setStatusMessage("Initializing...");

    try {
        if (mode === "image") {
             // Get background images from template
             const bgImages = selectedTemplate?.images || selectedTemplate?.backgrounds || [];
             
             const result = await processImageWithAI({
                userPhotoBase64: inputImage!,
                backgroundPrompt: prompt || selectedTemplate?.prompt || "portrait photo",
                backgroundImageUrls: bgImages,
                aspectRatio: aspectRatio as AspectRatio,
                aiModel: model,
                onProgress: setStatusMessage,
              });
              addToHistory({
                  id: crypto.randomUUID(),
                  url: result.url,
                  type: 'image',
                  timestamp: Date.now(),
                  prompt: prompt || selectedTemplate?.prompt,
                  model,
                  ratio: aspectRatio,
              });
              toast.success("Image ready!");
        } else {
             // Video generation logic
             const endpoint = `${ENV.API_URL || "http://localhost:3002"}/api/generate/video`;
             const resp = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prompt: prompt || selectedTemplate?.prompt || "cinematic video",
                  model_id: model,
                  duration: duration.replace("s", "") || "5",
                  aspect_ratio: aspectRatio || "16:9",
                  audio: audioOn,
                  unlimited: false,
                  start_image_url: mode === 'video' && inputImage ? inputImage : undefined
                }),
              });
              if (!resp.ok) throw new Error("Video generation failed");
              const data = await resp.json();
              addToHistory({
                  id: crypto.randomUUID(),
                  url: data.video_url || data.url,
                  previewUrl: data.video_url || data.url,
                  type: 'video',
                  timestamp: Date.now(),
                  prompt,
                  model,
                  duration,
                  ratio: aspectRatio
              });
              toast.success("Video ready!");
        }
    } catch (e) {
        console.error(e);
        toast.error("Generation failed");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSaveTemplate = (payload: any) => {
    saveTemplate({ id: crypto.randomUUID(), ...payload });
    toast.success("Template saved");
    setShowSaveTemplate(false);
  };

  if (!user) return null;

  return (
    <div className="h-[calc(100vh-64px)] flex bg-black text-white overflow-hidden font-sans">
      
      {/* --- LEFT SIDEBAR (CONTROLS) --- */}
      <div className="w-[380px] bg-black flex flex-col shrink-0 z-20 h-full p-4 border-r border-white/5">
        <div className="bg-zinc-900/50 rounded-xl border border-white/5 flex flex-col h-full overflow-hidden shadow-2xl relative">
            
            <ScrollArea className="flex-1">
                <div className="p-5 space-y-8">
                    
                    {/* Mode Selector */}
                    <div className="bg-black/40 p-1 rounded-lg flex">
                        {['image', 'video'].map((m) => (
                            <button
                                key={m}
                                onClick={() => {
                                    setMode(m as Mode);
                                    // Clear template selection if type mismatch
                                    if (selectedTemplate?.type !== m) {
                                        setSelectedTemplate(null);
                                    }
                                }}
                                className={cn(
                                    "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all",
                                    mode === m ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                Create {m}
                            </button>
                        ))}
                    </div>

                    {/* Template / Style Card */}
                    <div className="space-y-3">
                         <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Current Style</Label>
                            <Button 
                                variant="link" 
                                className="h-auto p-0 text-xs text-indigo-400 hover:text-indigo-300"
                                onClick={() => setViewState(viewState === "templates" ? "create" : "templates")}
                            >
                                {viewState === "templates" ? "Back to Create" : "Browse Library"}
                            </Button>
                        </div>
                        
                        <div className="relative group rounded-xl overflow-hidden aspect-[16/9] border border-white/10 bg-zinc-900 shadow-lg">
                            {/* Background Image of Template */}
                            <div className="absolute inset-0">
                                {selectedTemplate && getTemplateImage(selectedTemplate) ? (
                                    <img src={getTemplateImage(selectedTemplate)} className="w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-40" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                            </div>

                            <div className="absolute inset-0 p-4 flex flex-col justify-end">
                                <h3 className="text-lg font-bold text-white leading-tight mb-1">
                                    {selectedTemplate?.name || "General Style"}
                                </h3>
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="bg-white/10 border-white/10 text-zinc-300 text-[10px] backdrop-blur-md">
                                        {model}
                                    </Badge>
                                    <Button 
                                        size="sm" 
                                        className="h-7 text-xs bg-yellow-400 hover:bg-yellow-500 text-black font-bold border-0 shadow-lg"
                                        onClick={() => setViewState("templates")}
                                    >
                                        <Pencil className="w-3 h-3 mr-1.5" /> Change
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Input Media */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Source Input</Label>
                            {inputImage && (
                                <button onClick={() => setInputImage(null)} className="text-[10px] text-zinc-500 hover:text-white transition-colors">
                                    Clear
                                </button>
                            )}
                        </div>
                        
                        {inputImage ? (
                            <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group bg-black/50">
                                <img 
                                    src={inputImage} 
                                    className="w-full h-full object-contain" 
                                    key={inputImage.slice(0, 50)} // Stable key to prevent unnecessary re-renders
                                />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                                    <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => setShowCameraModal(true)}>
                                        <Camera className="w-3 h-3 mr-2" /> Retake
                                    </Button>
                                    <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => document.getElementById('file-upload')?.click()}>
                                        <Upload className="w-3 h-3 mr-2" /> Upload
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                    className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:border-white/20 transition-all aspect-square bg-zinc-900/30 group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Upload className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                                    </div>
                                    <span className="text-xs text-zinc-400 font-medium">Upload</span>
                                    <input id="file-upload" type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                                </button>
                                <button 
                                    onClick={() => setShowCameraModal(true)}
                                    className="border border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:border-white/20 transition-all aspect-square bg-zinc-900/30 group"
                                >
                                     <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Camera className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                                    </div>
                                    <span className="text-xs text-zinc-400 font-medium">Camera</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Prompt */}
                    <div className="space-y-3">
                         <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Prompt</Label>
                        <Textarea 
                            placeholder="Describe your vision..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="bg-black/20 border-white/10 text-sm min-h-[100px] resize-none focus:ring-1 focus:ring-indigo-500/50 text-zinc-200 placeholder:text-zinc-600 rounded-xl"
                        />
                    </div>

                    {/* Advanced Settings */}
                    <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase">Ratio</Label>
                                <select 
                                    value={aspectRatio}
                                    onChange={(e) => setAspectRatio(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg text-xs h-9 px-2 text-zinc-300 focus:outline-none"
                                >
                                    <option value="9:16">9:16 (Story)</option>
                                    <option value="16:9">16:9 (Landscape)</option>
                                    <option value="1:1">1:1 (Square)</option>
                                </select>
                             </div>
                             <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase">Model</Label>
                                <select 
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg text-xs h-9 px-2 text-zinc-300 focus:outline-none"
                                >
                                    {mode === "image" ? (
                                        <>
                                            {IMAGE_MODELS.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            {VIDEO_MODELS.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </>
                                    )}
                                </select>
                             </div>
                        </div>
                        
                        {/* Video-specific settings */}
                        {mode === "video" && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Duration</Label>
                                    <select 
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg text-xs h-9 px-2 text-zinc-300 focus:outline-none"
                                    >
                                        <option value="5s">5 seconds</option>
                                        <option value="10s">10 seconds</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Audio</Label>
                                    <div className="flex items-center h-9">
                                        <Switch 
                                            checked={audioOn}
                                            onCheckedChange={setAudioOn}
                                            className="data-[state=checked]:bg-indigo-500"
                                        />
                                        <span className="ml-2 text-xs text-zinc-400">{audioOn ? "On" : "Off"}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>

            {/* Sticky Generate Button */}
            <div className="p-4 bg-zinc-900/80 backdrop-blur-xl">
                <Button 
                    className="w-full h-12 text-sm font-bold bg-[#D1F349] hover:bg-[#c2e440] text-black shadow-lg shadow-yellow-900/10 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl"
                    onClick={handleGenerate}
                    disabled={isProcessing}
                >
                     <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> 
                        {isProcessing ? "Generating..." : `Generate ${mode === 'video' ? 'Video' : 'Image'}`}
                    </span>
                </Button>
            </div>

            {/* isProcessing && <AIProcessingOverlay status={statusMessage} /> */}
        </div>
      </div>

      {/* --- RIGHT AREA (DYNAMIC VIEW) --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-black relative">
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-8 bg-black z-20 sticky top-0">
            {viewState === "create" ? (
                <>
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-white tracking-tight">Timeline</h2>
                        <div className="h-4 w-px bg-white/10" />
                        <div className="flex gap-1">
                             <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-white"><LayoutGrid className="w-4 h-4" /></Button>
                             <Button variant="ghost" size="icon" className="w-8 h-8 text-white bg-white/5"><ListIcon className="w-4 h-4" /></Button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                         <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-white/10 bg-transparent text-zinc-300 hover:text-white hover:bg-white/5"
                            onClick={() => navigate("/creator/booth")}
                        >
                            <Store className="w-4 h-4 mr-2" /> My Booth
                        </Button>
                    </div>
                </>
            ) : (
                <>
                     <div className="flex items-center gap-4 w-full">
                        <Button variant="ghost" size="icon" onClick={() => setViewState("create")}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <Input 
                                placeholder="Search styles..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-zinc-900 border-white/10 rounded-full text-sm h-10 focus-visible:ring-indigo-500"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar mask-linear-fade">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap",
                                        activeCategory === cat 
                                            ? "bg-white text-black border-white" 
                                            : "bg-transparent text-zinc-400 border-white/10 hover:border-white/30 hover:text-white"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 bg-black">
            {viewState === "create" ? (
                // --- HISTORY FEED GRID ---
                <div className="p-8">
                     {history.length === 0 && !isProcessing ? (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-600">
                             <div className="w-24 h-24 rounded-full bg-zinc-900/50 flex items-center justify-center mb-6 border border-white/5">
                                <Sparkles className="w-10 h-10 opacity-20" />
                            </div>
                            <h3 className="text-xl font-bold text-zinc-300 mb-2">Start Creating</h3>
                            <p className="text-zinc-500 max-w-sm text-center">
                                Select a style from the left and upload an image to generate your first masterpiece.
                            </p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {isProcessing && <ProcessingCard status={statusMessage} />}
            {history.map((item) => (
                                <div key={item.id} className="group relative break-inside-avoid rounded-xl overflow-hidden bg-zinc-900 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1">
                                    {/* Media */}
                                    <div className="aspect-[3/4] bg-zinc-800 relative">
                                        {item.type === 'image' ? (
                                            <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                                        ) : (
                                            <video src={item.url} className="w-full h-full object-cover" loop muted onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                                        )}
                                        
                                        {/* Overlay Info (Hover) */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                            <div className="space-y-2">
                                                 <div className="flex items-center gap-2">
                                                    <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-0 text-[10px] h-5">
                                                        {item.model}
                                                    </Badge>
                                                    <Badge className="bg-white/20 hover:bg-white/30 backdrop-blur-md border-0 text-[10px] h-5">
                                                        {item.ratio}
                                                    </Badge>
                                                 </div>
                                                 <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                                                    {item.prompt}
                                                 </p>
                                                 <div className="pt-2 flex gap-2">
                                                     <Button size="sm" className="h-8 flex-1 bg-white text-black hover:bg-zinc-200 text-xs font-bold">Download</Button>
                                                     <Button size="icon" className="h-8 w-8 bg-white/10 hover:bg-white/20"><MoreHorizontal className="w-4 h-4" /></Button>
                                                 </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            ) : (
                // --- TEMPLATES BROWSER ---
                <div className="p-8">
                    {/* Tabs for Library vs Marketplace */}
                    <Tabs value={templateTab} onValueChange={(v) => setTemplateTab(v as "library" | "marketplace")} className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <TabsList className="bg-zinc-900 border border-white/10">
                                <TabsTrigger value="marketplace" className="data-[state=active]:bg-white data-[state=active]:text-black">
                                    <Globe className="w-4 h-4 mr-2" /> Marketplace
                                </TabsTrigger>
                                <TabsTrigger value="library" className="data-[state=active]:bg-white data-[state=active]:text-black">
                                    <Library className="w-4 h-4 mr-2" /> My Library
                                </TabsTrigger>
                            </TabsList>
                            
                            {loadingTemplates && (
                                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                                </div>
                            )}
                        </div>

                        <TabsContent value="marketplace" className="mt-0">
                            {filteredMarketplaceTemplates.length === 0 && !loadingTemplates ? (
                                <div className="text-center py-12 text-zinc-500">
                                    <Globe className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                    <p>No templates found in marketplace</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {filteredMarketplaceTemplates.map((tpl) => (
                                        <div 
                                            key={tpl.id} 
                                            onClick={() => applyTemplate(tpl)}
                                            className="group cursor-pointer relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-[#D1F349] transition-all"
                                        >
                                            <div className="absolute inset-0">
                                                {getTemplateImage(tpl) ? (
                                                    <img src={getTemplateImage(tpl)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                        <Sparkles className="w-8 h-8 text-zinc-600" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80" />
                                            </div>
                                            
                                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                                                <h3 className="text-white font-bold text-sm truncate">{tpl.name}</h3>
                                                <p className="text-[10px] text-zinc-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {tpl.ai_model || "nano-banana"} • {tpl.category || "General"}
                                                </p>
                                            </div>

                                            {selectedTemplate?.id === tpl.id && (
                                                <div className="absolute top-3 right-3 bg-[#D1F349] text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                                                    Selected
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="library" className="mt-0">
                            {filteredLibraryTemplates.length === 0 && !loadingTemplates ? (
                                <div className="text-center py-12 text-zinc-500">
                                    <Library className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                    <p>No templates in your library yet</p>
                                    <p className="text-xs mt-2">Add templates from the Marketplace tab</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    {filteredLibraryTemplates.map((tpl) => (
                                        <div 
                                            key={tpl.id} 
                                            onClick={() => applyTemplate(tpl)}
                                            className="group cursor-pointer relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-[#D1F349] transition-all"
                                        >
                                            <div className="absolute inset-0">
                                                {getTemplateImage(tpl) ? (
                                                    <img src={getTemplateImage(tpl)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                ) : (
                                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                        <Sparkles className="w-8 h-8 text-zinc-600" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80" />
                                            </div>
                                            
                                            <div className="absolute inset-x-0 bottom-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                                                <h3 className="text-white font-bold text-sm truncate">{tpl.name}</h3>
                                                <p className="text-[10px] text-zinc-400 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {tpl.ai_model || "nano-banana"}
                                                </p>
                                            </div>

                                            {selectedTemplate?.id === tpl.id && (
                                                <div className="absolute top-3 right-3 bg-[#D1F349] text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                                                    Selected
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </ScrollArea>
      </div>

      {/* --- MODALS --- */}
      <Dialog open={showCameraModal} onOpenChange={setShowCameraModal}>
          <DialogContent className="bg-black border-white/10 max-w-4xl p-0 overflow-hidden w-full h-[80vh]">
              <DialogTitle className="sr-only">Camera Capture</DialogTitle>
              <div className="h-full w-full relative">
                  <CameraCapture 
                      onCapture={(img) => {
                          setInputImage(img);
                          setShowCameraModal(false);
                      }}
                      onBack={() => setShowCameraModal(false)}
                      selectedBackground="Studio Capture"
                  />
              </div>
          </DialogContent>
      </Dialog>

      <SaveTemplateModal
        open={showSaveTemplate}
        onClose={() => setShowSaveTemplate(false)}
        defaults={{
          prompt,
          model,
          aspectRatio,
          duration: mode === "video" ? duration : undefined,
          type: mode,
        }}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}
