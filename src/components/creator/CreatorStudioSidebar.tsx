
import React, { useState, useMemo, useEffect } from 'react';
import {
    Settings,
    Upload,
    Sparkles,
    Loader2,
    ImageIcon,
    Video,
    Camera,
    X,
    ChevronRight,
    Check,
    Plus,
    Wand2,
    Coins,
    Globe,
    Lock,
    Pencil
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MarketplaceTemplate } from "@/components/creator/TemplateLibrary";

export type SidebarMode = "image" | "video" | "booth";

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

interface CreatorStudioSidebarProps {
    mode: SidebarMode;
    setMode: (m: SidebarMode) => void;
    prompt: string;
    setPrompt: (v: string) => void;
    model: string;
    setModel: (v: string) => void;
    aspectRatio: string;
    setAspectRatio: (v: string) => void;
    duration: string;
    setDuration: (v: string) => void;
    isProcessing: boolean;
    onGenerate: () => void;
    inputImage: string | null;
    endFrameImage?: string | null;
    onUploadClick: (type: "main" | "end" | "ref") => void;
    selectedTemplate: MarketplaceTemplate | null;
    onSelectTemplate: (t: MarketplaceTemplate) => void;
    onToggleTemplateLibrary: () => void;
    referenceImages: string[];
    onRemoveReferenceImage: (index: number) => void;
    isPublic: boolean;
    setIsPublic: (val: boolean) => void;
    isFreeTier: boolean;
    onCloseMobile?: () => void;
}

