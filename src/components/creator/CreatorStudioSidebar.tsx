
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
    Pencil,
    ChevronDown
} from 'lucide-react';
import { LOCAL_IMAGE_MODELS, LOCAL_VIDEO_MODELS, LEGACY_MODEL_IDS } from "@/services/aiProcessor";
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

// Local models definitions removed to use shared constants from aiProcessor.ts

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
    onRemoveInputImage?: () => void;
    onRemoveEndFrameImage?: () => void;
    selectedTemplate: MarketplaceTemplate | null;
    onSelectTemplate: (t: MarketplaceTemplate) => void;
    onToggleTemplateLibrary: () => void;
    referenceImages: string[];
    onRemoveReferenceImage: (index: number) => void;
    isPublic: boolean;
    setIsPublic: (val: boolean) => void;
    isFreeTier: boolean;
    onCloseMobile?: () => void;
    availableModels?: any[];
    remixFromUsername?: string | null;
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
    onRemoveInputImage,
    onRemoveEndFrameImage,
    selectedTemplate,
    onSelectTemplate,
    onToggleTemplateLibrary,
    referenceImages,
    onRemoveReferenceImage,
    isPublic,
    setIsPublic,
    isFreeTier,
    onCloseMobile,
    availableModels = [], // New prop for dynamic models from backend
    remixFromUsername
}: CreatorStudioSidebarProps) {

    // Merge Local Models with Backend Configurations
    // Merge Local Models with Backend Configurations
    const imageModels = useMemo(() => {
        // Start with backend models filtered by image type and NOT legacy
        const backendImageModels = availableModels.filter(m =>
            (m.type === 'image' || !m.type) &&
            !LEGACY_MODEL_IDS.includes(m.id)
        );

        // Map backend models and enrich with local metadata
        const merged = backendImageModels.map(bm => {
            const local = LOCAL_IMAGE_MODELS.find(lm => lm.shortId === bm.id || lm.id === bm.id);
            return {
                id: bm.id,
                shortId: bm.id,
                name: bm.name || (local ? local.name : bm.id),
                type: 'image',
                cost: bm.cost || (local ? local.cost : 1),
                speed: local ? local.speed : 'medium',
                description: bm.description || (local ? local.description : '')
            };
        });

        // Add any local models that are NOT in the backend list (as fallbacks)
        LOCAL_IMAGE_MODELS.forEach(local => {
            if (!merged.some(m => m.id === local.shortId || m.id === local.id)) {
                merged.push({ ...local, cost: local.cost || 1 });
            }
        });

        return merged;
    }, [availableModels]);

    const videoModels = useMemo(() => {
        const backendVideoModels = availableModels.filter(m =>
            m.type === 'video' &&
            !LEGACY_MODEL_IDS.includes(m.id)
        );

        const merged = backendVideoModels.map(bm => {
            const local = LOCAL_VIDEO_MODELS.find(lm => lm.shortId === bm.id || lm.id === bm.id);
            return {
                id: bm.id,
                shortId: bm.id,
                name: bm.name || (local ? local.name : bm.id),
                type: 'video',
                cost: bm.cost || (local ? local.cost : 150),
                speed: local ? local.speed : 'slow',
                description: bm.description || (local ? local.description : '')
            };
        });

        LOCAL_VIDEO_MODELS.forEach(local => {
            if (!merged.some(m => m.id === local.shortId || m.id === local.id)) {
                merged.push({ ...local, cost: local.cost || 150 });
            }
        });

        return merged;
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

            {/* --- SIDEBAR HEADER (Mobile Dropdown, Desktop Title) --- */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/5 flex-shrink-0 bg-[#09090b] md:bg-transparent">
                <div className="flex items-center gap-2">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 rounded-lg transition-colors group">
                                {mode === 'image' && <ImageIcon className="w-4 h-4 text-[#D1F349]" />}
                                {mode === 'video' && <Video className="w-4 h-4 text-[#D1F349]" />}
                                {mode === 'booth' && <Camera className="w-4 h-4 text-[#D1F349]" />}
                                <span className="font-bold text-sm tracking-tight">
                                    {mode === 'image' && 'Create Image'}
                                    {mode === 'video' && 'Create Video'}
                                    {mode === 'booth' && 'Photo Booth'}
                                </span>
                                <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 bg-zinc-950 border-zinc-800 z-[100]">
                            {[
                                { id: 'image', label: 'Create Image', icon: ImageIcon },
                                { id: 'video', label: 'Create Video', icon: Video },
                                { id: 'booth', label: 'Photo Booth', icon: Camera },
                            ].map((item) => (
                                <DropdownMenuItem
                                    key={item.id}
                                    onClick={() => setMode(item.id as any)}
                                    className={cn(
                                        "flex items-center gap-2 cursor-pointer focus:bg-zinc-900",
                                        mode === item.id && "text-[#D1F349]"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                    {mode === item.id && <Check className="w-3 h-3 ml-auto" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {onCloseMobile && (
                    <button
                        onClick={onCloseMobile}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all md:hidden"
                        aria-label="Close Studio"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-3 custom-scrollbar">



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
                                        alt={selectedTemplate.name}
                                    />
                                ) : (
                                    <img
                                        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60"
                                        alt="General Style"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            </div>

                            <div className="absolute top-2 right-2 z-20">
                                <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Pencil className="w-3 h-3 text-white" />
                                    <span className="text-[10px] font-medium text-white">Change</span>
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                {!selectedTemplate ? (
                                    <div className="flex flex-col">
                                        <h3 className="text-2xl font-black text-[#D1F349] tracking-tighter leading-none mb-1">GENERAL</h3>
                                        <span className="text-xs font-medium text-zinc-300 opacity-80">{selectedModelObj?.name || model}</span>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-[10px] font-bold text-[#D1F349] tracking-wider uppercase mb-0.5 block">Active Style</span>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-white shadow-black drop-shadow-md truncate max-w-[200px]">
                                                {selectedTemplate.name}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 3. MODEL SELECTOR (Slim row) */}
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full shrink-0 justify-between bg-zinc-900/50 border-white/10 hover:bg-zinc-900/80 hover:text-white z-[60]">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="truncate">
                                            {selectedModelObj ? selectedModelObj.name : "Select Model"}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4 rotate-90 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] bg-zinc-950 border-zinc-800 z-[100]" sideOffset={5}>
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
                        <div className="flex flex-col gap-2 w-full shrink-0">
                            {mode === 'video' ? (
                                // VIDEO MODE INPUTS
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    {/* Start Frame */}
                                    <div
                                        onClick={() => onUploadClick("main")}
                                        className={cn(
                                            "aspect-video w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-500 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden relative group",
                                            inputImage && "border-solid border-[#D1F349]/50"
                                        )}
                                    >
                                        {inputImage ? (
                                            <>
                                                <img src={inputImage} className="w-full h-full object-cover" />
                                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] text-white">Start</div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onRemoveInputImage?.(); }}
                                                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
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
                                            "aspect-video w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-500 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden relative group",
                                            endFrameImage && "border-solid border-[#D1F349]/50"
                                        )}
                                    >
                                        {endFrameImage ? (
                                            <>
                                                <img src={endFrameImage} className="w-full h-full object-cover" />
                                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] text-white">End</div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onRemoveEndFrameImage?.(); }}
                                                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
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
                                <div className="grid grid-cols-3 gap-2 w-full">
                                    {/* 1. Main Subject Input (Always first) */}
                                    <div
                                        onClick={() => onUploadClick("main")}
                                        className={cn(
                                            "aspect-square w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-500 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden group relative",
                                            inputImage && "border-solid border-[#D1F349]/50"
                                        )}
                                    >
                                        {inputImage ? (
                                            <>
                                                <img src={inputImage} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onRemoveInputImage?.(); }}
                                                    className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                                <div className="absolute active-badge top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] text-white hidden">Subject</div>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-[#D1F349]" />
                                                <span className="text-[10px] font-medium text-zinc-400 text-center leading-tight">Upload<br />Subject</span>
                                            </>
                                        )}
                                    </div>

                                    {/* 2. Reference Images (Mapped) */}
                                    {referenceImages.map((refImg, index) => (
                                        <div key={index} className="aspect-square w-full rounded-xl overflow-hidden border border-white/5 relative group bg-zinc-900/30">
                                            <img src={refImg} className="w-full h-full object-cover" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRemoveReferenceImage(index); }}
                                                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}

                                    {/* 3. Add Reference Button (Only if < 3 refs) */}
                                    {referenceImages.length < 3 && (
                                        <button
                                            onClick={() => onUploadClick("ref")}
                                            className="aspect-square w-full rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-800 transition-all flex flex-col items-center justify-center gap-1 group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-[#D1F349] group-hover:text-black transition-colors">
                                                <Plus className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] text-zinc-500">Add Ref</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 5. PROMPT AREA (Clean) */}
                        {remixFromUsername && (
                            <div className="flex items-center gap-1.5 bg-[#D1F349]/10 px-2.5 py-1.5 rounded-xl border border-[#D1F349]/20 w-full mb-1">
                                <Sparkles className="w-3.5 h-3.5 text-[#D1F349]" />
                                <span className="text-[10px] font-black text-[#D1F349] uppercase tracking-wider">Remixing @{remixFromUsername}</span>
                            </div>
                        )}
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
                                isFreeTier
                                    ? "bg-zinc-800/50 text-zinc-500 cursor-not-allowed"
                                    : isPublic
                                        ? "bg-zinc-800 text-[#D1F349]"
                                        : "bg-red-900/20 text-red-200"
                            )}
                            disabled={isFreeTier}
                            title={isFreeTier ? "Free tier creations are always public" : "Toggle visibility"}
                        >
                            {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            <span className="text-[10px] font-bold uppercase">
                                {isFreeTier ? "Public" : (isPublic ? "Public" : "Private")}
                            </span>
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
