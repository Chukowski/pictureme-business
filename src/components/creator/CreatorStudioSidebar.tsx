
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
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
    Minus,
    Wand2,
    Coins,
    Globe,
    Lock,
    Pencil,
    ChevronDown,
    Diamond,
    Smartphone,
    Ratio,
    Type,
    Clock
} from 'lucide-react';
import { LOCAL_IMAGE_MODELS, LOCAL_VIDEO_MODELS, LEGACY_MODEL_IDS, normalizeModelId } from "@/services/aiProcessor";
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
    audio: boolean;
    setAudio: (v: boolean) => void;
    resolution: string;
    setResolution: (v: string) => void;
    numImages: number;
    setNumImages: (v: number) => void;
    maxImages?: number;
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
    ghostPreviewUrl?: string | null;
}

export function CreatorStudioSidebar({
    mode, setMode,
    prompt, setPrompt,
    model, setModel,
    aspectRatio, setAspectRatio,
    duration, setDuration,
    audio, setAudio,
    resolution, setResolution,
    numImages, setNumImages,
    maxImages = 1,
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
    onRemoveInputImageObj,
    ghostPreviewUrl
}: CreatorStudioSidebarProps) {

    const [enhanceOn, setEnhanceOn] = useState(false);
    const [activeBoothImageIndex, setActiveBoothImageIndex] = useState(0);
    const [showCamera, setShowCamera] = useState(false);
    const [activeBrand, setActiveBrand] = useState<string | null>(null);
    const [showInfo, setShowInfo] = useState(true);
    const [countdown, setCountdown] = useState<number | null>(null);

    const supportedResolutions = useMemo(() => {
        if (mode !== 'image') return [];
        if (model === 'nano-banana-pro') return ["2K", "4K"];
        if (model.includes('seedream')) return ["2K", "4K"];
        if (model.includes('flux')) return ["1K", "2K"];
        return [];
    }, [model, mode]);

    useEffect(() => {
        if (mode === 'image' && supportedResolutions.length > 0 && !supportedResolutions.includes(resolution)) {
            setResolution(supportedResolutions[0]);
        }
    }, [model, mode, supportedResolutions, resolution, setResolution]);

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

    const BrandLogo = ({ brand, className = "w-4 h-4" }: { brand: string, className?: string }) => {
        switch (brand) {
            case 'Google':
                return (
                    <svg className={className} viewBox="0 0 20 20">
                        <path d="M2.55464 6.25768C3.24798 4.87705 4.31161 3.71644 5.62666 2.90557C6.94171 2.0947 8.45636 1.66553 10.0013 1.66602C12.2471 1.66602 14.1338 2.49102 15.5763 3.83685L13.1871 6.22685C12.323 5.40102 11.2246 4.98018 10.0013 4.98018C7.83047 4.98018 5.99297 6.44685 5.3388 8.41602C5.17214 8.91602 5.07714 9.44935 5.07714 9.99935C5.07714 10.5493 5.17214 11.0827 5.3388 11.5827C5.9938 13.5527 7.83047 15.0185 10.0013 15.0185C11.1221 15.0185 12.0763 14.7227 12.823 14.2227C13.2558 13.9377 13.6264 13.5679 13.9123 13.1356C14.1982 12.7033 14.3935 12.2176 14.4863 11.7077H10.0013V8.48435H17.8496C17.948 9.02935 18.0013 9.59768 18.0013 10.1885C18.0013 12.7268 17.093 14.8635 15.5163 16.3135C14.138 17.5868 12.2513 18.3327 10.0013 18.3327C8.90683 18.3331 7.823 18.1179 6.81176 17.6992C5.80051 17.2806 4.88168 16.6668 4.10777 15.8929C3.33386 15.119 2.72005 14.2001 2.30141 13.1889C1.88278 12.1777 1.66753 11.0938 1.66797 9.99935C1.66797 8.65435 1.98964 7.38268 2.55464 6.25768Z" fill="currentColor"></path>
                    </svg>
                );
            case 'Wan':
                return (
                    <svg className={className} viewBox="0 0 20 20">
                        <path d="M19.9361 12.1411L17.6243 8.09523L17.3525 7.61735L18.5771 5.47657C18.6187 5.4023 18.6411 5.32158 18.6411 5.23763C18.6411 5.15367 18.6187 5.07295 18.5771 4.99868L17.215 2.61896C17.1735 2.5447 17.1127 2.48658 17.0424 2.4446C16.972 2.40262 16.8921 2.38002 16.8058 2.38002H11.6323L10.4077 0.236011C10.3245 0.0874804 10.1679 -0.00292969 9.9984 -0.00292969H7.27738C7.19425 -0.00292969 7.11111 0.0196728 7.04077 0.0616489C6.97042 0.103625 6.90967 0.161746 6.86811 0.236011L4.55316 4.28509L4.28138 4.75974H1.83213C1.749 4.75974 1.66587 4.78235 1.59552 4.82432C1.52518 4.8663 1.46443 4.92442 1.42286 4.99868L0.0639488 7.38164C0.0223821 7.4559 0 7.53663 0 7.62058C0 7.70453 0.0223821 7.78525 0.0639488 7.85952L2.65068 12.3833L1.42606 14.5273C1.38449 14.6015 1.36211 14.6823 1.36211 14.7662C1.36211 14.8502 1.38449 14.9309 1.42606 15.0051L2.78817 17.3849C2.82974 17.4591 2.89049 17.5173 2.96083 17.5592C3.03118 17.6012 3.11111 17.6238 3.19744 17.6238H8.36771L9.59233 19.7678C9.67546 19.9163 9.83214 20.0068 10.0016 20.0068H12.7226C12.8058 20.0068 12.8889 19.9842 12.9592 19.9422C13.0296 19.9002 13.0903 19.8421 13.1319 19.7678L15.7186 15.2441H18.1679C18.251 15.2441 18.3341 15.2215 18.4045 15.1795C18.4748 15.1375 18.5356 15.0794 18.5771 15.0051L19.9393 12.6254C19.9808 12.5512 20.0032 12.4704 20.0032 12.3865C20.0032 12.3025 19.9808 12.2218 19.9393 12.1475L19.9361 12.1411ZM7.27738 0.474952L8.63949 2.8579L7.27738 5.23763H18.1679L16.8058 7.61735H6.45883L4.82494 4.75974L7.27738 0.474952ZM8.09273 17.1395H3.19424L4.55636 14.7565H7.27738L1.83213 5.23763H4.55316L5.91527 7.61735L9.72662 14.2851L8.09273 17.1427V17.1395ZM16.8058 12.3768L15.4468 9.99707L10.0016 19.5224L8.63949 17.1427L10.0016 14.763L13.813 8.09523H17.0807L19.53 12.38H16.8058V12.3768Z" fill="currentColor"></path>
                    </svg>
                );
            case 'Kling':
                return (
                    <svg className={className} viewBox="0 0 20 20">
                        <path fillRule="evenodd" clipRule="evenodd" d="M16.7522 2.86984L16.818 2.93745L16.8199 2.93552C18.087 4.25441 17.7236 6.90443 15.8863 9.90864L19.5 13.6567L19.3447 13.9703C18.7372 15.1986 17.9147 16.2992 16.9193 17.216C15.608 18.43 14.0251 19.2853 12.3143 19.7044L12.2522 19.7198L12.1634 19.7417L12.0994 19.7565L11.9584 19.7887L11.8416 19.8126L11.754 19.8299C11.6609 19.8493 11.5634 19.8673 11.4683 19.884L11.3888 19.8963L11.3286 19.904C11.2429 19.916 11.1576 19.9272 11.0727 19.9375C9.64831 20.1036 8.20616 19.9376 6.8516 19.4517C5.49703 18.9658 4.2643 18.1723 3.24348 17.1291L3.18385 17.0692C1.91429 15.7503 2.27391 13.0983 4.11366 10.0922L0.5 6.34416L0.65528 6.03054C1.26118 4.80131 2.0846 3.70115 3.08261 2.78741C4.10242 1.8473 5.28649 1.11848 6.57081 0.640344C6.86894 0.528933 7.18075 0.431691 7.48696 0.34926C7.73931 0.279139 7.9944 0.220054 8.25155 0.172163C8.33851 0.154131 8.43665 0.135456 8.53168 0.118712C10.0139 -0.12084 11.5297 0.00325476 12.9574 0.481036C14.385 0.958817 15.6847 1.77698 16.7522 2.86984ZM15.5304 3.03083H15.5267L15.5304 3.03276C14.3025 2.63864 12.354 3.27555 10.2944 4.68267C11.8615 4.22994 13.377 4.46435 14.3565 5.48057C15.2845 6.44462 15.5385 7.90777 15.187 9.44497C15.1704 9.52697 15.1497 9.61005 15.1248 9.69419C16.8062 7.05706 17.3441 4.58993 16.2795 3.48807C16.262 3.4682 16.2433 3.44949 16.2236 3.43204L16.2155 3.42431L16.2037 3.41336L16.1683 3.38503C16.153 3.37215 16.1371 3.3597 16.1205 3.34768L16.0944 3.32836C15.9242 3.19657 15.7334 3.09594 15.5304 3.03083ZM14.6876 8.95876C14.4708 10.2995 13.7559 11.6545 12.672 12.777C11.5913 13.9001 10.282 14.642 8.98696 14.8687C7.77516 15.0812 6.72981 14.8043 6.04472 14.0959C5.36149 13.3868 5.09441 12.3069 5.29938 11.044C5.51615 9.7045 6.22919 8.3489 7.30807 7.22771C7.30807 7.22771 7.30994 7.22771 7.31429 7.22127L7.31801 7.21483C8.40062 6.09944 9.70497 5.3595 10.9969 5.13539C12.2087 4.92287 13.2516 5.1985 13.9391 5.90818C14.6224 6.61657 14.8894 7.69847 14.6845 8.9594H14.6882L14.6876 8.95876Z" fill="currentColor"></path>
                    </svg>
                );
            case 'LTX':
                return (
                    <svg className={className} viewBox="0 0 75 32">
                        <path d="M0 30.0086V7.50056C0 7.09765 0.154254 6.69973 0.460162 6.43868C0.708822 6.22729 0.987356 6.12029 1.29316 6.12029H8.2339C8.63671 6.12029 9.03463 6.26205 9.31316 6.55307C9.53944 6.79174 9.65133 7.07777 9.65133 7.41345V23.198C9.65133 23.6108 9.98462 23.944 10.3974 23.944H21.4638C21.8666 23.944 22.267 24.0858 22.5431 24.3767C22.7668 24.6155 22.8812 24.9015 22.8812 25.2372V30.5856C22.8812 31.0457 22.6823 31.4982 22.3018 31.7569C22.078 31.9086 21.8244 31.9831 21.5383 31.9831L1.99199 31.9956C0.890348 31.9981 0 31.1078 0 30.0086Z" fill="currentColor" />
                        <path d="M36.5888 31.9926C34.4062 31.9876 32.492 31.6543 30.8413 30.9878C29.1906 30.3214 27.9103 29.2346 26.998 27.7227C26.0856 26.2132 25.6333 24.2137 25.6382 21.7269L25.6531 13.7194L21.7015 13.7119C21.3486 13.7119 21.0528 13.5876 20.8116 13.3365C20.5704 13.0853 20.4512 12.7819 20.4537 12.4164L20.4635 7.39299C20.4635 7.02744 20.5854 6.72154 20.8265 6.47288C21.0677 6.22422 21.3635 6.09983 21.7165 6.10233L25.668 6.10983L25.6779 1.29066C25.6779 0.925114 25.7998 0.619208 26.041 0.370548C26.282 0.121887 26.5778 0 26.9309 0L33.9065 0.0124913C34.2595 0.0124913 34.5554 0.136772 34.7964 0.387931C35.0376 0.639089 35.1569 0.944995 35.1545 1.30805L35.1445 6.12721L41.2078 6.13959C41.5607 6.13959 41.8566 6.26398 42.0977 6.51514C42.3389 6.76629 42.4582 7.0722 42.4557 7.43525L42.4458 12.4586C42.4458 12.8242 42.3239 13.1301 42.0828 13.3787C41.8417 13.6274 41.5434 13.7518 41.1928 13.7493L35.1296 13.7368L35.1171 20.8988C35.1171 21.8613 35.306 22.6148 35.6914 23.1618C36.0767 23.7089 36.6833 23.985 37.5186 23.985L41.5607 23.9925C41.9138 23.9925 42.2096 24.1168 42.4507 24.368C42.6918 24.6192 42.8112 24.9251 42.8087 25.2881L42.7987 30.7093C42.7987 31.075 42.677 31.3808 42.4358 31.6294C42.1946 31.8782 41.8963 32.0025 41.5459 32L36.5913 31.9901L36.5888 31.9926Z" fill="currentColor" />
                        <path d="M47.5486 31.985C47.2282 31.985 46.965 31.8682 46.7589 31.6369C46.5503 31.4056 46.4485 31.1395 46.4485 30.841C46.4485 30.7416 46.4634 30.6248 46.4956 30.4929C46.5279 30.3611 46.5925 30.2268 46.6868 30.0951L54.3506 18.9342C54.4647 18.7675 54.4672 18.5462 54.3556 18.3771L47.4543 8.01456C47.3896 7.91516 47.335 7.79827 47.2853 7.66639C47.2382 7.53462 47.2133 7.40035 47.2133 7.26858C47.2133 6.97017 47.3251 6.70402 47.5486 6.47274C47.7721 6.24146 48.0279 6.12457 48.316 6.12457H55.6443C56.0914 6.12457 56.4266 6.23157 56.6501 6.44786C56.8737 6.66426 57.0326 6.85328 57.1294 7.01992L60.3082 11.8169C60.5043 12.1128 60.939 12.1128 61.1352 11.8169L64.3138 7.01992C64.4405 6.85328 64.6093 6.66426 64.8155 6.44786C65.0216 6.23157 65.3494 6.12457 65.7964 6.12457H72.7896C73.0777 6.12457 73.331 6.24146 73.557 6.47274C73.7805 6.70402 73.8922 6.95268 73.8922 7.21882C73.8922 7.38547 73.8748 7.53462 73.8451 7.66639C73.8128 7.79827 73.7482 7.91516 73.6539 8.01456L66.6159 18.3747C66.4992 18.5462 66.5017 18.77 66.6209 18.9392L74.4212 30.0975C74.5181 30.2293 74.5801 30.3636 74.6124 30.4954C74.6447 30.6272 74.6596 30.744 74.6596 30.8435C74.6596 31.142 74.5478 31.4081 74.3244 31.6394C74.1008 31.8707 73.8451 31.9874 73.557 31.9874H65.8933C65.4786 31.9874 65.1756 31.888 64.9844 31.689C64.7932 31.4901 64.6317 31.3086 64.505 31.142L60.9886 25.9544C60.7924 25.671 60.3752 25.6685 60.1765 25.947L56.4118 31.1395C56.3149 31.3061 56.1634 31.4876 55.9573 31.6865C55.7487 31.8855 55.4383 31.985 55.0236 31.985H47.5486Z" fill="currentColor" />
                    </svg>
                );
            case 'Bytedance':
                return (
                    <svg className={className} viewBox="0 0 512 512" fillRule="evenodd" clipRule="evenodd">
                        <path d="M318.805 396.523l-36.352-9.493V213.547l38.912-9.856c21.334-5.419 39.254-9.835 40.107-9.664.683 0 1.195 47.68 1.195 106.07v106.09l-3.755-.17c-2.218 0-20.31-4.417-40.107-9.515v.02z" fill="currentColor" fillRule="nonzero" />
                        <path d="M149.333 352.896c0-58.368.512-106.24 1.366-106.24.682-.17 18.602 4.267 40.106 9.685l38.742 9.835-.342 86.4-.512 86.379-34.816 9.003c-19.114 4.906-37.034 9.493-39.594 10.005l-4.95 1.195V352.896z" fill="currentColor" fillRule="nonzero" />
                        <path d="M410.454 266.176c0-192.64.17-202.987 3.072-202.133 1.536.512 16.725 4.416 33.62 8.661 16.897 4.416 33.622 8.64 37.206 9.493l6.315 1.707-.341 182.613-.512 182.785-34.646 8.832c-18.944 4.906-36.864 9.322-39.594 10.026l-5.12 1.174V266.176z" fill="currentColor" fillRule="nonzero" />
                        <path d="M21.333 266.859c0-99.798.512-181.44 1.366-181.44.682 0 18.602 4.416 39.936 9.685l38.912 9.835v161.75c0 88.746-.342 161.578-.683 161.578-.512 0-18.603 4.587-40.107 10.027l-39.424 9.984v-181.44.02z" fill="currentColor" fillRule="nonzero" />
                    </svg>
                );
            case 'Flux':
                return (
                    <div className={cn("flex items-center justify-center font-black italic", className)}>
                        F
                    </div>
                );
            default:
                return <Sparkles className={className} />;
        }
    };

    const getRobustBrand = (id: string, name?: string, localBrand?: string): string => {
        if (localBrand && localBrand !== 'Other') return localBrand;
        const searchStr = (id + (name || '')).toLowerCase();
        if (searchStr.includes('kling')) return 'Kling';
        if (searchStr.includes('google') || searchStr.includes('veo') || searchStr.includes('nano-banana')) return 'Google';
        if (searchStr.includes('flux')) return 'Flux';
        if (searchStr.includes('seedream') || searchStr.includes('bytedance')) return 'Bytedance';
        if (searchStr.includes('wan')) return 'Wan';
        if (searchStr.includes('ltx')) return 'LTX';
        if (searchStr.includes('hailuo') || searchStr.includes('minimax')) return 'MiniMax';
        if (searchStr.includes('sora') || searchStr.includes('openai')) return 'OpenAI';
        return 'Other';
    };

    const BRAND_DETAILS: Record<string, { description: string }> = {
        'Higgsfield': { description: "Advanced camera controls and effect presets" },
        'OpenAI': { description: "Multi-shot video with sound generation" },
        'Google': { description: "Precision video with sound control" },
        'Wan': { description: "Camera-controlled video with sound, more freedom" },
        'Kling': { description: "Perfect motion with advanced video control" },
        'MiniMax': { description: "High-dynamic, VFX-ready, fastest and affordable" },
        'Seedance': { description: "Cinematic, multi-shot video creation" },
        'Bytedance': { description: "Professional creative video models" },
        'Flux': { description: "State-of-the-art cinematic image generation" },
        'LTX': { description: "Real-time high-fidelity video generation" }
    };

    const imageModels = useMemo(() => {
        const backendImageModels = availableModels.filter(m =>
            m.type === 'image' &&
            !LEGACY_MODEL_IDS.includes(m.id)
        );

        const merged: any[] = backendImageModels.map(bm => {
            const normalizedId = normalizeModelId(bm.id);
            const local = LOCAL_IMAGE_MODELS.find(lm => lm.shortId === normalizedId || lm.id === bm.id);
            return {
                id: bm.id,
                shortId: local ? (local.shortId || local.id) : bm.id,
                name: bm.name || (local ? local.name : bm.id),
                brand: getRobustBrand(bm.id, bm.name, local?.brand),
                type: 'image',
                cost: bm.cost || (local ? local.cost : 15),
                speed: local ? local.speed : 'medium',
                description: bm.description || (local ? local.description : ''),
                capabilities: local?.capabilities || [],
                variants: local?.variants || []
            };
        });

        LOCAL_IMAGE_MODELS.forEach(local => {
            if (!merged.some(m => m.id === local.shortId || m.id === local.id)) {
                merged.push({
                    ...local,
                    brand: getRobustBrand(local.id, local.name, (local as any).brand),
                    cost: local.cost || 15
                });
            }
        });

        return merged.filter(m => !LEGACY_MODEL_IDS.includes(m.id) && !LEGACY_MODEL_IDS.includes(m.shortId) && !m.isVariant);
    }, [availableModels]);

    const videoModels = useMemo(() => {
        const backendVideoModels = availableModels.filter(m =>
            m.type === 'video' &&
            !LEGACY_MODEL_IDS.includes(m.id)
        );

        const merged: any[] = backendVideoModels.map(bm => {
            const normalizedId = normalizeModelId(bm.id);
            const local = LOCAL_VIDEO_MODELS.find(lm => lm.shortId === normalizedId || lm.id === bm.id);
            return {
                id: bm.id,
                shortId: local ? (local.shortId || local.id) : bm.id,
                name: bm.name || (local ? local.name : bm.id),
                brand: getRobustBrand(bm.id, bm.name, local?.brand),
                type: 'video',
                cost: bm.cost || (local ? local.cost : 100),
                speed: local ? local.speed : 'slow',
                description: bm.description || (local ? local.description : ''),
                capabilities: local?.capabilities || [],
                variants: local?.variants || []
            };
        });

        LOCAL_VIDEO_MODELS.forEach(local => {
            if (!merged.some(m => m.id === local.shortId || m.id === local.id)) {
                merged.push({
                    ...local,
                    brand: getRobustBrand(local.id, local.name, (local as any).brand),
                    cost: local.cost || 100
                });
            }
        });

        return merged.filter(m => !LEGACY_MODEL_IDS.includes(m.id) && !LEGACY_MODEL_IDS.includes(m.shortId) && !m.isVariant);
    }, [availableModels]);

    useEffect(() => {
        const validModels = mode === 'image' ? imageModels : videoModels;
        const normalized = normalizeModelId(model);
        const isValid = validModels.some(m => m.shortId === normalized || m.id === model) ||
            validModels.some(m => m.variants?.some((v: any) =>
                v.id === model ||
                v.id === normalized ||
                v.shortId === normalized ||
                normalizeModelId(v.id) === normalized
            ));

        if (!isValid && validModels.length > 0) {
            // If the current model is not a base model or a variant, default to the first base model
            setModel(validModels[0].shortId);
        }
    }, [mode, imageModels, videoModels, model, setModel]);

    const selectedModelObj = useMemo(() => {
        const models = mode === 'image' ? imageModels : videoModels;

        // 1. Check if the current 'model' matches a base model ID or shortId
        const base = models.find(m => m.shortId === model || m.id === model);
        if (base) return base;

        // 2. Check if the current 'model' is a variant of any base model
        for (const m of models) {
            if (m.variants?.some((v: any) => v.id === model || v.shortId === model)) {
                return m;
            }
        }

        // 3. Fallback to first available model
        return models[0];
    }, [mode, model, imageModels, videoModels]);

    const activeCapabilities = useMemo(() => {
        const allLocal = [...LOCAL_IMAGE_MODELS, ...LOCAL_VIDEO_MODELS];
        const specific = allLocal.find(m => m.shortId === model || m.id === model) ||
            (selectedModelObj?.variants as any[])?.find((v: any) => v.id === model || v.shortId === model);

        return specific?.capabilities || selectedModelObj?.capabilities || [];
    }, [model, selectedModelObj]);

    const isOptional = useMemo(() => {
        if (mode === 'image') return activeCapabilities.includes('t2i');
        if (mode === 'video') return activeCapabilities.includes('t2v');
        return false;
    }, [mode, activeCapabilities]);

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
            "fixed flex flex-col text-white font-sans transition-all duration-300",
            // Mobile: Full screen drawer, must be above navbar (z-100)
            "inset-0 bg-[#09090b] h-[100dvh] z-[110] md:h-auto md:overflow-hidden",
            // Desktop: Extra compact floating fixed card (90% scaling feel)
            "md:z-20 md:top-[80px] md:left-[12px] md:bottom-8 md:w-[375px] md:bg-[#1A1A1A] md:rounded-[1rem] md:border md:border-white/5 md:shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:right-auto"
        )}>

            {/* --- SIDEBAR HEADER (Mobile) --- */}
            <div className="flex md:hidden items-center justify-between px-4 h-14 border-b border-white/5 flex-shrink-0 bg-[#101112]">
                <div className="flex items-center gap-2">
                    <DropdownMenu>
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
                        <DropdownMenuContent align="start" className="w-48 bg-card border-zinc-900 z-[200] p-1.5">
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
            <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent [webkit-overflow-scrolling:touch]">
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
                                                User said: "replace upload button for a grid of squares... so user can see and delete if any". 
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
                                {selectedTemplate ? (
                                    <img
                                        src={selectedTemplate.preview_url || selectedTemplate.preview_images?.[0] || selectedTemplate.images?.[0]}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        alt={selectedTemplate.name}
                                    />
                                ) : (inputImage || ghostPreviewUrl) ? (
                                    <img
                                        src={(inputImage || ghostPreviewUrl)!}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        alt="Current Preview"
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
                                    {selectedModelObj?.brand && <span className="text-white/50">{selectedModelObj.brand} › </span>}
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
                                        <span className="text-[12px] font-bold text-white/80">{mode === 'image' ? 'Upload' : (activeCapabilities.includes('v2v') ? 'Upload video' : 'Start frame')}</span>
                                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">{isOptional ? 'Optional' : 'Required'}</span>
                                    </div>
                                )}
                            </div>

                            {/* End Frame / Multi-input */}
                            {mode === 'video' ? (
                                (activeCapabilities.includes('frames') || activeCapabilities.includes('frame') || model.includes('frame') || model.includes('interpolation')) && (
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
                                                <span className="text-[10px] text-zinc-700 uppercase font-black tracking-tighter">Required</span>
                                            </div>
                                        )}
                                    </div>
                                )
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
                            <DropdownMenu modal={false} onOpenChange={(open) => {
                                if (open) setActiveBrand(null);
                            }}>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center justify-between w-full h-14 px-3 bg-[#0D0D0D]/50 hover:bg-zinc-800/80 rounded-xl border border-white/5 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 text-zinc-400 group-hover:text-[#D1F349] transition-colors">
                                                {selectedModelObj?.brand ? <BrandLogo brand={selectedModelObj.brand} className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                                            </div>
                                            <div className="flex flex-col items-start min-w-0">
                                                <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.1em]">Model</span>
                                                <div className="flex items-center gap-1.5 truncate max-w-[220px]">
                                                    {selectedModelObj?.brand && (
                                                        <span className="text-[13px] font-medium text-zinc-500">{selectedModelObj.brand}</span>
                                                    )}
                                                    <span className="text-zinc-700 text-[10px] mt-0.5">›</span>
                                                    <span className="text-[13px] font-black text-white">{selectedModelObj?.name || model}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-700 transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="w-[92vw] md:w-[340px] bg-[#141414] border-white/5 z-[200] p-2 shadow-2xl max-h-[85vh] md:max-h-[500px] overflow-hidden flex flex-col"
                                    side={typeof window !== 'undefined' && window.innerWidth < 768 ? "bottom" : "right"}
                                    sideOffset={12}
                                    align={typeof window !== 'undefined' && window.innerWidth < 768 ? "center" : "start"}
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                >
                                    <AnimatePresence mode="wait">
                                        {!activeBrand ? (
                                            /* --- LEVEL 1: BRAND SELECTION --- */
                                            <motion.div
                                                key="brands"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                className="flex flex-col gap-1 overflow-y-auto scrollbar-thin max-h-[440px] pr-1"
                                            >
                                                {Object.entries(
                                                    (mode === 'image' ? imageModels : videoModels).reduce((acc, m) => {
                                                        const brand = (m as any).brand || 'Other';
                                                        if (!acc[brand]) acc[brand] = [];
                                                        acc[brand].push(m);
                                                        return acc;
                                                    }, {} as Record<string, typeof imageModels>)
                                                ).map(([brand, models]) => (
                                                    <button
                                                        key={brand}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setActiveBrand(brand);
                                                        }}
                                                        className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-white/5 transition-all text-left group"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 text-zinc-400 group-hover:text-white transition-colors">
                                                            <BrandLogo brand={brand} className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-[14px] font-black text-white tracking-tight leading-none mb-1.5">{brand}</h4>
                                                            <p className="text-[11px] text-zinc-500 font-medium line-clamp-1 leading-none">
                                                                {BRAND_DETAILS[brand]?.description || `${models.length} models available`}
                                                            </p>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-all" />
                                                    </button>
                                                ))}
                                            </motion.div>
                                        ) : (
                                            /* --- LEVEL 2: COMPACT MODEL LIST --- */
                                            <motion.div
                                                key="models"
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                className="flex flex-col h-full"
                                            >
                                                {/* Header / Back */}
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setActiveBrand(null);
                                                    }}
                                                    className="flex items-center gap-2 p-2 mb-2 text-zinc-500 hover:text-white transition-colors text-[12px] font-black uppercase tracking-wider"
                                                >
                                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                                    Back
                                                </button>

                                                <div className="space-y-1.5 overflow-y-auto scrollbar-thin pr-1 max-h-[440px]">
                                                    {(mode === 'image' ? imageModels : videoModels)
                                                        .filter(m => m.brand === activeBrand)
                                                        .map((m) => {
                                                            const isSelected = model === m.shortId || (m.shortId === normalizeModelId(model));
                                                            return (
                                                                <DropdownMenuItem
                                                                    key={m.id}
                                                                    onClick={() => setModel(m.shortId)}
                                                                    className={cn(
                                                                        "flex flex-col items-start gap-1 p-4 rounded-2xl transition-all cursor-pointer border border-transparent",
                                                                        isSelected ? "bg-[#1f1f1f] border-white/10" : "hover:bg-white/5"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between w-full">
                                                                        <div className="flex-1 min-w-0">
                                                                            <h4 className={cn("text-[14px] font-black tracking-tight mb-1", isSelected ? "text-[#D1F349]" : "text-white")}>
                                                                                {m.name === 'Flux Models' ? 'Flux Pro' : m.name}
                                                                            </h4>
                                                                            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed line-clamp-1">
                                                                                {m.description || "High-quality model"}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex flex-col items-end gap-1 ml-3">
                                                                            <div className="flex items-center gap-1 mb-1">
                                                                                <span className="text-[12px] font-black text-[#D1F349] opacity-60">{m.cost}</span>
                                                                                <Sparkles className="w-3 h-3 text-[#D1F349] opacity-40" />
                                                                            </div>
                                                                            {isSelected && <Check className="w-4 h-4 text-[#D1F349]" />}
                                                                        </div>
                                                                    </div>

                                                                    {/* Technical Badges Like Higgsfield */}
                                                                    <div className="flex items-center gap-1.5 mt-2.5">
                                                                        <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 flex items-center gap-1">
                                                                            <Ratio className="w-3 h-3 text-zinc-500" />
                                                                            <span className="text-[9px] font-black text-zinc-500">
                                                                                {mode === 'image'
                                                                                    ? (m.id.includes('2k') || m.id.includes('4k') ? '2K-4K' : (m.id.includes('pro') ? '1MP+ HD' : '1MP'))
                                                                                    : '720p-1080p'}
                                                                            </span>
                                                                        </div>

                                                                        <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 flex items-center gap-1">
                                                                            <Wand2 className="w-3 h-3 text-zinc-500" />
                                                                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-tighter">
                                                                                {mode === 'image'
                                                                                    ? (m.capabilities?.includes('t2i') && m.capabilities?.includes('i2i') ? 'T2I · I2I' : (m.capabilities?.includes('i2i') ? 'I2I' : 'T2I'))
                                                                                    : (m.capabilities?.includes('t2v') && m.capabilities?.includes('i2v') ? 'T2V · I2V' : (m.capabilities?.includes('i2v') ? 'I2V' : 'T2V'))}
                                                                            </span>
                                                                        </div>

                                                                        <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 flex items-center gap-1">
                                                                            <Clock className="w-3 h-3 text-zinc-500" />
                                                                            <span className="text-[9px] font-black text-zinc-500 uppercase">
                                                                                {m.speed || (mode === 'video' ? '8s' : 'Pro')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </DropdownMenuItem>
                                                            );
                                                        })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <AnimatePresence>
                                {selectedModelObj?.variants && selectedModelObj.variants.length > 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-2"
                                    >
                                        <div className="flex flex-col gap-2 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl border-dashed">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.1em]">Engine Variation</span>
                                                <Badge className="bg-[#D1F349]/10 text-[#D1F349] border-none text-[8px] font-black px-1.5 py-0 h-4 uppercase">Selection</Badge>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {selectedModelObj.variants.map((v: any) => (
                                                    <button
                                                        key={v.id}
                                                        onClick={() => setModel(v.id)}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all border",
                                                            model === v.id || normalizeModelId(model) === v.id
                                                                ? "bg-[#D1F349] text-black border-[#D1F349]"
                                                                : "bg-white/5 text-zinc-500 border-white/5 hover:border-white/10 hover:text-white"
                                                        )}
                                                    >
                                                        {v.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {showInfo && selectedModelObj?.description && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl border-dashed relative group/info">
                                            <button
                                                onClick={() => setShowInfo(false)}
                                                className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover/info:opacity-40 hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3 text-white" />
                                            </button>
                                            <p className="text-[11px] text-zinc-500 font-medium leading-[1.6] pr-4">
                                                <Sparkles className="w-3 h-3 inline-block mr-1.5 text-[#D1F349]/40 -translate-y-[1px]" />
                                                {selectedModelObj.description}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>



                            <div className={cn(
                                "grid gap-1",
                                mode === 'video' ? "grid-cols-2" : (supportedResolutions.length > 0 ? "grid-cols-3" : "grid-cols-2")
                            )}>
                                {/* Resolution (Video or Supported Image Models) */}
                                {(mode === 'video' || (mode === 'image' && supportedResolutions.length > 0)) && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center justify-between h-12 px-3 bg-[#0D0D0D]/50 hover:bg-zinc-800/80 rounded-xl border border-white/5 transition-colors group">
                                                <div className="flex flex-col items-start translate-y-[1px]">
                                                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Res</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <Diamond className="w-3 h-3 text-[#D1F349]/50" />
                                                        <span className="text-[12px] font-bold text-white">{resolution}</span>
                                                    </div>
                                                </div>
                                                <ChevronDown className="w-3.5 h-3.5 text-zinc-600 transition-transform group-hover:translate-y-0.5" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-card border-zinc-900 text-white z-[200] min-w-[100px]">
                                            {(mode === 'video' ? ["720p", "1080p", "2K", "4K"] : supportedResolutions).map(r => (
                                                <DropdownMenuItem key={r} onClick={() => setResolution(r)} className="text-[12px] cursor-pointer focus:bg-card">
                                                    {r}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}

                                {/* Aspect Ratio */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center justify-between h-12 px-3 bg-[#0D0D0D]/50 hover:bg-zinc-800/80 rounded-xl border border-white/5 transition-colors group">
                                            <div className="flex flex-col items-start translate-y-[1px]">
                                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Ratio</span>
                                                <div className="flex items-center gap-1.5">
                                                    <Smartphone className="w-3 h-3 text-white/30" />
                                                    <span className="text-[12px] font-bold text-white">{aspectRatio}</span>
                                                </div>
                                            </div>
                                            <ChevronDown className="w-3.5 h-3.5 text-zinc-600 transition-transform group-hover:translate-y-0.5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-card border-zinc-900 text-white z-[200] min-w-[100px]">
                                        {["1:1", "4:5", "16:9", "9:16"].map(r => (
                                            <DropdownMenuItem key={r} onClick={() => setAspectRatio(r)} className="text-[12px] cursor-pointer focus:bg-card">
                                                {renderRatioVisual(r)} {r}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Batch Count (Image mode only) */}
                                {mode === 'image' && (
                                    <div className="flex items-center justify-between h-12 px-3 bg-[#0D0D0D]/50 rounded-xl border border-white/5 group">
                                        <div className="flex flex-col items-start translate-y-[1px]">
                                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Batch</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setNumImages(Math.max(1, numImages - 1))}
                                                    className="p-1 hover:bg-white/5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    disabled={numImages <= 1}
                                                >
                                                    <Minus className="w-3 h-3 text-zinc-500 hover:text-white" />
                                                </button>
                                                <span className="text-[12px] font-black text-white">{numImages}/{maxImages}</span>
                                                <button
                                                    onClick={() => setNumImages(Math.min(maxImages, numImages + 1))}
                                                    className="p-1 hover:bg-white/5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    disabled={numImages >= maxImages}
                                                >
                                                    <Plus className="w-3 h-3 text-zinc-500 hover:text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Duration (Video Only) */}
                                {mode === 'video' && (
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
                                        <DropdownMenuContent className="bg-card border-zinc-900 text-white z-[200] min-w-[100px]">
                                            {["5s", "10s"].map(d => (
                                                <DropdownMenuItem key={d} onClick={() => setDuration(d)} className="text-[12px] cursor-pointer focus:bg-card">
                                                    {d}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}

                                {/* Audio Toggle (Video Only) */}
                                {mode === 'video' && (
                                    <div className="col-span-2">
                                        <button
                                            onClick={() => setAudio(!audio)}
                                            className="flex items-center justify-between h-12 px-3 w-full bg-[#0D0D0D]/50 hover:bg-zinc-800/80 rounded-xl border border-white/5 transition-colors group"
                                        >
                                            <div className="flex flex-col items-start translate-y-[1px]">
                                                <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Audio</span>
                                                <span className="text-[12px] font-bold text-white">{audio ? 'Included' : 'No Audio'}</span>
                                            </div>
                                            <div className={cn(
                                                "w-10 h-5 rounded-full relative transition-colors duration-200 border border-white/10",
                                                audio ? "bg-[#D1F349]" : "bg-[#101112]"
                                            )}>
                                                <div className={cn(
                                                    "absolute top-0.5 bottom-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all transform",
                                                    audio ? "right-0.5" : "left-0.5"
                                                )} />
                                            </div>
                                        </button>
                                    </div>
                                )}
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
