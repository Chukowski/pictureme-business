import React from 'react';
import { Eye, EyeOff, List, LayoutGrid, Filter, ImageIcon, Video, Layers } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GalleryHeaderProps {
    showActions: boolean;
    setShowActions: (show: boolean) => void;
    viewMode: 'grid' | 'list';
    setViewMode: (mode: 'grid' | 'list') => void;
    zoomLevel: number[];
    setZoomLevel: (level: number[]) => void;
    mediaType: 'all' | 'image' | 'video';
    setMediaType: (type: 'all' | 'image' | 'video') => void;
}

export const GalleryHeader = ({
    showActions,
    setShowActions,
    viewMode,
    setViewMode,
    zoomLevel,
    setZoomLevel,
    mediaType,
    setMediaType
}: GalleryHeaderProps) => {
    return (
        <div className="sticky top-0 w-full bg-[#101112]/80 backdrop-blur-xl p-3 px-4 md:px-10 md:py-6 border-b border-white/5 z-30 transition-all duration-300">
            <div className="max-w-[1800px] mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center justify-between md:justify-start gap-4 md:gap-8 min-w-0 flex-1">
                    <div className="flex items-center gap-2 md:gap-4">
                        <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter shrink-0">Gallery</h2>

                        {/* Mobile Filter Toggle - Now right next to the title */}
                        <div className="md:hidden">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition-all active:scale-95">
                                        <Filter className="w-3.5 h-3.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-40 bg-[#1A1B1E] border-white/10 text-white p-1 rounded-xl shadow-2xl z-[100]">
                                    <DropdownMenuItem
                                        onClick={() => setMediaType('all')}
                                        className={cn("flex items-center gap-2 p-2 rounded-lg cursor-pointer", mediaType === 'all' ? "bg-white/10 text-[#D1F349]" : "hover:bg-white/5")}
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">All Creations</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setMediaType('image')}
                                        className={cn("flex items-center gap-2 p-2 rounded-lg cursor-pointer", mediaType === 'image' ? "bg-indigo-500/10 text-indigo-400" : "hover:bg-white/5")}
                                    >
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Only Images</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => setMediaType('video')}
                                        className={cn("flex items-center gap-2 p-2 rounded-lg cursor-pointer", mediaType === 'video' ? "bg-[#D1F349]/10 text-[#D1F349]" : "hover:bg-white/5")}
                                    >
                                        <Video className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Only Videos</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Desktop Media Type Filter */}
                    <div className="hidden md:flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5 shrink-0">
                        <button
                            onClick={() => setMediaType('all')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                mediaType === 'all' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-400"
                            )}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setMediaType('image')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                mediaType === 'image' ? "bg-indigo-500/20 text-indigo-400" : "text-zinc-500 hover:text-zinc-400"
                            )}
                        >
                            Images
                        </button>
                        <button
                            onClick={() => setMediaType('video')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                mediaType === 'video' ? "bg-[#D1F349]/20 text-[#D1F349]" : "text-zinc-500 hover:text-zinc-400"
                            )}
                        >
                            Videos
                        </button>
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                        <button
                            onClick={() => setShowActions(!showActions)}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                showActions ? "bg-white/10 text-white" : "text-zinc-500"
                            )}
                            title={showActions ? "Hide Actions" : "Show Actions"}
                        >
                            {showActions ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "p-1.5 rounded-lg transition-all md:hidden",
                                viewMode === 'list' ? "bg-white/10 text-white" : "text-zinc-500"
                            )}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "p-1.5 rounded-lg transition-all md:hidden",
                                viewMode === 'grid' ? "bg-[#D1F349] text-black" : "text-zinc-500"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Zoom Slider - Hidden on small mobile if too crowded */}
                    <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5 min-w-[160px]">
                        <LayoutGrid className="w-3.5 h-3.5 text-zinc-500" />
                        <Slider
                            value={zoomLevel}
                            onValueChange={setZoomLevel}
                            min={2}
                            max={6}
                            step={1}
                            className="[&_.bg-primary]:bg-[#D1F349] [&_.border-primary]:border-[#D1F349]"
                        />
                        <span className="text-[10px] font-bold text-zinc-500 w-4">{zoomLevel[0]}</span>
                    </div>

                    {/* Desktop View Toggles */}
                    <div className="hidden md:flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                viewMode === 'list' ? "bg-white/10 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <List className="w-3.5 h-3.5" />
                            List
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                viewMode === 'grid' ? "bg-[#D1F349] text-black shadow-md" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Grid
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
