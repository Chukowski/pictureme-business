import React, { useState } from 'react';
import { Search, X, Filter, Sparkles, Zap, Video, Image as ImageIcon, Check } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface MarketplaceTemplate {
    id: string;
    name: string;
    description?: string;
    prompt?: string;
    preview_url?: string;
    images?: string[];
    preview_images?: string[];
    backgrounds?: string[];
    ai_model?: string;
    aspectRatio?: string;
    type?: "image" | "video";
    media_type?: "image" | "video";
    category?: string;
    is_public?: boolean;
    tags?: string[];
    status?: string;
    pipeline_config?: {
        imageModel?: string;
        videoModel?: string;
        videoEnabled?: boolean;
    };
}

interface TemplateLibraryProps {
    onSelect: (template: MarketplaceTemplate) => void;
    onClose?: () => void;
    marketplaceTemplates?: MarketplaceTemplate[];
    myLibraryTemplates?: MarketplaceTemplate[];
    selectedTemplateId?: string;
}

// Group models for the top filter bar
const MODEL_FILTERS = [
    { id: 'all', name: 'All', icon: Sparkles },
    { id: 'video', name: 'Video Gen', icon: Video },
    { id: 'image', name: 'Image Gen', icon: ImageIcon },
];

export function TemplateLibrary({
    onSelect,
    onClose,
    marketplaceTemplates = [],
    myLibraryTemplates = [],
    selectedTemplateId
}: TemplateLibraryProps) {
    const [activeTab, setActiveTab] = useState<"marketplace" | "library">("marketplace");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeModelFilter, setActiveModelFilter] = useState("all");
    const [activeCategory, setActiveCategory] = useState("All");

    // Flatten templates based on tab
    const templates = activeTab === "marketplace" ? marketplaceTemplates : myLibraryTemplates;

    // Filter logic
    const filteredTemplates = templates.filter(t => {
        if (!t) return false;

        const matchesSearch = !searchQuery || (t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase()));

        // Category matching: Case insensitive, handle undefined, check tags as fallback
        const matchesCategory = activeCategory === "All" ||
            (t.category && t.category.toLowerCase() === activeCategory.toLowerCase()) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase() === activeCategory.toLowerCase())) ||
            (t.name && t.name.toLowerCase().includes(activeCategory.toLowerCase()));

        let matchesModel = true;
        if (activeModelFilter !== 'all') {
            const tType = t.type || t.media_type;
            if (activeModelFilter === 'video') matchesModel = tType === 'video';
            else if (activeModelFilter === 'image') matchesModel = tType === 'image' || !tType; // Default to image if undefined
            else matchesModel = t.ai_model?.includes(activeModelFilter) || false;
        }

        return matchesSearch && matchesCategory && matchesModel;
    });

    const [selectedId, setSelectedId] = useState<string | undefined>(selectedTemplateId);

    // Dynamic Categories based on current tab's templates
    const dynamicCategories = React.useMemo(() => {
        const cats = new Set<string>();
        cats.add("All");
        templates.forEach(t => {
            if (t?.category) {
                const formatted = t.category.charAt(0).toUpperCase() + t.category.slice(1).toLowerCase();
                cats.add(formatted);
            }
            if (t?.tags) {
                t.tags.forEach(tag => {
                    const formatted = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
                    cats.add(formatted);
                });
            }
        });
        if (cats.size <= 1) {
            ["Portrait", "Cinematic", "Fantasy", "Action", "Viral"].forEach(c => cats.add(c));
        }
        return Array.from(cats).slice(0, 15);
    }, [templates]);

    const handleCardClick = (t: MarketplaceTemplate) => {
        setSelectedId(t.id);
    };

    const handleConfirm = () => {
        const t = templates.find(t => t.id === selectedId);
        if (t) {
            onSelect(t);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#09090b] text-white relative z-50 overflow-hidden">
            {/* --- REFINED PREMIUM HEADER --- */}
            <div className="flex-shrink-0 bg-[#0c0c0e]/80 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top,0px)] sticky top-0 z-50">
                {/* Row 1: Top Control Bar */}
                <div className="flex items-center justify-between px-3 h-14">
                    <div className="w-10"></div>

                    <div className="flex bg-[#1a1a1c] rounded-full p-1 border border-white/5 shadow-inner">
                        <button
                            onClick={() => setActiveTab("marketplace")}
                            className={cn(
                                "px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300",
                                activeTab === "marketplace" ? "bg-[#D1F349] text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Marketplace
                        </button>
                        <button
                            onClick={() => setActiveTab("library")}
                            className={cn(
                                "px-5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300",
                                activeTab === "library" ? "bg-[#D1F349] text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Library
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Row 2: Search Area */}
                <div className="px-4 pb-4">
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 transition-colors group-focus-within:text-[#D1F349]" />
                        <Input
                            placeholder={`Search ${activeTab === 'marketplace' ? 'community' : 'my'} styles...`}
                            className="pl-10 h-11 bg-white/5 border-white/5 text-sm focus:border-[#D1F349]/30 focus:ring-0 rounded-2xl text-white w-full placeholder:text-zinc-600 transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Row 3: Horizontal Filter Strip */}
                <div className="bg-black/20 border-t border-white/5 px-4 py-3 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-3 w-fit">
                        {/* Model Filters Segment */}
                        <div className="flex items-center gap-2 pr-3 border-r border-white/10 shrink-0">
                            {MODEL_FILTERS.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setActiveModelFilter(m.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border border-transparent",
                                        activeModelFilter === m.id
                                            ? "bg-[#D1F349]/10 text-[#D1F349] border-[#D1F349]/10"
                                            : "text-zinc-500 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <m.icon className={cn("w-3 h-3", activeModelFilter === m.id ? "opacity-100" : "opacity-40")} />
                                    {m.name}
                                </button>
                            ))}
                        </div>

                        {/* Category Segment */}
                        <div className="flex items-center gap-2 shrink-0">
                            {dynamicCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                                        activeCategory.toLowerCase() === cat.toLowerCase()
                                            ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)] scale-105"
                                            : "bg-transparent text-zinc-500 border-white/10 hover:border-white/20 hover:text-white"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT GRID --- */}
            <ScrollArea className="flex-1 p-4 md:p-6 pb-24 md:pb-12 bg-[#09090b]">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredTemplates.map((t) => (
                        <div
                            key={t.id}
                            onClick={() => handleCardClick(t)}
                            className={cn(
                                "group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer bg-zinc-900 border transition-all duration-500",
                                selectedId === t.id ? "border-[#D1F349] ring-2 ring-[#D1F349]/50 shadow-[0_0_30px_rgba(209,243,73,0.2)]" : "border-white/5 ring-0 hover:border-white/20"
                            )}
                        >
                            {/* Image */}
                            <img
                                src={t.preview_url || t.images?.[0] || t.preview_images?.[0] || "/placeholder.svg"}
                                alt={t.name}
                                onError={(e) => {
                                    e.currentTarget.src = "/placeholder.svg";
                                }}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />

                            {/* Selection Checkmark */}
                            {selectedId === t.id && (
                                <div className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-[#D1F349] flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-300">
                                    <Check className="w-4 h-4 text-black stroke-[3]" />
                                </div>
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                            {/* Content */}
                            <div className="absolute inset-x-0 bottom-0 p-4 transform transition-transform duration-500">
                                <h3 className="text-white font-black text-[12px] uppercase tracking-wider mb-0.5 line-clamp-1 group-hover:line-clamp-none group-hover:text-[#D1F349] transition-colors">
                                    {t.name}
                                </h3>
                                {t.category && (
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">
                                        {t.category}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredTemplates.length === 0 && (
                        <div className="col-span-full h-96 flex flex-col items-center justify-center text-zinc-500 animate-in fade-in duration-1000">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                                <Search className="w-8 h-8 opacity-20" />
                            </div>
                            <h3 className="text-white font-bold mb-1">No styles found</h3>
                            <p className="text-xs">Try adjusting your filters or search terms</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Sticky Next Button */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent z-[60] pointer-events-none flex justify-center pb-10 md:pb-6">
                <Button
                    onClick={handleConfirm}
                    disabled={!selectedId}
                    className={cn(
                        "pointer-events-auto rounded-full px-12 py-7 font-black text-sm uppercase tracking-widest shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 transform",
                        selectedId
                            ? "translate-y-0 opacity-100 bg-[#D1F349] text-black hover:bg-[#c2e440] hover:scale-105 active:scale-95"
                            : "translate-y-12 opacity-0"
                    )}
                >
                    Apply Magic Style <Sparkles className="w-4 h-4 ml-3" />
                </Button>
            </div>
        </div>
    );
}
