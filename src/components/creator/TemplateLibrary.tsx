import React, { useState, useMemo } from 'react';
import { Search, X, Sparkles, Video, Image as ImageIcon, Check, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import SphereImageGrid from './SphereImageGrid';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    media_type?: "image" | "video";
    template_type?: "individual" | "business";
    price?: number;
    tokens_cost?: number;
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

const MODEL_FILTERS = [
    { id: 'all', name: 'All', icon: Sparkles },
    { id: 'video', name: 'Video Gen', icon: Video },
    { id: 'image', name: 'Image Gen', icon: ImageIcon },
    { id: 'booth', name: 'Booth', icon: Sparkles },
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

    // Easter Egg State
    const [styloSphereClicks, setStyloSphereClicks] = useState(0);
    const [isSphereView, setIsSphereView] = useState(false);

    const handleStyloSphereClick = () => {
        const newClicks = styloSphereClicks + 1;
        if (newClicks >= 3) {
            setIsSphereView(!isSphereView);
            setStyloSphereClicks(0);
            toast(isSphereView ? "Back to normal" : "🌌 StyloSphere Activated!", {
                description: isSphereView ? "Returning to grid view." : "Welcome to the future of browsing.",
                icon: <Sparkles className="w-4 h-4 text-[#D1F349]" />,
            });
        } else {
            setStyloSphereClicks(newClicks);
        }
    };

    const templates = activeTab === "marketplace" ? marketplaceTemplates : myLibraryTemplates;

    const filteredTemplates = templates.filter(t => {
        if (!t) return false;
        const matchesSearch = !searchQuery || (t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = activeCategory === "All" ||
            (t.category && t.category.toLowerCase() === activeCategory.toLowerCase()) ||
            (t.tags && t.tags.some(tag => tag.toLowerCase() === activeCategory.toLowerCase())) ||
            (t.name && t.name.toLowerCase().includes(activeCategory.toLowerCase()));

        let matchesModel = true;
        if (activeModelFilter !== 'all') {
            const tType = t.type || t.media_type;
            const isBooth = t.template_type === 'business';
            if (activeModelFilter === 'video') matchesModel = tType === 'video' && !isBooth;
            else if (activeModelFilter === 'image') matchesModel = (tType === 'image' || !tType) && !isBooth;
            else if (activeModelFilter === 'booth') matchesModel = isBooth;
        }
        return matchesSearch && matchesCategory && matchesModel;
    });

    const [selectedId, setSelectedId] = useState<string | undefined>(selectedTemplateId);
    const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
    const [isInfoExpanded, setIsInfoExpanded] = useState(false);
    const [actionPhrase, setActionPhrase] = useState("Ready?");

    const ACTION_PHRASES = ["Do it!", "Ready?", "Go for it!", "Good one", "Let's go!", "Perfect Choice", "Apply Style", "Looks Fire!"];

    const handleCardClick = (t: MarketplaceTemplate) => {
        setSelectedId(t.id);
        setSelectedTemplate(t);
        setIsInfoExpanded(false);
        const randomPhrase = ACTION_PHRASES[Math.floor(Math.random() * ACTION_PHRASES.length)];
        setActionPhrase(randomPhrase);
    };

    const handleDeselect = () => {
        setSelectedId(undefined);
        setSelectedTemplate(null);
        setIsInfoExpanded(false);
    };

    const dynamicCategories = useMemo(() => {
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

    const handleConfirm = () => {
        const t = templates.find(t => t.id === selectedId);
        if (t) {
            onSelect(t);
        }
    };

    const getModelDisplayName = (modelId: string | undefined) => {
        if (!modelId) return "Nano Banana";
        const model = Object.values(AI_MODELS).find(m => m.id === modelId || m.shortId === modelId);
        if (model) return model.name;
        // Clean up ID: remove fal-ai/ and dashes
        return modelId.replace('fal-ai/', '').split('/').shift()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || "Nano Banana";
    };

    return (
        <div className="flex flex-col h-full bg-[#09090b] text-white relative z-50 overflow-hidden">
            {/* --- REFINED PREMIUM HEADER --- */}
            <div className="flex-shrink-0 bg-[#0c0c0e]/80 backdrop-blur-xl border-b border-white/5 pt-[env(safe-area-inset-top,0px)] sticky top-0 z-50">
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
                        <button onClick={handleStyloSphereClick} className="text-[8px] font-black text-white/5 uppercase tracking-tighter hover:text-white/20 transition-colors mr-2 hidden md:block">
                            StyloSphere
                        </button>
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>

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

                <div className="bg-black/20 border-t border-white/5 px-4 py-3">
                    <div className="hidden md:flex items-center gap-3 w-fit overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-2 pr-3 border-r border-white/10 shrink-0">
                            {MODEL_FILTERS.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setActiveModelFilter(m.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap border border-transparent",
                                        activeModelFilter === m.id ? "bg-[#D1F349]/10 text-[#D1F349] border-[#D1F349]/10" : "text-zinc-500 hover:text-white hover:bg-white/5"
                                    )}
                                >
                                    <m.icon className={cn("w-3 h-3", activeModelFilter === m.id ? "opacity-100" : "opacity-40")} />
                                    {m.name}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {dynamicCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                                        activeCategory.toLowerCase() === cat.toLowerCase() ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.15)] scale-105" : "bg-transparent text-zinc-500 border-white/10 hover:border-white/20 hover:text-white"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex md:hidden items-center justify-between gap-2 overflow-hidden">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 bg-white/5 border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest flex-1 justify-between px-3">
                                        <div className="flex items-center gap-2 truncate">
                                            {React.createElement(MODEL_FILTERS.find(f => f.id === activeModelFilter)?.icon || Sparkles, { className: "w-2.5 h-2.5 opacity-60" })}
                                            <span className="truncate">{MODEL_FILTERS.find(f => f.id === activeModelFilter)?.name}</span>
                                        </div>
                                        <ChevronDown className="w-3 h-3 opacity-40 ml-1 shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-[#101112] border-white/10 text-white min-w-[120px] z-[200]">
                                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest opacity-40 px-3 py-2">Type</DropdownMenuLabel>
                                    {MODEL_FILTERS.map(m => (
                                        <DropdownMenuItem key={m.id} onClick={() => setActiveModelFilter(m.id)} className={cn("text-[10px] font-bold hover:bg-[#D1F349]/10 focus:bg-[#D1F349]/10 cursor-pointer flex items-center justify-between px-3 py-2", activeModelFilter === m.id && "text-[#D1F349]")}>
                                            <div className="flex items-center gap-2">
                                                <m.icon className="w-3.5 h-3.5" />
                                                <span>{m.name}</span>
                                            </div>
                                            {activeModelFilter === m.id && <Check className="w-3 h-3" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 bg-white/5 border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest flex-1 justify-between px-3">
                                        <span className="truncate">{activeCategory}</span>
                                        <ChevronDown className="w-3 h-3 opacity-40 ml-1 shrink-0" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-[#101112] border-white/10 text-white min-w-[140px] max-h-[300px] overflow-y-auto z-[200]">
                                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest opacity-40 px-3 py-2">Mood</DropdownMenuLabel>
                                    {dynamicCategories.map(cat => (
                                        <DropdownMenuItem key={cat} onClick={() => setActiveCategory(cat)} className={cn("text-[10px] font-bold hover:bg-[#D1F349]/10 focus:bg-[#D1F349]/10 cursor-pointer flex items-center justify-between px-3 py-2", activeCategory.toLowerCase() === cat.toLowerCase() && "text-[#D1F349]")}>
                                            <span>{cat}</span>
                                            {activeCategory.toLowerCase() === cat.toLowerCase() && <Check className="w-3 h-3" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <button onClick={handleStyloSphereClick} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse shrink-0">
                            <Sparkles className={cn("w-3 h-3 transition-colors", isSphereView ? "text-[#D1F349]" : "text-white/20")} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#09090b]">
                {isSphereView ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <SphereImageGrid
                            images={filteredTemplates.map(t => ({
                                id: t.id,
                                src: t.preview_url || t.images?.[0] || t.preview_images?.[0] || "/placeholder.svg",
                                alt: t.name,
                                title: t.name,
                                description: t.description,
                                originalData: t
                            }))}
                            sphereRadius={Math.min(window.innerWidth / 2, window.innerHeight / 3)}
                            dragSensitivity={0.8}
                            autoRotate={true}
                            autoRotateSpeed={0.2}
                            onSelect={(img) => {
                                if (img) {
                                    handleCardClick(img.originalData);
                                } else {
                                    handleDeselect();
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div
                        className="absolute inset-0 overflow-y-auto no-scrollbar"
                        onClick={handleDeselect}
                    >
                        <ScrollArea className="h-full p-4 md:p-6 pb-1 md:pb-8">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {filteredTemplates.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCardClick(t);
                                        }}
                                        className={cn(
                                            "group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer bg-zinc-900 border transition-all duration-500",
                                            selectedId === t.id ? "border-[#D1F349] ring-2 ring-[#D1F349]/50 shadow-[0_0_30px_rgba(209,243,73,0.2)]" : "border-white/5 ring-0 hover:border-white/20"
                                        )}
                                    >
                                        <img
                                            src={t.preview_url || t.images?.[0] || t.preview_images?.[0] || "/placeholder.svg"}
                                            alt={t.name}
                                            onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        {selectedId === t.id && (
                                            <div className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-[#D1F349] flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-300">
                                                <Check className="w-4 h-4 text-black stroke-[3]" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                        
                                        {/* Cost Badge */}
                                        <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-20">
                                            {(() => {
                                                const tokenCost = t.tokens_cost ?? 0;
                                                const moneyCost = t.price ?? 0;
                                                if (tokenCost === 0 && moneyCost === 0) {
                                                    return (
                                                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500 text-black text-[8px] font-black uppercase tracking-wider shadow-lg">
                                                            Free
                                                        </span>
                                                    );
                                                }
                                                return (
                                                    <span className="px-2 py-0.5 rounded-lg bg-[#D1F349] text-black text-[8px] font-black uppercase tracking-wider shadow-lg">
                                                        {tokenCost > 0 ? `${tokenCost} Tokens` : `$${moneyCost}`}
                                                    </span>
                                                );
                                            })()}
                                        </div>

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
                                    <div className="col-span-full h-96 flex flex-col items-center justify-center text-zinc-500">
                                        <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                                            <Search className="w-8 h-8 opacity-20" />
                                        </div>
                                        <h3 className="text-white font-bold mb-1">No styles found</h3>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                )}
            </div>

            <div className={cn(
                "absolute bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom,24px)] z-[60] pointer-events-none flex flex-col items-center gap-4 transition-all duration-700 ease-in-out",
                selectedTemplate ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
            )}>
                {/* Info Panel */}
                <div className={cn(
                    "w-full max-w-sm bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl pointer-events-auto transform transition-all duration-500 scale-100 overflow-hidden flex flex-col mb-2",
                    isInfoExpanded ? "max-h-[600px]" : "max-h-[280px]"
                )}>
                    {/* Always show Image Preview */}
                    {selectedTemplate && (
                        <div className={cn(
                            "relative w-full overflow-hidden transition-all duration-500 ease-in-out shrink-0",
                            isInfoExpanded ? "h-64" : "h-24"
                        )}>
                            <img
                                src={selectedTemplate.preview_url || selectedTemplate.images?.[0] || "/placeholder.svg"}
                                alt={selectedTemplate.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        </div>
                    )}

                    <div className="p-5 flex flex-col">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="w-3.5 h-3.5 text-[#D1F349]" />
                                    <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em] line-clamp-1">
                                        {selectedTemplate?.name}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter flex items-center gap-1">
                                        {selectedTemplate?.template_type === 'business' ? <Sparkles className="w-2 h-2" /> : selectedTemplate?.type === 'video' ? <Video className="w-2 h-2" /> : <ImageIcon className="w-2 h-2" />}
                                        {selectedTemplate?.template_type === 'business' ? 'Booth Template' : selectedTemplate?.type === 'video' ? 'Video Template' : 'Image Template'}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-zinc-800" />
                                    <span className="text-[8px] font-bold text-[#D1F349] uppercase tracking-tighter">
                                        {(() => {
                                            const tokenCost = selectedTemplate?.tokens_cost ?? 0;
                                            const moneyCost = selectedTemplate?.price ?? 0;
                                            if (tokenCost === 0 && moneyCost === 0) return 'Free Style';
                                            const parts = [];
                                            if (tokenCost > 0) parts.push(`${tokenCost} Tokens`);
                                            if (moneyCost > 0) parts.push(`$${moneyCost}`);
                                            return parts.join(' + ');
                                        })()}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsInfoExpanded(!isInfoExpanded); }}
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                                >
                                    {isInfoExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeselect(); }}
                                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {selectedTemplate?.description && (
                                <p className={cn(
                                    "text-[10px] text-zinc-400 font-medium leading-relaxed uppercase tracking-tight",
                                    !isInfoExpanded && "line-clamp-2"
                                )}>
                                    {selectedTemplate.description}
                                </p>
                            )}

                            <div className={cn(
                                "grid grid-cols-2 gap-2 transition-all duration-300",
                                isInfoExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none absolute"
                            )}>
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
                                    <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-1">AI Model</span>
                                    <span className="text-[10px] font-bold text-white uppercase">{getModelDisplayName(selectedTemplate?.ai_model)}</span>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-3">
                                    <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Cost</span>
                                    <span className="text-[10px] font-bold text-[#D1F349] uppercase">
                                        {(() => {
                                            const tokenCost = selectedTemplate?.tokens_cost ?? 0;
                                            const moneyCost = selectedTemplate?.price ?? 0;
                                            if (tokenCost === 0 && moneyCost === 0) return 'Free';
                                            const parts = [];
                                            if (tokenCost > 0) parts.push(`${tokenCost} Tokens`);
                                            if (moneyCost > 0) parts.push(`$${moneyCost}`);
                                            return parts.join(' + ');
                                        })()}
                                    </span>
                                </div>
                            </div>

                            {isInfoExpanded && selectedTemplate?.prompt && (
                                <div className="bg-[#D1F349]/5 border border-[#D1F349]/10 rounded-2xl p-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                    <span className="text-[7px] font-black text-[#D1F349] uppercase tracking-widest block mb-2">Prompt Brief</span>
                                    <p className="text-[10px] text-zinc-300 font-serif italic italic leading-relaxed">
                                        "{selectedTemplate.prompt.split('.').slice(0, 2).join('.') + '...'}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Action Button */}
                <div className="w-full flex justify-center bg-gradient-to-t from-[#09090b]/80 to-transparent pb-10 md:pb-6 pt-2">
                    <Button
                        onClick={handleConfirm}
                        className="pointer-events-auto rounded-full px-12 py-6 font-black text-xs uppercase tracking-[0.2em] border border-white/10 bg-[#D1F349] text-black hover:bg-white hover:scale-105 active:scale-95 animate-pulse shadow-[0_0_50px_rgba(209,243,73,0.15)]"
                    >
                        {actionPhrase}
                    </Button>
                </div>
            </div>
        </div>
    );
}
