import { useRef, useState, useEffect } from "react";
import { PublicCreation } from "@/services/contentApi";
import { getCurrentUser, toggleLike } from "@/services/eventsApi";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, User, Play } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { getMediaPreviewUrl, isVideoUrl } from "@/services/cdn";
import { cn, isUserAdult } from "@/lib/utils";

interface PublicFeedBlockProps {
    creations?: PublicCreation[];
    showAdultFilter?: boolean;
}

export function PublicFeedBlock({ creations = [], showAdultFilter = true }: PublicFeedBlockProps) {
    const [showAdultContent, setShowAdultContent] = useState(false);
    const currentUser = getCurrentUser();
    const isAdult = isUserAdult(currentUser?.birth_date);

    if (!creations || creations.length === 0) return null;

    // Filter out 18+ content if the toggle is off or user is under 18
    const filteredCreations = (showAdultContent && isAdult)
        ? creations 
        : creations.filter(c => !c.is_adult);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h2 className="text-xl font-semibold text-white">Community Feed</h2>
                    {!isAdult && currentUser && creations.some(c => c.is_adult) && (
                        <p className="text-[10px] text-zinc-500 italic">Sensitive content hidden based on your age.</p>
                    )}
                </div>
                {showAdultFilter && isAdult && (
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-zinc-400">Show 18+</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showAdultContent}
                                onChange={(e) => setShowAdultContent(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-red-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                        </label>
                    </div>
                )}
            </div>

            <ScrollArea className="w-full whitespace-nowrap rounded-xl border border-white/5 bg-card/30">
                <div className="flex w-max space-x-4 p-4">
                    {filteredCreations.map((creation) => (
                        <div key={creation.id} className="w-[250px] shrink-0">
                            <FeedCard creation={creation} showBlurred={creation.is_adult && showAdultContent} />
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}

function FeedCard({ creation, showBlurred = false }: { creation: PublicCreation; showBlurred?: boolean }) {
    const [likes, setLikes] = useState(creation.likes);
    const [isLiked, setIsLiked] = useState(creation.is_liked || false);
    const [isLiking, setIsLiking] = useState(false);
    const [isBlurred, setIsBlurred] = useState(showBlurred);

    // Determine if this is a video
    const isVideo = creation.type === 'video' || isVideoUrl(creation.image_url);

    // Get the proper preview URL using video-aware helper
    const previewUrl = getMediaPreviewUrl({
        url: creation.image_url,
        type: creation.type,
        thumbnail_url: creation.thumbnail_url
    }, 400);

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const currentUser = getCurrentUser();
        if (!currentUser) {
            toast.error("Please login to like creations");
            return;
        }

        if (isLiking) return;
        setIsLiking(true);

        // Optimistic update
        const prevLikes = likes;
        const prevIsLiked = isLiked;

        setLikes(prev => isLiked ? prev - 1 : prev + 1);
        setIsLiked(!isLiked);

        try {
            const result = await toggleLike(creation.id);
            if (!result.success) throw new Error("Failed to like");
        } catch (error) {
            // Revert
            setLikes(prevLikes);
            setIsLiked(prevIsLiked);
            toast.error("Failed to update like");
        } finally {
            setIsLiking(false);
        }
    };

    return (
        <Card className="bg-card border-white/10 overflow-hidden group hover:border-indigo-500/50 transition-all cursor-pointer">
            <CardContent className="p-0 relative aspect-[9/16]">
                {/* Video indicator badge */}
                {isVideo && (
                    <div className="absolute top-2 left-2 z-20 p-1.5 bg-black/50 backdrop-blur-sm rounded-lg">
                        <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                )}

                {/* 18+ Badge */}
                {creation.is_adult && (
                    <div className="absolute top-2 right-2 z-20 px-2 py-1 bg-red-500/80 backdrop-blur-sm rounded-md">
                        <span className="text-white text-[10px] font-black">18+</span>
                    </div>
                )}

                {/* Preview Image (works for both images and videos) */}
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt={creation.template_name || "Creation"}
                        className={cn(
                            "w-full h-full object-cover transition-all",
                            isBlurred && "blur-2xl"
                        )}
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <Play className="w-8 h-8 text-zinc-600" />
                    </div>
                )}

                {/* Blur Overlay for 18+ content */}
                {isBlurred && (
                    <div 
                        className="absolute inset-0 backdrop-blur-2xl bg-black/40 flex flex-col items-center justify-center z-30 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsBlurred(false);
                        }}
                    >
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-3 border-2 border-red-500/50">
                            <span className="text-red-400 font-black text-lg">18+</span>
                        </div>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-1">Adult Content</p>
                        <p className="text-[10px] text-white/60">Click to view</p>
                    </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#101112]/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <h3 className="font-semibold text-white text-sm truncate">{creation.template_name || "Untitled"}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-zinc-400" />
                            <span className="text-xs text-zinc-300 truncate max-w-[80px]">{creation.creator_username || "Anonymous"}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <Badge
                            variant="secondary"
                            className={`backdrop-blur-md border-0 gap-1 pl-1 cursor-pointer transition-colors ${isLiked
                                ? "bg-pink-500/20 text-pink-200 hover:bg-pink-500/30"
                                : "bg-white/10 text-white hover:bg-white/20"
                                }`}
                            onClick={handleLike}
                        >
                            <Heart className={`w-3 h-3 ${isLiked ? "fill-current text-pink-500" : "text-pink-500"}`} /> {likes}
                        </Badge>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {creation.views}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
