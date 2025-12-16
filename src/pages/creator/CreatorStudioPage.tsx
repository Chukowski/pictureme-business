import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import BoothDashboard from "./BoothDashboard";
import {
    LayoutTemplate,
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
    Globe,
    Plus,
    Zap,
    Image as ImageIcon,
    ChevronRight,
    Settings,
    Wand2,
    Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getCurrentUser } from "@/services/eventsApi";

import { processImageWithAI, AspectRatio, AI_MODELS, resolveModelId } from "@/services/aiProcessor";
import { ENV } from "@/config/env";
import { SaveTemplateModal } from "@/components/templates/SaveTemplateModal";
import { useMyTemplates, UserTemplate } from "@/hooks/useMyTemplates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CreatorStudioSidebar, SidebarMode } from "@/components/creator/CreatorStudioSidebar";
import { TemplateLibrary, MarketplaceTemplate } from "@/components/creator/TemplateLibrary";

type MainView = "create" | "templates" | "booths" | "gallery";

// --- Categories for browsing ---
const CATEGORIES = ["All", "Fantasy", "Portrait", "Cinematic", "Product", "UGC"];

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
    isPublic?: boolean;
    status?: 'completed' | 'processing' | 'failed'; // For showing pending generations
    jobId?: number; // Pending generation job ID
}

// --- Local Models Definition to avoid import circular dependency issues ---
const LOCAL_IMAGE_MODELS = [
    { id: "fal-ai/nano-banana/edit", shortId: "nano-banana", name: "Nano Banana (Fast)", type: "image", speed: "fast" },
    { id: "fal-ai/nano-banana-pro/edit", shortId: "nano-banana-pro", name: "Nano Banana Pro", type: "image", speed: "medium" },
    { id: "fal-ai/bytedance/seedream/v4/edit", shortId: "seedream-v4", name: "Seedream v4", type: "image", speed: "medium" },
    { id: "fal-ai/bytedance/seedream/v4.5/edit", shortId: "seedream-v4.5", name: "Seedream 4.5", type: "image", speed: "medium" },
    { id: "fal-ai/flux-2-pro/edit", shortId: "flux-2-pro", name: "Flux 2 Pro Edit", type: "image", speed: "medium" },
    { id: "fal-ai/flux-realism", shortId: "flux-realism", name: "Flux Realism", type: "image", speed: "slow" },
];

const LOCAL_VIDEO_MODELS = [
    { id: "fal-ai/kling-video/v2.6/pro/image-to-video", shortId: "kling-2.6-pro", name: "Kling 2.6 Pro", type: "video" },
    { id: "fal-ai/kling-video/o1/video-to-video/edit", shortId: "kling-o1-edit", name: "Kling O1 Edit", type: "video" },
    { id: "fal-ai/google/veo-3-1/image-to-video", shortId: "veo-3.1", name: "Google Veo 3.1", type: "video" },
    { id: "fal-ai/wan/v2.2-a14b/image-to-video", shortId: "wan-v2", name: "Wan v2", type: "video" },
];

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center text-white bg-red-900/20 rounded-xl border border-red-500/30 m-4">
                    <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-red-200 mb-4">{this.state.error?.message}</p>
                    <Button onClick={() => window.location.reload()} variant="secondary">Reload Page</Button>
                </div>
            );
        }
        return this.props.children;
    }
}

