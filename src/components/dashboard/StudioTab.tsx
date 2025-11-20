import { useState } from "react";
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
    SelectValue
} from "@/components/ui/select";
import {
    Wand2,
    Image as ImageIcon,
    Video,
    PenTool,
    Settings2,
    Sparkles,
    Zap,
    ChevronRight,
    Ratio,
    MonitorPlay,
    Plus,
    Minus,
    ImagePlus,
    Layers
} from "lucide-react";
import { toast } from "sonner";

// Mock Models Data
const MODELS = [
    { id: "flux-realism", name: "Flux Realism", type: "image", badge: "Unlimited", icon: ImageIcon },
    { id: "google-veo", name: "Google Veo 3.1", type: "video", badge: "Pro", icon: Video },
    { id: "midjourney-v6", name: "Midjourney v6", type: "image", badge: "Unlimited", icon: Wand2 },
    { id: "runway-gen3", name: "Runway Gen-3", type: "video", badge: "Pro", icon: MonitorPlay },
];

export default function StudioTab() {
    const [activeMode, setActiveMode] = useState<"video" | "image" | "face-swap">("video");
    const [selectedModel, setSelectedModel] = useState(MODELS[1].id);
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [imageCount, setImageCount] = useState(1);

    const handleGenerate = () => {
        if (!prompt) {
            toast.error("Please enter a prompt first");
            return;
        }
        setIsGenerating(true);
        // Simulate generation
        setTimeout(() => {
            setIsGenerating(false);
            toast.success("Generation started! Check the queue.");
        }, 2000);
    };

    return (
        <div className="flex h-[calc(100vh-12rem)] gap-6">
            {/* Left Control Panel */}
            <div className="w-96 flex flex-col gap-4 shrink-0">
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
                            <div className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center cursor-pointer group">
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <ImagePlus className="w-4 h-4 text-zinc-400" />
                                </div>
                                <span className="text-xs font-medium text-zinc-300">Start frame</span>
                                <span className="text-[10px] text-zinc-500">Optional</span>
                            </div>
                            <div className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center cursor-pointer group">
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                    <ImagePlus className="w-4 h-4 text-zinc-400" />
                                </div>
                                <span className="text-xs font-medium text-zinc-300">End frame</span>
                                <span className="text-[10px] text-zinc-500">Optional</span>
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
                                {/* Model Selector (Compact) */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-zinc-500">MODEL</Label>
                                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                                        <SelectTrigger className="bg-black/20 border-white/10 h-10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-black font-bold">G</div>
                                                <span className="text-sm">Nano Banana</span>
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

            {/* Right Preview Area */}
            <div className="flex-1 bg-black rounded-xl border border-white/10 overflow-hidden relative group">
                {/* Empty State / Placeholder */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                    <div className="w-24 h-24 rounded-full bg-zinc-900/50 flex items-center justify-center mb-4 border border-white/5">
                        <Sparkles className="w-10 h-10 opacity-20" />
                    </div>
                    <p className="text-lg font-medium">Ready to create</p>
                    <p className="text-sm opacity-60">Configure your settings and hit generate</p>
                </div>

                {/* Toolbar Overlay (Top Right) */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="secondary" className="rounded-full bg-black/50 backdrop-blur border border-white/10 text-white hover:bg-white/20">
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </div>

                {/* Playback Controls Overlay (Bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Placeholder for timeline/controls */}
                </div>
            </div>
        </div>
    );
}

import { Edit2 } from "lucide-react";
