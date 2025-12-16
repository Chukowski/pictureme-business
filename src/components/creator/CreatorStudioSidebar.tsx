import React, { useState } from 'react';
import {
    Sparkles,
    Upload,
    Settings,
    ChevronRight,
    Loader2,
    Wand2,
    Camera,
    Video,
    Image as ImageIcon,
    Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AI_MODELS } from "@/services/aiProcessor";
import { MarketplaceTemplate } from './TemplateLibrary';

export type SidebarMode = "image" | "video" | "booth";

const IMAGE_MODELS = Object.values(AI_MODELS).filter(m => m.type === 'image');
const VIDEO_MODELS = Object.values(AI_MODELS).filter(m => m.type === 'video');

interface CreatorStudioSidebarProps {
    mode: SidebarMode;
    setMode: (m: SidebarMode) => void;
    prompt: string;
    setPrompt: React.Dispatch<React.SetStateAction<string>>;
    model: string;
    setModel: (m: string) => void;
    aspectRatio: string;
    setAspectRatio: (r: string) => void;
    duration: string;
    setDuration: (d: string) => void;
    isProcessing: boolean;
    onGenerate: () => void;
    inputImage: string | null;
    endFrameImage: string | null;
    onUploadClick: (type: "main" | "end" | "ref") => void;
    selectedTemplate: MarketplaceTemplate | null;
    onToggleTemplateLibrary: () => void;
    onSelectTemplate?: (t: MarketplaceTemplate) => void;
}