const AppRail = ({ activeView, onViewChange }: { activeView: MainView, onViewChange: (v: MainView) => void }) => {
    const navigate = useNavigate();
    return (
        <div className="w-[72px] flex flex-col items-center py-6 bg-[#0A0A0A] border-r border-white/5 z-30 flex-shrink-0">
            <div className="flex-1 flex flex-col gap-6 w-full">
                <button
                    onClick={() => onViewChange("create")}
                    className={cn(
                        "w-full flex flex-col items-center gap-1 py-2 relative group",
                        activeView === "create" ? "text-[#D1F349]" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        activeView === "create" ? "bg-white/10" : "group-hover:bg-white/5"
                    )}>
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Create</span>
                    {activeView === "create" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#D1F349] rounded-r-full" />}
                </button>

                <button
                    onClick={() => onViewChange("templates")}
                    className={cn(
                        "w-full flex flex-col items-center gap-1 py-2 relative group",
                        activeView === "templates" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        activeView === "templates" ? "bg-white/10" : "group-hover:bg-white/5"
                    )}>
                        <LayoutTemplate className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Templates</span>
                    {activeView === "templates" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
                </button>

                <button
                    onClick={() => onViewChange("booths")}
                    className={cn(
                        "w-full flex flex-col items-center gap-1 py-2 relative group",
                        activeView === "booths" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        activeView === "booths" ? "bg-white/10" : "group-hover:bg-white/5"
                    )}>
                        <Store className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Booths</span>
                    {activeView === "booths" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
                </button>

                <button
                    onClick={() => onViewChange("gallery")}
                    className={cn(
                        "w-full flex flex-col items-center gap-1 py-2 relative group",
                        activeView === "gallery" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                    )}
                >
                    <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        activeView === "gallery" ? "bg-white/10" : "group-hover:bg-white/5"
                    )}>
                        <Library className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-medium">Gallery</span>
                    {activeView === "gallery" && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />}
                </button>
            </div>

            <div className="flex flex-col gap-6 w-full">
                <button
                    onClick={() => navigate('/creator/settings')}
                    className="w-full flex flex-col items-center gap-1 py-2 text-zinc-500 hover:text-white transition-colors"
                >
                    <Settings className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

const TemplatesView = () => (
    <div className="flex-1 bg-black p-8 overflow-y-auto w-full">
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">My Templates</h2>
                    <p className="text-zinc-400">Manage your trained models and styles</p>
                </div>
                <Button className="bg-white text-black hover:bg-zinc-200">
                    <Plus className="w-4 h-4 mr-2" /> Train New Model
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Placeholder Card */}
                <div className="group relative aspect-[3/4] bg-zinc-900 rounded-xl border border-white/10 overflow-hidden hover:border-[#D1F349] transition-all">
                    <div className="absolute inset-0 bg-zinc-800 flex flex-col items-center justify-center text-zinc-500 gap-2">
                        <Store className="w-8 h-8 opacity-20" />
                        <span className="text-xs">No custom models yet</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

function CreatorStudioPageContent() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const { templates: myTemplates, saveTemplate } = useMyTemplates();

    // View State
    const [activeView, setActiveView] = useState<MainView>("create");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");

    // Create Mode State
    const [mode, setMode] = useState<SidebarMode>("image");
    const [prompt, setPrompt] = useState("");
    const [model, setModel] = useState("nano-banana");
    const [aspectRatio, setAspectRatio] = useState("9:16");
    const [duration, setDuration] = useState("5s");
    const [audioOn, setAudioOn] = useState(false);

    // Templates
    const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
    const [templateTab, setTemplateTab] = useState<"library" | "marketplace">("marketplace");
    const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

    // Templates Data State (Moved logic back here or ensure it's loaded if we pass it down)
    const [marketplaceTemplates, setMarketplaceTemplates] = useState<MarketplaceTemplate[]>([]);
    const [myLibraryTemplates, setMyLibraryTemplates] = useState<MarketplaceTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    // Input Media
    const [inputImage, setInputImage] = useState<string | null>(null);
    const [endFrameImage, setEndFrameImage] = useState<string | null>(null);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [activeInputType, setActiveInputType] = useState<"main" | "end" | "ref">("main");

    // Processing
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Preparing...");

    // History
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);

    // Load templates logic (Moved back as we need data for the Library component which is now in page)
    useEffect(() => {
        if (showTemplateLibrary && marketplaceTemplates.length === 0) {
            const fetchT = async () => {
                setLoadingTemplates(true);
                try {
                    const token = localStorage.getItem("auth_token");
                    const headers: HeadersInit = { "Content-Type": "application/json" };
                    if (token) headers.Authorization = `Bearer ${token}`;

                    const [mRes, lRes] = await Promise.all([
                        fetch(`${ENV.API_URL}/api/marketplace/templates?is_public=true`, { headers }),
                        token ? fetch(`${ENV.API_URL}/api/marketplace/my-library`, { headers }) : Promise.resolve(null)
                    ]);
                    if (mRes.ok) setMarketplaceTemplates(await mRes.json());
                    if (lRes?.ok) setMyLibraryTemplates(await lRes.json());
                } catch (e) { console.error(e); } finally { setLoadingTemplates(false); }
            };
            fetchT();
        }
    }, [showTemplateLibrary]);



    // Load history logic
    useEffect(() => {
        if (!user) { navigate("/admin/auth"); return; }
        const loadHistory = async () => {
            const token = localStorage.getItem("auth_token");
            if (!token) return;
            try {
                const completedRes = await fetch(`${ENV.API_URL}/api/creations`, { headers: { "Authorization": `Bearer ${token}` } });
                let allItems: HistoryItem[] = [];

                if (completedRes.ok) {
                    const data = await completedRes.json();
                    if (data.creations && Array.isArray(data.creations)) {
                        allItems = data.creations.map((c: any) => ({
                            id: c.id.toString(), url: c.url, previewUrl: c.thumbnail_url || c.url, type: c.type || 'image',
                            timestamp: new Date(c.created_at).getTime(), prompt: c.prompt, model: c.model_id || c.model,
                            ratio: c.aspect_ratio, isPublic: c.is_published || c.visibility === 'public', status: 'completed'
                        }));
                    }
                }

                const pendingRes = await fetch(`${ENV.API_URL}/api/generate/pending`, { headers: { "Authorization": `Bearer ${token}` } });
                if (pendingRes.ok) {
                    const pData = await pendingRes.json();
                    if (pData.pending && Array.isArray(pData.pending)) {
                        const pendingItems = pData.pending.map((p: any) => ({
                            id: `pending-${p.id}`, url: '', previewUrl: '', type: p.type || 'image',
                            timestamp: new Date(p.created_at).getTime(), prompt: p.prompt, model: p.model_id,
                            ratio: p.aspect_ratio, status: p.status, jobId: p.id
                        }));
                        allItems = [...pendingItems, ...allItems];
                        // Implement polling logic if needed, skipping for brevity in this refactor
                    }
                }
                setHistory(allItems);
            } catch (e) { console.error(e); }
        };
        loadHistory();
    }, [user, navigate]);

    // Handlers
    const handleDeleteHistory = async (id: string) => {
        const itemToDelete = history.find(i => i.id === id);
        setHistory(prev => prev.filter(i => i.id !== id));
        if (previewItem?.id === id) setPreviewItem(null);
        if (!isNaN(Number(id))) {
            try {
                const token = localStorage.getItem("auth_token");
                if (token) {
                    const res = await fetch(`${ENV.API_URL}/api/creations/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } });
                    if (!res.ok) throw new Error("Failed");
                }
                toast.success("Deleted");
            } catch (e) {
                setHistory(prev => itemToDelete ? [itemToDelete, ...prev] : prev);
                toast.error("Failed to delete");
            }
        }
    };

    const handleReusePrompt = (item: HistoryItem) => {
        setPrompt(item.prompt || "");
        if (item.model) setModel(item.model);
        if (item.ratio) setAspectRatio(item.ratio);
        setMode(item.type);
        setActiveView("create");
    };

    const handleUseAsTemplate = (item: HistoryItem) => {
        if (item.type === "video") return toast.error("Images only");
        setSelectedTemplate({
            id: `history-${item.id}`, name: "From history", prompt: item.prompt, images: [item.url],
            ai_model: item.model, aspectRatio: item.ratio, type: "image"
        });
        handleReusePrompt(item);
    };

    const handleDownload = async (item: HistoryItem) => {
        const link = document.createElement("a");
        link.href = item.url;
        link.download = `creation-${item.id}.${item.type === 'video' ? 'mp4' : 'png'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleTogglePublic = async (item: HistoryItem) => {
        const newVisibility = !item.isPublic;
        setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPublic: newVisibility } : h));
        try {
            const token = localStorage.getItem("auth_token");
            if (!token) return;
            await fetch(`${ENV.API_URL}/api/creations/${item.id}/visibility`, {
                method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ visibility: newVisibility ? 'public' : 'private' })
            });
            toast.success(newVisibility ? "Published" : "Private");
        } catch (e) {
            setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPublic: !newVisibility } : h));
        }
    };

    const addToHistory = async (item: HistoryItem) => {
        setHistory(prev => [item, ...prev]); // optimistic
        try {
            const token = localStorage.getItem("auth_token");
            if (!token) return;
            const res = await fetch(`${ENV.API_URL}/api/creations`, {
                method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({
                    image_url: item.url, thumbnail_url: item.previewUrl || item.url, prompt: item.prompt || "",
                    model_id: item.model || "", aspect_ratio: item.ratio || "1:1", type: item.type
                })
            });
            if (res.ok) {
                const saved = await res.json();
                const realId = saved.id.toString();
                setHistory(prev => prev.map(h => h.id === item.id ? { ...h, id: realId } : h));
            }
        } catch (e) { console.error(e); }
    };

    const handleGenerate = async () => {
        if (mode === "booth") {
            toast.info("Booth generation is handled in the Booth Dashboard.");
            return;
        }
        if (mode === "image" && !inputImage) return toast.error("Upload image first");
        if (mode === "video" && !inputImage && !prompt) return toast.error("Provide a start frame or prompt"); // Relaxed for video

        setIsProcessing(true);
        setStatusMessage("Thinking...");
        try {
            if (mode === "image") {
                const templateBgs = selectedTemplate?.images || selectedTemplate?.backgrounds || [];
                const result = await processImageWithAI({
                    userPhotoBase64: inputImage!, backgroundPrompt: prompt || selectedTemplate?.prompt || "portrait",
                    backgroundImageUrls: [...referenceImages, ...templateBgs], aspectRatio: aspectRatio as AspectRatio,
                    aiModel: model, onProgress: setStatusMessage
                });
                addToHistory({ id: crypto.randomUUID(), url: result.url, type: 'image', timestamp: Date.now(), prompt, model, ratio: aspectRatio, status: 'completed' });
            } else if (mode === "video") {
                const endpoint = `${ENV.API_URL || "http://localhost:3002"}/api/generate/video`;
                const resp = await fetch(endpoint, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt,
                        model_id: model,
                        duration: duration.replace("s", ""),
                        aspect_ratio: aspectRatio,
                        audio: audioOn,
                        start_image_url: inputImage,
                        end_image_url: endFrameImage
                    })
                });
                if (!resp.ok) throw new Error("Failed");
                const data = await resp.json();
                addToHistory({ id: crypto.randomUUID(), url: data.url, type: 'video', timestamp: Date.now(), prompt, model, ratio: aspectRatio, status: 'completed' });
            }
            toast.success("Created!");
        } catch (e) { toast.error("Failed"); } finally { setIsProcessing(false); }
    };

    // File upload ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const triggerFileUpload = (type: any) => { setActiveInputType(type); fileInputRef.current?.click(); };
    const handleFileUpload = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const res = ev.target?.result as string;
            if (activeInputType === 'main') setInputImage(res);
            else if (activeInputType === 'end') setEndFrameImage(res);
            else if (activeInputType === 'ref') setReferenceImages(prev => [...prev, res]);
        };
        reader.readAsDataURL(file);
    };

    const applyTemplate = (tpl: MarketplaceTemplate) => {
        setSelectedTemplate(tpl);
        setPrompt(tpl.prompt || "");
        if (tpl.ai_model) setModel(tpl.ai_model);
        if (tpl.aspectRatio) setAspectRatio(tpl.aspectRatio);
        setShowTemplateLibrary(false);
        toast.success(`Applied style: ${tpl.name}`);
    };

    if (!user) return null;

    return (
        <div className="h-[calc(100vh-64px)] flex bg-black text-white overflow-hidden font-sans">

            {/* --- COLUMN 1: APP RAIL --- */}
            <AppRail activeView={activeView} onViewChange={setActiveView} />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex min-w-0">
                {activeView === "templates" ? (
                    <TemplatesView />
                ) : activeView === "booths" ? (
                    <div className="flex-1 bg-black overflow-y-auto w-full"><BoothDashboard /></div>
                ) : activeView === "gallery" ? (
                    <div className="flex-1 bg-black p-8 overflow-y-auto">
                        <div className="max-w-7xl mx-auto">
                            <h2 className="text-2xl font-bold text-white mb-6">Gallery</h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {history.map(item => (
                                    <div key={item.id} onClick={() => setPreviewItem(item)} className="cursor-pointer aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden relative group">
                                        {item.type === 'image' ? <img src={item.url} className="w-full h-full object-cover" /> : <video src={item.url} className="w-full h-full object-cover" />}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Sparkles className="text-white" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* --- CREATE VIEW (Existing Layout) --- */
                    <>
                        {/* COLUMN 2: CONTROL PANEL (Refactored) */}
                        <CreatorStudioSidebar
                            mode={mode}
                            setMode={setMode}
                            prompt={prompt}
                            setPrompt={setPrompt}
                            model={model}
                            setModel={setModel}
                            aspectRatio={aspectRatio}
                            setAspectRatio={setAspectRatio}
                            duration={duration}
                            setDuration={setDuration}
                            isProcessing={isProcessing}
                            onGenerate={handleGenerate}
                            inputImage={inputImage}
                            endFrameImage={endFrameImage}
                            onUploadClick={triggerFileUpload}
                            selectedTemplate={selectedTemplate}
                            onSelectTemplate={applyTemplate}
                            onToggleTemplateLibrary={() => setShowTemplateLibrary(prev => !prev)}
                        />

                        {/* COLUMN 3: CANVAS / TIMELINE or TEMPLATE LIBRARY */}
                        <div className="flex-1 bg-black flex flex-col relative w-full">
                            {showTemplateLibrary ? (
                                <TemplateLibrary
                                    onSelect={applyTemplate}
                                    onClose={() => setShowTemplateLibrary(false)}
                                    marketplaceTemplates={marketplaceTemplates}
                                    myLibraryTemplates={myLibraryTemplates}
                                    selectedTemplateId={selectedTemplate?.id}
                                />
                            ) : (
                                <>
                                    {/* Canvas Header */}
                                    <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black z-10 sticky top-0">
                                        <h3 className="font-bold text-white">Timeline</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-zinc-500">{history.length} items</span>
                                        </div>
                                    </div>

                                    {/* Canvas Content */}
                                    <ScrollArea className="flex-1 bg-black">
                                        <div className="p-6">
                                            {history.length === 0 && !isProcessing ? (
                                                <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-600">
                                                    <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                                                    <p>Create your first masterpiece</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
                                                    {/* Processing Card */}
                                                    {isProcessing && (
                                                        <div className="aspect-[3/4] bg-zinc-900 rounded-xl border border-indigo-500/30 flex flex-col items-center justify-center animate-pulse shadow-lg shadow-indigo-500/10">
                                                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-2" />
                                                            <span className="text-xs text-indigo-300 font-medium">{statusMessage}</span>
                                                        </div>
                                                    )}

                                                    {history.map(item => (
                                                        <div key={item.id} onClick={() => item.status === 'completed' && setPreviewItem(item)} className="group relative aspect-[3/4] bg-zinc-900 rounded-xl overflow-hidden cursor-pointer hover:ring-2 ring-[#D1F349]/50 transition-all shadow-lg">

                                                            {item.status === 'completed' ? (
                                                                item.type === 'image' ? <img src={item.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <video src={item.url} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-500 gap-2">
                                                                    <Loader2 className="animate-spin w-6 h-6" />
                                                                    <span className="text-[10px]">{item.status}</span>
                                                                </div>
                                                            )}
                                                            {item.status === 'completed' && (
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                                    <p className="text-[10px] text-white line-clamp-2 font-medium">{item.prompt}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </>
                            )}
                        </div>
                    </>
                )
                }
            </div >

            {/* Hidden Input */}
            < input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*" />

            {/* Lightbox Modal */}
            < Dialog open={!!previewItem} onOpenChange={(o) => !o && setPreviewItem(null)}>
                <DialogContent className="max-w-6xl w-full h-[90vh] bg-black border-white/10 p-0 flex overflow-hidden !rounded-2xl">
                    <div className="flex-1 bg-zinc-950 flex items-center justify-center relative p-8">
                        {previewItem?.type === 'image' ?
                            <img src={previewItem.url} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" /> :
                            <video src={previewItem?.url} controls className="max-h-full max-w-full rounded-lg shadow-2xl" autoPlay loop />
                        }
                    </div>
                    <div className="w-80 bg-zinc-900 border-l border-white/10 p-6 flex flex-col gap-4 z-50 shadow-2xl">
                        <h3 className="font-bold text-white text-lg">Details</h3>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <p className="text-xs text-zinc-300 italic leading-relaxed">"{previewItem?.prompt}"</p>
                        </div>
                        <div className="space-y-2 text-sm text-zinc-400">
                            <div className="flex justify-between"><span>Model</span> <span className="text-white">{previewItem?.model || 'Unknown'}</span></div>
                            <div className="flex justify-between"><span>Ratio</span> <span className="text-white">{previewItem?.ratio || 'Custom'}</span></div>
                        </div>

                        <div className="flex items-center justify-between text-sm py-4 border-t border-white/5 mt-auto">
                            <span>Public Feed</span>
                            <Switch checked={previewItem?.isPublic || false} onCheckedChange={() => previewItem && handleTogglePublic(previewItem)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" className="text-xs bg-white text-black hover:bg-zinc-200 border-none" onClick={() => previewItem && handleDownload(previewItem)}>Download</Button>
                            <Button onClick={() => previewItem && handleDeleteHistory(previewItem.id)} variant="destructive" className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20 border">Delete</Button>
                        </div>
                        <Button variant="secondary" className="w-full text-xs" onClick={() => { if (previewItem) { handleUseAsTemplate(previewItem); setPreviewItem(null); } }}>Save as Style</Button>
                    </div>
                </DialogContent>
            </Dialog >

            <SaveTemplateModal
                open={showSaveTemplate}
                onClose={() => setShowSaveTemplate(false)}
                defaults={{ prompt: prompt, model: model, aspectRatio: aspectRatio, type: mode === 'booth' ? 'image' : mode }}
                onSave={(p) => { saveTemplate({ id: crypto.randomUUID(), ...p }); setShowSaveTemplate(false); }}
            />
        </div >
    );
}

export default function CreatorStudioPage() {
    return (
        <ErrorBoundary>
            <CreatorStudioPageContent />
        </ErrorBoundary>
    );
}
