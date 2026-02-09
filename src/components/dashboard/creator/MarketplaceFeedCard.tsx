import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Heart, Play, RefreshCw, Wand2, Video, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getAvatarUrl, getMediaFeedUrl, isVideoUrl } from "@/services/cdn";
import { toggleLike } from "@/services/eventsApi";
import { toast } from "sonner";
import { FeedCreation, RemixMode } from "@/pages/creator/dashboard/types";

export function MarketplaceFeedCard({
    creation,
    onImageClick,
    onRemixClick,
    showBlurred = false
}: {
    creation: FeedCreation;
    onImageClick: (e: React.MouseEvent) => void;
    onRemixClick: (e: React.MouseEvent, mode?: RemixMode) => void;
    showBlurred?: boolean;
}) {
    const isHero = creation.is_hero || false;

    const [likes, setLikes] = useState(creation.likes || 0);
    const [isLiked, setIsLiked] = useState(creation.is_liked || false);
    const [isLiking, setIsLiking] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [isBlurred, setIsBlurred] = useState(showBlurred);
    const remixRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (expanded && remixRef.current && !remixRef.current.contains(e.target as Node)) {
                setExpanded(false);
            }
        };
        if (expanded) {
            document.addEventListener('mousedown', handleOutsideClick);
        }
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [expanded]);

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!localStorage.getItem("auth_token")) {
            toast.error("Please login to like");
            return;
        }

        if (isLiking) return;
        setIsLiking(true);

        const prevLikes = likes;
        const prevIsLiked = isLiked;
        setLikes(prev => isLiked ? prev - 1 : prev + 1);
        setIsLiked(!isLiked);

        try {
            const res = await toggleLike(creation.id);
            if (!res.success) throw new Error("Failed");
        } catch (error) {
            console.error(error);
            setLikes(prevLikes);
            setIsLiked(prevIsLiked);
            toast.error("Failed to update like");
        } finally {
            setIsLiking(false);
        }
    };

    const isVideo = creation.type === 'video' || isVideoUrl(creation.image_url || creation.url);
    const previewUrl = getMediaFeedUrl({
        url: creation.image_url || creation.url,
        type: creation.type,
        thumbnail_url: creation.thumbnail_url,
        previewUrl: creation.previewUrl
    }, 600);

    return (
        <div
            className="break-inside-avoid group relative rounded-2xl overflow-hidden bg-card border border-white/5 hover:border-white/20 transition-all cursor-pointer shadow-lg aspect-[4/5] h-min"
            onClick={isBlurred ? undefined : onImageClick}
            role={isBlurred ? undefined : "button"}
            tabIndex={isBlurred ? -1 : 0}
            onKeyDown={(e) => {
                if (isBlurred) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onImageClick(e as unknown as React.MouseEvent);
                }
            }}
        >
            {/* Video indicator badge */}
            {isVideo && (
                <div className="absolute top-3 left-3 z-30 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-md">
                    <Play className="w-3 h-3 text-white fill-white" />
                </div>
            )}

            {/* 18+ Badge */}
            {creation.is_adult && (
                <div className={cn(
                    "absolute left-3 z-30 px-2 py-1 bg-red-500/80 backdrop-blur-sm rounded-md",
                    isVideo ? "top-11" : "top-3"
                )}>
                    <span className="text-white text-[10px] font-black">18+</span>
                </div>
            )}

            {/* Preview image */}
            {previewUrl ? (
                <img
                    src={previewUrl}
                    alt={creation.template_name || creation.prompt || ''}
                    className={cn(
                        "w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500",
                        isBlurred && "blur-2xl"
                    )}
                    loading={isHero ? "eager" : "lazy"}
                    decoding="async"
                />
            ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <Play className="w-8 h-8 text-zinc-600" />
                </div>
            )}

            {/* Blur Overlay for 18+ content */}
            {isBlurred && (
                <div
                    className="absolute inset-0 backdrop-blur-2xl bg-black/40 flex flex-col items-center justify-center z-40 cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsBlurred(false);
                    }}
                >
                    <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border-2 border-red-500/50">
                        <span className="text-red-400 font-black text-2xl">18+</span>
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest text-white/90 mb-1">Adult Content</p>
                    <p className="text-xs text-white/60">Click to view</p>
                </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#101112]/90 via-[#101112]/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* Like Button */}
            <div className="absolute top-3 right-3 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button
                    onClick={handleLike}
                    className="w-9 h-9 aspect-square shrink-0 rounded-full flex items-center justify-center bg-[#101112]/40 backdrop-blur-md hover:bg-[#101112]/60 transition-colors border border-white/10 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                >
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-pink-500 text-pink-500" : "text-white"}`} />
                </button>
            </div>

            {/* Like Count */}
            {(likes > 0 || isLiked) && (
                <div className="hidden md:block absolute top-3 right-3 z-20 pointer-events-none md:group-hover:opacity-0 transition-opacity">
                    <Badge variant="secondary" className="bg-[#101112]/30 backdrop-blur-sm hover:bg-[#101112]/40 border-0 gap-1 pl-1.5 pr-2 h-8">
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-pink-500 text-pink-500" : "text-white"}`} />
                        <span className="text-xs font-medium text-white">{likes}</span>
                    </Badge>
                </div>
            )}

            {/* Content Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-2.5 md:p-4 z-20">
                <div className="flex items-end justify-between gap-2">
                    <div className="flex-1 min-w-0 pointer-events-none">
                        <h3 className="text-[10px] md:text-xs font-medium text-white/30 uppercase tracking-tighter leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,1)] line-clamp-2">
                            {creation.template_name || creation.prompt?.split(',')[0] || 'Creation'}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <div className="w-4 h-4 shrink-0 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden border border-white/10">
                                {creation.creator_avatar ? (
                                    <img src={getAvatarUrl(creation.creator_avatar, 32)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[6px] font-bold text-white uppercase">{creation.creator_username?.charAt(0)}</span>
                                )}
                            </div>
                            <span className="text-[9px] font-medium text-zinc-300 truncate">
                                @{creation.creator_username}
                            </span>
                        </div>
                    </div>

                    <div
                        ref={remixRef}
                        className="flex items-center gap-1.5 relative z-30 group/remix"
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (expanded) {
                                    onRemixClick(e);
                                } else {
                                    setExpanded(true);
                                }
                            }}
                            className={cn(
                                "w-10 h-10 md:w-8 md:h-8 aspect-square shrink-0 rounded-xl flex items-center justify-center transition-all shadow-lg",
                                expanded ? "bg-white/10 text-white" : "bg-[#D1F349] text-black"
                            )}
                        >
                            {expanded ? <RefreshCw className="w-4 h-4 animate-spin-slow" /> : <Wand2 className="w-4 h-4" />}
                        </button>

                        <AnimatePresence>
                            {expanded && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    className="flex items-center gap-1.5 overflow-hidden"
                                >
                                    <div className="w-px h-4 bg-white/10 mx-0.5" />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemixClick(e, 'video');
                                        }}
                                        className="w-8 h-8 md:w-7 md:h-7 aspect-square shrink-0 rounded-full md:rounded-lg flex items-center justify-center bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        <Video className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemixClick(e, 'prompt');
                                        }}
                                        className="w-8 h-8 md:w-7 md:h-7 aspect-square shrink-0 rounded-full md:rounded-lg flex items-center justify-center bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
