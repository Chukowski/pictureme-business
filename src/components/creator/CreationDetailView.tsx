import React, { useState, useEffect, useRef } from 'react';
// CDN service for public content (Cloudflare Image Resizing)
import { getViewUrl as getOptimizedUrl, getThumbnailUrl, getAvatarUrl } from "@/services/cdn";
import {
    X, Copy, RefreshCw, Save, Download,
    ChevronDown, Trash2, Maximize2, Wand2,
    Globe, Lock, Info, ChevronUp, Loader2,
    User, Cpu
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Drawer,
    DrawerContent,
} from "@/components/ui/drawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipProvider,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from 'react-router-dom';

export interface GalleryItem {
    id: string | number;
    url: string;
    previewUrl?: string;
    type: 'image' | 'video';
    timestamp?: number;
    prompt?: string;
    model?: string;
    ratio?: string;
    duration?: string;
    shareCode?: string;
    isPublic?: boolean;
    status?: 'completed' | 'processing' | 'failed';
    jobId?: number;
    template?: {
        id: string;
        name: string;
        image: string;
    };
    // Creator Info (for public feed)
    creator_username?: string;
    creator_avatar?: string;
    creator_slug?: string;
    creator_user_id?: string | number;
    isOwner?: boolean;
    parent_id?: number | string;
    parent_username?: string;
    meta?: any;
    metadata?: any;
}

interface CreationDetailViewProps {
    items: GalleryItem[];
    initialIndex: number;
    open: boolean;
    onClose: () => void;
    onTogglePublic?: (item: GalleryItem) => void;
    onReusePrompt: (item: GalleryItem) => void;
    onUseAsTemplate?: (item: GalleryItem) => void;
    onDownload: (item: GalleryItem) => void;
    onDelete?: (id: string | number) => void;
}

const slideVariants = {
    enter: (direction: number) => ({
        y: direction > 0 ? '100%' : '-100%',
        opacity: 0,
    }),
    center: {
        zIndex: 1,
        y: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        zIndex: 0,
        y: direction < 0 ? '100%' : '-100%',
        opacity: 0,
    }),
};

