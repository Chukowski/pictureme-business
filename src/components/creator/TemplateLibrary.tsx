import React, { useState } from 'react';
import { Search, X, Filter, Sparkles, Zap, Video, Image as ImageIcon } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AI_MODELS } from "@/services/aiProcessor";

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
// Group models for the top filter bar
const MODEL_FILTERS = [
    { id: 'all', name: 'All', icon: Sparkles },
    { id: 'video', name: 'Video Gen', icon: Video },
    { id: 'image', name: 'Image Gen', icon: ImageIcon },
];

const CATEGORIES = [
    "All", "Horror", "Viral", "Camera Control", "Effects", "UGC", "Action Movement", "Emotions", "Commercial"
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
            (t.tags && t.tags.some(tag => tag.toLowerCase() === activeCategory.toLowerCase()));

        let matchesModel = true;
        if (activeModelFilter !== 'all') {
            if (activeModelFilter === 'video') matchesModel = t.type === 'video';
            else if (activeModelFilter === 'image') matchesModel = t.type === 'image' || !t.type; // Default to image if undefined
            else matchesModel = t.ai_model?.includes(activeModelFilter) || false;
        }

        return matchesSearch && matchesCategory && matchesModel;
    });

    const [selectedId, setSelectedId] = useState<string | undefined>(selectedTemplateId);

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
        <div className="flex flex-col h-full bg-card text-white relative z-50">
            {/* --- HEADER SECTION --- */}
            <div className="flex-shrink-0 border-b border-white/5 bg-card p-4 space-y-4">

                {/* 1. Top Bar: Model Filters & Search */}
                <div className="flex items-center justify-between gap-4">
                    {/* Model Filters (Scrollable) */}
                    <div className="flex-1 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-1">
                            {MODEL_FILTERS.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setActiveModelFilter(m.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                                        activeModelFilter === m.id
                                            ? "bg-[#D1F349] text-black"
                                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    {m.id === activeModelFilter && <m.icon className="w-3 h-3" />}
                                    {m.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search & Close */}
                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-64 hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <Input
                                placeholder="Search"
                                className="pl-9 h-9 bg-card border-zinc-800 text-sm focus:border-white/20 rounded-full text-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-full hover:bg-white/10 text-zinc-400">
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* 2. Secondary Bar: Categories & Tab Switcher */}
                <div className="flex items-center justify-between gap-4 overflow-hidden">
                    {/* Categories (Pills) */}
                    <div className="flex-1 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={cn(
                                        "px-3 py-1 rounded-md text-xs font-medium border transition-all whitespace-nowrap",
                                        activeCategory === cat
                                            ? "bg-[#D1F349] text-black border-[#D1F349]"
                                            : "bg-transparent text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Library/Marketplace Toggle */}
                    <div className="flex bg-card rounded-lg p-0.5 border border-white/5 shrink-0 hidden md:flex">
                        <button
                            onClick={() => setActiveTab("marketplace")}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                activeTab === "marketplace" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Marketplace
                        </button>
                        <button
                            onClick={() => setActiveTab("library")}
                            className={cn(
                                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                                activeTab === "library" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            My Library
                        </button>
                    </div>
                </div>
            </div>

            {/* --- CONTENT GRID --- */}
            <ScrollArea className="flex-1 p-4 md:p-6 pb-24 md:pb-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredTemplates.map((t) => (
                        <div
                            key={t.id}
                            onClick={() => handleCardClick(t)}
                            className={cn(
                                "group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer bg-card border transition-all",
                                selectedId === t.id ? "border-[#D1F349] ring-2 ring-[#D1F349]" : "border-transparent ring-0 hover:ring-2 hover:ring-white/20"
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

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#101112] via-[#101112]/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                            {/* Content */}
                            <div className="absolute inset-x-0 bottom-0 p-4">
                                <h3 className="text-white font-bold text-sm uppercase tracking-wide mb-0.5 line-clamp-2">{t.name}</h3>
                            </div>

                            {/* Selection Indicator */}
                            {selectedId === t.id && (
                                <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#D1F349] shadow-[0_0_8px_rgba(209,243,73,0.8)] flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-[#101112]" />
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredTemplates.length === 0 && (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center text-zinc-500">
                            <Search className="w-8 h-8 opacity-20 mb-2" />
                            <p>No templates found</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Sticky Footer for Mobile Next Action */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#101112] to-transparent z-50 pointer-events-none flex justify-center pb-8 md:pb-4">
                <Button
                    onClick={handleConfirm}
                    disabled={!selectedId}
                    className={cn(
                        "pointer-events-auto rounded-full px-8 py-6 font-bold text-base shadow-2xl transition-all duration-300 transform",
                        selectedId ? "translate-y-0 opacity-100 bg-[#D1F349] text-black hover:bg-[#c2e440]" : "translate-y-20 opacity-0"
                    )}
                >
                    Next <Sparkles className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
