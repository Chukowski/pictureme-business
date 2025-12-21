import { useState, useRef, useEffect } from "react";
import { Video, ImageIcon, RefreshCw, Wand2, Sparkles, MonitorPlay, Upload, ImagePlus, Layers, Loader2, Zap, ChevronRight, Ratio, Plus, Minus, Settings2, PenTool, Edit2, X, Download, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ENV } from "@/config/env";
import { getThumbnailUrl, getOptimizedUrl, getDownloadUrl, getProxyDownloadUrl } from "@/services/imgproxy";
import { useUserTier } from "@/services/userTier";

// AI Models Data
const MODELS = [
    // Video Models
    { id: "kling-2.6-pro", name: "Kling 2.6 Pro (Cinematic)", type: "video", badge: "New", icon: Video },
    { id: "kling-o1-edit", name: "Kling O1 Video Edit", type: "video", badge: "Pro", icon: Video },
    { id: "wan-v2", name: "Wan v2.2 Video", type: "video", badge: "Fast", icon: MonitorPlay },
    { id: "google-video", name: "Google Gemini Video", type: "video", badge: "Beta", icon: Zap },

    // Image Models
    { id: "nano-banana", name: "Nano Banana (Gemini 2.5 Flash)", type: "image", badge: "Fast", icon: Sparkles },
    { id: "nano-banana-pro", name: "Nano Banana Pro (Gemini 3 Pro)", type: "image", badge: "Quality", icon: Sparkles },
    { id: "seedream-v4", name: "Seedream v4", type: "image", badge: "Artistic", icon: Wand2 },
    { id: "seedream-v4.5", name: "Seedream 4.5 (Latest)", type: "image", badge: "New", icon: Wand2 },
    { id: "flux-realism", name: "Flux Realism", type: "image", badge: "Photo", icon: ImageIcon },
    { id: "flux-2-pro", name: "Flux 2 Pro", type: "image", badge: "Pro", icon: ImageIcon },
];

interface HistoryItem {
    url: string;
    type: 'image' | 'video';
    timestamp: number;
    prompt?: string;
    model?: string;
}

interface StudioTabProps {
    currentUser?: { id: number };
}

