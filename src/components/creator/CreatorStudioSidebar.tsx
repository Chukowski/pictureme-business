
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
import { Badge } from "@/components/ui/badge";
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
    userBooths?: any[];
    selectedBooth?: any | null;
    onSelectBooth?: (booth: any) => void;
    selectedBoothTemplate?: any | null;
    onSelectBoothTemplate?: (template: any) => void;
    onImageCaptured?: (base64: string) => void;
    inputImages?: string[];
    onRemoveInputImageObj?: (index: number) => void;
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
    remixFromUsername,
    userBooths = [],
    selectedBooth,
    onSelectBooth,
    selectedBoothTemplate,
    onSelectBoothTemplate,
    onImageCaptured,
    inputImages = [],
    onRemoveInputImageObj
}: CreatorStudioSidebarProps) {

    const [enhanceOn, setEnhanceOn] = useState(false);
    const [activeBoothImageIndex, setActiveBoothImageIndex] = useState(0);
    const [showCamera, setShowCamera] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            setCameraStream(stream);
            setShowCamera(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast.error("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                // Mirror the image horizontally to match the user-facing camera view
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
                onImageCaptured?.(dataUrl);
                // Don't stop camera immediately if we want to take multiple, but user requested 'grid' so maybe stop?
                // Actually, "replace upload button for a grid of squares... so user can see and delete if any".
                // If I keep camera open, they can take more.
                // Let's keep camera open? No, typical flow is Capture -> Review -> Retake/Add.
                // But for "Studio" or "Booth", rapid fire is cool.
                // Currently stopCamera() is called.
                stopCamera();
            }
        }
    };

    const startCountdownAndCapture = () => {
        setCountdown(3);
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev === 1) {
                    clearInterval(timer);
                    capturePhoto();
                    return null;
                }
                return prev ? prev - 1 : null;
            });
        }, 1000);
    };

    // Cleanup camera on unmount or when leaving specific booth steps
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    // Also stop camera if we navigate away from the camera step
    useEffect(() => {
        if (!selectedBoothTemplate) {
            stopCamera();
        }
    }, [selectedBoothTemplate]);

    // Update video ref when stream changes
    useEffect(() => {
        if (videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [cameraStream, showCamera]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (mode === 'booth' && userBooths.length > 0) {
            interval = setInterval(() => {
                setActiveBoothImageIndex(prev => prev + 1);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [mode, userBooths]);

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
            <div className="flex md:hidden items-center justify-between px-4 h-14 border-b border-white/5 flex-shrink-0 bg-[#101112]">
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
                        <DropdownMenuContent align="start" className="w-48 bg-card border-zinc-900 z-[100] p-1.5">
                            {[
                                { id: 'image', label: 'Create Image', icon: ImageIcon },
                                { id: 'video', label: 'Create Video', icon: Video },
                                { id: 'booth', label: 'Photo Booth', icon: Camera },
                            ].map((item) => (
                                <DropdownMenuItem
                                    key={item.id}
                                    onClick={() => setMode(item.id as any)}
                                    className={cn(
                                        "flex items-center gap-2.5 cursor-pointer focus:bg-card text-[13px] font-bold py-2.5 rounded-lg px-3 transition-colors",
                                        mode === item.id ? "text-[#D1F349] bg-card/50" : "text-zinc-400"
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
                    <div className="flex flex-col gap-4">
                        {!selectedBooth ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between px-1">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Booth</Label>
                                    <span className="text-[10px] text-zinc-600 font-medium">Step 1 of 3</span>
                                </div>
                                {(!userBooths || userBooths.length === 0) ? (
                                    <div className="p-4 border border-dashed border-white/10 rounded-xl bg-white/5 text-center">
                                        <p className="text-xs text-zinc-500">No booths found.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {userBooths.map((booth) => {
                                            const templates = booth.templates || [];
                                            const currentTpl = templates.length > 0 ? templates[activeBoothImageIndex % templates.length] : null;
                                            const bgImage = currentTpl ? (currentTpl.imageUrl || currentTpl.image_url || currentTpl.images?.[0]) : null;

                                            return (
                                                <button
                                                    key={booth._id || booth.id}
                                                    onClick={() => onSelectBooth?.(booth)}
                                                    className="group relative h-32 w-full rounded-2xl overflow-hidden border border-white/10 transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
                                                >
                                                    {/* Background Image with Rotation */}
                                                    <div className="absolute inset-0 bg-[#151515]">
                                                        {bgImage && (
                                                            <div
                                                                key={bgImage} // Key change triggers animation
                                                                className="absolute inset-0 animate-in fade-in duration-700"
                                                            >
                                                                <img
                                                                    src={bgImage}
                                                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                                                    </div>

                                                    {/* Content */}
                                                    <div className="absolute inset-0 p-4 flex flex-col justify-end">
                                                        <div className="flex items-end justify-between">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-lg bg-[#D1F349] flex items-center justify-center">
                                                                        <Camera className="w-3.5 h-3.5 text-black" />
                                                                    </div>
                                                                    <h3 className="text-sm font-black text-white tracking-wide shadow-black drop-shadow-md">
                                                                        {booth.title}
                                                                    </h3>
                                                                </div>
                                                                <p className="text-[10px] font-medium text-white/70 line-clamp-1 ml-8">
                                                                    {booth.description || 'Virtual AI Photo Booth'}
                                                                </p>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 group-hover:bg-white/20 transition-colors">
                                                                <ChevronRight className="w-4 h-4 text-white" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : !selectedBoothTemplate ? (
                            <div className="flex flex-col gap-4 animate-in slide-in-from-right-8 duration-300">
                                <button
                                    onClick={() => { onSelectBooth?.(null); onSelectBoothTemplate?.(null); }}
                                    className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors pl-1"
                                >
                                    <ChevronRight className="w-3 h-3 rotate-180" />
                                    Back to Booths
                                </button>

                                <div className="flex flex-col gap-1 px-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black text-white tracking-tight">{selectedBooth.title}</h3>
                                        <span className="text-[10px] text-zinc-600 font-medium">Step 2 of 3</span>
                                    </div>
                                    <p className="text-xs text-zinc-500">Choose a style to continue</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2.5">
                                    {(selectedBooth.templates || []).map((template: any) => (
                                        <button
                                            key={template.id}
                                            onClick={() => onSelectBoothTemplate?.(template)}
                                            className={cn(
                                                "relative aspect-square rounded-2xl overflow-hidden border transition-all text-left group",
                                                selectedBoothTemplate?.id === template.id
                                                    ? "border-[#D1F349] ring-2 ring-[#D1F349]/50"
                                                    : "border-white/10 hover:border-white/30"
                                            )}
                                        >
                                            <img
                                                src={template.imageUrl || template.image_url || template.images?.[0]}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80" />
                                            <div className="absolute bottom-3 left-3 right-3">
                                                <span className="text-[11px] font-black text-white uppercase tracking-wider leading-tight block drop-shadow-lg">
                                                    {template.name}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 animate-in slide-in-from-right-8 duration-300 h-full">
                                <button
                                    onClick={() => onSelectBoothTemplate?.(null)}
                                    className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors pl-1"
                                >
                                    <ChevronRight className="w-3 h-3 rotate-180" />
                                    Back to Styles
                                </button>

                                <div className="flex flex-col gap-1 px-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xl font-black text-white tracking-tight">Capture</h3>
                                        <span className="text-[10px] text-zinc-600 font-medium">Step 3 of 3</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-zinc-500">Style:</span>
                                        <span className="text-[10px] font-bold text-[#D1F349] uppercase tracking-wider">{selectedBoothTemplate.name}</span>
                                    </div>
                                </div>

                                {/* Camera UI Simulator */}
                                <div className="flex flex-col gap-3">
                                    <div
                                        className="relative aspect-[3/4] w-full bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group flex flex-col items-center justify-center cursor-pointer hover:border-white/20 transition-all"
                                        onClick={() => !showCamera && (inputImages.length === 0 && !inputImage) && startCamera()}
                                    >
                                        {showCamera ? (
                                            <div className="absolute inset-0 z-20 flex flex-col bg-black">
                                                {/* Camera Feed */}
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    className="w-full h-full object-cover scale-x-[-1]"
                                                />

                                                {/* Countdown Overlay */}
                                                {countdown !== null && (
                                                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                                                        <span className="text-[120px] font-black text-white animate-bounce drop-shadow-2xl">
                                                            {countdown}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Camera Controls Overlay */}
                                                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                                                    {/* Top Controls */}
                                                    <div className="flex justify-between items-start pointer-events-auto">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); stopCamera(); }}
                                                            className="p-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>

                                                    {/* Bottom Controls */}
                                                    <div className="flex flex-col items-center gap-6 pointer-events-auto mb-4">
                                                        {/* Shutter Button */}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); startCountdownAndCapture(); }}
                                                            disabled={countdown !== null}
                                                            className="w-16 h-16 rounded-full border-[4px] border-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 bg-transparent"
                                                        >
                                                            <div className="w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full bg-white hover:bg-[#D1F349] transition-colors duration-200" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (inputImages.length > 0 || inputImage) ? (
                                            <>
                                                {/* If we have images, show the LAST one as preview in the big box, OR just keep the camera view with overlay? 
                                                User said: "replace the upload button for a grid of squares". 
                                                The camera component (600 lines long) acts as the 'main display'. 
                                                If we have an image, typically we show it. 
                                                Let's show the LATEST image here.
                                            */}
                                                <img src={inputImages.length > 0 ? inputImages[inputImages.length - 1] : inputImage!} className="w-full h-full object-cover" />
                                                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                                                {/* Tap to retake/add more Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 pointer-events-none">
                                                    <p className="font-bold text-white uppercase tracking-widest">Tap to Add Photo</p>
                                                </div>

                                                {/* Retake/Add Controls */}
                                                <div className="absolute bottom-6 inset-x-0 flex justify-center z-20 gap-3">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); startCamera(); }}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-all"
                                                    >
                                                        <Camera className="w-4 h-4 text-white" />
                                                        <span className="text-xs font-bold text-white uppercase tracking-wider">Add Photo</span>
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Viewfinder Overlay */}
                                                <div className="absolute inset-0 pointer-events-none z-10">
                                                    <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-lg" />
                                                    <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-white/30 rounded-tr-lg" />
                                                    <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-white/30 rounded-bl-lg" />
                                                    <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br-lg" />
                                                </div>

                                                {/* Central UI */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-0">
                                                    <div className="p-4 rounded-full bg-white/5 border border-white/10 group-hover:bg-[#D1F349]/10 group-hover:border-[#D1F349] transition-colors">
                                                        <Camera className="w-8 h-8 text-white/50 group-hover:text-[#D1F349] transition-colors" />
                                                    </div>
                                                    <p className="text-xs font-medium text-white/50 animate-pulse group-hover:text-white transition-colors">Tap to open camera</p>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Image Grid (Replaces Upload Button) */}
                                    {inputImages.length > 0 ? (
                                        <div className="grid grid-cols-4 gap-2 animate-in slide-in-from-bottom-4">
                                            {/* Upload Button Tile */}
                                            <button
                                                onClick={() => onUploadClick("main")}
                                                className="aspect-square rounded-xl bg-white/5 border border-dashed border-white/10 hover:bg-white/10 flex items-center justify-center transition-all group/up"
                                                title="Upload more"
                                            >
                                                <Upload className="w-4 h-4 text-zinc-500 group-hover/up:text-white" />
                                            </button>

                                            {/* Image Tiles */}
                                            {inputImages.map((img, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group/item">
                                                    <img src={img} className="w-full h-full object-cover" />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onRemoveInputImageObj?.(idx); }}
                                                        className="absolute top-0.5 right-0.5 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        /* Empty State Upload Button */
                                        <button
                                            onClick={() => onUploadClick("main")}
                                            className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center gap-2 transition-all group"
                                        >
                                            <Upload className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                                            <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase tracking-wider">Upload Photos</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Remixing Banner */}                    {remixFromUsername && (
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
                            <div className="absolute inset-0 bg-card">
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
                                <div className="absolute inset-0 bg-gradient-to-t from-[#101112] via-[#101112]/20 to-transparent" />
                            </div>

                            <div className="absolute top-2 right-2 flex gap-1 z-20">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 px-2.5 rounded-lg bg-[#101112]/60 backdrop-blur-md border-white/10 text-[10px] font-bold uppercase tracking-wider hover:bg-[#101112]/80"
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
                                    "aspect-square w-full rounded-2xl border border-dashed border-white/10 bg-card/30 hover:bg-card/50 hover:border-white/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 relative group overflow-hidden",
                                    inputImage && "border-solid border-[#D1F349]/40"
                                )}
                            >
                                {inputImage ? (
                                    <>
                                        <img src={inputImage} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-[#101112]/20" />
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onRemoveInputImage?.(); }}
                                            className="absolute top-2 right-2 p-1.5 bg-[#101112]/60 backdrop-blur-md rounded-full text-white transition-all ring-1 ring-white/10 opacity-0 group-hover:opacity-100"
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
                                        "aspect-square w-full rounded-2xl border border-dashed border-white/10 bg-card/30 hover:bg-card/50 hover:border-white/20 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 relative group overflow-hidden",
                                        endFrameImage && "border-solid border-[#D1F349]/40"
                                    )}
                                >
                                    {endFrameImage ? (
                                        <>
                                            <img src={endFrameImage} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-[#101112]/20" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRemoveEndFrameImage?.(); }}
                                                className="absolute top-2 right-2 p-1.5 bg-[#101112]/60 backdrop-blur-md rounded-full text-white transition-all ring-1 ring-white/10 opacity-0 group-hover:opacity-100"
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
                                        <div key={index} className="rounded-xl overflow-hidden border border-white/5 relative group bg-card/30">
                                            <img src={refImg} className="w-full h-full object-cover" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRemoveReferenceImage(index); }}
                                                className="absolute top-1 right-1 p-1 bg-[#101112]/50 hover:bg-[#101112]/80 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100"
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
                                            enhanceOn ? "bg-[#D1F349]" : "bg-[#101112]"
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
                                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] bg-[#1a1a1a] border-white/5 z-[100] p-1.5 shadow-2xl" sideOffset={8}>
                                    {(mode === 'image' ? imageModels : videoModels).map((m) => (
                                        <DropdownMenuItem
                                            key={m.id}
                                            onClick={() => setModel(m.shortId)}
                                            className={cn(
                                                "flex flex-col items-start gap-1 p-3 rounded-xl mb-1 last:mb-0 transition-all cursor-pointer",
                                                m.shortId === model ? "bg-white/10 border border-white/10" : "hover:bg-white/5 border border-transparent"
                                            )}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-[13px] font-bold", m.shortId === model ? "text-[#D1F349]" : "text-white")}>
                                                        {m.name}
                                                    </span>
                                                    {m.cost && (
                                                        <Badge variant="outline" className="h-4 px-1 text-[9px] border-[#D1F349]/30 text-[#D1F349] bg-[#D1F349]/5 font-black uppercase tracking-tighter">
                                                            {m.cost}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {m.shortId === model && <Check className="w-3.5 h-3.5 text-[#D1F349]" />}
                                            </div>
                                            {m.description && (
                                                <span className="text-[11px] text-zinc-500 line-clamp-1 leading-tight">{m.description}</span>
                                            )}
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
                                    <DropdownMenuContent className="bg-card border-zinc-900 text-white z-[70] min-w-[100px]">
                                        {["5s", "10s"].map(d => (
                                            <DropdownMenuItem key={d} onClick={() => setDuration(d)} className="text-[12px] cursor-pointer focus:bg-card">
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
                                    <DropdownMenuContent className="bg-card border-zinc-900 text-white z-[70] min-w-[100px]">
                                        {["1:1", "4:5", "16:9", "9:16"].map(r => (
                                            <DropdownMenuItem key={r} onClick={() => setAspectRatio(r)} className="text-[12px] cursor-pointer focus:bg-card">
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
                            ? "bg-card/50 text-zinc-700 cursor-not-allowed border-transparent opacity-50"
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
                        <div className={cn(
                            "flex items-center w-full h-full justify-between gap-1.5 px-1",
                            "transition-all"
                        )}>
                            <div className="flex items-center gap-2">
                                {mode === 'video' ? <Video className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                <span className="uppercase tracking-[0.1em] text-[11px] leading-none mb-[-2px]">
                                    {mode === 'booth' ? 'Capture Booth' : mode === 'video' ? 'Animate Scene' : 'Generate'}
                                </span>
                            </div>
                            {selectedModelObj?.cost && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/10 rounded-full border border-black/5">
                                    <Coins className="w-3 h-3" />
                                    <span className="text-[10px] font-black">{selectedModelObj.cost}</span>
                                </div>
                            )}
                        </div>
                    )}
                </Button>
            </div>
        </div>
    );
}
