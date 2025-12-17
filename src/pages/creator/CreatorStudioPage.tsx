import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
    ChevronLeft,
    PanelLeftOpen,
    Settings,
    Wand2,
    Coins,
    Copy,
    RefreshCw,
    Save,
    Download,
    ChevronDown
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
import { getMarketplaceTemplates } from "@/services/marketplaceApi";

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
    template?: {
        id: string;
        name: string;
        image: string;
    };
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

// Helper for persisting template metadata (supports saving by ID or URL)
const saveTemplateMeta = (key: string, template: any) => {
    try {
        if (!template) return;
        localStorage.setItem(`template_meta_${key}`, JSON.stringify(template));
    } catch (e) { console.error(e); }
};

const getTemplateMeta = (keys: string[]) => {
    try {
        for (const key of keys) {
            const data = localStorage.getItem(`template_meta_${key}`);
            if (data) return JSON.parse(data);
        }
    } catch (e) { return undefined; }
};

const AppRail = ({ activeView, onViewChange, onToggle }: { activeView: MainView, onViewChange: (v: MainView) => void, onToggle: () => void }) => {
    const navigate = useNavigate();
    return (
        <div className="w-[60px] flex flex-col items-center py-4 z-30 flex-shrink-0 ml-3 my-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl h-[calc(100vh-7rem)] sticky top-3 transition-all duration-300">
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="mb-4 p-2 text-zinc-500 hover:text-white transition-colors"
                title="Collapse Menu"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>

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
    const location = useLocation();
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

    // Handle remix state from feed navigation
    useEffect(() => {
        const remixState = location.state as {
            prompt?: string;
            templateId?: string;
            templateUrl?: string;
            sourceImageUrl?: string;
            remixFrom?: string;
        } | null;

        if (remixState) {
            // Pre-fill prompt if provided
            if (remixState.prompt) {
                setPrompt(remixState.prompt);
            }
            // Set source image if provided (for style reference)
            if (remixState.sourceImageUrl) {
                setInputImage(remixState.sourceImageUrl);
            }
            // Clear the state after consuming it to prevent re-triggering
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // Templates
    const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
    const [templateTab, setTemplateTab] = useState<"library" | "marketplace">("marketplace");
    const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

    // Templates Data State
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
    const [showRail, setShowRail] = useState(true);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);

    const formatModelName = (modelId: string) => {
        const allModels = [...LOCAL_IMAGE_MODELS, ...LOCAL_VIDEO_MODELS];
        const found = allModels.find(m => m.id === modelId);
        if (found) return found.name;
        // Fallback cleanup
        if (modelId.includes('/')) {
            const parts = modelId.split('/');
            return parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return modelId;
    };

    // Load templates logic
    useEffect(() => {
        if (showTemplateLibrary && marketplaceTemplates.length === 0) {
            const fetchT = async () => {
                setLoadingTemplates(true);
                try {
                    // Use the service to get templates
                    const templates = await getMarketplaceTemplates({ limit: 50 });
                    // Ensure robust handling if the API returns something nested or different, though TS says it returns MediaTemplate[]
                    console.log("[CreatorStudioPage] Fetched templates:", templates);

                    // Transform if necessary (e.g. if images are in preview_images)
                    // The service response type should match MarketplaceTemplate, but let's be safe
                    const safeTemplates = templates.map((t: any) => ({
                        ...t,
                        // Ensure images array is populated from available sources in order of preference
                        images: t.images || t.preview_images || t.backgrounds || [],
                        // If preview_url is set, make sure it is the first image
                        preview_images: t.preview_url ? [t.preview_url, ...(t.preview_images || [])] : (t.preview_images || []),
                        type: t.type || t.template_type || 'image'
                    }));

                    setMarketplaceTemplates(safeTemplates);

                    // Also fetch my library if user is logged in
                    const token = localStorage.getItem("auth_token");
                    if (token) {
                        const lRes = await fetch(`${ENV.API_URL}/api/marketplace/my-library`, { headers: { Authorization: `Bearer ${token}` } });
                        if (lRes.ok) setMyLibraryTemplates(await lRes.json());
                    }
                } catch (e) { console.error("Error fetching templates:", e); } finally { setLoadingTemplates(false); }
            };
            fetchT();
        }
    }, [showTemplateLibrary]);



    // Load history logic
    useEffect(() => {
        if (!user?.id) {
            navigate("/admin/auth");
            return;
        }
        const loadHistory = async () => {
            const token = localStorage.getItem("auth_token");
            if (!token) return;
            try {
                const completedRes = await fetch(`${ENV.API_URL}/api/creations`, { headers: { "Authorization": `Bearer ${token}` } });
                let allItems: HistoryItem[] = [];

                if (completedRes.ok) {
                    const data = await completedRes.json();
                    if (data.creations && Array.isArray(data.creations)) {
                        allItems = data.creations.map((c: any) => {
                            const realId = c.id.toString();
                            return {
                                id: realId,
                                url: c.url,
                                previewUrl: c.thumbnail_url || c.url,
                                type: c.type || 'image',
                                timestamp: new Date(c.created_at).getTime(),
                                prompt: c.prompt,
                                model: c.model_id || c.model,
                                ratio: c.aspect_ratio,
                                isPublic: c.is_published || c.visibility === 'public',
                                status: 'completed',
                                template: getTemplateMeta([realId, c.url]) // Hydrate from ID or URL lookup
                            };
                        });
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
                    }
                }

                // Deduplicate by ID to prevent ghost items
                const uniqueMap = new Map();

                // First add all items, normalizing IDs
                allItems.forEach(item => {
                    const realId = item.id.toString().replace('pending-', '');

                    // If we already have a completed version (id without pending-), keep it
                    // If the current item is pending and we have a completed one, skip
                    if (item.id.toString().startsWith('pending-') && uniqueMap.has(realId)) {
                        return;
                    }

                    // If we have a pending version and now find a completed version, replace it
                    if (uniqueMap.has(realId)) {
                        const existing = uniqueMap.get(realId);
                        if (existing.id.toString().startsWith('pending-')) {
                            // Replace pending with real
                            uniqueMap.set(realId, item);
                        }
                        // If both are real (shouldn't happen with Map), overwrite is fine
                    } else {
                        // New item
                        uniqueMap.set(realId, item);
                    }
                });

                setHistory(Array.from(uniqueMap.values()));
            } catch (e) { console.error(e); }
        };
        loadHistory();
    }, [user?.id, navigate]);

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

        // Restore template if available
        if (item.template) {
            // Check if we can find the full template in our current list
            const found = marketplaceTemplates.find(t => t.id === item.template?.id) ||
                myLibraryTemplates.find(t => t.id === item.template?.id);

            if (found) {
                setSelectedTemplate(found);
            } else {
                // If not found (e.g. from older session), construct a minimal shell
                // This isn't perfect but allows the UI to show the selected template pill
                setSelectedTemplate({
                    id: item.template.id,
                    name: item.template.name,
                    // We don't have the original template images/backgrounds here unfortunately
                    // unless we persist them. For now, we restore the identity.
                    images: [item.template.image],
                    preview_images: [item.template.image],
                    type: 'image'
                } as MarketplaceTemplate);
            }
        } else {
            setSelectedTemplate(null);
        }

        setActiveView("create");
        toast.success("Prompt and settings restored");
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

        // Optimistic update for both list and preview
        setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPublic: newVisibility } : h));
        if (previewItem?.id === item.id) {
            setPreviewItem(prev => prev ? { ...prev, isPublic: newVisibility } : null);
        }

        try {
            const token = localStorage.getItem("auth_token");
            if (!token) return;
            await fetch(`${ENV.API_URL}/api/creations/${item.id}/visibility`, {
                method: "PUT", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ visibility: newVisibility ? 'public' : 'private' })
            });
            toast.success(newVisibility ? "Published" : "Private");
        } catch (e) {
            // Revert on failure
            setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPublic: !newVisibility } : h));
            if (previewItem?.id === item.id) {
                setPreviewItem(prev => prev ? { ...prev, isPublic: !newVisibility } : null);
            }
            toast.error("Failed to update visibility");
        }
    };

    const addToHistory = async (item: HistoryItem, skipBackendSave = false) => {
        setHistory(prev => [item, ...prev]); // optimistic

        // Always persist template meta by URL if available, as a fallback
        if (item.template && item.url) {
            saveTemplateMeta(item.url, item.template);
        }

        if (skipBackendSave) {
            return;
        }

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
                // Persist template metadata locally by ID
                if (item.template) {
                    saveTemplateMeta(realId, item.template);
                }
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

                const templateInfo = selectedTemplate ? {
                    id: selectedTemplate.id,
                    name: selectedTemplate.name,
                    image: selectedTemplate.preview_images?.[0] || selectedTemplate.images?.[0] || ""
                } : undefined;

                // CRITICAL: Save template metadata using the RAW FAL URL (if available) 
                // because that is what the backend auto-saves. This ensures hydration works on refresh.
                if (result.rawUrl && templateInfo) {
                    saveTemplateMeta(result.rawUrl, templateInfo);
                }

                addToHistory({
                    id: crypto.randomUUID(),
                    url: result.url,
                    type: 'image',
                    timestamp: Date.now(),
                    prompt,
                    model,
                    ratio: aspectRatio,
                    status: 'completed',
                    template: templateInfo
                }, true); // Skip backend save because the backend generation endpoint auto-saves
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
        <div className="h-[calc(100vh-64px)] flex bg-black text-white overflow-hidden font-sans relative">

            {/* --- COLUMN 1: APP RAIL --- */}
            {showRail ? (
                <AppRail activeView={activeView} onViewChange={setActiveView} onToggle={() => setShowRail(false)} />
            ) : (
                <div className="absolute left-3 top-3 z-50">
                    <button
                        onClick={() => setShowRail(true)}
                        className="p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-colors shadow-2xl"
                    >
                        <PanelLeftOpen className="w-5 h-5" />
                    </button>
                </div>
            )}

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
                        <div className="flex-1 bg-black flex flex-col relative w-full overflow-hidden">

                            {/* TEMPLATE LIBRARY OVERLAY (Sliding Card) */}
                            <div
                                className={cn(
                                    "absolute inset-4 z-20 bg-[#121212] rounded-2xl border border-white/10 shadow-2xl transition-all duration-500 ease-in-out flex flex-col overflow-hidden",
                                    showTemplateLibrary ? "translate-y-0 opacity-100" : "translate-y-[105%] opacity-0 pointer-events-none"
                                )}
                            >
                                <TemplateLibrary
                                    onSelect={applyTemplate}
                                    onClose={() => setShowTemplateLibrary(false)}
                                    marketplaceTemplates={marketplaceTemplates}
                                    myLibraryTemplates={myLibraryTemplates}
                                    selectedTemplateId={selectedTemplate?.id}
                                />
                            </div>

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
                    <div className="w-96 bg-[#09090b] border-l border-white/10 flex flex-col z-50 shadow-2xl">
                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-white text-xl">Details</h3>
                                {previewItem?.status === 'completed' && (
                                    <Badge className="bg-[#D1F349] text-black hover:bg-[#b0cc3d]">Completed</Badge>
                                )}
                            </div>

                            {/* Prompt Section */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm text-zinc-400">
                                    <span className="font-medium">Prompt</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(previewItem?.prompt || "");
                                            toast.success("Prompt copied!");
                                        }}
                                        className="text-white hover:text-[#D1F349] transition-colors p-1"
                                        title="Copy prompt"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <div
                                    className={cn(
                                        "bg-zinc-900/50 p-4 rounded-xl border border-white/5 text-sm text-zinc-300 italic leading-relaxed relative cursor-pointer hover:bg-zinc-900/80 transition-colors group",
                                        !isPromptExpanded && "line-clamp-3"
                                    )}
                                    onClick={() => setIsPromptExpanded(!isPromptExpanded)}
                                >
                                    "{previewItem?.prompt}"
                                    {!isPromptExpanded && (
                                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-zinc-900/90 to-transparent flex items-end justify-center pb-2">
                                            <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-white" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="space-y-4 bg-zinc-900/30 p-4 rounded-xl border border-white/5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-500">Model</span>
                                    <span className="text-white font-medium bg-zinc-800 px-2 py-1 rounded text-xs">
                                        {formatModelName(previewItem?.model || "")}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-500">Ratio</span>
                                    <span className="text-white font-medium bg-zinc-800 px-2 py-1 rounded text-xs">
                                        {previewItem?.ratio || 'Custom'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-zinc-500">Privacy</span>
                                    <div className="flex items-center gap-2">
                                        <span className={cn("text-xs font-medium", previewItem?.isPublic ? "text-[#D1F349]" : "text-zinc-500")}>
                                            {previewItem?.isPublic ? "Public" : "Private"}
                                        </span>
                                        <Switch
                                            checked={previewItem?.isPublic || false}
                                            onCheckedChange={() => previewItem && handleTogglePublic(previewItem)}
                                            className="data-[state=checked]:bg-[#D1F349] data-[state=unchecked]:bg-zinc-700"
                                        />
                                    </div>
                                </div>

                                {/* Template Info Card */}
                                {previewItem?.template && (
                                    <div className="mt-4">
                                        <div className="group relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 hover:border-[#D1F349]/50 transition-colors cursor-pointer"
                                            onClick={() => { if (previewItem) { handleReusePrompt(previewItem); setPreviewItem(null); } }}
                                        >
                                            {previewItem.template.image && (
                                                <img
                                                    src={previewItem.template.image}
                                                    alt={previewItem.template.name}
                                                    className="h-full w-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                                                />
                                            )}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                                <span className="text-lg font-bold text-white drop-shadow-md uppercase tracking-wide">
                                                    {previewItem.template.name}
                                                </span>
                                            </div>
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Badge className="bg-[#D1F349] text-black">Template</Badge>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="p-6 bg-zinc-900/50 border-t border-white/5 space-y-3">
                            < Button
                                className="w-full bg-[#D1F349] hover:bg-[#b0cc3d] text-black font-bold h-11"
                                onClick={() => { if (previewItem) { handleReusePrompt(previewItem); setPreviewItem(null); } }}
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reuse Prompt
                            </Button>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    className="border-white/10 bg-zinc-800/50 hover:bg-zinc-800 text-white hover:text-white"
                                    onClick={() => { if (previewItem) { handleUseAsTemplate(previewItem); setPreviewItem(null); } }}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Save as Template
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-white/10 bg-zinc-800/50 hover:bg-zinc-800 text-white hover:text-white"
                                    onClick={() => previewItem && handleDownload(previewItem)}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                </Button>
                            </div>

                            <Button
                                onClick={() => previewItem && handleDeleteHistory(previewItem.id)}
                                variant="ghost"
                                className="w-full text-red-500 hover:text-red-400 hover:bg-red-500/10 h-8 text-xs"
                            >
                                Delete Asset
                            </Button>
                        </div>
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
