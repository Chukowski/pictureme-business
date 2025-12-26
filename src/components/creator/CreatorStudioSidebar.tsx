
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { GalleryItem } from '@/components/creator/CreationDetailView';
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
    availableModels = [],
    remixFromUsername
}: CreatorStudioSidebarProps) {

    const [enhanceOn, setEnhanceOn] = useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [prompt, mode]);

    const imageModels = useMemo(() => {
        const backendImageModels = availableModels.filter(m =>
            (m.type === 'image' || !m.type) &&
            !LEGACY_MODEL_IDS.includes(m.id)
        );

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

    useEffect(() => {
        const validModels = mode === 'image' ? imageModels : videoModels;
        const isValid = validModels.some(m => m.shortId === model);

        if (!isValid && validModels.length > 0) {
            setModel(validModels[0].shortId);
        }
    }, [mode, imageModels, videoModels, model, setModel]);

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
            <div className="w-4 h-4 flex items-center justify-center mr-1.5 text-zinc-500">
                <div
                    className="border border-current rounded-[1px]"
                    style={{ width: `${width}px`, height: `${height}px` }}
                />
            </div>
        );
    };

    return (
        <div className={cn(
            "fixed z-[60] flex flex-col text-white font-sans overflow-hidden transition-all duration-300",
            // Mobile: Full screen drawer
            "inset-0 bg-[#09090b] h-[100dvh] md:h-auto",
            // Desktop: Extra compact floating fixed card (90% scaling feel)
            "md:z-20 md:top-[80px] md:left-[12px] md:bottom-8 md:w-[325px] md:bg-[#1A1A1A] md:rounded-[1rem] md:border md:border-white/5 md:shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:right-auto"
        )}>

            {/* --- SIDEBAR HEADER (Mobile) --- */}
            <div className="flex md:hidden items-center justify-between px-4 h-14 border-b border-white/5 flex-shrink-0 bg-black">
                <div className="flex items-center gap-2">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-2 hover:bg-white/5 px-2 py-1.5 rounded-xl transition-all group">
                                <div className="p-1 rounded-lg bg-[#D1F349]/10">
                                    {mode === 'image' && <ImageIcon className="w-4 h-4 text-[#D1F349]" />}
                                    {mode === 'video' && <Video className="w-4 h-4 text-[#D1F349]" />}
                                    {mode === 'booth' && <Camera className="w-4 h-4 text-[#D1F349]" />}
                                </div>
                                <span className="font-black text-[14px] uppercase tracking-tight text-white">
                                    {mode === 'image' && 'Image'}
                                    {mode === 'video' && 'Video'}
                                    {mode === 'booth' && 'Booth'}
                                </span>
                                <ChevronDown className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48 bg-zinc-950 border-zinc-900 z-[100] p-1.5">
                            {[
                                { id: 'image', label: 'Create Image', icon: ImageIcon },
                                { id: 'video', label: 'Create Video', icon: Video },
                                { id: 'booth', label: 'Photo Booth', icon: Camera },
                            ].map((item) => (
                                <DropdownMenuItem
                                    key={item.id}
                                    onClick={() => setMode(item.id as any)}
                                    className={cn(
                                        "flex items-center gap-2.5 cursor-pointer focus:bg-zinc-900 text-[13px] font-bold py-2.5 rounded-lg px-3 transition-colors",
                                        mode === item.id ? "text-[#D1F349] bg-zinc-900/50" : "text-zinc-400"
                                    )}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span>{item.label}</span>
                                    {mode === item.id && <Check className="w-3.5 h-3.5 ml-auto" />}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {onCloseMobile && (
                    <button
                        onClick={onCloseMobile}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all group md:hidden"
                        aria-label="Close Studio"
                    >
                        <X className="w-5 h-5 group-active:scale-90 transition-transform" />
                    </button>
                )}
            </div>

            {/* --- SIDEBAR TABS (Desktop Only) --- */}
            <nav className="hidden md:flex items-center justify-center gap-6 px-4 pt-5 border-b border-white/5 shrink-0 bg-[#1A1A1A]">
                {[
                    { id: 'image', label: 'IMAGE' },
                    { id: 'video', label: 'VIDEO' },
                    { id: 'booth', label: 'BOOTH' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setMode(item.id as any)}
                        className={cn(
                            "h-9 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 pb-3",
                            mode === item.id
                                ? "text-white border-[#D1F349]"
                                : "text-zinc-500 border-transparent hover:text-zinc-300"
                        )}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* --- SCROLLABLE CONTENT --- */}
            <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
                {mode === 'booth' ? (
                    <div className="h-48 flex flex-col items-center justify-center text-zinc-500 space-y-3">
                        <Camera className="w-10 h-10 opacity-20" />
                        <p className="text-xs">Booth settings coming soon...</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Remixing Banner */}
                        {remixFromUsername && (
                            <div className="flex items-center gap-2 bg-[#D1F349]/10 px-3 py-2 rounded-xl border border-[#D1F349]/20 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Sparkles className="w-3.5 h-3.5 text-[#D1F349]" />
                                <span className="text-[10px] font-black text-[#D1F349] uppercase tracking-widest">Remixing @{remixFromUsername}</span>
                            </div>
                        )}

                        {/* 1. STYLE HERO CARD (Higgs Style) */}
                        <div
                            onClick={onToggleTemplateLibrary}
                            className="group relative aspect-[2.3] w-full shrink-0 rounded-2xl overflow-hidden cursor-pointer border border-white/10 ring-1 ring-white/5 shadow-2xl"
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
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                            </div>

                            <div className="absolute top-2 right-2 flex gap-1 z-20">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 px-2.5 rounded-lg bg-black/60 backdrop-blur-md border-white/10 text-[10px] font-bold uppercase tracking-wider hover:bg-black/80"
                                >
                                    <Pencil className="w-3 h-3 mr-1.5" />
                                    Change
                                </Button>
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-4 pt-10">
                                <h3 className="text-[13px] font-black text-[#D1F349] uppercase tracking-wider leading-none mb-0.5 drop-shadow-lg">
                                    {selectedTemplate?.name || "General"}
                                </h3>
                                <p className="text-[11px] font-medium text-white/70 drop-shadow-md">
                                    {selectedModelObj?.name || model}
                                </p>
                            </div>
                        </div>

                        {/* 2. DROPZONES (Start/End) */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Start Frame */}
                            <div
                                onClick={() => onUploadClick("main")}
                                className={cn(
                                    "aspect-square w-full rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-white/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 relative group overflow-hidden",
                                    inputImage && "border-solid border-[#D1F349]/40"
                                )}
                            >
                                {inputImage ? (
                                    <>
                                        <img src={inputImage} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemoveInputImage?.(); }}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white transition-all ring-1 ring-white/10 opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-inner border border-white/5">
                                            <Upload className="w-5 h-5 text-white/60 group-hover:text-[#D1F349]" />
                                        </div>
                                        <span className="text-[12px] font-bold text-white/80">Start frame</span>
                                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">Required</span>
                                    </div>
                                )}
                            </div>

                            {/* End Frame / Multi-input */}
                            {mode === 'video' ? (
                                <div
                                    onClick={() => onUploadClick("end")}
                                    className={cn(
                                        "aspect-square w-full rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-white/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 relative group overflow-hidden",
                                        endFrameImage && "border-solid border-[#D1F349]/40"
                                    )}
                                >
                                    {endFrameImage ? (
                                        <>
                                            <img src={endFrameImage} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/20" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRemoveEndFrameImage?.(); }}
                                                className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white transition-all ring-1 ring-white/10 opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-inner border border-white/5">
                                                <Upload className="w-5 h-5 text-zinc-700 group-hover:text-white/80" />
                                            </div>
                                            <span className="text-[12px] font-bold text-zinc-600">End frame</span>
                                            <span className="text-[10px] text-zinc-700 uppercase font-black tracking-tighter">Optional</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 grid-rows-2 gap-1.5 h-full">
                                    {referenceImages.map((refImg, index) => (
                                        <div key={index} className="rounded-xl overflow-hidden border border-white/5 relative group bg-zinc-900/30">
                                            <img src={refImg} className="w-full h-full object-cover" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRemoveReferenceImage(index); }}
                                                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {referenceImages.length < 3 && (
                                        <button
                                            onClick={() => onUploadClick("ref")}
                                            className="rounded-xl bg-white/5 border border-dashed border-white/10 hover:bg-white/10 transition-all flex items-center justify-center group"
                                        >
                                            <Plus className="w-4 h-4 text-zinc-600 group-hover:text-[#D1F349]" />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 3. PROMPT AREA */}
                        <div className="flex flex-col">
                            <div className="relative bg-[#0D0D0D]/50 rounded-2xl border border-white/5 focus-within:ring-2 ring-white/5 transition-all p-3 pb-2 group">
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block text-white/40">Prompt</span>
                                <Textarea
                                    ref={textareaRef}
                                    placeholder="Describe the scene you imagine, with details."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="min-h-[50px] bg-transparent border-none text-[13px] leading-relaxed resize-none p-0 placeholder:text-zinc-700 focus-visible:ring-5 w-full overflow-hidden"
                                />
                                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                                    <button
                                        onClick={() => setEnhanceOn(!enhanceOn)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-[11px] font-bold",
                                            enhanceOn ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-6 h-3.5 rounded-full relative transition-colors duration-200 border border-white/10",
                                            enhanceOn ? "bg-[#D1F349]" : "bg-black"
                                        )}>
                                            <div className={cn(
                                                "absolute top-0.5 bottom-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all transform",
                                                enhanceOn ? "right-0.5" : "left-0.5"
                                            )} />
                                        </div>
                                        <span>Enhance {enhanceOn ? 'on' : 'off'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 4. MODEL & SECONDARY (Row rows) */}
                        <div className="flex flex-col gap-1">
                            {/* Model */}
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center justify-between w-full h-12 px-3 bg-[#0D0D0D]/50 hover:bg-zinc-800/80 rounded-xl border border-white/5 transition-colors group">
                                        <div className="flex flex-col items-start translate-y-[1px]">
                                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Model</span>
                                            <span className="text-[12px] font-bold text-white group-hover:text-white truncate max-w-[180px]">
                                                {selectedModelObj?.name || model}
                                            </span>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-600 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] bg-zinc-950 border-zinc-900 z-[100]" sideOffset={5}>
                                    {(mode === 'image' ? imageModels : videoModels).map((m) => (
                                        <DropdownMenuItem
                                            key={m.id}
                                            onClick={() => setModel(m.shortId)}
                                            className="flex items-center justify-between cursor-pointer focus:bg-zinc-900 text-[12px]"
                                        >
                                            <span className={cn(m.shortId === model && "text-[#D1F349]")}>{m.name}</span>
                                            {m.shortId === model && <Check className="w-3.5 h-3.5 text-[#D1F349]" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="grid grid-cols-2 gap-1">
                                {/* Duration */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center justify-between h-12 px-3 bg-[#0D0D0D]/50 hover:bg-zinc-800/80 rounded-xl border border-white/5 transition-colors group">
                                            <div className="flex flex-col items-start translate-y-[1px]">
                                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Duration</span>
                                                <span className="text-[12px] font-bold text-white">{duration}</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-zinc-600 transition-transform group-hover:translate-x-0.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-zinc-950 border-zinc-900 text-white z-[70] min-w-[100px]">
                                        {["5s", "10s"].map(d => (
                                            <DropdownMenuItem key={d} onClick={() => setDuration(d)} className="text-[12px] cursor-pointer focus:bg-zinc-900">
                                                {d}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Ratio */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center justify-between h-12 px-3 bg-[#0D0D0D]/50 hover:bg-zinc-800/80 rounded-xl border border-white/5 transition-colors group">
                                            <div className="flex flex-col items-start translate-y-[1px]">
                                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Aspect Ratio</span>
                                                <span className="text-[12px] font-bold text-white">{aspectRatio}</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-zinc-600 transition-transform group-hover:translate-x-0.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-zinc-950 border-zinc-900 text-white z-[70] min-w-[100px]">
                                        {["1:1", "4:5", "16:9", "9:16"].map(r => (
                                            <DropdownMenuItem key={r} onClick={() => setAspectRatio(r)} className="text-[12px] cursor-pointer focus:bg-zinc-900">
                                                {renderRatioVisual(r)} {r}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- FOOTER --- */}
            {/* --- FOOTER --- */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-transparent flex items-center gap-2">
                <button
                    onClick={() => !isFreeTier && setIsPublic(!isPublic)}
                    className={cn(
                        "h-10 flex items-center gap-2 px-3 rounded-[1rem] transition-all border group relative overflow-hidden",
                        isFreeTier
                            ? "bg-zinc-900/50 text-zinc-700 cursor-not-allowed border-transparent opacity-50"
                            : isPublic
                                ? "bg-zinc-800/20 text-zinc-400 border-white/5 hover:border-white/10"
                                : "bg-[#251212] text-[#FF8A8A] border-[#FF8A8A]/10 shadow-[inner_0_2px_12px_rgba(0,0,0,0.5)] active:scale-[0.98]"
                    )}
                    disabled={isFreeTier}
                >
                    {!isPublic && <div className="absolute inset-x-0 bottom-0 h-1/2 bg-red-500/10 blur-xl pointer-events-none" />}
                    {isPublic ? <Globe className="w-2.5 h-2.5 opacity-40" /> : <Lock className="w-2.5 h-2.5 stroke-[2.5]" />}
                    <span className="text-[9px] font-black uppercase tracking-[0.1em] relative z-20">
                        {isPublic ? 'Public' : 'Private'}
                    </span>
                </button>

                <Button
                    onClick={onGenerate}
                    disabled={isProcessing}
                    className={cn(
                        "flex-1 h-10 font-black transition-all rounded-[1rem] shadow-2xl flex items-center justify-center border-none overflow-hidden",
                        "bg-[#D1F349] hover:bg-[#c2e340] text-black active:scale-[0.98] shadow-[#D1F349]/20",
                        "disabled:bg-zinc-800 disabled:text-zinc-600 shadow-none px-3"
                    )}
                >
                    {isProcessing ? <Loader2 className="animate-spin w-4 h-4" /> : (
                        <div className="flex items-center justify-between w-full h-full gap-1.5">
                            <span className="text-[10px] uppercase tracking-wide">Generate</span>
                            <div className="flex items-center gap-1 bg-black/10 px-2.5 py-1 rounded-full border border-black/5 mr-[-2px] shadow-inner h-7">
                                <Coins className="w-2.5 h-2.5 stroke-[2.5] opacity-60" />
                                <span className="text-[11px] font-bold">{(selectedModelObj as any).cost || 1}</span>
                            </div>
                        </div>
                    )}
                </Button>
            </div>
        </div>
    );
}


