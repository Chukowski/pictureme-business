/**
 * CreatorBoothFeed - Public feed page for creator booths
 * 
 * Uses TikTok-style grid with preview/remix functionality
 * Same style as PublicProfile gallery
 * 
 * Route: /{username}/{booth-slug}/feed
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEventConfig } from '@/hooks/useEventConfig';
import { useEventPhotos } from '@/hooks/useEventPhotos';
import {
    Loader2, Camera, ArrowLeft, Heart, Eye,
    MessageCircle, Cpu, Sparkles, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// CDN service for public content (Cloudflare Image Resizing)
import { getAvatarUrl, getThumbnailUrl, getViewUrl, getDownloadUrl } from '@/services/cdn';
// Keep imgproxy proxy download for authenticated downloads
import { getProxyDownloadUrl } from '@/services/imgproxy';
import { getPublicUserProfile, User, toggleLike, getCurrentUser } from '@/services/eventsApi';
import { cn } from '@/lib/utils';
import { SEO } from '@/components/SEO';
import { EventNotFound, FeedNotAvailable } from '@/components/EventNotFound';
import { CreationDetailView, GalleryItem } from '@/components/creator/CreationDetailView';
import { toast } from 'sonner';
import { useUserTier } from '@/services/userTier';

interface BoothPhoto {
    id: string;
    share_code?: string;
    processed_image_url: string;
    original_image_url?: string;
    background_name?: string;
    template_id?: string;
    template_name?: string;
    prompt?: string;
    model?: string;
    model_params?: {
        guidance_scale?: number;
        num_inference_steps?: number;
        seed?: number;
        [key: string]: any;
    };
    is_public?: boolean;
    likes?: number;
    views?: number;
    is_liked?: boolean;
    testimonial?: string;
    user_id?: string;
    user_name?: string;
    user_avatar?: string;
    created_at?: string;
    meta?: any;
}

export default function CreatorBoothFeed() {
    const { userSlug, eventSlug } = useParams<{ userSlug: string; eventSlug: string }>();
    const navigate = useNavigate();

    const { config, loading: configLoading, error: configError } = useEventConfig(
        userSlug || '',
        eventSlug || ''
    );

    const { photos: rawPhotos, loading: photosLoading, error: photosError } = useEventPhotos(
        userSlug || '',
        eventSlug || '',
        10000 // Poll every 10 seconds
    );

    const [creator, setCreator] = useState<User | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [photos, setPhotos] = useState<BoothPhoto[]>([]);

    const currentUser = getCurrentUser();
    const isLoggedIn = !!currentUser;
    const { tier: userTier } = useUserTier();

    // Sync photos from hook - map to our interface
    useEffect(() => {
        const mapped: BoothPhoto[] = rawPhotos.map(p => {
            // Extract metadata from meta field if available
            const meta = p.meta || {};
            return {
                id: String(p.id || p.share_code || ''),
                share_code: p.share_code,
                processed_image_url: p.processed_image_url,
                original_image_url: p.original_image_url,
                background_name: p.background_name,
                template_id: meta.template_id,
                template_name: meta.template_name || p.background_name,
                prompt: meta.prompt,
                model: meta.model || meta.model_id,
                model_params: meta.model_params || {
                    guidance_scale: meta.guidance_scale,
                    num_inference_steps: meta.num_inference_steps,
                    seed: meta.seed
                },
                is_public: meta.is_public,
                likes: meta.likes || 0,
                views: meta.views || 0,
                is_liked: meta.is_liked,
                testimonial: meta.testimonial,
                user_id: meta.user_id,
                user_name: meta.user_name,
                user_avatar: meta.user_avatar,
                created_at: p.created_at ? String(p.created_at) : undefined,
                meta: p.meta
            };
        });
        setPhotos(mapped);
    }, [rawPhotos]);

    // Load creator profile
    useEffect(() => {
        if (userSlug) {
            getPublicUserProfile(userSlug).then(setCreator).catch(console.error);
        }
    }, [userSlug]);

    // Get branding info
    const primaryColor = config?.theme?.primaryColor || '#6366F1';
    const displayName = config?.branding?.creatorDisplayName || creator?.name || creator?.full_name || userSlug;
    const logoUrl = config?.branding?.logoPath;
    const avatarUrl = creator?.avatar_url ? getAvatarUrl(creator.avatar_url, 80) : undefined;

    // Format model name for display
    const formatModelName = (modelId?: string) => {
        if (!modelId) return "AI";
        const parts = modelId.replace('fal-ai/', '').split('/');
        const modelPart = parts[0] || parts[parts.length - 1];
        return modelPart
            .split('-')
            .filter(word => word && !['ai', 'fal', 'v1', 'v2'].includes(word.toLowerCase()))
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .substring(0, 12);
    };

    // Handle like toggle
    const handleToggleLike = async (photo: BoothPhoto, e: React.MouseEvent) => {
        e.stopPropagation();

        if (!currentUser) {
            toast.error("Please login to like photos");
            return;
        }

        const previousPhotos = [...photos];

        // Optimistic update
        const updatedPhotos = photos.map(p => {
            if (p.id === photo.id || p.share_code === photo.share_code) {
                return {
                    ...p,
                    likes: p.is_liked ? (p.likes || 1) - 1 : (p.likes || 0) + 1,
                    is_liked: !p.is_liked
                };
            }
            return p;
        });
        setPhotos(updatedPhotos);

        try {
            const result = await toggleLike(parseInt(photo.id));
            if (!result.success) throw new Error("Failed to like");
        } catch (error) {
            console.error("Like failed", error);
            toast.error("Failed to update like");
            setPhotos(previousPhotos);
        }
    };

    // Convert photos to GalleryItem format for CreationDetailView
    // Only show prompt/model details if user is logged in
    const galleryItems: GalleryItem[] = useMemo(() => {
        return photos.map(photo => ({
            id: photo.id || photo.share_code || '',
            url: photo.processed_image_url,
            previewUrl: photo.processed_image_url,
            type: 'image' as const,
            // Only expose prompt if logged in
            prompt: isLoggedIn ? (photo.prompt || photo.template_name || photo.background_name) : undefined,
            model: isLoggedIn ? photo.model : undefined,
            shareCode: photo.share_code,
            isPublic: photo.is_public,
            creator_username: photo.user_name || displayName,
            creator_avatar: photo.user_avatar || avatarUrl,
            creator_slug: userSlug,
            creator_user_id: photo.user_id,
            isOwner: false,
            meta: {
                testimonial: photo.testimonial,
                likes: photo.likes,
                views: photo.views,
                is_liked: photo.is_liked,
                model_params: isLoggedIn ? photo.model_params : undefined,
                template_name: photo.template_name
            }
        }));
    }, [photos, displayName, avatarUrl, userSlug, isLoggedIn]);

    if (configLoading) {
        return (
            <div className="min-h-screen bg-[#101112] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-500" />
                    <p className="text-white text-lg">Loading feed...</p>
                </div>
            </div>
        );
    }

    if (configError || !config) {
        return (
            <EventNotFound
                message={configError || "This booth doesn't exist."}
                eventSlug={eventSlug || ''}
            />
        );
    }

    // Check if feed is enabled (always allow for creator booths)
    if (!config.is_booth && !config.settings?.feedEnabled) {
        return <FeedNotAvailable />;
    }

    return (
        <>
            <SEO
                title={`${config.title} Gallery | ${displayName}`}
                description={`Photo gallery from ${config.title} by ${displayName}`}
                image={logoUrl || avatarUrl}
            />

            <div className="min-h-screen bg-[#101112]">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-[#101112]/80 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                        {/* Left - Back to booth */}
                        <Link
                            to={`/${userSlug}/${eventSlug}`}
                            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="text-sm hidden sm:inline">Back to Booth</span>
                        </Link>

                        {/* Center - Creator info */}
                        <div className="flex items-center gap-3">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt={config.title}
                                    className="w-8 h-8 rounded-lg object-contain bg-white/5 p-1"
                                />
                            ) : avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="w-8 h-8 rounded-full object-cover border border-white/10"
                                />
                            ) : (
                                <div
                                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${primaryColor}20` }}
                                >
                                    <Camera className="w-4 h-4" style={{ color: primaryColor }} />
                                </div>
                            )}
                            <div className="text-center sm:text-left">
                                <h1 className="text-sm font-semibold text-white">{config.title}</h1>
                                <p className="text-[10px] text-zinc-500">by {displayName}</p>
                            </div>
                        </div>

                        {/* Right - Stats */}
                        <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                            {photosLoading && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            {photos.length} Photos
                        </Badge>
                    </div>
                </header>

                {/* Photo Grid - TikTok Style with Info */}
                <main className="max-w-7xl mx-auto px-4 py-6">
                    {photos.length === 0 && !photosLoading && (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-10 h-10 text-zinc-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">No photos yet</h2>
                            <p className="text-zinc-500 mb-6">Be the first to take a photo!</p>
                            <Link to={`/${userSlug}/${eventSlug}`}>
                                <Button style={{ backgroundColor: primaryColor, color: 'white' }}>
                                    <Camera className="w-4 h-4 mr-2" />
                                    Take a Photo
                                </Button>
                            </Link>
                        </div>
                    )}

                    {photos.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {photos.map((photo, index) => (
                                <div
                                    key={photo.id || photo.share_code || index}
                                    onClick={() => {
                                        setPreviewIndex(index);
                                        setPreviewOpen(true);
                                    }}
                                    className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 group cursor-pointer"
                                >
                                    <img
                                        src={getThumbnailUrl(photo.processed_image_url, 400)}
                                        alt={photo.background_name || 'Photo'}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        loading="lazy"
                                    />

                                    {/* Top badges - Model & Testimonial */}
                                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                                        {/* Model badge */}
                                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#101112]/60 backdrop-blur-sm border border-white/5">
                                            <Cpu className="w-2.5 h-2.5 text-[#D1F349]" />
                                            <span className="text-[8px] font-bold text-white uppercase tracking-wider">
                                                {formatModelName(photo.model)}
                                            </span>
                                        </div>

                                        {/* Testimonial indicator */}
                                        {photo.testimonial && (
                                            <div className="p-1.5 rounded-full bg-[#101112]/60 backdrop-blur-sm border border-white/5">
                                                <MessageCircle className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Bottom info bar - always visible */}
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                                        {/* Template/Style name */}
                                        <p className="text-[10px] font-medium text-white truncate mb-1">
                                            {photo.template_name || photo.background_name || 'AI Generated'}
                                        </p>

                                        {/* Stats row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    className="flex items-center gap-1 hover:scale-105 transition-transform"
                                                    onClick={(e) => handleToggleLike(photo, e)}
                                                >
                                                    <Heart
                                                        className={cn(
                                                            "w-3.5 h-3.5",
                                                            photo.is_liked ? "fill-red-500 text-red-500" : "text-white/70"
                                                        )}
                                                    />
                                                    <span className="text-[10px] text-white/70 font-medium">{photo.likes || 0}</span>
                                                </button>
                                                <span className="flex items-center gap-1">
                                                    <Eye className="w-3.5 h-3.5 text-white/50" />
                                                    <span className="text-[10px] text-white/50">{photo.views || 0}</span>
                                                </span>
                                            </div>

                                            {/* User avatar if available */}
                                            {photo.user_name && (
                                                <span className="text-[9px] text-white/50 truncate max-w-[60px]">
                                                    @{photo.user_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Prompt preview on hover (only for logged in users) */}
                                    {isLoggedIn && photo.prompt && (
                                        <div className="absolute inset-0 bg-[#101112]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                            <p className="text-xs text-white/90 text-center line-clamp-4">
                                                {photo.prompt}
                                            </p>
                                        </div>
                                    )}

                                    {/* Login prompt on hover for non-logged in users */}
                                    {!isLoggedIn && (
                                        <div className="absolute inset-0 bg-[#101112]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                            <div className="text-center">
                                                <Lock className="w-6 h-6 text-white/50 mx-auto mb-2" />
                                                <p className="text-xs text-white/70">Login to see prompt</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </main>

                {/* Floating CTA */}
                <div className="fixed bottom-6 right-6 z-50">
                    <Link to={`/${userSlug}/${eventSlug}`}>
                        <Button
                            size="lg"
                            className="rounded-full shadow-xl h-14 px-6"
                            style={{
                                backgroundColor: primaryColor,
                                color: 'white',
                                boxShadow: `0 10px 30px -10px ${primaryColor}60`
                            }}
                        >
                            <Camera className="w-5 h-5 mr-2" />
                            Take a Photo
                        </Button>
                    </Link>
                </div>
            </div>

            {/* TikTok-style Detail View */}
            <CreationDetailView
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                items={galleryItems}
                initialIndex={previewIndex}
                onDownload={async (item) => {
                    try {
                        const optimizedUrl = getDownloadUrl(item.url, userTier);
                        const proxyUrl = getProxyDownloadUrl(optimizedUrl, `booth-photo-${item.id}.webp`);
                        window.location.href = proxyUrl;
                        toast.success("Download started");
                    } catch (e) {
                        console.error("Download failed", e);
                        window.open(item.url, '_blank');
                    }
                }}
                onReusePrompt={(item) => {
                    if (!isLoggedIn) {
                        toast.error("Please login to remix this photo");
                        return;
                    }
                    setPreviewOpen(false);
                    // Navigate to creator studio to remix
                    const remixState = {
                        prompt: item.prompt || '',
                        selectedTemplate: item.template || null,
                        sourceImageUrl: getViewUrl(item.url),
                        remixFrom: item.id,
                        remixFromUsername: item.creator_username,
                        view: 'create'
                    };
                    navigate('/creator/studio?view=create', { state: remixState });
                }}
            />
        </>
    );
}
