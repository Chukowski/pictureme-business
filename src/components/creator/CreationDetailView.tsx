import React, { useState, useEffect, useRef } from 'react';
import {
    X, Copy, RefreshCw, Save, Download,
    ChevronDown, Trash2, Maximize2, Wand2,
    Globe, Lock, Info, ChevronUp, Loader2
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

export interface HistoryItem {
    id: string;
    url: string;
    previewUrl?: string;
    type: 'image' | 'video';
    timestamp: number;
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
}

interface CreationDetailViewProps {
    items: HistoryItem[];
    initialIndex: number;
    open: boolean;
    onClose: () => void;
    onTogglePublic: (item: HistoryItem) => void;
    onReusePrompt: (item: HistoryItem) => void;
    onUseAsTemplate: (item: HistoryItem) => void;
    onDownload: (item: HistoryItem) => void;
    onDelete: (id: string) => void;
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

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!open) return;
            if (e.key === 'ArrowUp') handlePrev();
            if (e.key === 'ArrowDown') handleNext();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, currentIndex, items.length]);

    const item = items[currentIndex];

    // Final safety check for rendering only
    const renderContent = () => {
        if (!item || !open) return null;

        const formatModelName = (modelId: string) => {
            if (!modelId) return "Unknown Model";
            const parts = modelId.split('/');
            const last = parts[parts.length - 1];
            return last.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
                    className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-0 md:p-12 z-0 overflow-hidden"
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                    onWheel={onWheel}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowUI(!showUI);
                    }}
                >
                    {/* Immersive Background (Full compressed version) */}
                    <div className="absolute inset-0 opacity-40 blur-3xl scale-110 pointer-events-none transition-all duration-700">
                        <img
                            key={`bg-${item.id}`}
                            src={item.previewUrl || item.url}
                            className="w-full h-full object-cover"
                            alt=""
                        />
                    </div>

                    {/* Main Visual - Optimized Performance */}
                    <div className="relative w-full h-full flex items-center justify-center p-0 md:p-8" onClick={() => setShowUI(!showUI)}>
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
                            <div className="relative h-full w-full flex items-center justify-center">
                                {/* Compressed Preview Only for Gallery Navigation Speed */}
                                <img
                                    src={item.previewUrl || item.url}
                                    className="h-full w-full object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.5)] scale-100"
                                    alt="Preview"
                                />
                            </div>
                        )}
                    </div>

                    {/* --- ITEM OVERLAYS --- */}
                    <div className={cn(
                        "absolute top-0 left-0 right-0 p-6 flex items-start justify-between z-50 transition-all duration-500",
                        !showUI ? "-translate-y-20 opacity-0" : "translate-y-0 opacity-100"
                    )}>
                        <div className="w-10 h-10" />
                        <div className="flex flex-col items-end gap-2 text-right">
                            <Badge className="bg-[#D1F349] text-black font-black px-3 py-1 text-[10px] tracking-widest border-none shadow-lg">
                                {currentIndex + 1} / {items.length}
                            </Badge>
                            <div className="text-[10px] font-black text-white/50 uppercase tracking-tighter bg-black/40 backdrop-blur-md px-2 py-0.5 rounded border border-white/5">
                                {formatModelName(item.model || "")}
                            </div>
                        </div>
                    </div>

                    <div className={cn(
                        "absolute bottom-0 left-0 w-full md:max-w-xl p-6 md:p-8 z-40 transition-all duration-500 bg-gradient-to-t from-black/95 via-black/40 to-transparent pt-32 pb-12",
                        !showUI ? "translate-y-20 opacity-0" : "translate-y-0 opacity-100"
                    )}>
                        <div className="space-y-4">
                            <div
                                className={cn(
                                    "text-white/90 text-sm md:text-base font-bold leading-relaxed drop-shadow-md cursor-pointer transition-all pr-12 md:pr-0",
                                    !isPromptExpanded && "line-clamp-2"
                                )}
                                onClick={(e) => { e.stopPropagation(); setIsPromptExpanded(!isPromptExpanded); }}
                            >
                                {item.prompt}
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onTogglePublic(item); }}
                                    className="flex items-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/10 transition-colors"
                                >
                                    {item.isPublic ? <Globe className="w-3 h-3 text-[#D1F349]" /> : <Lock className="w-3 h-3 text-zinc-400" />}
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", item.isPublic ? "text-[#D1F349]" : "text-zinc-600")}>
                                        {item.isPublic ? "Public" : "Private"}
                                    </span>
                                </button>

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

                    <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 right-6 flex flex-col items-center gap-7 z-50 transition-all duration-500",
                        !showUI ? "translate-x-24 opacity-0" : "translate-x-0 opacity-100"
                    )}>
                        <TooltipProvider delayDuration={0}>
                            <div className="flex flex-col items-center gap-6">
                                <ActionButton icon={Wand2} label="Remix" variant="primary" onClick={() => onReusePrompt(item)} />
                                <ActionButton icon={Save} label="Library" onClick={() => onUseAsTemplate(item)} />
                                <ActionButton icon={Download} label="Get" onClick={() => onDownload(item)} />
                                <ActionButton icon={Trash2} label="Delete" variant="danger" onClick={() => onDelete(item.id)} />
                            </div>
                        </TooltipProvider>

                        <div className="w-px h-8 bg-white/10 mt-2" />

                        <button
                            onClick={(e) => { e.stopPropagation(); setShowUI(false); }}
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/40 hover:text-white border border-white/5 group transition-all hover:scale-110 active:scale-95"
                        >
                            <Info className="w-5 h-5 transition-transform" />
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col">
                    <div className={cn(
                        "absolute top-6 left-6 z-[110] transition-opacity duration-500",
                        !showUI ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white transition-all border border-white/10 hover:bg-black/60 active:scale-90"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div
                        ref={containerRef}
                        className="relative flex-1 bg-black overflow-hidden touch-none select-none"
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
                        variant === "primary" ? "bg-[#D1F349] text-black border-none shadow-[0_0_20px_rgba(209,243,73,0.3)]" : "bg-black/40 text-white hover:bg-black/60",
                        variant === "danger" && "hover:bg-red-500/20 text-red-500"
                    )}>
                        <Icon className={cn("w-5 h-5", variant === "primary" && "fill-current")} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tighter text-white/50 group-hover:text-white drop-shadow-md transition-colors">
                        {label}
                    </span>
                </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="bg-zinc-900 border border-white/10 text-white font-bold text-xs uppercase tracking-widest px-4 py-2">
                {label}
            </TooltipContent>
        </Tooltip>
    );
}
