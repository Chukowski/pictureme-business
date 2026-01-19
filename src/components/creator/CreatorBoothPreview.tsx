/**
 * CreatorBoothPreview - Live preview component for the Creator Booth Editor
 * 
 * Shows a real-time preview of the PublicCreatorBooth biolink/landing page
 * as the creator configures it.
 */

import { useState, useEffect } from "react";
import { EventFormData } from "@/components/admin/event-editor/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Camera,
    Instagram,
    Twitter,
    Youtube,
    Globe,
    ChevronDown,
    Sparkles,
    ArrowLeft,
    ExternalLink,
    Link2
} from "lucide-react";
// CDN service for public content (Cloudflare Image Resizing)
import { getAvatarUrl } from "@/services/cdn";
import ShaderBackground from "@/components/ShaderBackground";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
);

interface CreatorBoothPreviewProps {
    formData: EventFormData;
    creatorName?: string;
    creatorAvatar?: string;
    currentStep?: string;
}

interface BioLink {
    id: string;
    title: string;
    url: string;
    icon?: string;
    enabled: boolean;
}

export function CreatorBoothPreview({
    formData,
    creatorName,
    creatorAvatar,
    currentStep
}: CreatorBoothPreviewProps) {
    const { theme, title, description, branding, monetization } = formData;
    const [previewState, setPreviewState] = useState<'landing' | 'select'>('landing');
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    // Background slideshow effect
    const slideshow = (branding as any)?.backgroundSlideshow;
    useEffect(() => {
        if (!slideshow?.enabled || !slideshow?.images?.length) return;
        const duration = (slideshow.duration || 5) * 1000;
        const interval = setInterval(() => {
            setCurrentSlideIndex(prev => (prev + 1) % slideshow.images.length);
        }, duration);
        return () => clearInterval(interval);
    }, [slideshow]);

    const primaryColor = theme?.primaryColor || '#6366F1';
    const displayName = branding?.creatorDisplayName || creatorName || 'Creator Name';
    const logoUrl = branding?.logoPath;
    const avatarUrl = creatorAvatar ? getAvatarUrl(creatorAvatar, 120) : undefined;

    // Get social links
    const getSocialLinks = () => {
        const links = [];
        if (branding?.socialInstagram) {
            links.push({ icon: Instagram, label: 'Instagram' });
        }
        if (branding?.socialTikTok) {
            links.push({ icon: TikTokIcon, label: 'TikTok' });
        }
        if (branding?.socialX) {
            links.push({ icon: Twitter, label: 'X' });
        }
        if (branding?.socialWebsite) {
            links.push({ icon: Globe, label: 'Website' });
        }
        return links;
    };

    // Get bio/featured links
    const getBioLinks = (): BioLink[] => {
        return (branding as any)?.bioLinks || [];
    };

    const socialLinks = getSocialLinks();
    const bioLinks = getBioLinks().filter(l => l.enabled);
    const backgroundAnimation = (theme as any)?.backgroundAnimation || 'grid';

    return (
        <div className="w-full h-full flex flex-col bg-[#101112] relative overflow-hidden">
            {/* Background Image Slideshow */}
            {slideshow?.enabled && slideshow?.images?.length > 0 && previewState === 'landing' && (
                <div className="absolute inset-0 z-0">
                    {slideshow.images.map((imgUrl: string, idx: number) => (
                        <div
                            key={idx}
                            className="absolute inset-0 transition-opacity duration-1000"
                            style={{
                                opacity: idx === currentSlideIndex ? 1 : 0,
                                backgroundImage: `url(${imgUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        />
                    ))}
                    <div
                        className="absolute inset-0 bg-black"
                        style={{ opacity: (slideshow.overlayOpacity || 60) / 100 }}
                    />
                </div>
            )}

            {/* Background Animation (only if no slideshow) */}
            {!(slideshow?.enabled && slideshow?.images?.length > 0) && backgroundAnimation !== 'none' && previewState === 'landing' && (
                <div className="absolute inset-0 pointer-events-none z-0 opacity-30">
                    {backgroundAnimation === 'grid' && (
                        <div className="absolute bottom-0 left-0 right-0 h-[60%] [mask-image:linear-gradient(to_top,black_20%,transparent_100%)]">
                            <ShaderBackground />
                        </div>
                    )}
                    {backgroundAnimation === 'particles' && (
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: `${primaryColor}20` }} />
                            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl animate-pulse delay-1000" style={{ backgroundColor: `${primaryColor}15` }} />
                            <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-white/10 rounded-full blur-sm animate-bounce" />
                        </div>
                    )}
                    {backgroundAnimation === 'pulse' && (
                        <div
                            className="absolute inset-0 animate-pulse"
                            style={{
                                background: `radial-gradient(circle at 50% 80%, ${primaryColor}15 0%, transparent 60%)`,
                            }}
                        />
                    )}
                </div>
            )}

            {/* Landing View */}
            {previewState === 'landing' && (
                <div className="relative z-10 flex-1 flex flex-col">
                    {/* Status Bar Mock */}
                    <div className="h-6 w-full flex items-center justify-between px-4 text-[10px] font-medium text-zinc-500 shrink-0">
                        <span>9:41</span>
                        <div className="flex gap-1">
                            <span className="w-3 h-3 rounded-sm bg-current opacity-50" />
                            <span className="w-3 h-3 rounded-sm bg-current opacity-50" />
                            <span className="w-4 h-3 rounded-sm bg-current opacity-50" />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center overflow-y-auto">
                        {/* Avatar/Logo */}
                        <div className="relative mb-4">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt={title || 'Booth'}
                                    className="w-20 h-20 rounded-xl object-contain bg-white/5 border border-white/10 p-1.5"
                                />
                            ) : avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="w-20 h-20 rounded-full object-cover border-2 border-white/10"
                                />
                            ) : (
                                <div
                                    className="w-20 h-20 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${primaryColor}20` }}
                                >
                                    <Camera className="w-8 h-8" style={{ color: primaryColor }} />
                                </div>
                            )}

                            {/* Verified badge */}
                            {branding?.showCreatorBrand && (
                                <div
                                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#101112]"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    <Sparkles className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </div>

                        {/* Creator Name */}
                        <h1 className="text-lg font-bold text-white mb-1">
                            {displayName}
                        </h1>

                        {/* Booth Title */}
                        <h2 className="text-sm text-zinc-400 mb-2">{title || 'My Photo Booth'}</h2>

                        {/* Description */}
                        {description && (
                            <p className="text-xs text-zinc-500 max-w-[200px] mb-3 leading-relaxed line-clamp-2">
                                {description}
                            </p>
                        )}

                        {/* Social Links */}
                        {socialLinks.length > 0 && (
                            <div className="flex items-center gap-2 mb-4">
                                {socialLinks.map((link, index) => (
                                    <div
                                        key={index}
                                        className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
                                        title={link.label}
                                    >
                                        <link.icon className="w-4 h-4 text-zinc-400" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Bio/Featured Links */}
                        {bioLinks.length > 0 && (
                            <div className="w-full max-w-[220px] space-y-2 mb-4">
                                {bioLinks.slice(0, 3).map((link) => (
                                    <div
                                        key={link.id}
                                        className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-left"
                                    >
                                        <Link2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                        <span className="text-xs text-zinc-300 truncate">{link.title}</span>
                                        <ExternalLink className="w-3 h-3 text-zinc-600 ml-auto shrink-0" />
                                    </div>
                                ))}
                                {bioLinks.length > 3 && (
                                    <p className="text-[10px] text-zinc-600">+{bioLinks.length - 3} more links</p>
                                )}
                            </div>
                        )}

                        <Button
                            onClick={() => setPreviewState('select')}
                            size="sm"
                            className="h-10 px-6 text-sm font-semibold rounded-xl shadow-lg transition-all hover:scale-105"
                            style={{
                                backgroundColor: primaryColor,
                                color: 'white',
                                boxShadow: `0 10px 30px -10px ${primaryColor}40`
                            }}
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            {(branding as any)?.ctaButtonText || 'Take a Photo'}
                        </Button>

                        {/* CTA Subtext */}
                        {(branding as any)?.ctaSubtext && (
                            <p className="mt-1 text-[10px] text-zinc-400">
                                {(branding as any).ctaSubtext}
                            </p>
                        )}

                        {/* Monetization Badge */}
                        {monetization?.type === 'free' && (
                            <Badge className="mt-3 bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                                Free to use
                            </Badge>
                        )}
                        {monetization?.type === 'tokens' && (
                            <Badge className="mt-3 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px]">
                                {monetization.token_price || 1} tokens
                            </Badge>
                        )}
                        {monetization?.type === 'revenue_share' && (
                            <Badge className="mt-3 bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px]">
                                ${monetization.fiat_price?.toFixed(2) || '0.99'}
                            </Badge>
                        )}

                        {/* Scroll indicator */}
                        <div className="mt-6 animate-bounce opacity-40">
                            <ChevronDown className="w-4 h-4 text-zinc-600" />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-3 text-center border-t border-white/5 space-y-1">
                        {/* Footer Links Preview */}
                        <div className="flex items-center justify-center gap-3 mb-1">
                            {(branding as any)?.showProfileLink !== false && (
                                <span className="text-[8px] text-zinc-500 flex items-center gap-0.5">
                                    <Sparkles className="w-2 h-2" /> Portfolio
                                </span>
                            )}
                            {(branding as any)?.showFeedLink && (
                                <span className="text-[8px] text-zinc-500 flex items-center gap-0.5">
                                    <Camera className="w-2 h-2" /> Feed
                                </span>
                            )}
                        </div>
                        <p className="text-[8px] text-zinc-600">
                            Powered by <span className="text-indigo-400">PictureMe.Now</span>
                        </p>
                    </div>
                </div>
            )}

            {/* Template Selection View */}
            {previewState === 'select' && (
                <div className="relative z-10 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="p-3 border-b border-white/5 flex items-center gap-3">
                        <button
                            onClick={() => setPreviewState('landing')}
                            className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <p className="text-xs font-medium text-white">{title || 'My Booth'}</p>
                            <p className="text-[10px] text-zinc-500">Choose a style</p>
                        </div>
                    </div>

                    {/* Templates Grid */}
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="grid grid-cols-2 gap-2">
                            {(formData.templates || []).slice(0, 4).map((template, i) => (
                                <div
                                    key={template.id || i}
                                    className="aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 relative group cursor-pointer"
                                >
                                    {template.images?.[0] ? (
                                        <img src={template.images[0]} className="w-full h-full object-cover" alt={template.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/40 to-purple-900/40">
                                            <Sparkles className="w-6 h-6 text-white/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                        <p className="text-[9px] text-white font-medium truncate">{template.name}</p>
                                    </div>
                                </div>
                            ))}
                            {(!formData.templates || formData.templates.length === 0) && (
                                <div className="col-span-2 text-center py-8 text-zinc-500">
                                    <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30" />
                                    <p className="text-[10px]">No templates yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Mode Indicator */}
            <div className="absolute bottom-16 right-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded border border-white/5 text-[6px] font-medium text-white/20 pointer-events-none z-50 uppercase tracking-tighter">
                {previewState}
            </div>
        </div>
    );
}
