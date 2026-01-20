import React, { useState } from 'react';
import { Sparkles, Loader2, Wand2, Download, History, BookOpen, ImageIcon, Video, CheckCircle2, Maximize2, LayoutGrid, List, Clock } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { GalleryItem } from '@/components/creator/CreationDetailView';
// CDN service for public content (Cloudflare Image Resizing)
import { getThumbnailUrl, getVideoUrl } from "@/services/cdn";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface TimelineViewProps {
    history: GalleryItem[];
    isProcessing: boolean;
    statusMessage: string;
    parent_id?: number | string;
    parent_username?: string;
    meta?: any;
    metadata?: any;
    setPreviewItem: (item: GalleryItem) => void;
    onReusePrompt: (item: GalleryItem) => void;
    onDownload: (item: GalleryItem) => void;
    mode?: 'image' | 'video' | 'booth';
}

export const TimelineView = ({
    history,
    isProcessing,
    statusMessage,
    setPreviewItem,
    onReusePrompt,
    onDownload,
    mode = 'image'
}: TimelineViewProps) => {
    const [activeTab, setActiveTab] = useState<'history' | 'guide'>('history');
    const [zoomLevel, setZoomLevel] = useState([5]); // 3 columns by default
    const [listSplitRatio, setListSplitRatio] = useState([400]); // Width of info panel in px
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [fitToScreen, setFitToScreen] = useState(false);

    const resolveModelName = (modelId: string | undefined) => {
        if (!modelId) return "AI Model";
        const parts = modelId.replace('fal-ai/', '').split('/');
        const modelPart = parts[0] || parts[parts.length - 1];
        return modelPart
            .split('-')
            .filter(word => word && !['ai', 'fal', 'v1', 'v2', 'lora'].includes(word.toLowerCase()))
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const formatDate = (ts: number | undefined) => {
        if (!ts) return '';
        return new Date(ts).toLocaleDateString("en-US", {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    return (
        <div className={cn(
            "hidden md:flex flex-col fixed z-20 overflow-hidden transition-all duration-300",
            // Vertical alignment: Matches Sidebar exactly (top-100px, bottom-8)
            "md:top-[80px] md:bottom-0",
            // Horizontal alignment: Starts after Sidebar (48px left + 300px width + 16px gap = 364px) and stretches wide
            "md:left-[405px] md:right-4 gap-2",
            // Layout (No Card Styling on wrapper)
            "pointer-events-none"
        )}>
            {/* Canvas Header - Floating Card */}
            <div className="flex items-center justify-between p-2 bg-[#101112] rounded-2xl border border-white/10 shadow-xl z-20 shrink-0 pointer-events-auto">
                {/* Subcard: Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-[#1A1A1A] rounded-xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-tight transition-all",
                            activeTab === 'history'
                                ? "bg-[#333333] text-white shadow-lg"
                                : "bg-transparent text-zinc-500 hover:text-zinc-400"
                        )}
                    >
                        <History className="w-3.5 h-3.5" />
                        History
                    </button>
                    <button
                        onClick={() => setActiveTab('guide')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-tight transition-all",
                            activeTab === 'guide'
                                ? "bg-[#333333] text-white shadow-lg"
                                : "bg-transparent text-zinc-500 hover:text-zinc-400"
                        )}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        How it works
                    </button>
                </div>

                {/* Right side controls - Subcards */}
                <div className="flex items-center gap-2">
                    {/* Subcard: Maximize */}
                    <button
                        onClick={() => setFitToScreen(!fitToScreen)}
                        className={cn(
                            "w-9 h-9 flex items-center justify-center rounded-xl border border-white/5 transition-colors",
                            fitToScreen ? "bg-[#D1F349] text-black border-[#D1F349]" : "bg-[#1A1A1A] text-zinc-500 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>

                    {/* Subcard: Slider */}
                    <div className="h-9 px-4 flex items-center bg-[#1A1A1A] rounded-xl border border-white/5 min-w-[140px]">
                        <Slider
                            value={viewMode === 'list' ? listSplitRatio : zoomLevel}
                            onValueChange={viewMode === 'list' ? setListSplitRatio : setZoomLevel}
                            min={viewMode === 'list' ? 300 : 2}
                            max={viewMode === 'list' ? 800 : 6}
                            step={viewMode === 'list' ? 10 : 1}
                            className="[&_.bg-primary]:bg-[#D1F349] [&_.border-primary]:border-[#D1F349]"
                        />
                    </div>

                    {/* Subcard: View Toggles */}
                    <div className="flex items-center gap-1 p-1 bg-[#1A1A1A] rounded-xl border border-white/5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                viewMode === 'list'
                                    ? "bg-[#333333] text-white shadow-md"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <List className="w-3.5 h-3.5" />
                            List
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                viewMode === 'grid'
                                    ? "bg-[#D1F349] text-black shadow-md border border-[#D1F349]/50"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Grid
                        </button>
                    </div>
                </div>
            </div>

            {/* Canvas Content - Floating Card */}
            <div className="flex-1 overflow-hidden pointer-events-auto relative flex items-start justify-center pt-2">
                {activeTab === 'guide' ? (
                    /* --- HOW IT WORKS / ONBOARDING (Smaller Card) --- */
                    <ScrollArea className="h-full w-full">
                        <div className="flex justify-center pb-20 pt-6">
                            <div className="w-full max-w-4xl bg-[#1A1A1A] rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden group p-10">
                                {/* Decorative Gradient */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#D1F349]/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />

                                <header className="mb-12 relative z-10">
                                    <h1 className="mb-3 font-black text-4xl text-white uppercase tracking-tighter leading-none">
                                        Make <span className="text-[#D1F349]">{mode === 'video' ? 'Videos' : 'Images'}</span> In One Click
                                    </h1>
                                    <p className="text-[15px] text-zinc-400 font-medium max-w-xl leading-relaxed">
                                        {mode === 'video'
                                            ? "Experience the future of creation with our professional tools. High-quality VFX, manual control, and seamless animations."
                                            : "Create stunning visuals with our advanced AI engine. Realistic details, artistic control, and premium models at your fingertips."
                                        }
                                    </p>
                                </header>

                                <div className="grid grid-cols-3 gap-8 relative z-10">
                                    {mode === 'video' ? (
                                        /* VIDEO STEPS */
                                        <>
                                            {/* Step 1 */}
                                            <article className="group/step">
                                                <div className="aspect-[1.3] w-full mb-6 rounded-3xl overflow-hidden bg-card border border-white/5 group-hover/step:border-[#D1F349]/30 transition-all relative">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <ImageIcon className="w-12 h-12 text-[#D1F349]/20 group-hover/step:text-[#D1F349]/40 transition-all group-hover/step:scale-110 duration-500" />
                                                    </div>
                                                    <div className="absolute bottom-4 left-4 right-4">
                                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#D1F349] w-1/3" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500">1</span>
                                                    Add image
                                                </h2>
                                                <p className="text-[13px] text-zinc-500 font-medium leading-normal">
                                                    Upload or generate an image to start your story.
                                                </p>
                                            </article>

                                            {/* Step 2 */}
                                            <article className="group/step">
                                                <div className="aspect-[1.3] w-full mb-6 rounded-3xl overflow-hidden bg-card border border-white/5 group-hover/step:border-[#D1F349]/30 transition-all relative">
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-[#D1F349]/5 to-transparent opacity-50" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Sparkles className="w-12 h-12 text-[#D1F349]/20 group-hover/step:text-[#D1F349]/40 transition-all group-hover/step:scale-110 duration-500" />
                                                    </div>
                                                    <div className="absolute bottom-4 left-4 right-4">
                                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#D1F349] w-2/3" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500">2</span>
                                                    Choose style
                                                </h2>
                                                <p className="text-[13px] text-zinc-500 font-medium leading-normal">
                                                    Pick a preset or use AI to enhance your prompt.
                                                </p>
                                            </article>

                                            {/* Step 3 */}
                                            <article className="group/step">
                                                <div className="aspect-[1.3] w-full mb-6 rounded-3xl overflow-hidden bg-card border border-white/5 group-hover/step:border-[#D1F349]/30 transition-all relative">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#101112] via-[#101112]/40 to-transparent" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Video className="w-12 h-12 text-[#D1F349]/20 group-hover/step:text-[#D1F349]/40 transition-all group-hover/step:scale-110 duration-500" />
                                                    </div>
                                                    <div className="absolute bottom-4 left-4 right-4">
                                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#D1F349] w-full shadow-[0_0_10px_#D1F349]" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <h2 className="text-sm font-black text-[#D1F349] uppercase tracking-tighter mb-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-[#D1F349] flex items-center justify-center text-[10px] text-black border-none">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </span>
                                                    Get video
                                                </h2>
                                                <p className="text-[13px] text-zinc-500 font-medium leading-normal">
                                                    Click generate and let our engine do the magic!
                                                </p>
                                            </article>
                                        </>
                                    ) : (
                                        /* IMAGE STEPS */
                                        <>
                                            {/* Step 1 */}
                                            <article className="group/step">
                                                <div className="aspect-[1.3] w-full mb-6 rounded-3xl overflow-hidden bg-card border border-white/5 group-hover/step:border-[#D1F349]/30 transition-all relative">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Sparkles className="w-12 h-12 text-[#D1F349]/20 group-hover/step:text-[#D1F349]/40 transition-all group-hover/step:scale-110 duration-500" />
                                                    </div>
                                                    <div className="absolute bottom-4 left-4 right-4">
                                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#D1F349] w-1/3" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500">1</span>
                                                    Visualize
                                                </h2>
                                                <p className="text-[13px] text-zinc-500 font-medium leading-normal">
                                                    Describe your vision or upload a reference image.
                                                </p>
                                            </article>

                                            {/* Step 2 */}
                                            <article className="group/step">
                                                <div className="aspect-[1.3] w-full mb-6 rounded-3xl overflow-hidden bg-card border border-white/5 group-hover/step:border-[#D1F349]/30 transition-all relative">
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-[#D1F349]/5 to-transparent opacity-50" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <LayoutGrid className="w-12 h-12 text-[#D1F349]/20 group-hover/step:text-[#D1F349]/40 transition-all group-hover/step:scale-110 duration-500" />
                                                    </div>
                                                    <div className="absolute bottom-4 left-4 right-4">
                                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#D1F349] w-2/3" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <h2 className="text-sm font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500">2</span>
                                                    Configure
                                                </h2>
                                                <p className="text-[13px] text-zinc-500 font-medium leading-normal">
                                                    Select the perfect model, style, and aspect ratio.
                                                </p>
                                            </article>

                                            {/* Step 3 */}
                                            <article className="group/step">
                                                <div className="aspect-[1.3] w-full mb-6 rounded-3xl overflow-hidden bg-card border border-white/5 group-hover/step:border-[#D1F349]/30 transition-all relative">
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#101112] via-[#101112]/40 to-transparent" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <ImageIcon className="w-12 h-12 text-[#D1F349]/20 group-hover/step:text-[#D1F349]/40 transition-all group-hover/step:scale-110 duration-500" />
                                                    </div>
                                                    <div className="absolute bottom-4 left-4 right-4">
                                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-[#D1F349] w-full shadow-[0_0_10px_#D1F349]" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <h2 className="text-sm font-black text-[#D1F349] uppercase tracking-tighter mb-2 flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-[#D1F349] flex items-center justify-center text-[10px] text-black border-none">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </span>
                                                    Create
                                                </h2>
                                                <p className="text-[13px] text-zinc-500 font-medium leading-normal">
                                                    Hit generate and watch your idea come to life.
                                                </p>
                                            </article>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                    </ScrollArea>
                ) : (
                    /* --- HISTORY VIEW --- */
                    <div className="w-full h-full bg-[#1A1A1A] rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-6">
                                {history.length === 0 && !isProcessing ? (
                                    <div className="h-[60vh] flex flex-col items-center justify-center text-zinc-700">
                                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                            <History className="w-8 h-8 opacity-20" />
                                        </div>
                                        <p className="text-sm font-bold uppercase tracking-widest opacity-40">No history yet</p>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setActiveTab('guide')}
                                            className="mt-4 text-[11px] font-black uppercase text-[#D1F349] hover:text-[#D1F349] hover:bg-[#D1F349]/5"
                                        >
                                            Learn how to create
                                        </Button>
                                    </div>
                                ) : viewMode === 'list' ? (
                                    /* --- LIST VIEW LAYOUT --- */
                                    <div className="flex flex-col gap-6 pb-20">
                                        {history.map((item, index) => {
                                            const isHero = (item as any).is_hero || false;
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => item.status === 'completed' && setPreviewItem(item)}
                                                    className="group flex flex-col md:flex-row h-[500px] w-full bg-[#0d0d0d] rounded-[2rem] border border-white/5 overflow-hidden hover:border-white/10 transition-all cursor-pointer"
                                                >
                                                    {/* LEFT COLUMN: MEDIA */}
                                                    <div className="flex-1 relative bg-[#101112] flex items-center justify-center overflow-hidden">
                                                        {item.status === 'completed' ? (
                                                            item.type === 'image' ? (
                                                                <img
                                                                    src={getThumbnailUrl(item.url, 1200)}
                                                                    className="w-full h-full object-contain"
                                                                    loading={isHero ? "eager" : "lazy"}
                                                                    decoding="async"
                                                                    alt={item.prompt}
                                                                />
                                                            ) : (
                                                                <video src={getVideoUrl(item.url)} className="w-full h-full object-contain" controls />
                                                            )
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-3 text-zinc-600">
                                                                <Loader2 className="animate-spin w-8 h-8" />
                                                                <span className="text-xs font-mono uppercase">Processing</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* RIGHT COLUMN: INFO */}
                                                    <div
                                                        className="bg-[#141414] p-8 flex flex-col relative border-l border-white/5 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                                                        style={{ width: listSplitRatio[0] }}
                                                    >
                                                        {/* Model Badge */}
                                                        <div className="flex items-start mb-6">
                                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                                                                <Sparkles className="w-3.5 h-3.5 text-white" />
                                                                <span className="text-[11px] font-bold text-white">
                                                                    {resolveModelName(item.model)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Prompt */}
                                                        <div className="flex-1 overflow-hidden mb-6">
                                                            <p className="text-[15px] font-medium text-zinc-300 leading-relaxed line-clamp-6">
                                                                {item.prompt || "No prompt available"}
                                                            </p>
                                                        </div>

                                                        {/* Style/Input Preview (Mock for now or if item has input image) */}
                                                        <div className="mb-8">
                                                            {item.previewUrl && (
                                                                <div className="w-16 h-16 rounded-2xl bg-indigo-900/20 border border-white/10 flex items-center justify-center overflow-hidden">
                                                                    <img src={getThumbnailUrl(item.previewUrl, 200)} className="w-full h-full object-cover" />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Metadata Grid */}
                                                        <div className="grid grid-cols-3 gap-2 mb-8">
                                                            <div className="flex items-center gap-2 px-3 py-2 bg-[#101112]/40 rounded-lg border border-white/5 text-zinc-400">
                                                                <div className="w-2 h-2 rotate-45 border border-current" />
                                                                <span className="text-[10px] font-bold">1080p</span>
                                                            </div>
                                                            {item.type === 'video' && (
                                                                <div className="flex items-center gap-2 px-3 py-2 bg-[#101112]/40 rounded-lg border border-white/5 text-zinc-400">
                                                                    <Clock className="w-3.5 h-3.5" />
                                                                    <span className="text-[10px] font-bold">{item.duration ? `${item.duration}s` : 'N/A'}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-2 px-3 py-2 bg-[#101112]/40 rounded-lg border border-white/5 text-zinc-400">
                                                                <div className="w-2.5 h-3.5 border border-current rounded-[1px]" />
                                                                <span className="text-[10px] font-bold">{item.ratio || '9:16'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 px-3 py-2 bg-[#101112]/40 rounded-lg border border-white/5 text-zinc-400 col-span-2">
                                                                <span className="text-[10px] font-bold">Seed: {(item as any).meta?.seed || (item as any).seed || 'N/A'}</span>
                                                            </div>
                                                        </div>

                                                        {/* Footer Date */}
                                                        <div className="mt-auto pt-6 border-t border-white/5 text-zinc-500 text-xs font-medium">
                                                            {formatDate(item.timestamp)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    /* --- GRID VIEW LAYOUT (Default) --- */
                                    <div
                                        className="grid gap-6 pb-20"
                                        style={{
                                            gridTemplateColumns: `repeat(${zoomLevel[0]}, minmax(0, 1fr))`
                                        }}
                                    >
                                        {/* Processing Card */}
                                        {isProcessing && (
                                            <div className="aspect-[3/4] bg-[#121212] rounded-xl border-2 border-[#D1F349]/20 flex flex-col items-center justify-center animate-pulse shadow-2xl relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#D1F349]/5 to-transparent" />
                                                <Loader2 className="w-10 h-10 text-[#D1F349] animate-spin mb-4" />
                                                <span className="text-[11px] text-[#D1F349] font-black uppercase tracking-widest">{statusMessage || "Generating..."}</span>
                                            </div>
                                        )}

                                        {history.map((item, index) => {
                                            const isHero = (item as any).is_hero || false;
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => item.status === 'completed' && setPreviewItem(item)}
                                                    className="group relative aspect-[3/4] bg-[#121212] rounded-xl overflow-hidden cursor-pointer hover:ring-2 ring-[#D1F349]/50 transition-all shadow-xl group"
                                                >
                                                    {item.status === 'completed' ? (
                                                        item.type === 'image' ? (
                                                            <img
                                                                src={getThumbnailUrl(item.url, 800)}
                                                                className={cn("w-full h-full transition-transform duration-700 group-hover:scale-105", fitToScreen ? "object-contain bg-[#101112]" : "object-cover")}
                                                                loading={isHero ? "eager" : "lazy"}
                                                                decoding="async"
                                                                alt={item.prompt}
                                                            />
                                                        ) : (
                                                            <video src={getVideoUrl(item.url)} className={cn("w-full h-full", fitToScreen ? "object-contain bg-[#101112]" : "object-cover")} />
                                                        )
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center bg-card/50 text-zinc-700 gap-3">
                                                            <Loader2 className="animate-spin w-8 h-8" />
                                                            <span className="text-[10px] font-black uppercase tracking-tighter">{item.status}</span>
                                                        </div>
                                                    )}

                                                    {item.status === 'completed' && (
                                                        <div className="absolute inset-0 bg-gradient-to-t from-[#101112]/95 via-[#101112]/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                                                            <div className="flex items-center gap-2 mb-4 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onReusePrompt(item); }}
                                                                    className="w-10 h-10 rounded-2xl bg-[#D1F349] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                                                                    title="Remix"
                                                                >
                                                                    <Wand2 className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onDownload(item); }}
                                                                    className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/20 hover:scale-105 active:scale-95 transition-all border border-white/10 shadow-lg"
                                                                    title="Download"
                                                                >
                                                                    <Download className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                            <p className="text-[11px] text-white/60 line-clamp-2 font-bold uppercase tracking-tight leading-tight mb-1">{item.prompt}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>
        </div>
    );
};
