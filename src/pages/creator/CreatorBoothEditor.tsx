import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    createBooth,
    updateEvent,
    getUserBooths,
    getCurrentUser,
    getCurrentUserProfile,
    type Template,
    type User,
} from "@/services/eventsApi";
import { BoothEditorLayout } from "@/components/creator/BoothEditorLayout";
import { BoothPhotoManager } from "@/components/creator/BoothPhotoManager";
import { CreatorBoothPreview } from "@/components/creator/CreatorBoothPreview";
import { EventFormData, EventTheme } from "@/components/admin/event-editor/types";
import { hasFeature } from "@/lib/planFeatures";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EventTemplates } from "@/components/admin/event-editor/EventTemplates";
import { DollarSign, Palette, Lock, Settings2, Sparkles, Upload, Copy, ExternalLink, Camera, Globe, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { ENV } from "@/config/env";
import { getAuthToken } from "@/services/eventsApi";
import { MediaLibrary } from "@/components/MediaLibrary";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";

// Simplified theme preset for creators
const CREATOR_THEME_PRESET: EventTheme = {
    preset: "classic_dark",
    brandName: "",
    primaryColor: "#6366F1",
    secondaryColor: "#F59E0B",
    accentColor: "#10B981",
    tagline: "",
    mode: "dark",
    cardRadius: "xl",
    buttonStyle: "solid",
    backgroundAnimation: "grid",
};

export default function CreatorBoothEditor() {
    const navigate = useNavigate();
    const { eventId } = useParams();
    const isEdit = Boolean(eventId);

    const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentStep, setCurrentStep] = useState('setup');

    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        // Refresh profile on mount to ensure we have the latest tier (if updated in DB)
        const refreshProfile = async () => {
            try {
                const freshUser = await getCurrentUserProfile();
                if (freshUser) {
                    console.log("Fresh user profile loaded:", freshUser.role, freshUser.subscription_tier);
                    setCurrentUser(freshUser);
                }
            } catch (e) {
                console.error("Failed to refresh profile", e);
            }
        };
        refreshProfile();
    }, []);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const token = getAuthToken();
            const formDataUpload = new FormData();
            formDataUpload.append("file", file);

            const response = await fetch(`${ENV.API_URL}/api/media/upload`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formDataUpload
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();
            setFormData(prev => ({
                ...prev,
                branding: { ...prev.branding, logoPath: data.url }
            }));
            toast.success("Logo uploaded successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload logo");
        } finally {
            setIsUploading(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const getBoothUrl = () => {
        const userSlug = currentUser?.slug || currentUser?.username || 'user';
        return `${window.location.origin}/${userSlug}/${formData.slug || 'booth'}`;
    };

    const getFeedUrl = () => {
        return `${getBoothUrl()}/feed`;
    };

    const [formData, setFormData] = useState<EventFormData>({
        slug: "",
        title: "",
        description: "",
        is_active: true,
        start_date: "",
        end_date: "",

        eventMode: "free",
        is_booth: true,
        password: "",

        monetization: {
            type: "free",
            token_price: 0,
            fiat_price: 0,
            revenue_split: 0.8,
        },

        rules: {
            leadCaptureEnabled: false,
            requirePaymentBeforeDownload: false,
            allowFreePreview: true,
            staffOnlyMode: false,
            enableQRToPayment: false,
            useStripeCodeForPayment: false,
            feedEnabled: true,
            hardWatermarkOnPreviews: false,
            allowPrintStation: false,
            allowTimelineSplitView: false,
            enableBadgeCreator: false,
            blurOnUnpaidGallery: false,
            showPaymentCardOnSharedAlbum: false,
        },

        theme: CREATOR_THEME_PRESET,
        branding: {
            logoPath: "",
            headerBackgroundColor: "#FFFFFF",
            footerBackgroundColor: "#000000",
            showLogoInBooth: true,
            showLogoInFeed: true,
            includeLogoOnPrints: true,
        },

        sharing: {
            emailEnabled: true,
            whatsappEnabled: false,
            smsEnabled: false,
            emailTemplate: "",
            emailAfterBuy: true,
            groupPhotosIntoAlbums: false,
        },

        settings: {
            aiModel: "nano-banana",
            imageSize: { width: 1080, height: 1920 },
            feedEnabled: true,
            moderationEnabled: false,
            maxPhotosPerSession: 5,
        },
        templates: [] as Template[],
    } as EventFormData);

    useEffect(() => {
        if (isEdit && eventId) {
            loadBooth();
        }
    }, [isEdit, eventId]);

    const loadBooth = async () => {
        try {
            setIsLoading(true);
            const booths = await getUserBooths();
            const booth = booths.find((b) => b._id === eventId);

            if (!booth) {
                toast.error("Booth not found");
                navigate("/creator/booth");
                return;
            }

            setFormData((prev) => ({
                ...prev,
                ...booth,
                theme: { ...prev.theme, ...(booth.theme || {}) },
                templates: booth.templates || prev.templates,
                is_booth: true,
                monetization: { ...prev.monetization, ...(booth.monetization || {}) },
            } as EventFormData));
        } catch (error) {
            toast.error("Failed to load booth");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.title) {
            toast.error("Please fill in a title");
            return;
        }

        try {
            setIsSaving(true);
            const dataToSave = {
                ...formData,
                is_booth: true,
                settings: {
                    ...formData.settings,
                    aiModel: formData.settings?.aiModel || "nano-banana",
                }
            };

            if (isEdit && eventId) {
                await updateEvent(eventId, dataToSave);
                toast.success("Booth updated successfully");
            } else {
                const newBooth = await createBooth(dataToSave);
                toast.success("Booth created successfully");
                navigate(`/creator/booth/${newBooth._id}/edit`);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save booth");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#101112]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    const renderStepContent = () => {
        // Aggregate all potential tier indicators
        const tierIndicators = [
            currentUser?.subscription_tier,
            currentUser?.role,
            currentUser?.plan_id,
            currentUser?.plan_name
        ].filter(Boolean).map(t => String(t).toLowerCase());

        const isStudio = tierIndicators.some(t =>
            t.includes('studio') ||
            t.includes('business') ||
            t.includes('enterprise') ||
            t.includes('masters')
        );
        const isVibe = tierIndicators.some(t => t.includes('vibe'));
        const isSpark = tierIndicators.some(t => t.includes('spark') || t.includes('individual'));
        const isBusiness = tierIndicators.some(t => t.includes('business') || t.includes('enterprise') || t.includes('masters'));

        // Robust mapping
        const effectiveTier = isStudio ? 'studio' :
            isVibe ? 'vibe' :
                isSpark ? 'spark' :
                    isBusiness ? 'business_eventpro' : 'spark';

        const canTokens = hasFeature(effectiveTier, 'boothTokenMonetization');
        const canRevenue = hasFeature(effectiveTier, 'boothRevenueShare');
        const canCustomSplit = hasFeature(effectiveTier, 'boothCustomSplit');

        switch (currentStep) {
            case 'setup':
                return (
                    <div className="space-y-6">
                        <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl">Booth Details</CardTitle>
                                <CardDescription>Basic information about your photo booth</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Booth Title</Label>
                                        <Input
                                            id="title"
                                            value={formData.title}
                                            onChange={(e) => {
                                                const title = e.target.value;
                                                const updates: any = { title };
                                                if (!formData.slug || formData.slug === formData.title.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
                                                    updates.slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                                }
                                                setFormData({ ...formData, ...updates });
                                            }}
                                            placeholder="My Awesome Booth"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="slug">URL Slug</Label>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex">
                                                <div className="flex items-center px-3 border border-r-0 bg-muted/50 text-xs text-muted-foreground font-mono rounded-l-md select-none whitespace-nowrap">
                                                    /{currentUser?.slug || '...'}/
                                                </div>
                                                <Input
                                                    id="slug"
                                                    value={formData.slug}
                                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-') })}
                                                    placeholder="unique-slug"
                                                    className="rounded-l-none font-mono text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Describe your booth experience..."
                                        className="h-20 resize-none"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Monetization Card */}
                        <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center">
                                    <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                                    Monetization
                                </CardTitle>
                                <CardDescription>Choose how visitors use your booth</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Free Mode */}
                                    <div
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2 ${formData.monetization?.type === 'free' ? 'border-primary bg-primary/10' : 'border-border bg-card/50 hover:border-primary/50'}`}
                                        onClick={() => setFormData({
                                            ...formData,
                                            monetization: { ...formData.monetization!, type: 'free' }
                                        })}
                                    >
                                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 text-2xl">
                                            🎁
                                        </div>
                                        <div>
                                            <h3 className="font-bold">Free</h3>
                                            <p className="text-[10px] text-muted-foreground mt-1">Creator pays tokens. Best for viral sharing.</p>
                                        </div>
                                    </div>

                                    {/* Token Mode */}
                                    <div
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-2 relative ${!canTokens ? 'opacity-50 cursor-not-allowed border-border' : formData.monetization?.type === 'tokens' ? 'border-primary bg-primary/10 cursor-pointer' : 'border-border bg-card/50 hover:border-primary/50 cursor-pointer'}`}
                                        onClick={() => {
                                            if (!canTokens) return;
                                            setFormData({
                                                ...formData,
                                                monetization: { ...formData.monetization!, type: 'tokens', token_price: 1 }
                                            });
                                        }}
                                    >
                                        {!canTokens && <Lock className="absolute top-2 right-2 w-3 h-3 text-indigo-500" />}
                                        <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-2xl">
                                            ⚡
                                        </div>
                                        <div>
                                            <h3 className="font-bold">Tokens</h3>
                                            <p className="text-[10px] text-muted-foreground mt-1">Users pay tokens. Available on <strong>Spark+</strong>.</p>
                                        </div>
                                    </div>

                                    {/* Revenue Mode */}
                                    <div
                                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center text-center gap-2 relative ${!canRevenue ? 'opacity-50 cursor-not-allowed border-border' : formData.monetization?.type === 'revenue_share' ? 'border-primary bg-primary/10 cursor-pointer' : 'border-border bg-card/50 hover:border-primary/50 cursor-pointer'}`}
                                        onClick={() => {
                                            if (!canRevenue) return;
                                            const split = effectiveTier === 'studio' ? 0.7 : 0.5;
                                            setFormData({
                                                ...formData,
                                                monetization: { ...formData.monetization!, type: 'revenue_share', fiat_price: 1.0, revenue_split: split }
                                            });
                                        }}
                                    >
                                        {!canRevenue && <Lock className="absolute top-2 right-2 w-3 h-3 text-emerald-500" />}
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-2xl">
                                            💰
                                        </div>
                                        <div>
                                            <h3 className="font-bold">Revenue</h3>
                                            <p className="text-[10px] text-muted-foreground mt-1">Users pay $. Available on <strong>Vibe+</strong>.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Save to Creator Gallery Toggle (Free Mode Only) */}
                                {formData.monetization?.type === 'free' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <Label className="flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 text-indigo-400" />
                                                        Save Copies to My Gallery
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground max-w-[600px]">
                                                        By default, booth photos belong 100% to the visitor. Enable this to <strong>also</strong> save a copy to your personal gallery.
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={formData.settings?.saveToCreatorGallery}
                                                    onCheckedChange={(checked) => setFormData({
                                                        ...formData,
                                                        settings: { ...formData.settings, saveToCreatorGallery: checked }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {formData.monetization?.type === 'tokens' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label>Price per use (Tokens)</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                className="w-32"
                                                value={formData.monetization?.token_price}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    monetization: { ...formData.monetization!, token_price: parseInt(e.target.value) || 1 }
                                                })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {formData.monetization?.type === 'revenue_share' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                        <div className="space-y-2">
                                            <Label>Price per use (USD)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.50"
                                                    className="pl-7 w-32"
                                                    value={formData.monetization?.fiat_price}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        monetization: { ...formData.monetization!, fiat_price: parseFloat(e.target.value) || 0 }
                                                    })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Label>Your Revenue Split</Label>
                                                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                                                    {effectiveTier === 'studio' ? 'Studio Plan' : 'Vibe Plan'}
                                                </span>
                                            </div>
                                            <div className="p-4 rounded-xl bg-card border border-white/5 flex items-center justify-between">
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">You Earn</p>
                                                    <p className="text-2xl font-bold text-white">
                                                        {Math.round((formData.monetization?.revenue_split || (effectiveTier === 'studio' ? 0.7 : 0.5)) * 100)}%
                                                    </p>
                                                </div>
                                                <div className="w-px h-10 bg-white/10" />
                                                <div className="space-y-1 text-right">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Platform Fee</p>
                                                    <p className="text-2xl font-bold text-muted-foreground">
                                                        {100 - Math.round((formData.monetization?.revenue_split || (effectiveTier === 'studio' ? 0.7 : 0.5)) * 100)}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {isEdit && (
                            <div className="pt-4 space-y-3">
                                <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Quick Links</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl border bg-card/60 flex items-center justify-between group hover:border-indigo-500/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                                <Camera className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-white">Public Booth</p>
                                                <p className="text-[9px] text-muted-foreground truncate max-w-[120px] font-mono">{formData.slug || 'booth'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-indigo-500/10 hover:text-indigo-400" onClick={() => copyToClipboard(getBoothUrl(), "Booth URL")}>
                                                <Copy className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-500/10 hover:text-green-400" onClick={() => window.open(getBoothUrl(), '_blank')}>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-xl border bg-card/60 flex items-center justify-between group hover:border-[#D1F349]/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-[#D1F349]/10 text-[#D1F349]">
                                                <Globe className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-white">Live Results</p>
                                                <p className="text-[9px] text-muted-foreground truncate max-w-[120px] font-mono">{formData.slug || 'booth'}/feed</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-[#D1F349]/10 hover:text-[#D1F349]" onClick={() => copyToClipboard(getFeedUrl(), "Feed URL")}>
                                                <Copy className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-green-500/10 hover:text-green-400" onClick={() => window.open(getFeedUrl(), '_blank')}>
                                                <ExternalLink className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>AI Generation Model</Label>
                                <select
                                    value={formData.settings?.aiModel || "nano-banana"}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        settings: { ...formData.settings, aiModel: e.target.value }
                                    })}
                                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
                                >
                                    <option value="nano-banana">Nano Banana (Standard)</option>
                                    <option value="nano-banana-pro">Nano Banana Pro (Premium)</option>
                                    <option value="flux-realism">Flux Realism (Pro)</option>
                                    <option value="seedream-v4">Seedream v4 (Standard)</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Email Sharing</Label>
                                </div>
                                <Switch
                                    checked={formData.sharing?.emailEnabled}
                                    onCheckedChange={(c) => setFormData({
                                        ...formData,
                                        sharing: { ...formData.sharing, emailEnabled: c }
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'design':
                return (
                    <div className="space-y-6">
                        <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center">
                                    <Palette className="w-5 h-5 mr-2 text-indigo-500" />
                                    Branding & Design
                                </CardTitle>
                                <CardDescription>Customize your booth's appearance</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold">Booth Visuals</Label>
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-card/40 border border-white/5">
                                            <div className="w-20 h-20 rounded-lg bg-zinc-900 border border-dashed border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                                {formData.branding?.logoPath ? (
                                                    <>
                                                        <img src={formData.branding.logoPath} alt="Logo" className="w-full h-full object-contain p-2" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-white hover:text-red-400"
                                                                onClick={() => setFormData({ ...formData, branding: { ...formData.branding, logoPath: "" } })}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Palette className="w-8 h-8 text-white/10" />
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <Label className="text-xs">Booth Logo</Label>
                                                    <p className="text-[10px] text-muted-foreground">Upload a photo to be displayed in your booth</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="secondary" size="sm" className="h-9">
                                                                <ImageIcon className="w-3.5 h-3.5 mr-2" />
                                                                Logo Library
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
                                                            <DialogHeader>
                                                                <DialogTitle>Media Library</DialogTitle>
                                                            </DialogHeader>
                                                            <MediaLibrary
                                                                selectedUrl={formData.branding?.logoPath}
                                                                onSelectMedia={(url) => {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        branding: { ...prev.branding, logoPath: url }
                                                                    }));
                                                                }}
                                                            />
                                                        </DialogContent>
                                                    </Dialog>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="shrink-0 h-9"
                                                        disabled={isUploading}
                                                        onClick={() => document.getElementById('logo-upload')?.click()}
                                                    >
                                                        {isUploading ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                                                        Upload New
                                                    </Button>
                                                    <input
                                                        id="logo-upload"
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={handleLogoUpload}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Primary Color</Label>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-full border border-border shadow-sm cursor-pointer"
                                                style={{ backgroundColor: formData.theme.primaryColor }}
                                                onClick={() => document.getElementById('primaryColor')?.click()}
                                            />
                                            <input
                                                id="primaryColor"
                                                type="color"
                                                className="hidden"
                                                value={formData.theme.primaryColor}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    theme: { ...formData.theme, primaryColor: e.target.value }
                                                })}
                                            />
                                            <Input
                                                type="text"
                                                className="font-mono text-xs"
                                                value={formData.theme.primaryColor}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    theme: { ...formData.theme, primaryColor: e.target.value }
                                                })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4">
                                        <div className="space-y-0.5">
                                            <Label>Dark Mode</Label>
                                        </div>
                                        <Switch
                                            checked={formData.theme.mode === 'dark'}
                                            onCheckedChange={(checked) => setFormData({
                                                ...formData,
                                                theme: { ...formData.theme, mode: checked ? 'dark' : 'light' }
                                            })}
                                        />
                                    </div>
                                </div>

                                <Separator className="border-border/40" />

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Logo URL</Label>
                                        <Input
                                            value={formData.branding?.logoPath || ""}
                                            placeholder="https://your-logo-url"
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                branding: { ...formData.branding, logoPath: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm">Show Logo in Booth</Label>
                                        <Switch
                                            checked={formData.branding?.showLogoInBooth}
                                            onCheckedChange={(c) => setFormData({
                                                ...formData,
                                                branding: { ...formData.branding, showLogoInBooth: c }
                                            })}
                                        />
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Booth Experience Background</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {([
                                                { id: 'none', name: 'Static Black', icon: <div className="w-4 h-4 bg-black rounded-sm border border-white/10" /> },
                                                { id: 'grid', name: 'Glow Grid', icon: <Sparkles className="w-4 h-4 text-indigo-400" /> },
                                                { id: 'particles', name: 'Floating Particles', icon: <div className="w-4 h-4 bg-indigo-500/20 rounded-full blur-[2px]" /> },
                                                { id: 'pulse', name: 'Neon Pulse', icon: <div className="w-4 h-4 bg-indigo-500 animate-pulse rounded-full" /> }
                                            ] as const).map((anim) => (
                                                <div
                                                    key={anim.id}
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        theme: { ...formData.theme, backgroundAnimation: anim.id }
                                                    })}
                                                    className={cn(
                                                        "p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3",
                                                        formData.theme.backgroundAnimation === anim.id
                                                            ? "bg-indigo-500/10 border-indigo-500 text-indigo-400"
                                                            : "bg-card/40 border-white/5 text-zinc-400 hover:border-white/20"
                                                    )}
                                                >
                                                    {anim.icon}
                                                    <span className="text-xs font-medium">{anim.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Background Image Slideshow */}
                                    <div className="space-y-3 pt-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Landing Page Background Images</Label>
                                        <p className="text-[10px] text-zinc-500">Select images from your templates to display as a slideshow background</p>

                                        <div className="flex items-center gap-3 mb-3">
                                            <Switch
                                                checked={(formData.branding as any)?.backgroundSlideshow?.enabled || false}
                                                onCheckedChange={(checked) => setFormData({
                                                    ...formData,
                                                    branding: {
                                                        ...formData.branding,
                                                        backgroundSlideshow: {
                                                            ...((formData.branding as any)?.backgroundSlideshow || {}),
                                                            enabled: checked
                                                        }
                                                    } as any
                                                })}
                                            />
                                            <span className="text-xs text-zinc-400">Enable background slideshow</span>
                                        </div>

                                        {(formData.branding as any)?.backgroundSlideshow?.enabled && (
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-1">
                                                    {/* Get all images from templates */}
                                                    {Array.from(new Set(
                                                        (formData.templates || []).flatMap(t => t.images || [])
                                                    )).map((imgUrl, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => {
                                                                const current = (formData.branding as any)?.backgroundSlideshow?.images || [];
                                                                const isSelected = current.includes(imgUrl);
                                                                setFormData({
                                                                    ...formData,
                                                                    branding: {
                                                                        ...formData.branding,
                                                                        backgroundSlideshow: {
                                                                            ...((formData.branding as any)?.backgroundSlideshow || {}),
                                                                            images: isSelected
                                                                                ? current.filter((u: string) => u !== imgUrl)
                                                                                : [...current, imgUrl]
                                                                        }
                                                                    } as any
                                                                });
                                                            }}
                                                            className={cn(
                                                                "aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                                                ((formData.branding as any)?.backgroundSlideshow?.images || []).includes(imgUrl)
                                                                    ? "border-indigo-500 ring-2 ring-indigo-500/30"
                                                                    : "border-transparent hover:border-white/20"
                                                            )}
                                                        >
                                                            <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                    {(formData.templates || []).flatMap(t => t.images || []).length === 0 && (
                                                        <div className="col-span-4 text-center py-6 text-zinc-600 text-xs">
                                                            Add templates with images first
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1 space-y-1">
                                                        <Label className="text-[10px] text-zinc-500">Slide Duration (seconds)</Label>
                                                        <Input
                                                            type="number"
                                                            min={2}
                                                            max={15}
                                                            value={(formData.branding as any)?.backgroundSlideshow?.duration || 5}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                branding: {
                                                                    ...formData.branding,
                                                                    backgroundSlideshow: {
                                                                        ...((formData.branding as any)?.backgroundSlideshow || {}),
                                                                        duration: parseInt(e.target.value) || 5
                                                                    }
                                                                } as any
                                                            })}
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="flex-1 space-y-1">
                                                        <Label className="text-[10px] text-zinc-500">Overlay Opacity</Label>
                                                        <select
                                                            value={(formData.branding as any)?.backgroundSlideshow?.overlayOpacity || 60}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                branding: {
                                                                    ...formData.branding,
                                                                    backgroundSlideshow: {
                                                                        ...((formData.branding as any)?.backgroundSlideshow || {}),
                                                                        overlayOpacity: parseInt(e.target.value)
                                                                    }
                                                                } as any
                                                            })}
                                                            className="w-full h-8 px-2 rounded-md border border-border bg-background text-xs"
                                                        >
                                                            <option value={40}>Light (40%)</option>
                                                            <option value={60}>Medium (60%)</option>
                                                            <option value={80}>Dark (80%)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* CTA Button Customization */}
                                    <div className="space-y-3 pt-2 border-t border-white/5">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Call-to-Action Button</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-zinc-500">Button Text</Label>
                                                <Input
                                                    value={(formData.branding as any)?.ctaButtonText || ""}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        branding: { ...formData.branding, ctaButtonText: e.target.value } as any
                                                    })}
                                                    placeholder="Take a Photo"
                                                    className="h-9 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] text-zinc-500">Secondary Text (optional)</Label>
                                                <Input
                                                    value={(formData.branding as any)?.ctaSubtext || ""}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        branding: { ...formData.branding, ctaSubtext: e.target.value } as any
                                                    })}
                                                    placeholder="e.g. It's free!"
                                                    className="h-9 text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Profile & Feed Links */}
                                    <div className="space-y-3 pt-2 border-t border-white/5">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Footer Links</Label>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-card/40 border border-white/5">
                                                <div>
                                                    <p className="text-xs font-medium text-white">Show Profile Link</p>
                                                    <p className="text-[10px] text-zinc-500">Link to your public profile/portfolio</p>
                                                </div>
                                                <Switch
                                                    checked={(formData.branding as any)?.showProfileLink !== false}
                                                    onCheckedChange={(checked) => setFormData({
                                                        ...formData,
                                                        branding: { ...formData.branding, showProfileLink: checked } as any
                                                    })}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-card/40 border border-white/5">
                                                <div>
                                                    <p className="text-xs font-medium text-white">Show Live Feed Link</p>
                                                    <p className="text-[10px] text-zinc-500">Link to this booth's photo feed</p>
                                                </div>
                                                <Switch
                                                    checked={(formData.branding as any)?.showFeedLink === true}
                                                    onCheckedChange={(checked) => setFormData({
                                                        ...formData,
                                                        branding: { ...formData.branding, showFeedLink: checked } as any
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator className="border-border/40" />

                                {/* Creator Branding Section (Studio Tier) */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold flex items-center gap-2">
                                            Creator Personal Branding
                                            {!isStudio && <Badge variant="secondary" className="text-[9px] h-4 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Studio / Business Only</Badge>}
                                        </Label>
                                        {isStudio && (
                                            <Switch
                                                checked={formData.branding?.showCreatorBrand}
                                                onCheckedChange={(checked) => setFormData({
                                                    ...formData,
                                                    branding: { ...formData.branding, showCreatorBrand: checked }
                                                })}
                                            />
                                        )}
                                    </div>

                                    {!isStudio ? (
                                        <div className="p-4 rounded-xl border border-dashed border-border bg-card/20 flex flex-col items-center text-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                <Lock className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white mb-1">Personal Branding Locked</p>
                                                <p className="text-xs text-muted-foreground max-w-[280px]">Upgrade to <strong>Studio</strong> or <strong>Business</strong> to display your name, avatar, and social links on this booth.</p>
                                            </div>
                                            <Button variant="outline" size="sm" className="h-8 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10" onClick={() => window.open('/pricing', '_blank')}>
                                                Upgrade to Studio / Business
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className={`space-y-4 transition-all duration-300 ${!formData.branding?.showCreatorBrand ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Display Name</Label>
                                                    <Input
                                                        value={formData.branding?.creatorDisplayName || currentUser?.name || ""}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            branding: { ...formData.branding, creatorDisplayName: e.target.value }
                                                        })}
                                                        placeholder="e.g. Photography by Alex"
                                                        className="h-9 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Website / Portfolio</Label>
                                                    <Input
                                                        value={formData.branding?.socialWebsite || ""}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            branding: { ...formData.branding, socialWebsite: e.target.value }
                                                        })}
                                                        placeholder="https://..."
                                                        className="h-9 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Social Links</Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <Input
                                                        value={formData.branding?.socialInstagram || ""}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            branding: { ...formData.branding, socialInstagram: e.target.value }
                                                        })}
                                                        placeholder="Instagram username"
                                                        className="h-9 text-xs"
                                                    />
                                                    <Input
                                                        value={formData.branding?.socialTikTok || ""}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            branding: { ...formData.branding, socialTikTok: e.target.value }
                                                        })}
                                                        placeholder="TikTok username"
                                                        className="h-9 text-xs"
                                                    />
                                                    <Input
                                                        value={formData.branding?.socialX || ""}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            branding: { ...formData.branding, socialX: e.target.value }
                                                        })}
                                                        placeholder="X (Twitter) handle"
                                                        className="h-9 text-xs"
                                                    />
                                                </div>
                                            </div>

                                            {/* Bio Links Section */}
                                            <div className="space-y-3 pt-3 border-t border-white/5">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs">Featured Links</Label>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs text-indigo-400 hover:text-indigo-300"
                                                        onClick={() => {
                                                            const currentLinks = (formData.branding as any)?.bioLinks || [];
                                                            setFormData({
                                                                ...formData,
                                                                branding: {
                                                                    ...formData.branding,
                                                                    bioLinks: [
                                                                        ...currentLinks,
                                                                        { id: `link-${Date.now()}`, title: '', url: '', enabled: true }
                                                                    ]
                                                                } as any
                                                            });
                                                        }}
                                                    >
                                                        + Add Link
                                                    </Button>
                                                </div>
                                                <p className="text-[10px] text-zinc-500">Add links to your portfolio, shop, booking page, etc.</p>

                                                <div className="space-y-2">
                                                    {((formData.branding as any)?.bioLinks || []).map((link: any, index: number) => (
                                                        <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-card/40 border border-white/5">
                                                            <Switch
                                                                checked={link.enabled}
                                                                onCheckedChange={(checked) => {
                                                                    const links = [...((formData.branding as any)?.bioLinks || [])];
                                                                    links[index] = { ...link, enabled: checked };
                                                                    setFormData({
                                                                        ...formData,
                                                                        branding: { ...formData.branding, bioLinks: links } as any
                                                                    });
                                                                }}
                                                                className="scale-75"
                                                            />
                                                            <Input
                                                                value={link.title}
                                                                onChange={(e) => {
                                                                    const links = [...((formData.branding as any)?.bioLinks || [])];
                                                                    links[index] = { ...link, title: e.target.value };
                                                                    setFormData({
                                                                        ...formData,
                                                                        branding: { ...formData.branding, bioLinks: links } as any
                                                                    });
                                                                }}
                                                                placeholder="Link title"
                                                                className="h-7 text-xs flex-1"
                                                            />
                                                            <Input
                                                                value={link.url}
                                                                onChange={(e) => {
                                                                    const links = [...((formData.branding as any)?.bioLinks || [])];
                                                                    links[index] = { ...link, url: e.target.value };
                                                                    setFormData({
                                                                        ...formData,
                                                                        branding: { ...formData.branding, bioLinks: links } as any
                                                                    });
                                                                }}
                                                                placeholder="https://..."
                                                                className="h-7 text-xs flex-1"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-zinc-500 hover:text-red-400"
                                                                onClick={() => {
                                                                    const links = ((formData.branding as any)?.bioLinks || []).filter((_: any, i: number) => i !== index);
                                                                    setFormData({
                                                                        ...formData,
                                                                        branding: { ...formData.branding, bioLinks: links } as any
                                                                    });
                                                                }}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    ))}

                                                    {((formData.branding as any)?.bioLinks || []).length === 0 && (
                                                        <div className="text-center py-4 text-zinc-600 text-xs">
                                                            No featured links yet. Add links to highlight on your booth.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'experience':
                return (
                    <div className="space-y-6">
                        <EventTemplates
                            formData={formData}
                            setFormData={setFormData}
                            variant="creator"
                            onPreviewModeChange={() => { }}
                        />

                        <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center">
                                    <Globe className="w-5 h-5 mr-2 text-indigo-400" />
                                    Public Feed & Social Settings
                                </CardTitle>
                                <CardDescription>Control how photos are shared in the public gallery</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Enable Live Feed</Label>
                                        <p className="text-xs text-muted-foreground">Creates a public gallery for this booth at {formData.slug}/feed</p>
                                    </div>
                                    <Switch
                                        checked={formData.settings?.feedEnabled}
                                        onCheckedChange={(checked) => setFormData({
                                            ...formData,
                                            settings: { ...formData.settings, feedEnabled: checked }
                                        })}
                                    />
                                </div>

                                {formData.settings?.feedEnabled && (
                                    <>
                                        <Separator className="bg-border/20" />
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">Public by Default</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    {formData.monetization?.type === 'free'
                                                        ? "Mandatory for free booths: all photos will be public."
                                                        : "Optional: users can choose to hide their photos."}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={formData.settings?.feedPublic}
                                                onCheckedChange={(checked) => setFormData({
                                                    ...formData,
                                                    settings: { ...formData.settings, feedPublic: checked }
                                                })}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between border-t border-border/20 pt-4">
                                            <div className="space-y-0.5">
                                                <Label className="text-base flex items-center gap-2">
                                                    AI Moderation
                                                    <Badge variant="secondary" className="text-[9px] h-4">Recommended</Badge>
                                                </Label>
                                                <p className="text-xs text-muted-foreground">Automatically hide inappropriate content from the feed</p>
                                            </div>
                                            <Switch
                                                checked={formData.settings?.feedModeration}
                                                onCheckedChange={(checked) => setFormData({
                                                    ...formData,
                                                    settings: { ...formData.settings, feedModeration: checked }
                                                })}
                                            />
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'photos':
                return (
                    <div className="space-y-6">
                        <BoothPhotoManager eventId={eventId || ''} />
                    </div>
                );

            default:
                return null;
        }
    };

    const steps = [
        { id: 'setup', label: '1. Setup', icon: Settings2, description: 'Core details & monetization' },
        { id: 'design', label: '2. Design', icon: Palette, description: 'Branding & customization' },
        { id: 'experience', label: '3. Experience', icon: Sparkles, description: 'Templates & AI' },
        ...(isEdit ? [{ id: 'photos', label: '4. Photos', icon: ImageIcon, description: 'Manage gallery' }] : [])
    ];

    return (
        <BoothEditorLayout
            title={formData.title || "My Booth"}
            onTitleChange={(newTitle) => setFormData({ ...formData, title: newTitle })}
            status={formData.is_active ? 'active' : 'draft'}
            onStatusChange={(newStatus) => setFormData({ ...formData, is_active: newStatus === 'active' })}
            onSave={handleSubmit}
            isSaving={isSaving}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            steps={steps}
            preview={currentStep === 'photos' ? null : (
                <CreatorBoothPreview
                    formData={formData}
                    currentStep={currentStep}
                    creatorName={currentUser?.name || currentUser?.username}
                    creatorAvatar={currentUser?.avatar_url}
                />
            )}
        >
            <div className="h-full overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto">
                    {renderStepContent()}
                    <div className="mt-8 flex items-center justify-between pt-6 border-t border-border/40">
                        <button
                            onClick={() => {
                                const idx = steps.findIndex(s => s.id === currentStep);
                                if (idx > 0) setCurrentStep(steps[idx - 1].id);
                            }}
                            disabled={currentStep === 'setup'}
                            className="text-sm text-muted-foreground hover:text-white disabled:opacity-50 transition-colors"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => {
                                const idx = steps.findIndex(s => s.id === currentStep);
                                if (idx < steps.length - 1) {
                                    setCurrentStep(steps[idx + 1].id);
                                } else {
                                    handleSubmit();
                                }
                            }}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
                        >
                            {currentStep === 'experience' ? (isEdit ? 'Save Booth' : 'Create Booth') : 'Next Step'}
                        </button>
                    </div>
                </div>
            </div>
        </BoothEditorLayout>
    );
}
