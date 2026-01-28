/**
 * PublicCreatorBooth - Public-facing creator booth/biolink page
 * 
 * This page serves as both:
 * 1. A biolink-style landing page with creator branding, social links, and CTAs
 * 2. An AI photo booth where visitors can take photos
 * 
 * Route: /{username}/{booth-slug}
 * 
 * Features:
 * - Hero section with creator branding
 * - Social links and CTA buttons
 * - Photo booth experience (templates, camera, AI processing)
 * - Recent photos/gallery section
 * - Optional authentication for monetized booths
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
    getEventConfig,
    getPublicUserProfile,
    getAuthToken,
    getCurrentUserProfile,
    Template,
    User,
    EventConfig
} from "@/services/eventsApi";
import { SEO } from "@/components/SEO";
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
    Loader2,
    ExternalLink,
    Share2,
    Heart,
    Link2,
    Coins,
    X
} from "lucide-react";
import { CameraCapture } from "@/components/CameraCapture";
import { BackgroundSelector } from "@/components/BackgroundSelector";
import { ProcessingLoader } from "@/components/ProcessingLoader";
import { ResultDisplay } from "@/components/ResultDisplay";
import { processImageWithAI, downloadImageAsBase64 } from "@/services/aiProcessor";
import { saveProcessedPhoto } from "@/services/localStorage";
// CDN service for public content (Cloudflare Image Resizing)
import { getAvatarUrl } from "@/services/cdn";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BoothGate } from "@/components/auth/BoothGate";
import ShaderBackground from "@/components/ShaderBackground";
import { Link } from "react-router-dom";
import { ENV } from "@/config/env";

type BoothState = 'landing' | 'select' | 'camera' | 'processing' | 'result';

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
    </svg>
);

export default function PublicCreatorBooth() {
    const { userSlug, eventSlug } = useParams<{ userSlug: string; eventSlug: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // State
    const [config, setConfig] = useState<EventConfig | null>(null);
    const [creator, setCreator] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [boothState, setBoothState] = useState<BoothState>('landing');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [processedPhoto, setProcessedPhoto] = useState<string>('');
    const [shareCode, setShareCode] = useState<string>('');
    const [processingStatus, setProcessingStatus] = useState<string>('');
    const [showAuthGate, setShowAuthGate] = useState(false);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [hasPaid, setHasPaid] = useState(false);
    const [isRestoringSession, setIsRestoringSession] = useState(false);
    const [isCheckingPayment, setIsCheckingPayment] = useState(false);

    // Load booth config and creator profile
    useEffect(() => {
        const loadData = async () => {
            if (!userSlug || !eventSlug) {
                setError("Invalid booth URL");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // Load booth config and creator profile in parallel
                const [boothConfig, userProfile] = await Promise.all([
                    getEventConfig(userSlug, eventSlug),
                    getPublicUserProfile(userSlug)
                ]);

                if (!boothConfig) {
                    setError("Booth not found");
                    return;
                }

                // Only allow creator booths (is_booth = true)
                if (!boothConfig.is_booth) {
                    setError("This is not a creator booth");
                    return;
                }

                setConfig(boothConfig);
                setCreator(userProfile);

            } catch (err) {
                console.error("Failed to load booth:", err);
                setError("Failed to load booth");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [userSlug, eventSlug]);

    // Check if auth is required (for monetized booths)
    const shouldEnforceAuth = useMemo(() => {
        if (!config) return false;
        const mode = config.monetization?.sale_mode || config.monetization?.type;
        return mode === 'tokens' || mode === 'revenue_share' || mode === 'money';
    }, [config]);

    // Check if payment is required (for money/revenue_share mode)
    const requiresPayment = useMemo(() => {
        if (!config) return false;
        const mode = config.monetization?.sale_mode || config.monetization?.type;
        return mode === 'revenue_share' || mode === 'money';
    }, [config]);

    // Check payment status for revenue_share booths
    const checkPaymentStatus = async () => {
        // We can't rely solely on requiresPayment here because we want to force a check
        // if we are explicitly in a payment flow
        const mode = config?.monetization?.sale_mode || config?.monetization?.type;
        const actuallyRequiresPayment = mode === 'revenue_share' || mode === 'money';

        if (!config || !actuallyRequiresPayment) return true;

        const token = getAuthToken();
        if (!token) return false;

        try {
            setIsCheckingPayment(true);
            const response = await fetch(`${ENV.API_URL}/api/billing/booths/${config._id}/payment-status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setHasPaid(data.paid);
                return data.paid;
            }
        } catch (e) {
            console.error('Payment check failed:', e);
        } finally {
            setIsCheckingPayment(false);
        }
        return false;
    };

    // Apply theme
    useEffect(() => {
        if (config?.theme) {
            document.documentElement.style.setProperty('--brand-primary', config.theme.primaryColor || '#6366F1');
            const themeMode = config.theme.mode || 'dark';
            if (themeMode === 'light') {
                document.documentElement.classList.remove('dark');
                document.documentElement.classList.add('light');
            } else {
                document.documentElement.classList.remove('light');
                document.documentElement.classList.add('dark');
            }
        }

        return () => {
            document.documentElement.classList.add('dark');
        };
    }, [config]);

    // Background slideshow effect
    useEffect(() => {
        if (!config) return;
        const slideshow = (config.branding as any)?.backgroundSlideshow;
        if (!slideshow?.enabled || !slideshow?.images?.length) return;

        const duration = (slideshow.duration || 5) * 1000;
        const interval = setInterval(() => {
            setCurrentSlideIndex(prev => (prev + 1) % slideshow.images.length);
        }, duration);

        return () => clearInterval(interval);
    }, [config]);

    // Session restoration after Stripe redirect
    useEffect(() => {
        const restoreSession = async () => {
            const checkoutSuccess = searchParams.get('checkout') === 'success' || searchParams.get('payment') === 'success';
            const pendingTemplateId = localStorage.getItem('booth_pending_template');

            if (checkoutSuccess && pendingTemplateId && config) {
                setIsRestoringSession(true);

                // Re-verify payment status
                const isPaid = await checkPaymentStatus();

                if (isPaid) {
                    // Find the template
                    const template = config.templates?.find(t => t.id === pendingTemplateId);
                    if (template) {
                        setSelectedTemplate(template);
                        setBoothState('camera');
                        toast.success('Payment successful! Ready to take your photo.');
                    }
                    // Clean up
                    localStorage.removeItem('booth_pending_template');
                    // Remove query params
                    searchParams.delete('checkout');
                    searchParams.delete('payment');
                    setSearchParams(searchParams);
                }

                setIsRestoringSession(false);
            }
        };

        if (config) {
            restoreSession();
        }
    }, [config, searchParams, setSearchParams]);

    // Auth check when entering booth - Require login for ALL users
    const handleStartBooth = async () => {
        // Always require authentication to ensure photos can be saved to user gallery
        if (!getAuthToken()) {
            setShowAuthGate(true);
            return;
        }

        // Proceed to template selection
        setBoothState('select');
    };

    // Initiate Stripe payment for money mode
    const initiatePayment = async () => {
        const token = getAuthToken();
        if (!token || !config) {
            toast.error('Please sign in first');
            setShowAuthGate(true);
            return;
        }

        try {
            const response = await fetch(`${ENV.API_URL}/api/billing/booths/${config._id}/checkout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.checkout_url) {
                    window.location.href = data.checkout_url;
                }
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to create checkout');
            }
        } catch (e) {
            console.error('Checkout error:', e);
            toast.error('Payment failed. Please try again.');
        }
    };

    // Template selection - now triggers payment gate
    const handleSelectTemplate = async (template: Template) => {
        setSelectedTemplate(template);
        await handlePaymentGate(template);
    };

    // Payment/Token gate - runs AFTER template selection
    const handlePaymentGate = async (template: Template) => {
        if (!config) return;

        const monetizationType = config.monetization?.sale_mode || config.monetization?.type || 'free';

        // Free mode - proceed directly
        if (monetizationType === 'free') {
            setBoothState('camera');
            return;
        }

        // Token mode - check balance
        if (monetizationType === 'tokens') {
            try {
                const user = await getCurrentUserProfile();
                if (!user) {
                    toast.error('Please sign in to continue');
                    setShowAuthGate(true);
                    return;
                }

                const tokenCost = config.monetization?.token_price || 1;
                const userTokens = user.tokens_remaining || 0;

                if (userTokens < tokenCost) {
                    toast.error(
                        `You need ${tokenCost} token${tokenCost > 1 ? 's' : ''} to use this booth. You have ${userTokens}.`,
                        {
                            description: 'Purchase more tokens in your dashboard.',
                            duration: 5000,
                        }
                    );
                    return;
                }

                // Show confirmation
                toast.info(`This will use ${tokenCost} token${tokenCost > 1 ? 's' : ''}`, {
                    icon: <Coins className="w-4 h-4" />,
                });

                setBoothState('camera');
            } catch (error) {
                console.error('Failed to check token balance:', error);
                toast.error('Failed to verify token balance');
            }
            return;
        }

        // Money mode (revenue_share) - check payment
        if (monetizationType === 'money' || monetizationType === 'revenue_share') {
            const isPaid = await checkPaymentStatus();

            if (isPaid) {
                setBoothState('camera');
            } else {
                // Save template to restore after payment
                localStorage.setItem('booth_pending_template', template.id);
                // Redirect to checkout
                initiatePayment();
            }
        }
    };

    // Photo capture and processing
    const handlePhotoCapture = async (imageData: string) => {
        if (!selectedTemplate || !config) {
            toast.error("No template selected");
            return;
        }

        setBoothState('processing');
        setProcessingStatus("Preparing your photo...");

        try {
            const result = await processImageWithAI({
                userPhotoBase64: imageData,
                backgroundPrompt: selectedTemplate.prompt,
                backgroundImageUrls: selectedTemplate.images || [],
                aspectRatio: selectedTemplate.aspectRatio || '9:16',
                aiModel: selectedTemplate.pipelineConfig?.imageModel || config.settings?.aiModel,
                eventSlug: config.slug,
                userSlug: config.user_slug,
                boothId: config._id, // Required for backend payment verification
                onProgress: (status) => {
                    if (status === "queued") setProcessingStatus("Waiting in queue...");
                    else if (status === "processing") setProcessingStatus("AI is working its magic...");
                    else if (status === "applying_branding") setProcessingStatus("Applying branding...");
                },
            });

            setProcessingStatus("Finalizing...");

            let processedBase64 = result.url.startsWith('data:')
                ? result.url
                : await downloadImageAsBase64(result.url);

            try {
                // Build metadata for the feed
                const modelId = selectedTemplate.pipelineConfig?.imageModel || config.settings?.aiModel || 'nano-banana';

                const savedPhoto = await saveProcessedPhoto({
                    originalImageBase64: imageData,
                    processedImageBase64: processedBase64,
                    backgroundId: selectedTemplate.id,
                    backgroundName: selectedTemplate.name,
                    prompt: selectedTemplate.prompt,
                    userSlug: config.user_slug || userSlug || '',
                    eventSlug: config.slug || eventSlug || '',
                    visibility: 'public',
                    meta: {
                        model: modelId,
                        model_name: modelId.replace('fal-ai/', '').split('/')[0].toUpperCase().replace(/-/g, ' '),
                        template_id: selectedTemplate.id,
                        template_name: selectedTemplate.name,
                        aspect_ratio: selectedTemplate.aspectRatio || '9:16',
                        seed: result.seed,
                    }
                });

                setProcessedPhoto(savedPhoto.processedImageUrl || processedBase64);
                setShareCode(savedPhoto.shareCode || '');
                toast.success("Your photo is ready! 🎉");
            } catch (storageError) {
                console.warn("Storage error:", storageError);
                setProcessedPhoto(processedBase64);
                toast.warning("Photo ready but could not sync with gallery");
            }

            setBoothState('result');
        } catch (error) {
            console.error("Processing error:", error);
            toast.error("Failed to process photo. Please try again.");
            setBoothState('camera');
        }
    };

    // Reset to landing
    const handleReset = () => {
        setBoothState('landing');
        setSelectedTemplate(null);
        setProcessedPhoto('');
        setShareCode('');
    };

    // Social links helper
    const getSocialLinks = () => {
        const links = [];

        // From creator profile
        if (creator?.social_links?.instagram) {
            links.push({ icon: Instagram, url: `https://instagram.com/${creator.social_links.instagram}`, label: 'Instagram' });
        }
        if (creator?.social_links?.x) {
            links.push({ icon: Twitter, url: `https://x.com/${creator.social_links.x}`, label: 'X (Twitter)' });
        }
        if (creator?.social_links?.youtube) {
            links.push({ icon: Youtube, url: `https://youtube.com/${creator.social_links.youtube}`, label: 'YouTube' });
        }
        if (creator?.social_links?.tiktok) {
            links.push({ icon: TikTokIcon, url: `https://tiktok.com/@${creator.social_links.tiktok}`, label: 'TikTok' });
        }

        // From booth branding (Studio tier features)
        if (config?.branding?.socialInstagram) {
            links.push({ icon: Instagram, url: `https://instagram.com/${config.branding.socialInstagram}`, label: 'Instagram' });
        }
        if (config?.branding?.socialTikTok) {
            links.push({ icon: TikTokIcon, url: `https://tiktok.com/@${config.branding.socialTikTok}`, label: 'TikTok' });
        }
        if (config?.branding?.socialX) {
            links.push({ icon: Twitter, url: `https://x.com/${config.branding.socialX}`, label: 'X' });
        }
        if (config?.branding?.socialWebsite) {
            links.push({ icon: Globe, url: config.branding.socialWebsite, label: 'Website' });
        }

        // Deduplicate by URL
        return links.filter((link, index, self) =>
            index === self.findIndex(l => l.url === link.url)
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-[#101112] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-500" />
                    <p className="text-white text-lg">Loading booth...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !config) {
        return (
            <div className="min-h-screen bg-[#101112] flex items-center justify-center p-4">
                <div className="text-center space-y-6 max-w-md">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                        <Camera className="w-10 h-10 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Booth Not Found</h1>
                    <p className="text-zinc-400">{error || "This booth doesn't exist or is no longer active."}</p>
                    <Button onClick={() => navigate('/')} variant="outline">
                        Go Home
                    </Button>
                </div>
            </div>
        );
    }

    const socialLinks = getSocialLinks();
    const primaryColor = config.theme?.primaryColor || '#6366F1';
    const displayName = config.branding?.creatorDisplayName || creator?.name || creator?.full_name || userSlug;
    const avatarUrl = creator?.avatar_url ? getAvatarUrl(creator.avatar_url, 120) : undefined;
    const logoUrl = config.branding?.logoPath;

    return (
        <>
            <SEO
                title={`${config.title} | ${displayName}`}
                description={config.description || `AI Photo Booth by ${displayName}`}
                image={logoUrl || avatarUrl}
            />

            <div className="min-h-screen bg-[#101112] relative">
                {/* Full screen loader while restoring session */}
                {isRestoringSession && (
                    <ProcessingLoader status="Verifying payment..." />
                )}

                {/* Background Image Slideshow */}
                {(config.branding as any)?.backgroundSlideshow?.enabled &&
                    (config.branding as any)?.backgroundSlideshow?.images?.length > 0 &&
                    boothState === 'landing' && (
                        <div className="fixed inset-0 z-0">
                            {(config.branding as any).backgroundSlideshow.images.map((imgUrl: string, idx: number) => (
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
                            {/* Dark overlay */}
                            <div
                                className="absolute inset-0 bg-black"
                                style={{ opacity: ((config.branding as any)?.backgroundSlideshow?.overlayOpacity || 60) / 100 }}
                            />
                        </div>
                    )}

                {/* Background Animation (only if no slideshow) */}
                {!((config.branding as any)?.backgroundSlideshow?.enabled && (config.branding as any)?.backgroundSlideshow?.images?.length > 0) &&
                    config.theme?.backgroundAnimation && config.theme.backgroundAnimation !== 'none' && boothState === 'landing' && (
                        <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
                            {config.theme.backgroundAnimation === 'grid' && (
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backgroundImage: `linear-gradient(${primaryColor}22 1px, transparent 1px), linear-gradient(90deg, ${primaryColor}22 1px, transparent 1px)`,
                                        backgroundSize: '40px 40px',
                                    }}
                                />
                            )}
                            {config.theme.backgroundAnimation === 'particles' && (
                                <ShaderBackground />
                            )}
                            {config.theme.backgroundAnimation === 'pulse' && (
                                <div
                                    className="absolute inset-0 animate-pulse"
                                    style={{
                                        background: `radial-gradient(circle at 50% 50%, ${primaryColor}20 0%, transparent 70%)`,
                                    }}
                                />
                            )}
                        </div>
                    )}

                {/* Landing/Biolink View */}
                {boothState === 'landing' && (
                    <div className="relative z-10 min-h-screen flex flex-col">
                        {/* Hero Section */}
                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                            {/* Avatar/Logo */}
                            <div className="relative mb-6">
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt={config.title}
                                        className="w-28 h-28 rounded-2xl object-contain bg-white/5 border border-white/10 p-2"
                                    />
                                ) : avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={displayName}
                                        className="w-28 h-28 rounded-full object-cover border-4 border-white/10"
                                    />
                                ) : (
                                    <div
                                        className="w-28 h-28 rounded-2xl flex items-center justify-center"
                                        style={{ backgroundColor: `${primaryColor}20` }}
                                    >
                                        <Camera className="w-12 h-12" style={{ color: primaryColor }} />
                                    </div>
                                )}

                                {/* Verified badge for Studio tier */}
                                {config.branding?.showCreatorBrand && (
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center border-2 border-[#101112]">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>

                            {/* Creator Name */}
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                {displayName}
                            </h1>

                            {/* Booth Title */}
                            <h2 className="text-lg text-zinc-400 mb-4">{config.title}</h2>

                            {/* Description */}
                            {config.description && (
                                <p className="text-sm text-zinc-500 max-w-md mb-6 leading-relaxed">
                                    {config.description}
                                </p>
                            )}

                            {/* Social Links */}
                            {socialLinks.length > 0 && (
                                <div className="flex items-center gap-3 mb-8">
                                    {socialLinks.map((link, index) => (
                                        <a
                                            key={index}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all hover:scale-110"
                                            title={link.label}
                                        >
                                            <link.icon className="w-5 h-5 text-zinc-400 hover:text-white transition-colors" />
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Bio/Featured Links */}
                            {((config.branding as any)?.bioLinks || []).filter((l: any) => l.enabled && l.title && l.url).length > 0 && (
                                <div className="w-full max-w-md space-y-3 mb-8">
                                    {((config.branding as any)?.bioLinks || []).filter((l: any) => l.enabled && l.title && l.url).map((link: any) => (
                                        <a
                                            key={link.id}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-3 text-left transition-all hover:scale-[1.02] group"
                                        >
                                            <Link2 className="w-4 h-4 text-zinc-500 shrink-0" />
                                            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors flex-1">{link.title}</span>
                                            <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* Main CTA - Start Booth */}
                            <Button
                                onClick={handleStartBooth}
                                size="lg"
                                className="h-14 px-8 text-lg font-semibold rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:scale-105"
                                style={{
                                    backgroundColor: primaryColor,
                                    color: 'white'
                                }}
                            >
                                <Camera className="w-5 h-5 mr-2" />
                                {(config.branding as any)?.ctaButtonText || 'Take a Photo'}
                            </Button>

                            {/* CTA Subtext */}
                            {(config.branding as any)?.ctaSubtext && (
                                <p className="mt-2 text-sm text-zinc-400">
                                    {(config.branding as any).ctaSubtext}
                                </p>
                            )}

                            {/* Monetization Badge */}
                            {config.monetization?.type === 'free' && (
                                <Badge className="mt-4 bg-green-500/10 text-green-400 border-green-500/20">
                                    Free to use
                                </Badge>
                            )}
                            {config.monetization?.type === 'tokens' && (
                                <Badge className="mt-4 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                                    {config.monetization.token_price} tokens per photo
                                </Badge>
                            )}
                            {(config.monetization?.type === 'revenue_share' || config.monetization?.sale_mode === 'money') && (
                                <Badge className="mt-4 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                    ${config.monetization?.fiat_price?.toFixed(2) || '1.00'} per photo
                                </Badge>
                            )}

                            {/* Scroll indicator */}
                            <div className="mt-12 animate-bounce">
                                <ChevronDown className="w-6 h-6 text-zinc-600" />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 text-center border-t border-white/5 space-y-3">
                            {/* Profile and Feed Links */}
                            <div className="flex items-center justify-center gap-4">
                                {(config.branding as any)?.showProfileLink !== false && userSlug && (
                                    <Link
                                        to={`/profile/${userSlug}`}
                                        className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        View Portfolio
                                    </Link>
                                )}
                                {(config.branding as any)?.showFeedLink && userSlug && eventSlug && (
                                    <Link
                                        to={`/${userSlug}/${eventSlug}/feed`}
                                        className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <Camera className="w-3 h-3" />
                                        Live Feed
                                    </Link>
                                )}
                            </div>
                            <p className="text-xs text-zinc-600">
                                Powered by <a href="/" className="text-indigo-400 hover:underline">PictureMe.Now</a>
                            </p>
                        </div>
                    </div>
                )}

                {/* Template Selection */}
                {boothState === 'select' && (
                    <div className="min-h-screen flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setBoothState('landing')}
                                className="text-zinc-400 hover:text-white"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="font-semibold text-white">{config.title}</h1>
                                <p className="text-xs text-zinc-500">Choose a style</p>
                            </div>
                        </div>

                        {/* Templates */}
                        <div className="flex-1 overflow-y-auto">
                            <BackgroundSelector
                                onSelectBackground={handleSelectTemplate}
                                templates={config.templates?.filter(t => t.active)}
                            />
                        </div>
                    </div>
                )}

                {/* Camera */}
                {boothState === 'camera' && selectedTemplate && (
                    <CameraCapture
                        onCapture={handlePhotoCapture}
                        onBack={() => setBoothState('select')}
                        selectedBackground={selectedTemplate.name}
                    />
                )}

                {/* Processing */}
                {boothState === 'processing' && (
                    <ProcessingLoader status={processingStatus} />
                )}

                {/* Result */}
                {boothState === 'result' && processedPhoto && (
                    <ResultDisplay
                        imageUrl={processedPhoto}
                        shareCode={shareCode}
                        onReset={handleReset}
                        config={config}
                        creator={creator || undefined}
                        activeTemplatesCount={config.templates?.filter(t => t.active).length || 0}
                    />
                )}

                {/* Auth Gate */}
                {showAuthGate && config && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowAuthGate(false)} />
                        <div className="relative z-10 w-full max-w-lg">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-12 right-0 text-white/60 hover:text-white"
                                onClick={() => setShowAuthGate(false)}
                            >
                                <X className="w-6 h-6" />
                            </Button>
                            <BoothGate
                                config={config}
                                onSuccess={() => {
                                    setShowAuthGate(false);
                                    setBoothState('select');
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