export function CreatorStudioSidebar({
    mode, setMode,
    prompt, setPrompt,
    model, setModel,
    aspectRatio, setAspectRatio,
    duration, setDuration,
    isProcessing = false,
    onGenerate,
    inputImage,
    endFrameImage,
    onUploadClick,
    selectedTemplate,
    onSelectTemplate,
    onToggleTemplateLibrary,
    referenceImages,
    onRemoveReferenceImage,
    isPublic,
    setIsPublic,
    isFreeTier,
    onCloseMobile,
    availableModels = [] // New prop for dynamic models from backend
}: CreatorStudioSidebarProps & { availableModels?: any[] }) {

    // Merge Local Models with Backend Costs
    const imageModels = useMemo(() => {
        return LOCAL_IMAGE_MODELS.map((local: any) => {
            const backend = availableModels.find(m => m.id === local.shortId || m.id === local.id);
            return {
                ...local,
                cost: backend ? backend.cost : (local.cost || 1) // default cost 1 if not found
            };
        });
    }, [availableModels]);

    const videoModels = useMemo(() => {
        return LOCAL_VIDEO_MODELS.map((local: any) => {
            const backend = availableModels.find(m => m.id === local.shortId || m.id === local.id);
            return {
                ...local,
                cost: backend ? backend.cost : (local.type === 'video' ? 150 : 10) // default 150 for video
            };
        });
    }, [availableModels]);

    // Auto-switch model when mode changes
    useEffect(() => {
        // Check if current model is valid for the new mode
        const validModels = mode === 'image' ? imageModels : videoModels;
        const isValid = validModels.some(m => m.shortId === model);

        if (!isValid && validModels.length > 0) {
            setModel(validModels[0].shortId); // Default to first available
        }
    }, [mode, imageModels, videoModels, model, setModel]);

    // Current selected model object
    const selectedModelObj = useMemo(() => {
        if (mode === 'image') return imageModels.find(m => m.shortId === model) || imageModels[0];
        return videoModels.find(m => m.shortId === model) || videoModels[0];
    }, [mode, model, imageModels, videoModels]);

    const renderRatioVisual = (r: string) => {
        let width = 10;
        let height = 10;
        switch (r) {
            case "16:9": width = 14; height = 8; break;
            case "4:5": width = 9; height = 11; break;
            case "3:2": width = 12; height = 8; break;
            case "9:16": width = 8; height = 14; break;
        }
        return (
            <div className="w-5 h-5 flex items-center justify-center mr-2 text-zinc-400">
                <div
                    className="border border-current rounded-[1px]"
                    style={{ width: `${width}px`, height: `${height}px` }}
                />
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] bg-[#09090b] h-[100dvh] flex flex-col md:relative md:inset-auto md:z-20 md:w-[340px] md:h-[calc(100vh-7rem)] md:bg-[#121212] md:border md:border-white/10 md:shadow-2xl md:rounded-3xl md:translate-y-0 text-white font-sans">

            {/* --- MOBILE HEADER (Compact) --- */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-white/5 md:hidden flex-shrink-0 bg-[#09090b]">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D1F349]" />
                    <span className="font-bold text-sm">Create Image</span>
                </div>
                <button
                    onClick={onCloseMobile}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900/50 text-zinc-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-3 custom-scrollbar">

                {/* 1. Top Tabs (Compact) */}
                <div className="flex p-1 bg-zinc-900/50 rounded-xl border border-white/5 mb-4">
                    {["image", "video", "booth"].map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m as any)}
                            className={cn(
                                "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2",
                                mode === m ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            {m === 'image' && <ImageIcon className="w-3 h-3" />}
                            {m === 'video' && <Video className="w-3 h-3" />}
                            {m === 'booth' && <Camera className="w-3 h-3" />}
                            <span>{m}</span>
                        </button>
                    ))}
                </div>

                {mode === 'booth' ? (
                    <div className="h-48 flex flex-col items-center justify-center text-zinc-500 space-y-3">
                        <Camera className="w-12 h-12 opacity-20" />
                        <p className="text-sm">Booth settings coming soon...</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 pb-20"> {/* Changed to flex gap and added padding bottom */}
                        {/* 2. TEMPLATE / STYLE HERO */}
                        <div
                            onClick={onToggleTemplateLibrary}
                            className="group relative h-32 w-full shrink-0 rounded-2xl overflow-hidden cursor-pointer border border-white/10 hover:border-[#D1F349]/50 transition-all shadow-lg"
                        >
                            <div className="absolute inset-0 bg-zinc-900">
                                {(selectedTemplate?.images?.[0] || selectedTemplate?.preview_images?.[0]) ? (
                                    <img
                                        src={selectedTemplate.images?.[0] || selectedTemplate.preview_images?.[0]}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                                        <Sparkles className="w-8 h-8 opacity-20" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <span className="text-[10px] font-bold text-[#D1F349] tracking-wider uppercase mb-0.5 block">Active Style</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-white shadow-black drop-shadow-md truncate max-w-[200px]">
                                        {selectedTemplate ? selectedTemplate.name : "Select a Style..."}
                                    </span>
                                    <div className="bg-white/10 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1">
                                        <Pencil className="w-3 h-3 text-white" />
                                        <span className="text-[10px] font-medium text-white">Change</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. MODEL SELECTOR (Slim row) */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full shrink-0 justify-between bg-zinc-900/50 border-white/10 hover:bg-zinc-900/80 hover:text-white">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="truncate">
                                            {selectedModelObj ? selectedModelObj.name : "Select Model"}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 rotate-90 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] bg-zinc-950 border-zinc-800">
                                {(mode === 'image' ? imageModels : videoModels).map((m) => (
                                    <DropdownMenuItem
                                        key={m.id}
                                        onClick={() => setModel(m.shortId)}
                                        className="flex items-center justify-between cursor-pointer focus:bg-zinc-900"
                                    >
                                        <span className={cn(m.shortId === model && "text-[#D1F349]")}>{m.name}</span>
                                        {m.shortId === model && <Check className="w-4 h-4 text-[#D1F349]" />}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* 4. INPUTS (Dynamic based on Mode) */}
                        <div className="flex flex-col gap-2 w-full shrink-0 min-h-[6rem]">
                            {mode === 'video' ? (
                                // VIDEO MODE INPUTS
                                <div className="grid grid-cols-2 gap-2 h-full w-full">
                                    {/* Start Frame */}
                                    <div
                                        onClick={() => onUploadClick("main")}
                                        className={cn(
                                            "h-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-500 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden relative group",
                                            inputImage && "border-solid border-[#D1F349]/50"
                                        )}
                                    >
                                        {inputImage ? (
                                            <>
                                                <img src={inputImage} className="w-full h-full object-cover" />
                                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] text-white">Start</div>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-5 h-5 text-zinc-500 group-hover:text-[#D1F349] transition-colors" />
                                                <span className="text-[10px] font-medium text-zinc-400">Start Frame</span>
                                            </>
                                        )}
                                    </div>

                                    {/* End Frame */}
                                    <div
                                        onClick={() => onUploadClick("end")}
                                        className={cn(
                                            "h-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-500 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden relative group",
                                            endFrameImage && "border-solid border-[#D1F349]/50"
                                        )}
                                    >
                                        {endFrameImage ? (
                                            <>
                                                <img src={endFrameImage} className="w-full h-full object-cover" />
                                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] text-white">End</div>
                                            </>
                                        ) : (
                                            <>
                                                <Video className="w-5 h-5 text-zinc-500 group-hover:text-[#D1F349] transition-colors" />
                                                <span className="text-[10px] font-medium text-zinc-400">End Frame</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                // IMAGE MODE INPUTS
                                <div className="grid grid-cols-3 gap-2 h-full w-full">
                                    {/* Main Subject Input */}
                                    <div
                                        onClick={() => onUploadClick("main")}
                                        className={cn(
                                            "h-full col-span-1 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-500 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden group relative",
                                            inputImage && "border-solid border-[#D1F349]/50"
                                        )}
                                    >
                                        {inputImage ? (
                                            <img src={inputImage} className="w-full h-full object-cover" />
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-[#D1F349]" />
                                                <span className="text-[10px] font-medium text-zinc-400 text-center leading-tight">Upload<br />Subject</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Reference Images */}
                                    <div className="col-span-2 grid grid-cols-2 gap-2 h-full">
                                        {/* Add Reference Button */}
                                        <button
                                            onClick={() => onUploadClick("ref")}
                                            className="h-full rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-800 transition-all flex flex-col items-center justify-center gap-1 group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-[#D1F349] group-hover:text-black transition-colors">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] text-zinc-500">Add Ref</span>
                                        </button>

                                        {/* Show first ref or placeholder count */}
                                        {referenceImages.length > 0 ? (
                                            <div className="relative h-full rounded-xl overflow-hidden border border-white/5 group">
                                                <img src={referenceImages[0]} className="w-full h-full object-cover" />
                                                {referenceImages.length > 1 && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                        <span className="text-xs font-bold text-white">+{referenceImages.length - 1}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-full rounded-xl bg-zinc-900/10 border border-white/5 flex items-center justify-center">
                                                <span className="text-[10px] text-zinc-700">No refs</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 5. PROMPT AREA (Clean) */}
                        <div className="relative shrink-0 mt-2 bg-zinc-900/30 rounded-xl border border-white/5 focus-within:border-[#D1F349]/50 transition-colors">
                            <Textarea
                                placeholder={mode === 'video' ? "Describe your video..." : "Describe your image..."}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="min-h-[160px] bg-transparent border-none text-xs md:text-sm resize-none p-3 placeholder:text-zinc-600 focus-visible:ring-0"
                            />
                            <button className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
                                <Wand2 className="w-3 h-3" />
                            </button>
                        </div>

                        {/* 6. RATIO & SETTINGS (Row) */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Ratio */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="h-10 flex items-center justify-between px-3 bg-zinc-900/50 rounded-lg border border-white/5">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Ratio</span>
                                        <div className="flex items-center gap-1.5">
                                            {renderRatioVisual(aspectRatio)}
                                            <span className="text-xs font-medium text-white">{aspectRatio}</span>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-[#121212] border-white/10 text-white z-[70]">
                                    {["1:1", "4:5", "16:9", "9:16"].map(r => (
                                        <DropdownMenuItem key={r} onClick={() => setAspectRatio(r)} className="flex items-center text-xs">
                                            {renderRatioVisual(r)} {r}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>


                        </div>
                    </div>
                )}
            </div>

            {/* --- FOOTER (Split Style) --- */}
            {mode !== 'booth' && (
                <div className="flex-shrink-0 p-4 pb-6 md:pb-4 border-t border-white/5 bg-[#09090b] flex items-center gap-3 md:bg-transparent md:border-none">
                    {/* Secondary Action (Privacy/Count) */}
                    <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-white/5 h-12">
                        <button
                            onClick={() => !isFreeTier && setIsPublic(!isPublic)}
                            className={cn(
                                "h-full px-3 rounded-md flex items-center justify-center gap-2 transition-all min-w-[80px]",
                                isPublic ? "bg-zinc-800 text-zinc-400" : "bg-red-900/20 text-red-200"
                            )}
                            disabled={isFreeTier}
                        >
                            {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            <span className="text-[10px] font-bold uppercase">{isPublic ? "Public" : "Private"}</span>
                        </button>
                    </div>

                    {/* Primary Button */}
                    <Button
                        onClick={onGenerate}
                        disabled={isProcessing}
                        className={cn(
                            "flex-1 h-12 font-bold text-sm hover:brightness-110 transition-all rounded-xl shadow-lg shadow-[#D1F349]/10 text-black flex items-center justify-center gap-2",
                            mode === 'image' ? "bg-[#D1F349] hover:bg-[#c2e340]" : "bg-white hover:bg-zinc-200"
                        )}
                    >
                        {isProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : (
                            <>
                                <span>Generate</span>
                                <div className="flex items-center gap-1 bg-black/10 px-2 py-0.5 rounded-full">
                                    <Coins className="w-3 h-3 opacity-70" />
                                    <span className="text-xs font-semibold">{(selectedModelObj as any).cost}</span>
                                </div>
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