export function CreatorStudioSidebar({
    mode,
    setMode,
    prompt,
    setPrompt,
    model,
    setModel,
    aspectRatio,
    setAspectRatio,
    duration,
    setDuration,
    isProcessing,
    onGenerate,
    inputImage,
    endFrameImage,
    onUploadClick,
    selectedTemplate,
    onToggleTemplateLibrary
}: CreatorStudioSidebarProps) {

    const [videoTab, setVideoTab] = useState<"frames" | "ingredients">("frames");

    const currentModelObj = [...IMAGE_MODELS, ...VIDEO_MODELS].find(m => m.shortId === model || m.id === model);
    const currentModelName = currentModelObj?.name || model;

    return (
        <div className="w-[380px] flex-shrink-0 flex flex-col z-20 m-2 h-auto max-h-[calc(100vh-80px)] rounded-3xl bg-[#121212] border border-white/10 shadow-2xl overflow-hidden">

            {/* Use simple div for scrolling to allow auto-height behavior properly. Removing ScrollArea. */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 custom-scrollbar">

                {/* 1. Top Tabs */}
                <div className="flex p-1 bg-zinc-900 rounded-xl border border-white/5">
                    <button
                        onClick={() => setMode("image")}
                        className={cn(
                            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center gap-1",
                            mode === "image" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <ImageIcon className="w-4 h-4" />
                        <span>Image</span>
                    </button>
                    <button
                        onClick={() => setMode("video")}
                        className={cn(
                            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center gap-1",
                            mode === "video" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Video className="w-4 h-4" />
                        <span>Video</span>
                    </button>
                    <button
                        onClick={() => setMode("booth")}
                        className={cn(
                            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex flex-col items-center gap-1",
                            mode === "booth" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        <Camera className="w-4 h-4" />
                        <span>Booth</span>
                    </button>
                </div>

                {mode === 'booth' ? (
                    <div className="h-48 flex flex-col items-center justify-center text-zinc-500 space-y-3">
                        <Camera className="w-12 h-12 opacity-20" />
                        <p className="text-sm">Booth settings coming soon...</p>
                    </div>
                ) : (
                    <>
                        {/* 2. GENERAL CARD */}
                        <div
                            onClick={onToggleTemplateLibrary}
                            className="group relative h-16 rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-[#D1F349] transition-all"
                        >
                            <div className="absolute inset-0 bg-zinc-900">
                                {(selectedTemplate?.images?.[0] || selectedTemplate?.preview_images?.[0]) && (
                                    <img
                                        src={selectedTemplate.images?.[0] || selectedTemplate.preview_images?.[0]}
                                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                                    />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-transparent" />
                            </div>

                            <div className="absolute inset-0 px-4 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "font-bold text-sm tracking-wide uppercase truncate max-w-[200px]",
                                            selectedTemplate ? "text-white" : "text-[#D1F349]"
                                        )}>
                                            {selectedTemplate?.name || "GENERAL"}
                                        </span>
                                    </div>
                                    <p className="text-zinc-400 text-[10px] mt-0.5">{currentModelName}</p>
                                </div>
                                <div className="p-1.5 bg-white/10 rounded-full text-[10px] flex items-center gap-1 backdrop-blur-md hover:bg-white/20 transition-colors">
                                    <Settings className="w-3 h-3" />
                                </div>
                            </div>
                        </div>

                        {/* 3. MODE SPECIFIC SETTINGS */}
                        {mode === 'video' ? (
                            <div className="space-y-4">
                                {/* Frames / Ingredients Toggle */}
                                <div className="flex bg-zinc-900/50 rounded-lg p-1 border border-white/5">
                                    <button
                                        onClick={() => setVideoTab("frames")}
                                        className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", videoTab === "frames" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500")}
                                    >
                                        Frames
                                    </button>
                                    <button
                                        onClick={() => setVideoTab("ingredients")}
                                        className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", videoTab === "ingredients" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500")}
                                    >
                                        Ingredients
                                    </button>
                                </div>

                                {/* FRAMES TAB CONTENT */}
                                {videoTab === 'frames' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div onClick={() => onUploadClick("main")} className="aspect-square rounded-xl bg-zinc-900 border border-dashed border-zinc-800 hover:border-[#D1F349] hover:bg-zinc-800/50 cursor-pointer flex flex-col items-center justify-center gap-2 group transition-all relative overflow-hidden">
                                                {inputImage && <img src={inputImage} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                                                <div className="relative z-10 flex flex-col items-center">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center mb-1 group-hover:bg-[#D1F349] group-hover:text-black transition-colors">
                                                        <Upload className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-medium text-zinc-300">Start frame</span>
                                                    <span className="text-[10px] text-zinc-600">Optional</span>
                                                </div>
                                            </div>
                                            <div onClick={() => onUploadClick("end")} className="aspect-square rounded-xl bg-zinc-900 border border-dashed border-zinc-800 hover:border-[#D1F349] hover:bg-zinc-800/50 cursor-pointer flex flex-col items-center justify-center gap-2 group transition-all relative overflow-hidden">
                                                {endFrameImage && <img src={endFrameImage} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                                                <div className="relative z-10 flex flex-col items-center">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center mb-1 group-hover:bg-[#D1F349] group-hover:text-black transition-colors">
                                                        <Upload className="w-4 h-4" />
                                                    </div>
                                                    <span className="text-xs font-medium text-zinc-300">End frame</span>
                                                    <span className="text-[10px] text-zinc-600">Optional</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Shared Video Settings (Frames Tab) */}
                                        <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                                                        <span className="text-xs font-medium text-zinc-300">Model</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-zinc-400">{currentModelName}</span>
                                                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                                                        </div>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-56 bg-zinc-900 border-white/10 text-white">
                                                    {VIDEO_MODELS.map(m => (
                                                        <DropdownMenuItem key={m.shortId} onClick={() => setModel(m.shortId)}>{m.name}</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <div className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                                                <span className="text-xs font-medium text-zinc-300">Quality</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-zinc-400">1080p</span>
                                                    <ChevronRight className="w-3 h-3 text-zinc-600" />
                                                </div>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                                                        <span className="text-xs font-medium text-zinc-300">Ratio</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-zinc-400">{aspectRatio}</span>
                                                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                                                        </div>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white">
                                                    {["1:1", "4:5", "16:9", "9:16"].map(r => (
                                                        <DropdownMenuItem key={r} onClick={() => setAspectRatio(r)}>{r}</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                                                        <span className="text-xs font-medium text-zinc-300">Duration</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-zinc-400">{duration}</span>
                                                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                                                        </div>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white">
                                                    {["4s", "5s", "8s", "10s"].map(d => (
                                                        <DropdownMenuItem key={d} onClick={() => setDuration(d)}>{d}</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                )}

                                {/* INGREDIENTS TAB CONTENT */}
                                {videoTab === 'ingredients' && (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        {/* Prompt */}
                                        <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5 space-y-2">
                                            <Label className="text-[10px] font-bold text-zinc-500 uppercase">Prompt</Label>
                                            <Textarea
                                                value={prompt}
                                                onChange={e => setPrompt(e.target.value)}
                                                placeholder="Describe your video..."
                                                className="bg-transparent border-none p-0 text-sm text-white resize-none min-h-[80px] focus-visible:ring-0 placeholder:text-zinc-600"
                                            />
                                            <button
                                                className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-[#D1F349] transition-colors"
                                                onClick={() => { setPrompt(p => p + " highly detailed, cinematic"); toast.success("Enhanced!"); }}
                                            >
                                                <Wand2 className="w-3 h-3" />
                                                Enhance onMode
                                            </button>
                                        </div>

                                        {/* Shared Video Settings (Ingredients Tab) */}
                                        <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                                            <div className="p-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-zinc-300">Multi-shot mode</span>
                                                    <Layers className="w-3 h-3 text-zinc-600" />
                                                </div>
                                                <Switch id="multishot" />
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                                                        <span className="text-xs font-medium text-zinc-300">Model</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-zinc-400">{currentModelName}</span>
                                                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                                                        </div>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="w-56 bg-zinc-900 border-white/10 text-white">
                                                    {VIDEO_MODELS.map(m => (
                                                        <DropdownMenuItem key={m.shortId} onClick={() => setModel(m.shortId)}>{m.name}</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <div className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                                                <span className="text-xs font-medium text-zinc-300">Quality</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-zinc-400">1080p</span>
                                                    <ChevronRight className="w-3 h-3 text-zinc-600" />
                                                </div>
                                            </div>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                                                        <span className="text-xs font-medium text-zinc-300">Ratio</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-zinc-400">{aspectRatio}</span>
                                                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                                                        </div>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white">
                                                    {["1:1", "4:5", "16:9", "9:16"].map(r => (
                                                        <DropdownMenuItem key={r} onClick={() => setAspectRatio(r)}>{r}</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <div className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                                                        <span className="text-xs font-medium text-zinc-300">Duration</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-zinc-400">{duration}</span>
                                                            <ChevronRight className="w-3 h-3 text-zinc-600" />
                                                        </div>
                                                    </div>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white">
                                                    {["4s", "5s", "8s", "10s"].map(d => (
                                                        <DropdownMenuItem key={d} onClick={() => setDuration(d)}>{d}</DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* --- IMAGE MODE SETTINGS --- */
                            <div className="space-y-4">
                                {/* Subject */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Input</Label>
                                    <div onClick={() => onUploadClick("main")} className="cursor-pointer relative min-h-[160px] rounded-xl bg-zinc-900 border border-dashed border-zinc-700 hover:border-[#D1F349] hover:bg-zinc-800 transition-all flex flex-col items-center justify-center group overflow-hidden">
                                        {inputImage ? (
                                            <>
                                                <img src={inputImage} className="w-full h-full object-cover absolute inset-0 opacity-80 group-hover:opacity-50 transition-opacity" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><Upload className="w-6 h-6 text-white" /></div>
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-zinc-500 mb-2" />
                                                <span className="text-xs text-zinc-400 font-medium">Upload Subject</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Prompt */}
                                <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5 space-y-2">
                                    <Label className="text-[10px] font-bold text-zinc-500 uppercase">Prompt</Label>
                                    <Textarea
                                        value={prompt}
                                        onChange={e => setPrompt(e.target.value)}
                                        placeholder="Describe your image..."
                                        className="bg-transparent border-none p-0 text-sm text-white resize-none min-h-[80px] focus-visible:ring-0 placeholder:text-zinc-600"
                                    />
                                    <button
                                        className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-[#D1F349] transition-colors"
                                        onClick={() => { setPrompt(p => p + " highly detailed, 8k"); toast.success("Enhanced!"); }}
                                    >
                                        <Wand2 className="w-3 h-3" />
                                        Enhance onMode
                                    </button>
                                </div>

                                {/* Image Settings List */}
                                <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">
                                    {/* Model */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <div className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                                                <span className="text-xs font-medium text-zinc-300">Model</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-zinc-400">{currentModelName}</span>
                                                    <ChevronRight className="w-3 h-3 text-zinc-600" />
                                                </div>
                                            </div>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-56 bg-zinc-900 border-white/10 text-white">
                                            {IMAGE_MODELS.map(m => (
                                                <DropdownMenuItem key={m.shortId} onClick={() => setModel(m.shortId)}>{m.name}</DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Ratio */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <div className="p-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
                                                <span className="text-xs font-medium text-zinc-300">Ratio</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-zinc-400">{aspectRatio}</span>
                                                    <ChevronRight className="w-3 h-3 text-zinc-600" />
                                                </div>
                                            </div>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white">
                                            {["1:1", "4:5", "16:9", "9:16"].map(r => (
                                                <DropdownMenuItem key={r} onClick={() => setAspectRatio(r)}>{r}</DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )}
                    </>
                )}

            </div>

            {mode !== 'booth' && (
                <div className="p-4 border-t border-white/5 bg-zinc-950 mt-auto">
                    <Button
                        onClick={onGenerate}
                        disabled={isProcessing}
                        className={cn(
                            "w-full h-12 font-bold hover:brightness-110 transition-all rounded-xl",
                            mode === 'image' ? "bg-white text-black hover:bg-gray-200" : "bg-[#D1F349] text-black hover:bg-[#bce028]"
                        )}
                    >
                        {isProcessing ? <Loader2 className="animate-spin w-4 h-4 ml-2" /> : (
                            <><Sparkles className="w-4 h-4 mr-2" /> {mode === 'image' ? 'Generate Image' : 'Generate Video'}</>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
