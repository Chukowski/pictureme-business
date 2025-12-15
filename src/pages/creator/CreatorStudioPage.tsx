import React, { useEffect, useState, useMemo, useRef } from "react";
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
    Globe,
    Plus,
    Zap,
    Image as ImageIcon,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

type Mode = "image" | "video";
type ViewState = "create" | "templates";

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
    isPublic?: boolean;
    status?: 'completed' | 'processing' | 'failed'; // For showing pending generations
    jobId?: number; // Pending generation job ID
}

// --- Local Models Definition to avoid import circular dependency issues ---
const LOCAL_IMAGE_MODELS = [
    { id: "fal-ai/nano-banana/edit", shortId: "nano-banana", name: "Nano Banana (Fast)", type: "image" },
    { id: "fal-ai/nano-banana-pro/edit", shortId: "nano-banana-pro", name: "Nano Banana Pro", type: "image" },
    { id: "fal-ai/bytedance/seedream/v4/edit", shortId: "seedream-v4", name: "Seedream v4", type: "image" },
    { id: "fal-ai/flux-realism", shortId: "flux-realism", name: "Flux Realism", type: "image" },
];

const LOCAL_VIDEO_MODELS = [
    { id: "fal-ai/kling-video/v2.6/pro/image-to-video", shortId: "kling-2.6-pro", name: "Kling 2.6 Pro", type: "video" },
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

function CreatorStudioPageContent() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const { templates: myTemplates, saveTemplate } = useMyTemplates();

    // View State
    const [viewState, setViewState] = useState<ViewState>("create");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [templateTab, setTemplateTab] = useState<"library" | "marketplace">("marketplace");

    // Use local models
    const imageModels = LOCAL_IMAGE_MODELS;
    const videoModels = LOCAL_VIDEO_MODELS;

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
    const [endFrameImage, setEndFrameImage] = useState<string | null>(null); // For video
    const [referenceImages, setReferenceImages] = useState<string[]>([]); // For multi-image

    const [activeInputType, setActiveInputType] = useState<"main" | "end" | "ref">("main");

    // Processing & Result
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Preparing...");

    // History / Feed - Initialize from localStorage
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);

    // History actions
    const handleDeleteHistory = (id: string) => {
        setHistory((prev) => prev.filter((item) => item.id !== id));
    };

    const handleReusePrompt = (item: HistoryItem) => {
        setPrompt(item.prompt || "");
        if (item.model) setModel(item.model);
        if (item.ratio) setAspectRatio(item.ratio);
        setMode(item.type);
        setViewState("create");
        toast.success("Prompt reloaded from history");
    };

    // File Upload Handling
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                if (result) {
                    if (activeInputType === "main") {
                        setInputImage(result);
                    } else if (activeInputType === "end") {
                        setEndFrameImage(result);
                    } else if (activeInputType === "ref") {
                        setReferenceImages(prev => [...prev, result]);
                    }
                }
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const triggerFileUpload = (type: "main" | "end" | "ref") => {
        setActiveInputType(type);
        if (fileInputRef.current) {
            fileInputRef.current.multiple = type === "ref";
            fileInputRef.current.click();
        }
    };

    const handleUseAsTemplate = (item: HistoryItem) => {
        if (item.type === "video") {
            toast.error("Solo puedes usar imágenes como template");
            return;
        }
        const tmpl: MarketplaceTemplate = {
            id: `history-${item.id}`,
            name: "From history",
            prompt: item.prompt,
            images: [item.url],
            ai_model: item.model,
            aspectRatio: item.ratio,
            type: "image",
        };
        setSelectedTemplate(tmpl);
        if (item.prompt) setPrompt(item.prompt);
        if (item.ratio) setAspectRatio(item.ratio);
        setMode("image");
        setViewState("create");
        toast.success("Imagen guardada como template");
    };

    const handleDownload = async (item: HistoryItem) => {
        try {
            const response = await fetch(item.url);
            if (!response.ok) throw new Error("Download failed");
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = item.type === "video" ? "creation.mp4" : "creation.png";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            toast.error("No se pudo descargar");
        }
    };

    const handleTogglePublic = async (item: HistoryItem) => {
        const newVisibility = !item.isPublic;
        // Optimistic update
        setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPublic: newVisibility } : h));
        if (previewItem?.id === item.id) {
            setPreviewItem(prev => prev ? { ...prev, isPublic: newVisibility } : null);
        }

        try {
            const token = localStorage.getItem("auth_token");
            if (!token) return;

            const res = await fetch(`${ENV.API_URL}/api/creations/${item.id}/visibility`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ visibility: newVisibility ? 'public' : 'private' })
            });

            if (res.ok) {
                toast.success(newVisibility ? "Published to Community Feed" : "Removed from feed");
            } else {
                throw new Error("Failed");
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to update visibility");
            // Revert optimistic update
            setHistory(prev => prev.map(h => h.id === item.id ? { ...h, isPublic: !newVisibility } : h));
        }
    };

    const handlePublishToMarketplace = (item: HistoryItem) => {
        // Open Save Template modal but pre-fill data and maybe set a flag for 'public'
        // For now, reuse SaveTemplateModal which likely has 'public' toggle or we can add logic
        // Actually SaveTemplateModal is for Library. We might need a "Publish" flow.
        // Let's use SaveTemplateModal and user can set "Is Public" if the modal supports it,
        // or we just save it to library first then they publish.
        // Based on user request: "crear templates publicarlos en el marketplace".
        // Let's treat it as "Save as Template" which is the first step.
        handleUseAsTemplate(item);
        // Ideally we would trigger the modal directly with the item
        setShowSaveTemplate(true);
        // Note: We need to ensure SaveTemplateModal knows it comes from this item if we want to prefill image
        // But handleUseAsTemplate sets state for 'create' mode.
        // Let's just open the modal with the item data.
    };

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

    // Load history from API on mount
    useEffect(() => {
        if (!user) {
            navigate("/admin/auth");
            return;
        }

        const fetchHistory = async () => {
            const token = localStorage.getItem("auth_token");
            if (!token) return;

            try {
                // Fetch completed creations
                const res = await fetch(`${ENV.API_URL}/api/creations`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                let completedItems: HistoryItem[] = [];
                if (res.ok) {
                    const data = await res.json();
                    if (data.creations && Array.isArray(data.creations)) {
                        completedItems = data.creations.map((c: any) => ({
                            id: c.id.toString(),
                            url: c.url,  // Backend returns 'url' not 'image_url'
                            previewUrl: c.thumbnail_url || c.url,
                            type: c.type || 'image',
                            timestamp: new Date(c.created_at).getTime(),
                            prompt: c.prompt,
                            model: c.model_id || c.model,
                            ratio: c.aspect_ratio,
                            isPublic: c.is_published || c.visibility === 'public',
                            status: 'completed' as const
                        }));
                    }
                }

                // Fetch pending generations (in progress)
                const pendingRes = await fetch(`${ENV.API_URL}/api/generate/pending`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });

                let pendingItems: HistoryItem[] = [];
                if (pendingRes.ok) {
                    const pendingData = await pendingRes.json();
                    if (pendingData.pending && Array.isArray(pendingData.pending)) {
                        pendingItems = pendingData.pending.map((p: any) => ({
                            id: `pending-${p.id}`,
                            url: '', // No URL yet
                            previewUrl: '', // Show placeholder
                            type: p.type || 'image',
                            timestamp: new Date(p.created_at).getTime(),
                            prompt: p.prompt,
                            model: p.model_id,
                            ratio: p.aspect_ratio,
                            status: p.status as 'processing' | 'failed',
                            jobId: p.id
                        }));
                        console.log(`Found ${pendingItems.length} pending generations`);
                    }
                }

                // Combine: pending items first, then completed
                const allItems = [...pendingItems, ...completedItems];
                setHistory(allItems);
                console.log(`Loaded ${completedItems.length} completed + ${pendingItems.length} pending items`);

                // Poll for pending items to complete
                if (pendingItems.length > 0) {
                    pollPendingGenerations(pendingItems);
                }
            } catch (e) {
                console.error('Failed to load history from cloud:', e);
            } finally {
                setHistoryLoaded(true);
            }
        };

        // Poll pending generations for updates
        const pollPendingGenerations = async (pendingItems: HistoryItem[]) => {
            const token = localStorage.getItem("auth_token");
            if (!token) return;

            for (const item of pendingItems) {
                if (!item.jobId) continue;

                // Poll this job until completion
                const pollJob = async () => {
                    const maxAttempts = 120;
                    for (let i = 0; i < maxAttempts; i++) {
                        await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds

                        try {
                            const statusRes = await fetch(`${ENV.API_URL}/api/generate/status/${item.jobId}`, {
                                headers: { "Authorization": `Bearer ${token}` }
                            });

                            if (!statusRes.ok) continue;

                            const statusData = await statusRes.json();

                            if (statusData.status === 'completed' && statusData.url) {
                                // Update history with completed item
                                setHistory(prev => prev.map(h =>
                                    h.id === item.id
                                        ? { ...h, url: statusData.url, previewUrl: statusData.url, status: 'completed' as const }
                                        : h
                                ));
                                console.log(`✅ Pending job ${item.jobId} completed!`);
                                return;
                            } else if (statusData.status === 'failed') {
                                setHistory(prev => prev.map(h =>
                                    h.id === item.id
                                        ? { ...h, status: 'failed' as const }
                                        : h
                                ));
                                console.log(`❌ Pending job ${item.jobId} failed`);
                                return;
                            }
                        } catch (e) {
                            console.warn(`Poll error for job ${item.jobId}:`, e);
                        }
                    }
                };

                // Start polling in background (don't await, run in parallel)
                pollJob();
            }
        };

        fetchHistory();
    }, [navigate, user?.id]);

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

    const addToHistory = async (item: HistoryItem) => {
        // Optimistic update
        setHistory(prev => [item, ...prev]);

        // Save to backend
        try {
            const token = localStorage.getItem("auth_token");
            if (!token) return;

            await fetch(`${ENV.API_URL}/api/creations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    image_url: item.url,
                    thumbnail_url: item.previewUrl || item.url,
                    prompt: item.prompt || "",
                    model_id: item.model || "",
                    aspect_ratio: item.ratio || "1:1",
                    type: item.type
                })
            });
        } catch (e) {
            console.error("Failed to save creation to cloud:", e);
        }
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
                // Get background images from template or manual upload
                const templateBgs = selectedTemplate?.images || selectedTemplate?.backgrounds || [];
                // Combine manual reference images with template backgrounds
                const finalBgImages = [...referenceImages, ...templateBgs];

                const result = await processImageWithAI({
                    userPhotoBase64: inputImage!,
                    backgroundPrompt: prompt || selectedTemplate?.prompt || "portrait photo",
                    backgroundImageUrls: finalBgImages,
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
                        start_image_url: inputImage || undefined,
                        end_image_url: endFrameImage || undefined
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

            {/* --- LEFT SIDEBAR (CARD STYLE) --- */}
            <div className="w-[380px] flex-shrink-0 bg-black flex flex-col z-20 h-full font-sans p-4">
                <div className="flex-1 bg-[#121212] rounded-3xl border border-white/5 flex flex-col overflow-hidden shadow-2xl relative">

                    {/* Header: Tabs */}
                    <div className="px-6 pt-5 pb-2">
                        <div className="flex items-center gap-6 border-b border-white/10 pb-0.5">
                            <button
                                onClick={() => {
                                    setMode("video");
                                    setModel("kling-2.6-pro");
                                    if (selectedTemplate?.type !== "video") setSelectedTemplate(null);
                                }}
                                className={cn(
                                    "text-sm font-semibold pb-3 border-b-2 transition-all",
                                    mode === "video" ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                Create Video
                            </button>
                            <button
                                onClick={() => {
                                    setMode("image");
                                    setModel("nano-banana");
                                    if (selectedTemplate?.type !== "image") setSelectedTemplate(null);
                                }}
                                className={cn(
                                    "text-sm font-semibold pb-3 border-b-2 transition-all",
                                    mode === "image" ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                Create Image
                            </button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 px-5 py-4">
                        <div className="space-y-5">

                            {/* 1. FEATURED STYLE CARD */}
                            <div className="relative group rounded-2xl overflow-hidden aspect-[2.4/1] bg-zinc-800 shadow-lg cursor-pointer hover:opacity-95 transition-all mb-2" onClick={() => setViewState("templates")}>
                                <img
                                    src={selectedTemplate ? getTemplateImage(selectedTemplate) : "https://fal.media/files/monkey/Chukowski_pictureme-now_0531c3bf1c8b4b73b22b28c86d8122c8.jpg"}
                                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-5 flex flex-col justify-end">
                                    <h3 className="text-[#D1F349] font-bold text-lg uppercase tracking-wide leading-none mb-1 shadow-black drop-shadow-md">
                                        {selectedTemplate ? selectedTemplate.name : "GENERAL"}
                                    </h3>
                                    <p className="text-zinc-300 text-xs font-medium shadow-black drop-shadow-md">
                                        {(mode === "image" ? LOCAL_IMAGE_MODELS : LOCAL_VIDEO_MODELS).find(m => m.shortId === model)?.name || model}
                                    </p>
                                </div>
                                <div className="absolute top-3 right-3">
                                    <Badge variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 px-2 py-1 h-auto text-[10px] gap-1 cursor-pointer">
                                        <Pencil className="w-3 h-3" /> Change
                                    </Badge>
                                </div>
                            </div>

                            {/* 2. INPUT GRID (Start/End Frame) */}
                            {mode === "video" && (
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Start Frame */}
                                    <button
                                        onClick={() => triggerFileUpload("main")}
                                        className="relative group w-full aspect-square rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-800 hover:border-zinc-500 transition-all flex flex-col items-center justify-center gap-3 overflow-hidden"
                                    >
                                        {inputImage ? (
                                            <>
                                                <img src={inputImage} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center">
                                                        <Upload className="w-5 h-5 text-white" />
                                                    </div>
                                                    <span className="text-[10px] text-white mt-2">Change</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                                                    <Upload className="w-5 h-5 text-zinc-400" />
                                                </div>
                                                <div className="text-center">
                                                    <span className="block text-sm font-medium text-zinc-200">Start frame</span>
                                                    <span className="block text-[10px] text-zinc-500 mt-0.5">Required</span>
                                                </div>
                                            </>
                                        )}
                                    </button>

                                    {/* End Frame */}
                                    <button
                                        onClick={() => triggerFileUpload("end")}
                                        className="relative group w-full aspect-square rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-800 hover:border-zinc-500 transition-all flex flex-col items-center justify-center gap-3 overflow-hidden"
                                    >
                                        {endFrameImage ? (
                                            <>
                                                <img src={endFrameImage} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center">
                                                        <Upload className="w-5 h-5 text-white" />
                                                    </div>
                                                    <span className="text-[10px] text-white mt-2">Change</span>
                                                </div>
                                                <div onClick={(e) => { e.stopPropagation(); setEndFrameImage(null); }} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500/50 text-white z-10">
                                                    <X className="w-3 h-3" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                                                    <Upload className="w-5 h-5 text-zinc-400" />
                                                </div>
                                                <div className="text-center">
                                                    <span className="block text-sm font-medium text-zinc-200">End frame</span>
                                                    <span className="block text-[10px] text-zinc-500 mt-0.5">Optional</span>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* IMAGE MODE INPUTS */}
                            {mode === "image" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => triggerFileUpload("main")}
                                        className="relative group w-full aspect-square rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-800 transition-all flex flex-col items-center justify-center gap-2"
                                    >
                                        {inputImage ? (
                                            <img src={inputImage} className="absolute inset-0 w-full h-full object-cover rounded-xl" />
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"><Upload className="w-5 h-5 text-zinc-400" /></div>
                                                <div className="text-center">
                                                    <span className="block text-sm font-medium text-zinc-200">Subject</span>
                                                    <span className="block text-[10px] text-zinc-500">Required</span>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => triggerFileUpload("ref")}
                                        className="relative group w-full aspect-square rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-800 transition-all flex flex-col items-center justify-center gap-2 overflow-hidden"
                                    >
                                        {referenceImages.length > 0 ? (
                                            <>
                                                <div className="grid grid-cols-2 gap-1 w-full h-full p-2.5">
                                                    {referenceImages.slice(0, 4).map((img, i) => (
                                                        <img key={i} src={img} className="w-full h-full object-cover rounded-md border border-white/10" />
                                                    ))}
                                                </div>
                                                <div onClick={(e) => { e.stopPropagation(); setReferenceImages([]); }} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-red-500/50 text-white z-10 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-white/5"><ListIcon className="w-5 h-5 text-zinc-400" /></div>
                                                <div className="text-center">
                                                    <span className="block text-sm font-medium text-zinc-200">Style Ref</span>
                                                    <span className="block text-[10px] text-zinc-500 mt-0.5">Optional</span>
                                                </div>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}


                            {/* 3. PROMPT SECTION */}
                            <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5 space-y-2">
                                <Label className="text-xs font-semibold text-zinc-400 ml-1">Prompt</Label>
                                <Textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe the scene you imagine, with details..."
                                    className="bg-transparent border-0 resize-none h-24 text-sm text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-0 p-1 leading-relaxed"
                                />
                                <div className="flex justify-end">
                                    <button
                                        className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 hover:text-[#D1F349] transition-colors"
                                        onClick={() => {
                                            if (!prompt) setPrompt("Cinematic shot of...");
                                            else setPrompt(prev => prev + ", highly detailed, 8k resolution, cinematic lighting");
                                        }}
                                    >
                                        <Sparkles className="w-3 h-3" /> Enhance on
                                    </button>
                                </div>
                            </div>

                            {/* 4. SETTINGS GRID */}
                            <div className="space-y-3">
                                {/* Model Selector */}
                                <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-3 pt-2 block">Model</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="w-full flex items-center justify-between px-3 pb-3 pt-1 hover:bg-white/5 transition-colors text-left">
                                                <span className="text-sm font-medium text-white flex items-center gap-2">
                                                    {(mode === "image" ? LOCAL_IMAGE_MODELS : LOCAL_VIDEO_MODELS).find(m => m.shortId === model)?.name || model}
                                                    {mode === "video" && <Zap className="w-3 h-3 text-[#D1F349]" />}
                                                </span>
                                                <ChevronRight className="w-4 h-4 text-zinc-500" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-72 bg-[#121212] border-zinc-800 text-white">
                                            {(mode === "image" ? LOCAL_IMAGE_MODELS : LOCAL_VIDEO_MODELS).map((m) => (
                                                <DropdownMenuItem key={m.shortId} onClick={() => setModel(m.shortId)} className="flex flex-col items-start gap-1 py-2 cursor-pointer focus:bg-zinc-800">
                                                    <div className="font-bold flex items-center gap-2">
                                                        {m.name}
                                                        {m.shortId === model && <span className="w-1.5 h-1.5 rounded-full bg-[#D1F349]" />}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-400 flex justify-between w-full">
                                                        <span>{m.id.split('/')[1]}</span>
                                                        <span>{(m as any).cost || (m.type === 'video' ? 10 : 4)} tokens</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Duration & Ratio Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Duration (Video Only) */}
                                    {mode === "video" && (
                                        <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-3 flex flex-col justify-between h-16 cursor-pointer hover:bg-zinc-900 transition-colors">
                                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Duration</span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-white">{duration}s</span>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><ChevronRight className="w-4 h-4 text-zinc-600" /></DropdownMenuTrigger>
                                                    <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white">
                                                        {["5", "10"].map(d => (
                                                            <DropdownMenuItem key={d} onClick={() => setDuration(d)}>{d}s</DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    )}

                                    {/* Aspect Ratio */}
                                    <div className={cn("bg-zinc-900/50 rounded-xl border border-white/5 p-3 flex flex-col justify-between h-16 cursor-pointer hover:bg-zinc-900 transition-colors", mode === "image" && "col-span-2")}>
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase">Ratio</span>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-white">{aspectRatio}</span>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><ChevronRight className="w-4 h-4 text-zinc-600" /></DropdownMenuTrigger>
                                                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white">
                                                    {["1:1", "16:9", "9:16", "4:3", "3:4"].map(r => (
                                                        <DropdownMenuItem key={r} onClick={() => setAspectRatio(r as AspectRatio)}>{r}</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </ScrollArea>

                    {/* Footer */}
                    <div className="p-5 border-t border-white/5 bg-[#121212] z-20">
                        <Button
                            onClick={handleGenerate}
                            disabled={isProcessing}
                            className={cn(
                                "w-full h-12 rounded-xl text-black font-bold text-base shadow-lg hover:brightness-110 active:scale-[0.98] transition-all",
                                "bg-[#D1F349] hover:bg-[#D1F349]"
                            )}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    Generate <Sparkles className="w-4 h-4 ml-2 fill-black/20" />
                                    <span className="ml-1 text-sm font-normal opacity-80">
                                        {((mode === "image" ? LOCAL_IMAGE_MODELS : LOCAL_VIDEO_MODELS).find(m => m.shortId === model) as any)?.cost || (mode === "image" ? 4 : 10)}
                                    </span>
                                </>
                            )}
                        </Button>
                    </div>
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
                                        <div key={item.id} onClick={() => item.status !== 'processing' && setPreviewItem(item)} className={`group relative break-inside-avoid rounded-xl overflow-hidden bg-zinc-900 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 ${item.status === 'processing' ? 'cursor-wait' : 'cursor-pointer'}`}>
                                            {/* Media */}
                                            <div className="aspect-[3/4] bg-zinc-800 relative">
                                                {item.status === 'processing' ? (
                                                    /* Processing state - show animated loader */
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900/50 to-purple-900/50">
                                                        <div className="relative">
                                                            <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-indigo-400 animate-spin"></div>
                                                            <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-indigo-400 animate-pulse" />
                                                        </div>
                                                        <p className="mt-4 text-sm text-white/80 font-medium">Generating...</p>
                                                        <p className="text-xs text-white/50 mt-1 px-4 text-center line-clamp-2">{item.prompt}</p>
                                                    </div>
                                                ) : item.status === 'failed' ? (
                                                    /* Failed state */
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-900/30">
                                                        <X className="w-10 h-10 text-red-400" />
                                                        <p className="mt-2 text-sm text-red-300">Generation failed</p>
                                                    </div>
                                                ) : item.type === 'image' ? (
                                                    <img src={item.url} className="w-full h-full object-cover" loading="lazy" />
                                                ) : (
                                                    <video src={item.url} className="w-full h-full object-cover" loop muted onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                                                )}

                                                {/* Overlay Info (Hover) - only for completed items */}
                                                {item.status !== 'processing' && item.status !== 'failed' && (
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
                                                            <div className="pt-2 flex justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 bg-white text-black hover:bg-zinc-200 text-xs font-bold px-3"
                                                                    onClick={() => handleDownload(item)}
                                                                >
                                                                    Download
                                                                </Button>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button size="icon" className="h-8 w-8 bg-white/10 hover:bg-white/20">
                                                                            <MoreHorizontal className="w-4 h-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white w-52">
                                                                        <DropdownMenuItem onClick={() => handleReusePrompt(item)} className="cursor-pointer">
                                                                            Reusar prompt
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem disabled={item.type === "video"} onClick={() => handleUseAsTemplate(item)} className="cursor-pointer">
                                                                            Usar imagen como template
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                                        <DropdownMenuItem onClick={() => handleDeleteHistory(item.id)} className="cursor-pointer text-red-400 focus:text-red-400">
                                                                            Eliminar
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
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

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
            />

            {/* --- MODALS --- */}


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

            {/* LIGHTBOX */}
            <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
                <DialogContent className="bg-black/95 border-white/10 max-w-5xl w-full p-0 overflow-hidden text-white sm:max-h-[90vh]">
                    <DialogTitle className="sr-only">Preview</DialogTitle>
                    <div className="flex flex-col md:flex-row h-full">
                        {/* Media Display */}
                        <div className="flex-1 bg-zinc-950 flex items-center justify-center p-4 min-h-[50vh]">
                            {previewItem?.type === 'image' ? (
                                <img src={previewItem.url} className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" />
                            ) : (
                                <video src={previewItem?.url} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" controls autoPlay loop />
                            )}
                        </div>

                        {/* Sidebar Details */}
                        <div className="w-full md:w-80 border-l border-white/10 bg-zinc-900/50 p-6 flex flex-col gap-6">
                            <div className="space-y-4">
                                <h3 className="font-bold text-lg text-white">Creation Details</h3>
                                <div className="space-y-2 text-sm text-zinc-400">
                                    <div className="flex justify-between">
                                        <span>Model</span>
                                        <span className="text-white">{previewItem?.model || 'Unknown'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Ratio</span>
                                        <span className="text-white">{previewItem?.ratio || 'Custom'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Created</span>
                                        <span className="text-white">{new Date(previewItem?.timestamp || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-t border-white/5">
                                        <span>Public Feed</span>
                                        <Switch
                                            checked={previewItem?.isPublic || false}
                                            onCheckedChange={() => previewItem && handleTogglePublic(previewItem)}
                                        />
                                    </div>
                                </div>

                                <div className="bg-black/30 rounded-lg p-3 text-xs text-zinc-300 italic">
                                    "{previewItem?.prompt}"
                                </div>
                            </div>

                            <div className="mt-auto space-y-3">
                                <Button className="w-full bg-white text-black hover:bg-zinc-200" onClick={() => previewItem && handleDownload(previewItem)}>
                                    Download
                                </Button>
                                <Button className="w-full" variant="secondary" onClick={() => {
                                    if (previewItem) {
                                        handleReusePrompt(previewItem);
                                        setPreviewItem(null);
                                    }
                                }}>
                                    Reuse Settings
                                </Button>
                                {previewItem?.type === 'image' && (
                                    <Button className="w-full text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/10" variant="outline" onClick={() => {
                                        if (previewItem) {
                                            handleUseAsTemplate(previewItem);
                                            setShowSaveTemplate(true); // Open save modal immediately
                                            setPreviewItem(null);
                                        }
                                    }}>
                                        Save / Publish to Market
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function CreatorStudioPage() {
    return (
        <ErrorBoundary>
            <CreatorStudioPageContent />
        </ErrorBoundary>
    );
}