export function CreationDetailView({
    items,
    initialIndex,
    open,
    onClose,
    onTogglePublic,
    onReusePrompt,
    onUseAsTemplate,
    onDownload,
    onDelete
}: CreationDetailViewProps) {
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [direction, setDirection] = useState(0);
    const [isPromptExpanded, setIsPromptExpanded] = useState(false);
    const [showUI, setShowUI] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const touchStartY = useRef(0);

    // Sync index when open changes or initialIndex changes
    useEffect(() => {
        if (open) {
            setCurrentIndex(initialIndex);
            setDirection(0);
            setIsPromptExpanded(false);
            setShowUI(true);
        }
    }, [open, initialIndex]);

    const handleNext = () => {
        if (currentIndex < items.length - 1) {
            setDirection(1);
            setCurrentIndex(prev => prev + 1);
            setIsPromptExpanded(false);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(prev => prev - 1);
            setIsPromptExpanded(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!open) return;
        if (e.key === 'ArrowUp') handlePrev();
        if (e.key === 'ArrowDown') handleNext();
        if (e.key === 'Escape') onClose();
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, currentIndex, items.length]);

    const item = items[currentIndex];

    const renderContent = () => {
        if (!item || !open) return null;

        const formatModelName = (modelId: string) => {
            if (!modelId) return "AI Model";
            // Handle FAL model IDs like "fal-ai/nano-banana/edit" or "fal-ai/seedream-2.0"
            const parts = modelId.replace('fal-ai/', '').split('/');
            // Take the model name part (usually the first after removing provider)
            const modelPart = parts[0] || parts[parts.length - 1];
            // Convert kebab-case to Title Case
            return modelPart
                .split('-')
                .filter(word => word && !['ai', 'fal', 'v1', 'v2'].includes(word.toLowerCase()))
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        };

        const onTouchStart = (e: React.TouchEvent) => {
            touchStartY.current = e.touches[0].clientY;
        };

        const onTouchEnd = (e: React.TouchEvent) => {
            const touchEndY = e.changedTouches[0].clientY;
            const delta = touchStartY.current - touchEndY;
            if (Math.abs(delta) > 50) {
                if (delta > 0) handleNext();
                else handlePrev();
            }
        };

        const onWheel = (e: React.WheelEvent) => {
            if (Math.abs(e.deltaY) > 30) {
                if (e.deltaY > 0) handleNext();
                else handlePrev();
            }
        };

        const goToProfile = (e: React.MouseEvent) => {
            e.stopPropagation();
            const identifier = item.creator_slug || item.creator_username || item.creator_user_id;
            if (identifier) {
                onClose();
                navigate(`/profile/${identifier}`);
            }
        };

        return (
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
                <motion.div
                    key={item.id}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{
                        y: { type: "tween", duration: 0.4, ease: [0.32, 0.72, 0, 1] },
                        opacity: { duration: 0.3 }
                    }}
                    className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-0 z-0 overflow-hidden touch-none"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    onWheel={onWheel}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowUI(!showUI);
                    }}
                >
                    {/* Immersive Background */}
                    <div className="absolute inset-0 opacity-40 blur-3xl scale-110 pointer-events-none transition-all duration-700">
                        <img
                            key={`bg-${item.id}`}
                            src={getThumbnailUrl(item.previewUrl || item.url, 400)}
                            className="w-full h-full object-cover"
                            alt=""
                        />
                    </div>

                    {/* Main Visual */}
                    <div className="relative w-full h-full flex items-center justify-center p-0" onClick={() => setShowUI(!showUI)}>
                        {item.type === 'video' ? (
                            <video
                                key={item.id}
                                src={item.url}
                                controls={false}
                                className="h-full w-full object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                                autoPlay
                                loop
                                playsInline
                            />
                        ) : (
                            <img
                                src={getOptimizedUrl(item.previewUrl || item.url, 1200)}
                                className="h-full w-full object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.5)] scale-100"
                                alt="Preview"
                            />
                        )}
                    </div>

                    {/* --- ITEM OVERLAYS --- */}
                    <div className={cn(
                        "absolute top-0 left-0 right-0 p-6 flex items-start justify-between z-50 transition-all duration-500",
                        !showUI ? "-translate-y-20 opacity-0" : "translate-y-0 opacity-100"
                    )}>
                        <div className="w-10 h-10" />
                        <div className="flex flex-col items-end gap-2 text-right">
                            {/* Counter only for Owner (Gallery View) */}
                            {item.isOwner && (
                                <Badge className="bg-[#D1F349] text-black font-black px-3 py-1 text-[10px] tracking-widest border-none shadow-lg">
                                    {currentIndex + 1} / {items.length}
                                </Badge>
                            )}

                            {/* Projected Model Metadata */}
                            <div className="flex items-center gap-2 bg-[#101112]/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5 shadow-2xl">
                                <Cpu className="w-3 h-3 text-[#D1F349]" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                    {formatModelName(item.model || "")}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={cn(
                        "absolute bottom-0 left-0 w-full p-6 md:p-8 z-40 transition-all duration-500 bg-gradient-to-t from-[#101112]/95 via-[#101112]/40 to-transparent pt-32 pb-12",
                        !showUI ? "translate-y-20 opacity-0" : "translate-y-0 opacity-100"
                    )}>
                        <div className="space-y-4 max-w-2xl">
                            {/* Creator Byline - Always visible on mobile and desktop */}
                            {(item.creator_username || item.creator_avatar) && !item.isOwner && (
                                <div className="flex items-center gap-3 mb-2 group/creator cursor-pointer w-fit" onClick={goToProfile}>
                                    <div className="w-10 h-10 rounded-full border-2 border-[#D1F349]/50 overflow-hidden bg-zinc-800 shadow-lg group-hover/creator:scale-110 transition-transform">
                                        {item.creator_avatar ? (
                                            <img src={getAvatarUrl(item.creator_avatar, 48)} className="w-full h-full object-cover" alt={item.creator_username} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                                                {item.creator_username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-black text-sm tracking-tight drop-shadow-md">@{item.creator_username}</span>
                                        <span className="text-[#D1F349] text-[10px] font-bold uppercase tracking-widest leading-none opacity-80">View Profile</span>
                                    </div>
                                </div>
                            )}

                            {/* Remix Attribution */}
                            {item.parent_username && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center gap-1.5 opacity-80 group/remix cursor-pointer hover:opacity-100 transition-all w-fit -mt-2 ml-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                        navigate(`/profile/${item.parent_username}`);
                                    }}
                                >
                                    <RefreshCw className="w-3 h-3 text-[#D1F349]" />
                                    <span className="text-white/60 text-[10px] font-bold leading-none">
                                        remixed from <span className="text-[#D1F349] group-hover/remix:underline">@{item.parent_username}</span>
                                    </span>
                                </motion.div>
                            )}

                            {/* Projected Real Prompt */}
                            <div className="relative group/prompt">
                                {item.prompt ? (
                                    <>
                                        <div
                                            className={cn(
                                                "text-white/90 text-sm md:text-base font-bold leading-relaxed drop-shadow-md cursor-pointer transition-all pr-12 md:pr-0",
                                                !isPromptExpanded && "line-clamp-2"
                                            )}
                                            onClick={(e) => { e.stopPropagation(); setIsPromptExpanded(!isPromptExpanded); }}
                                        >
                                            {item.prompt}
                                        </div>
                                        <div className="mt-1 flex items-center gap-2 opacity-0 group-hover/prompt:opacity-100 transition-opacity">
                                            <span className="text-[10px] font-black text-[#D1F349] uppercase tracking-widest">Original Prompt</span>
                                        </div>

                                        {/* Model Parameters - show when expanded */}
                                        {isPromptExpanded && item.meta?.model_params && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {item.meta.model_params.guidance_scale && (
                                                    <span className="text-[9px] font-bold text-white/50 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                                                        CFG: {item.meta.model_params.guidance_scale}
                                                    </span>
                                                )}
                                                {item.meta.model_params.num_inference_steps && (
                                                    <span className="text-[9px] font-bold text-white/50 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                                                        Steps: {item.meta.model_params.num_inference_steps}
                                                    </span>
                                                )}
                                                {item.meta.model_params.seed && (
                                                    <span className="text-[9px] font-bold text-white/50 bg-white/5 px-2 py-1 rounded-full border border-white/10">
                                                        Seed: {item.meta.model_params.seed}
                                                    </span>
                                                )}
                                                {item.meta.template_name && (
                                                    <span className="text-[9px] font-bold text-[#D1F349]/70 bg-[#D1F349]/10 px-2 py-1 rounded-full border border-[#D1F349]/20">
                                                        Template: {item.meta.template_name}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2 text-white/40">
                                        <Lock className="w-4 h-4" />
                                        <span className="text-sm font-medium">Login to view prompt details</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                {item.isOwner && onTogglePublic && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onTogglePublic(item); }}
                                        className="flex items-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/10 transition-colors"
                                    >
                                        {item.isPublic ? <Globe className="w-3 h-3 text-[#D1F349]" /> : <Lock className="w-3 h-3 text-zinc-400" />}
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", item.isPublic ? "text-[#D1F349]" : "text-zinc-600")}>
                                            {item.isPublic ? "Public" : "Private"}
                                        </span>
                                    </button>
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(item.prompt || "");
                                        toast.success("Prompt copied!");
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 shadow-inner"
                                >
                                    <Copy className="w-3.5 h-3.5 text-white/40" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons Column with Enhanced Blur Panel */}
                    <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 right-6 p-2 rounded-full z-50 transition-all duration-500",
                        !showUI ? "translate-x-24 opacity-0" : "translate-x-0 opacity-100"
                    )}>
                        <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl" />

                        <div className="relative flex flex-col items-center gap-5 py-6 px-1">
                            <TooltipProvider delayDuration={0}>
                                <div className="flex flex-col items-center gap-6">
                                    <ActionButton icon={Wand2} label="Remix" variant="primary" onClick={() => onReusePrompt(item)} />

                                    {onUseAsTemplate && (
                                        <ActionButton icon={Save} label="Library" onClick={() => onUseAsTemplate(item)} />
                                    )}

                                    <ActionButton icon={Download} label="Get" onClick={() => onDownload(item)} />

                                    {item.isOwner && onDelete && (
                                        <ActionButton icon={Trash2} label="Delete" variant="danger" onClick={() => onDelete(item.id)} />
                                    )}
                                </div>
                            </TooltipProvider>

                            <div className="w-px h-8 bg-white/10 mt-1" />

                            <button
                                onClick={(e) => { e.stopPropagation(); setShowUI(false); }}
                                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/40 hover:text-white border border-white/10 group transition-all hover:scale-110 active:scale-95"
                            >
                                <Info className="w-5 h-5 transition-transform" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[9999] bg-[#101112] overflow-hidden flex flex-col">
                    <div className={cn(
                        "absolute top-6 left-6 z-[110] transition-opacity duration-500",
                        !showUI ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-[#101112]/40 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-all border border-white/10 hover:bg-[#101112]/60 active:scale-90"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div
                        ref={containerRef}
                        className="relative flex-1 bg-[#101112] overflow-hidden touch-none select-none"
                    >
                        {renderContent()}
                    </div>

                    <div className={cn(
                        "absolute left-1/2 -translate-x-1/2 bottom-20 flex flex-col items-center gap-1 transition-all duration-500 pointer-events-none z-[110]",
                        !showUI ? "opacity-0" : "opacity-50"
                    )}>
                        {currentIndex > 0 && <ChevronUp className="w-4 h-4 text-white animate-bounce-slow" />}
                        <div className="h-10 w-[2px] bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                        {currentIndex < items.length - 1 && <ChevronDown className="w-4 h-4 text-white animate-bounce" />}
                    </div>

                    {!showUI && (
                        <div
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer animate-bounce opacity-50 hover:opacity-100 transition-opacity z-[110]"
                            onClick={() => setShowUI(true)}
                        >
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Show Details</span>
                            <ChevronUp className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>
            )}
        </AnimatePresence>
    );
}

function ActionButton({ onClick, icon: Icon, label, variant = "default" }: any) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                    className="group flex flex-col items-center justify-center gap-1.5 transition-all active:scale-90"
                >
                    <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all border border-white/10",
                        variant === "primary" ? "bg-[#D1F349] text-black border-none shadow-[0_0_20px_rgba(209,243,73,0.3)]" : "bg-white/10 text-white hover:bg-white/20",
                        variant === "danger" && "hover:bg-red-500/20 text-red-500"
                    )}>
                        <Icon className={cn("w-5 h-5", variant === "primary" && "fill-current")} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-white/50 group-hover:text-white drop-shadow-md transition-colors">
                        {label}
                    </span>
                </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-card border border-white/10 text-white font-bold text-xs uppercase tracking-widest px-4 py-2">
                {label}
            </TooltipContent>
        </Tooltip>
    );
}
