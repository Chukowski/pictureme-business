import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Image as ImageIcon, MoreHorizontal, Trash2, Flag,
    EyeOff, ExternalLink, User, ChevronRight, Loader2, Play
} from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface PublicImage {
    id: string;
    url: string;
    thumbnail_url?: string;
    creator_id: string;
    creator_name?: string;
    creator_email?: string;
    event_title?: string;
    created_at: string;
    is_flagged?: boolean;
    type?: string; // 'image' or 'video'
}

export function SuperAdminPublicFeed() {
    const [images, setImages] = useState<PublicImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<PublicImage | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'flagged' | 'recent'>('recent');

    useEffect(() => {
        fetchPublicImages();
    }, [filter]);

    const fetchPublicImages = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/public-images?filter=${filter}&limit=12`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setImages(data.images || []);
            } else {
                // Mock data for development
                setImages([]);
            }
        } catch (error) {
            console.error("Error fetching public images:", error);
            // Keep empty for now - API might not exist yet
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (imageId: string, action: 'delete' | 'flag' | 'make_private') => {
        setActionLoading(imageId);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/public-images/${imageId}/${action}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success(`Image ${action === 'delete' ? 'deleted' : action === 'flag' ? 'flagged' : 'made private'} successfully`);
                fetchPublicImages();
                setSelectedImage(null);
            } else {
                toast.error(`Failed to ${action.replace('_', ' ')} image`);
            }
        } catch (error) {
            toast.error(`Error: ${action.replace('_', ' ')} failed`);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <Card className="bg-card/30 border-white/10">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-pink-400" />
                        Public Feed Monitor
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        {(['recent', 'all', 'flagged'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${filter === f
                                    ? 'bg-white text-black'
                                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                    </div>
                ) : images.length === 0 ? (
                    <div className="text-center py-12">
                        <ImageIcon className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500">No public images found</p>
                        <p className="text-xs text-zinc-600 mt-1">Public creations will appear here for moderation</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {images.map((image) => (
                            <div
                                key={image.id}
                                className="relative group aspect-square rounded-lg overflow-hidden bg-zinc-900 cursor-pointer"
                                onClick={() => setSelectedImage(image)}
                            >
                                {(image.type === 'video') && !image.thumbnail_url ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-500">
                                        <Play className="w-8 h-8 mb-2 opacity-20" />
                                        <span className="text-[10px] uppercase tracking-widest font-bold">Video</span>
                                    </div>
                                ) : (
                                    <img
                                        src={image.thumbnail_url || image.url}
                                        alt=""
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        loading="lazy"
                                    />
                                )}

                                {image.type === 'video' && (
                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full pointer-events-none">
                                        <Play className="w-3 h-3 text-white fill-white" />
                                    </div>
                                )}
                                {/* Overlay on hover */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <ExternalLink className="w-5 h-5 text-white" />
                                </div>
                                {/* Flag indicator */}
                                {image.is_flagged && (
                                    <div className="absolute top-1 right-1">
                                        <Badge className="bg-red-500/80 text-white text-[8px] px-1 py-0 h-4">
                                            <Flag className="w-2 h-2 mr-0.5" /> Flagged
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {images.length > 0 && (
                    <div className="mt-4 text-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-500 hover:text-white text-xs"
                            onClick={() => window.location.href = '/super-admin/content?tab=creations'}
                        >
                            View All <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                    </div>
                )}
            </CardContent>

            {/* Image Preview Dialog */}
            <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
                <DialogContent className="bg-card border-zinc-800 text-white max-w-2xl p-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b border-white/5">
                        <DialogTitle className="text-base">Image Details</DialogTitle>
                    </DialogHeader>

                    {selectedImage && (
                        <div className="flex flex-col md:flex-row">
                            {/* Image/Video Preview */}
                            <div className="md:w-1/2 bg-black flex items-center justify-center">
                                {selectedImage.type === 'video' || selectedImage.url?.includes('.mp4') || selectedImage.url?.includes('.webm') ? (
                                    <video
                                        src={selectedImage.url}
                                        controls
                                        className="w-full h-full object-contain max-h-[400px]"
                                        autoPlay
                                        loop
                                        muted
                                    />
                                ) : (
                                    <img
                                        src={selectedImage.url}
                                        alt=""
                                        className="w-full h-full object-contain max-h-[400px]"
                                        onError={(e) => {
                                            // Fallback to thumbnail if main image fails
                                            if (selectedImage.thumbnail_url && e.currentTarget.src !== selectedImage.thumbnail_url) {
                                                e.currentTarget.src = selectedImage.thumbnail_url;
                                            }
                                        }}
                                    />
                                )}
                            </div>

                            {/* Details & Actions */}
                            <div className="md:w-1/2 p-6 space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-zinc-500" />
                                        <div>
                                            <p className="text-sm text-white">{selectedImage.creator_name || 'Unknown'}</p>
                                            <p className="text-xs text-zinc-500">{selectedImage.creator_email}</p>
                                        </div>
                                    </div>
                                    {selectedImage.event_title && (
                                        <div>
                                            <p className="text-xs text-zinc-500">Event</p>
                                            <p className="text-sm text-zinc-300">{selectedImage.event_title}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs text-zinc-500">Created</p>
                                        <p className="text-sm text-zinc-300">
                                            {new Date(selectedImage.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-white/5">
                                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Admin Actions</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start border-white/10 hover:bg-yellow-500/10 hover:text-yellow-400 hover:border-yellow-500/20"
                                        onClick={() => handleAction(selectedImage.id, 'flag')}
                                        disabled={!!actionLoading}
                                    >
                                        {actionLoading === selectedImage.id ? (
                                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                        ) : (
                                            <Flag className="w-3 h-3 mr-2" />
                                        )}
                                        {selectedImage.is_flagged ? 'Unflag Image' : 'Flag Image'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start border-white/10 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/20"
                                        onClick={() => handleAction(selectedImage.id, 'make_private')}
                                        disabled={!!actionLoading}
                                    >
                                        <EyeOff className="w-3 h-3 mr-2" />
                                        Make Private
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start border-white/10 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20"
                                        onClick={() => handleAction(selectedImage.id, 'delete')}
                                        disabled={!!actionLoading}
                                    >
                                        <Trash2 className="w-3 h-3 mr-2" />
                                        Delete Permanently
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
