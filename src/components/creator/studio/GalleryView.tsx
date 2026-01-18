import React, { useState, useMemo, useCallback } from 'react';
import { Wand2, Download, LayoutGrid, List, Sparkles, Clock, ChevronRight, Eye, EyeOff, Video, ImageIcon, Save } from 'lucide-react';
import { GalleryItem } from '@/components/creator/CreationDetailView';
import { getThumbnailUrl } from '@/services/imgproxy';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { GalleryHeader } from './GalleryHeader';

interface GalleryViewProps {
    history: GalleryItem[];
    setPreviewItem: (item: GalleryItem) => void;
    onReusePrompt: (item: GalleryItem) => void;
    onDownload: (item: GalleryItem) => void;
    onUseAsTemplate?: (item: GalleryItem) => void;
}

export const GalleryView = ({
    history,
    setPreviewItem,
    onReusePrompt,
    onDownload,
    onUseAsTemplate
}: GalleryViewProps) => {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [zoomLevel, setZoomLevel] = useState([window.innerWidth < 768 ? 2 : 4]);
    const [showActions, setShowActions] = useState(true);
    const [mediaType, setMediaType] = useState<'all' | 'image' | 'video'>('all');

    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            if (mediaType === 'all') return true;
            return item.type === mediaType;
        });
    }, [history, mediaType]);

    const resolveModelName = useCallback((modelId: string | undefined) => {
        if (!modelId) return "AI Model";
        const parts = modelId.replace('fal-ai/', '').split('/');
        const modelPart = parts[0] || parts[parts.length - 1];
        return modelPart
            .split('-')
            .filter(word => word && !['ai', 'fal', 'v1', 'v2', 'lora'].includes(word.toLowerCase()))
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }, []);

    const formatDate = useCallback((ts: number | undefined) => {
        if (!ts) return '';
        return new Date(ts).toLocaleDateString("en-US", {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }, []);

    return (
        <div className="h-full bg-[#101112] overflow-hidden w-full">
            {/* Main Scroll Container - Header sits inside to share scrollbar width alignment */}
            <div className="h-full overflow-y-scroll w-full">
                <GalleryHeader
                    showActions={showActions}
                    setShowActions={setShowActions}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    zoomLevel={zoomLevel}
                    setZoomLevel={setZoomLevel}
                    mediaType={mediaType}
                    setMediaType={setMediaType}
                />

                {/* Content Area */}
                <div className="p-4 md:px-10 md:py-8 min-h-[calc(100%-100px)] w-full">
                    <div className="max-w-[1800px] mx-auto w-full">
                        {filteredHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    {mediaType === 'video' ? <Video className="w-8 h-8 opacity-20" /> : <ImageIcon className="w-8 h-8 opacity-20" />}
                                </div>
                                <p className="text-sm font-black uppercase tracking-widest opacity-40">No {mediaType === 'all' ? 'creations' : mediaType + 's'} found</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div
                                className="grid gap-4 md:gap-6 w-full"
                                style={{
                                    gridTemplateColumns: `repeat(${zoomLevel[0]}, minmax(0, 1fr))`
                                }}
                            >
                                {filteredHistory.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => setPreviewItem(item)}
                                        className="group relative aspect-[3/4] bg-[#121212] rounded-2xl overflow-hidden cursor-pointer hover:ring-2 ring-[#D1F349]/50 transition-all shadow-xl"
                                    >
                                        {item.type === 'image' ? (
                                            <img
                                                src={getThumbnailUrl(item.url, 800)}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                alt={item.prompt || ''}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <video
                                                src={item.url}
                                                poster={getThumbnailUrl(item.url, 800)}
                                                className="w-full h-full object-cover"
                                                muted
                                                playsInline
                                                loop
                                            />
                                        )}

                                        {/* Action Overlay - Conditionally visible */}
                                        <div className={cn(
                                            "absolute inset-0 bg-gradient-to-t from-[#101112]/90 via-[#101112]/20 to-transparent transition-all duration-300 flex flex-col justify-end p-4 md:p-6",
                                            showActions ? (window.innerWidth < 768 ? "opacity-100" : "opacity-0 md:group-hover:opacity-100") : "opacity-0 invisible"
                                        )}>
                                            <div className="flex items-center gap-2 mb-3 md:mb-4 md:translate-y-4 md:group-hover:translate-y-0 transition-transform duration-500">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onReusePrompt(item); }}
                                                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#D1F349] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                                                >
                                                    <Wand2 className="w-4 h-4 md:w-5 md:h-5" />
                                                </button>
                                                {onUseAsTemplate && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onUseAsTemplate(item); }}
                                                        className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/10 backdrop-blur-xl text-white flex items-center justify-center hover:bg-[#D1F349] hover:text-black transition-all border border-white/10 shadow-lg"
                                                        title="Save as Template"
                                                    >
                                                        <Save className="w-4 h-4 md:w-5 md:h-5" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onDownload(item); }}
                                                    className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/10 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/20 hover:scale-105 active:scale-95 transition-all border border-white/10 shadow-lg"
                                                >
                                                    <Download className="w-4 h-4 md:w-5 md:h-5" />
                                                </button>
                                            </div>
                                            <p className="hidden md:block text-[11px] text-white/60 line-clamp-2 font-bold uppercase tracking-tight leading-tight mb-1">{item.prompt}</p>
                                            <span className="md:hidden text-[9px] font-black text-white/40 uppercase tracking-widest">View Details</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* List View - Dynamic Grid (1 or 2 Columns based on Zoom) */
                            <div className={cn(
                                "grid gap-4 pb-20 w-full",
                                zoomLevel[0] >= 4 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
                            )}>
                                {filteredHistory.map((item) => {
                                    // Dynamic Height Logic:
                                    // If 1 Column (Zoom 2-3): Scale from 400px down to 300px
                                    // If 2 Columns (Zoom 4-6): Scale from 450px down to 250px (taller start to compensate for narrower width)
                                    const isTwoCol = zoomLevel[0] >= 4;
                                    const baseHeight = isTwoCol ? 500 : 400;
                                    const reductionFactor = isTwoCol ? ((zoomLevel[0] - 3) * 60) : ((zoomLevel[0] - 2) * 50);
                                    const itemHeight = Math.max(isTwoCol ? 280 : 250, baseHeight - reductionFactor);

                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => setPreviewItem(item)}
                                            className="group flex flex-col md:flex-row bg-[#0d0d0d] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-[#D1F349]/5"
                                            style={{ height: window.innerWidth < 768 ? 'auto' : `${itemHeight}px` }}
                                        >
                                            {/* LEFT COLUMN: MEDIA - 50% Width on Desktop */}
                                            <div className="relative bg-[#101112] overflow-hidden min-h-[240px] md:min-h-0 md:w-1/2 border-r border-white/5">
                                                {item.type === 'image' ? (
                                                    <img
                                                        src={getThumbnailUrl(item.url, 1200)}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                                                        alt={item.prompt || ''}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <video
                                                        src={item.url}
                                                        poster={getThumbnailUrl(item.url, 1200)}
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        playsInline
                                                        loop
                                                    />
                                                )}

                                                {/* Type Badge Overlay */}
                                                <div className="absolute top-3 left-3 md:top-4 md:left-4">
                                                    <div className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2">
                                                        {item.type === 'video' ? <Video className="w-3 h-3 text-[#D1F349]" /> : <ImageIcon className="w-3 h-3 text-indigo-400" />}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* RIGHT COLUMN: INFO - 50% Width on Desktop */}
                                            <div
                                                className="bg-[#141414] p-5 md:p-6 flex flex-col shrink-0 relative transition-all duration-300 md:w-1/2"
                                            >
                                                {/* Model & Date Header */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
                                                        <Sparkles className="w-3 h-3 text-[#D1F349]" />
                                                        <span className="text-[10px] font-bold text-white uppercase tracking-tight">
                                                            {resolveModelName(item.model)}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                                        {formatDate(item.timestamp)}
                                                    </span>
                                                </div>

                                                {/* Prompt Area - Responsive Text Size */}
                                                <div className="flex-1 overflow-hidden relative mb-4">
                                                    <p className={cn(
                                                        "font-medium text-zinc-300 leading-relaxed",
                                                        isTwoCol ? "text-[13px] line-clamp-4" : "text-sm line-clamp-[6]"
                                                    )}>
                                                        {item.prompt || "No prompt available"}
                                                    </p>
                                                    {/* Gradient fade */}
                                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#141414] to-transparent pointer-events-none" />
                                                </div>

                                                {/* Metadata & Actions Footer */}
                                                <div className="mt-auto space-y-4">
                                                    {/* Quick Stats Grid */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-[#101112] rounded-xl border border-white/5 text-zinc-500">
                                                            <Clock className="w-3 h-3" />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">{item.ratio || '9:16'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 px-3 py-2 bg-[#101112] rounded-xl border border-white/5 text-zinc-500">
                                                            <div className="w-3 h-3 border-2 border-current rounded-sm" />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">HD</span>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    {showActions && (
                                                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                                            <Button
                                                                onClick={(e) => { e.stopPropagation(); onReusePrompt(item); }}
                                                                className="flex-1 h-10 rounded-xl bg-[#D1F349] text-black hover:bg-[#b8d63e] font-bold uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95"
                                                            >
                                                                <Wand2 className="w-3.5 h-3.5 mr-2" />
                                                                Remix
                                                            </Button>
                                                            {onUseAsTemplate && (
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={(e) => { e.stopPropagation(); onUseAsTemplate(item); }}
                                                                    className="w-10 h-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-[#D1F349] hover:text-black transition-all flex items-center justify-center p-0"
                                                                >
                                                                    <Save className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="outline"
                                                                onClick={(e) => { e.stopPropagation(); onDownload(item); }}
                                                                className="w-10 h-10 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 transition-all flex items-center justify-center p-0"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
