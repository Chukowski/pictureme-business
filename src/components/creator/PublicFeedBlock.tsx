import { useRef, useState } from "react";
import { PublicCreation } from "@/services/contentApi";
import { getCurrentUser, toggleLike } from "@/services/eventsApi";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, User } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface PublicFeedBlockProps {
    creations?: PublicCreation[];
}

export function PublicFeedBlock({ creations = [] }: PublicFeedBlockProps) {
    if (!creations || creations.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Community Feed</h2>
                {/* <Button variant="link" className="text-zinc-400">View All</Button> */}
            </div>

            <ScrollArea className="w-full whitespace-nowrap rounded-xl border border-white/5 bg-card/30">
                <div className="flex w-max space-x-4 p-4">
                    {creations.map((creation) => (
                        <div key={creation.id} className="w-[250px] shrink-0">
                            <FeedCard creation={creation} />
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}

function FeedCard({ creation }: { creation: PublicCreation }) {
    const [likes, setLikes] = useState(creation.likes);
    const [isLiked, setIsLiked] = useState(creation.is_liked || false);
    const [isLiking, setIsLiking] = useState(false);

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
                {/* Image */}
                <img
                    src={creation.thumbnail_url || creation.image_url}
                    alt={creation.template_name || "Creation"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />

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