export default function StudioTab({ currentUser }: StudioTabProps) {
    const { tier: userTier } = useUserTier();
    const [activeMode, setActiveMode] = useState<"video" | "image" | "face-swap">("video");
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Auto-select first model of the active mode when mode changes
    useEffect(() => {
        const firstModelOfMode = MODELS.find(m => m.type === activeMode);
        if (firstModelOfMode && selectedModel !== firstModelOfMode.id) {
            // Check if current model is compatible with active mode
            const currentModel = MODELS.find(m => m.id === selectedModel);
            if (!currentModel || currentModel.type !== activeMode) {
                setSelectedModel(firstModelOfMode.id);
            }
        }
    }, [activeMode]);

    // History & Persistence
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);

    // Load history from localStorage on mount (user-specific)
    useEffect(() => {
        if (!currentUser) return;
        const savedHistory = localStorage.getItem(`studio_history_${currentUser.id}`);
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error("Failed to parse history", e);
            }
        } else {
            setHistory([]); // Reset if no history for this user
        }
    }, [currentUser?.id]);

    // Save history to localStorage whenever it changes
    useEffect(() => {
        if (!currentUser) return;
        localStorage.setItem(`studio_history_${currentUser.id}`, JSON.stringify(history));
    }, [history, currentUser?.id]);

    const [imageCount, setImageCount] = useState(1);
    const [startImageUrl, setStartImageUrl] = useState<string | null>(null);
    const [endImageUrl, setEndImageUrl] = useState<string | null>(null);
    const [sourceFaceUrl, setSourceFaceUrl] = useState<string | null>(null);
    const [targetImageUrl, setTargetImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRefStart = useRef<HTMLInputElement>(null);
    const fileInputRefEnd = useRef<HTMLInputElement>(null);
    const fileInputRefSource = useRef<HTMLInputElement>(null);
    const fileInputRefTarget = useRef<HTMLInputElement>(null);

    const handleUpload = async (file: File, type: 'start' | 'end' | 'source' | 'target') => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${ENV.API_URL}/api/generate/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();

            if (type === 'start') setStartImageUrl(data.url);
            else if (type === 'end') setEndImageUrl(data.url);
            else if (type === 'source') setSourceFaceUrl(data.url);
            else if (type === 'target') setTargetImageUrl(data.url);

            toast.success("Image uploaded successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end' | 'source' | 'target') => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0], type);
        }
    };

    // Reset selected model when mode changes
    useEffect(() => {
        const firstModel = MODELS.find(m => m.type === activeMode || (activeMode === 'face-swap' && m.type === 'image'));
        if (firstModel) {
            setSelectedModel(firstModel.id);
        }
    }, [activeMode]);

    const handleGenerate = async () => {
        if (!prompt && activeMode !== 'face-swap') {
            toast.error("Please enter a prompt first");
            return;
        }
        setIsGenerating(true);

        try {
            let endpoint = activeMode === 'video' ? `${ENV.API_URL}/api/generate/video` : `${ENV.API_URL}/api/generate/image`;

            const body: any = {
                prompt,
                model_id: selectedModel,
            };

            if (activeMode === 'image') {
                body.num_images = imageCount;
                body.image_size = "landscape_4_3";
            } else if (activeMode === 'video') {
                body.duration = "5";
                body.aspect_ratio = "16:9";
                if (startImageUrl) body.start_image_url = startImageUrl;
                if (endImageUrl) body.end_image_url = endImageUrl;
            } else if (activeMode === 'face-swap') {
                if (!sourceFaceUrl || !targetImageUrl) {
                    toast.error("Please upload both source face and target image for face swap.");
                    setIsGenerating(false);
                    return;
                }
                body.source_face_url = sourceFaceUrl;
                body.target_image_url = targetImageUrl;
                endpoint = `${ENV.API_URL}/api/generate/face-swap`;
                delete body.prompt;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Generation failed");
            }

            const data = await response.json();
            const newItem: HistoryItem = {
                url: data.image_url || data.video_url,
                type: data.image_url ? 'image' : 'video',
                timestamp: Date.now(),
                prompt: prompt,
                model: selectedModel
            };

            setHistory(prev => [newItem, ...prev]);
            toast.success("Generation successful!");

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Failed to generate");
        } finally {
            setIsGenerating(false);
        }
    };

    const deleteHistoryItem = (timestamp: number) => {
        setHistory(prev => prev.filter(item => item.timestamp !== timestamp));
        if (selectedHistoryItem?.timestamp === timestamp) {
            setSelectedHistoryItem(null);
        }
        toast.success("Item deleted");
    };

    // Helper to get selected model details
    const selectedModelData = MODELS.find(m => m.id === selectedModel);

    return (
        <div className="flex flex-col lg:flex-row h-full gap-6">
            {/* Hidden File Inputs */}
            <input type="file" ref={fileInputRefStart} className="hidden" accept="image/*" onChange={(e) => onFileChange(e, 'start')} />
            <input type="file" ref={fileInputRefEnd} className="hidden" accept="image/*" onChange={(e) => onFileChange(e, 'end')} />
            <input type="file" ref={fileInputRefSource} className="hidden" accept="image/*" onChange={(e) => onFileChange(e, 'source')} />
            <input type="file" ref={fileInputRefTarget} className="hidden" accept="image/*" onChange={(e) => onFileChange(e, 'target')} />

            {/* Left Control Panel */}
            <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
                {/* Mode Tabs */}
                <div className="flex p-1 bg-zinc-900/50 border border-white/10 rounded-xl backdrop-blur-sm">
                    <button
                        onClick={() => setActiveMode("video")}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeMode === "video" ? "bg-white/10 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                            }`}
                    >
                        Video
                    </button>
                    <button
                        onClick={() => setActiveMode("image")}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeMode === "image" ? "bg-white/10 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                            }`}
                    >
                        Image
                    </button>
                    <button
                        onClick={() => setActiveMode("face-swap")}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeMode === "face-swap" ? "bg-white/10 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                            }`}
                    >
                        Face Swap
                    </button>
                </div>

                {/* Main Controls Card */}
                <div className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl p-5 flex flex-col gap-5 backdrop-blur-sm overflow-y-auto">

                    {/* Preview/Style Selector */}
                    <div className="relative group cursor-pointer rounded-lg overflow-hidden border border-white/10 aspect-video bg-black/50">
                        <img
                            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
                            alt="Style Preview"
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                                <span className="text-xs font-bold text-white">GENERAL</span>
                                <Settings2 className="w-3 h-3 text-zinc-400" />
                            </div>
                        </div>
                        <div className="absolute top-2 right-2">
                            <Button size="sm" variant="secondary" className="h-6 text-[10px] bg-white/10 backdrop-blur-md border-white/10 hover:bg-white/20">
                                <Edit2 className="w-3 h-3 mr-1" /> Change
                            </Button>
                        </div>
                    </div>

                    {/* Prompt Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label className="text-xs font-medium text-zinc-400">PROMPT</Label>
                            <span className="text-[10px] text-zinc-500">0/1000</span>
                        </div>
                        <Textarea
                            placeholder="Describe what you want to create..."
                            className="min-h-[120px] bg-black/20 border-white/10 resize-none focus:border-indigo-500/50 text-sm leading-relaxed"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="h-7 text-xs border-white/10 bg-white/5 hover:bg-white/10">
                                <Sparkles className="w-3 h-3 mr-1 text-yellow-400" /> Enhance
                            </Button>
                        </div>
                    </div>

                    {/* Video Specific: Start/End Frames (Placed in whitespace) */}
                    {activeMode === 'video' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div
                                onClick={() => fileInputRefStart.current?.click()}
                                className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden"
                            >
                                {startImageUrl ? (
                                    <img src={getThumbnailUrl(startImageUrl, 300)} alt="Start frame" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                            <ImagePlus className="w-4 h-4 text-zinc-400" />
                                        </div>
                                        <span className="text-xs font-medium text-zinc-300">Start frame</span>
                                        <span className="text-[10px] text-zinc-500">Optional</span>
                                    </>
                                )}
                                {isUploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
                            </div>
                            <div
                                onClick={() => fileInputRefEnd.current?.click()}
                                className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden"
                            >
                                {endImageUrl ? (
                                    <img src={getThumbnailUrl(endImageUrl, 300)} alt="End frame" className="w-full h-full object-cover" />
                                ) : (
                                    <>
                                        <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                            <ImagePlus className="w-4 h-4 text-zinc-400" />
                                        </div>
                                        <span className="text-xs font-medium text-zinc-300">End frame</span>
                                        <span className="text-[10px] text-zinc-500">Optional</span>
                                    </>
                                )}
                                {isUploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
                            </div>
                        </div>
                    )}

                    {/* Image Specific: Add Photos (Placed in whitespace) */}
                    {activeMode === 'image' && (
                        <div className="w-full aspect-[3/1] rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center cursor-pointer group">
                            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <ImagePlus className="w-5 h-5 text-zinc-400" />
                            </div>
                            <span className="text-sm font-medium text-zinc-300">Add one or more photos</span>
                            <span className="text-xs text-zinc-500">Optional • For image-to-image</span>
                        </div>
                    )}

                    {/* Face Swap Specific: Source/Target (Placed in whitespace) */}
                    {activeMode === 'face-swap' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center cursor-pointer group">
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <ImagePlus className="w-4 h-4 text-zinc-400" />
                                </div>
                                <span className="text-xs font-medium text-zinc-300">Source Face</span>
                                <span className="text-[10px] text-zinc-500">The face to swap</span>
                            </div>
                            <div className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center cursor-pointer group">
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <ImagePlus className="w-4 h-4 text-zinc-400" />
                                </div>
                                <span className="text-xs font-medium text-zinc-300">Target Image</span>
                                <span className="text-[10px] text-zinc-500">The destination image</span>
                            </div>
                        </div>
                    )}

                    {/* Settings */}
                    <div className="space-y-4 mt-auto pt-4 border-t border-white/10">

                        {activeMode === 'video' && (
                            <>
                                {/* Multi-shot Toggle */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-zinc-400" />
                                        <span className="text-sm text-zinc-300">Multi-shot mode</span>
                                    </div>
                                    <Switch />
                                </div>

                                {/* Model Selector */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-zinc-500">MODEL</Label>
                                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                                        <SelectTrigger className="bg-black/20 border-white/10 h-12">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10">
                                            {MODELS.filter(m => m.type === 'video').map(model => (
                                                <SelectItem key={model.id} value={model.id} className="focus:bg-white/10">
                                                    <div className="flex items-center justify-between w-full gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <model.icon className="w-4 h-4 text-zinc-400" />
                                                            <span className="font-medium text-white">{model.name}</span>
                                                        </div>
                                                        <Badge variant="outline" className={`text-[10px] h-5 ${model.badge === 'Unlimited' ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'
                                                            }`}>
                                                            {model.badge}
                                                        </Badge>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Quality & Ratio Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-zinc-500">QUALITY</Label>
                                        <Button variant="outline" className="w-full justify-between bg-black/20 border-white/10 font-normal text-zinc-300 hover:bg-white/5 hover:text-white">
                                            1080p <ChevronRight className="w-4 h-4 opacity-50" />
                                        </Button>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-zinc-500">RATIO</Label>
                                        <Button variant="outline" className="w-full justify-between bg-black/20 border-white/10 font-normal text-zinc-300 hover:bg-white/5 hover:text-white">
                                            9:16 <Ratio className="w-4 h-4 opacity-50" />
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}

                        {activeMode === 'image' && (
                            <div className="space-y-4">
                                {/* Model Selector (Fixed) */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-zinc-500">MODEL</Label>
                                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                                        <SelectTrigger className="bg-black/20 border-white/10 h-10">
                                            <div className="flex items-center gap-2">
                                                {selectedModelData?.icon && <selectedModelData.icon className="w-4 h-4 text-zinc-400" />}
                                                <span className="text-sm">{selectedModelData?.name || "Select Model"}</span>
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10">
                                            {MODELS.filter(m => m.type === 'image').map(model => (
                                                <SelectItem key={model.id} value={model.id}>
                                                    {model.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Quantity & Ratio Row */}
                                <div className="flex gap-3">
                                    {/* Quantity Counter */}
                                    <div className="flex-1 flex items-center justify-between bg-black/20 border border-white/10 rounded-md px-2 h-10">
                                        <button
                                            onClick={() => setImageCount(Math.max(1, imageCount - 1))}
                                            className="p-1 hover:text-white text-zinc-500 transition-colors"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <span className="text-sm font-medium w-4 text-center">{imageCount}</span>
                                        <button
                                            onClick={() => setImageCount(Math.min(4, imageCount + 1))}
                                            className="p-1 hover:text-white text-zinc-500 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Ratio Selector */}
                                    <Button variant="outline" className="flex-1 justify-between bg-black/20 border-white/10 font-normal text-zinc-300 hover:bg-white/5 hover:text-white h-10 px-3">
                                        9:16 <Ratio className="w-4 h-4 opacity-50" />
                                    </Button>
                                </div>

                                {/* Unlimited Toggle & Draw Button */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 flex items-center justify-between bg-black/20 border border-white/10 rounded-md px-3 h-10">
                                        <span className="text-xs text-zinc-300">Unlimited</span>
                                        <Switch className="scale-75" />
                                    </div>
                                    <Button variant="outline" className="flex-1 bg-black/20 border-white/10 hover:bg-white/5 h-10">
                                        <PenTool className="w-4 h-4 mr-2" /> Draw
                                    </Button>
                                </div>
                            </div>
                        )}

                        {activeMode === 'face-swap' && (
                            /* Keep generic settings for now or adapt later */
                            <div className="space-y-1.5">
                                {/* Settings specific to face swap can go here if needed, but inputs are now above */}
                            </div>
                        )}

                        {/* Generate Button */}
                        <Button
                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base mt-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                            onClick={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <span className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 animate-spin" /> Generating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Generate <Zap className="w-4 h-4 fill-white" /> 58
                                </span>
                            )}
                        </Button>

                    </div>
                </div>
            </div>

            {/* Right Area: History Grid */}
            <div className="flex-1 bg-black rounded-xl border border-white/10 overflow-hidden relative group min-h-0 flex flex-col">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/50 backdrop-blur-sm z-10">
                    <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <Layers className="w-4 h-4" /> History
                    </h3>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => setHistory([])}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {history.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                            <div className="w-24 h-24 rounded-full bg-zinc-900/50 flex items-center justify-center mb-4 border border-white/5">
                                <Sparkles className="w-10 h-10 opacity-20" />
                            </div>
                            <p className="text-lg font-medium">Ready to create</p>
                            <p className="text-sm opacity-60">Your generations will appear here</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {history.map((item) => (
                                <div
                                    key={item.timestamp}
                                    className="aspect-square rounded-lg border border-white/10 overflow-hidden cursor-pointer hover:border-white/30 transition-all relative group bg-zinc-900"
                                    onClick={() => setSelectedHistoryItem(item)}
                                >
                                    {item.type === 'image' ? (
                                        <img src={getThumbnailUrl(item.url, 400)} alt="Generated" className="w-full h-full object-cover" />
                                    ) : (
                                        <video src={item.url} className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <MonitorPlay className="w-8 h-8 text-white drop-shadow-lg" />
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                        <p className="text-[10px] text-white/80 truncate">{new Date(item.timestamp).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
                <DialogContent className="bg-zinc-950 border-white/10 max-w-4xl w-full p-0 overflow-hidden flex flex-col md:flex-row h-[80vh] md:h-[600px]">
                    {selectedHistoryItem && (
                        <>
                            {/* Preview Side */}
                            <div className="flex-1 bg-black flex items-center justify-center relative p-4">
                                {selectedHistoryItem.type === 'image' ? (
                                    <img src={getOptimizedUrl(selectedHistoryItem.url, 1200)} alt="Detail" className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <video src={selectedHistoryItem.url} controls autoPlay loop className="max-w-full max-h-full object-contain" />
                                )}
                            </div>

                            {/* Info Side */}
                            <div className="w-full md:w-80 bg-zinc-900 p-6 flex flex-col border-l border-white/10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="font-medium text-white">Generation Details</h3>
                                        <p className="text-xs text-zinc-500">{new Date(selectedHistoryItem.timestamp).toLocaleString()}</p>
                                    </div>
                                    <DialogClose asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white -mt-2 -mr-2">
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </DialogClose>
                                </div>

                                <div className="space-y-4 flex-1 overflow-y-auto">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-500">PROMPT</Label>
                                        <div className="p-3 bg-black/20 rounded-lg border border-white/5 text-sm text-zinc-300 leading-relaxed max-h-32 overflow-y-auto">
                                            {selectedHistoryItem.prompt || "No prompt"}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs text-zinc-500">MODEL</Label>
                                        <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg border border-white/5">
                                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                                                {MODELS.find(m => m.id === selectedHistoryItem.model)?.name || selectedHistoryItem.model || "Unknown"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 space-y-3 pt-6 border-t border-white/10">
                                    <Button
                                        className="w-full bg-white text-black hover:bg-zinc-200"
                                        onClick={async () => {
                                            try {
                                                if (selectedHistoryItem.type === 'video') {
                                                    const proxyUrl = getProxyDownloadUrl(selectedHistoryItem.url, `creation-${selectedHistoryItem.timestamp}.mp4`);
                                                    window.location.href = proxyUrl;
                                                    return;
                                                }
                                                const optimizedUrl = getDownloadUrl(selectedHistoryItem.url, userTier);
                                                const proxyUrl = getProxyDownloadUrl(optimizedUrl, `creation-${selectedHistoryItem.timestamp}.webp`);
                                                window.location.href = proxyUrl;
                                                toast.success("Download started");
                                            } catch (e) {
                                                window.open(selectedHistoryItem.url, '_blank');
                                            }
                                        }}
                                    >
                                        <Download className="w-4 h-4 mr-2" /> Download
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5 text-zinc-300" onClick={() => {
                                            setPrompt(selectedHistoryItem.prompt || "");
                                            if (selectedHistoryItem.type === 'image') {
                                                setStartImageUrl(getThumbnailUrl(selectedHistoryItem.url, 800));
                                            }
                                            setSelectedHistoryItem(null);
                                            toast.success("Prompt and image loaded to editor");
                                        }}>
                                            <Copy className="w-4 h-4 mr-2" /> Use Prompt
                                        </Button>
                                        <Button variant="outline" className="flex-1 border-red-500/20 hover:bg-red-500/10 text-red-400 hover:text-red-300" onClick={() => deleteHistoryItem(selectedHistoryItem.timestamp)}>
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
