import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
    createBooth,
    updateEvent,
    getUserBooths,
    getCurrentUser,
    type Template,
} from "@/services/eventsApi";
import { BoothEditorLayout } from "@/components/creator/BoothEditorLayout";
import { LivePreview } from "@/components/admin/event-editor/LivePreview";
import { EventFormData, EventTheme } from "@/components/admin/event-editor/types";
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
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventTemplates } from "@/components/admin/event-editor/EventTemplates";
import { DollarSign, Palette, Lock } from "lucide-react";

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
};

export default function CreatorBoothEditor() {
    const navigate = useNavigate();
    const { eventId } = useParams();
    const isEdit = Boolean(eventId);

    const currentUser = useMemo(() => getCurrentUser(), []);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [currentStep, setCurrentStep] = useState('setup');

    const [formData, setFormData] = useState<EventFormData>({
        slug: "",
        title: "",
        description: "",
        is_active: true,
        start_date: "",
        end_date: "",

        eventMode: "free", // Can be "free", "tokens", or "paid"
        is_booth: true,
        password: "", // For password protection

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
            } as EventFormData));
        } catch (error) {
            toast.error("Failed to load booth");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.slug || !formData.title) {
            toast.error("Please fill in a title and slug");
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
            <div className="flex items-center justify-center h-screen bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 'setup':
                return (
                    <div className="h-full p-6 space-y-6 overflow-hidden">
                        <Card className="bg-zinc-900 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">Booth Details</CardTitle>
                                <CardDescription className="text-zinc-400">
                                    Basic information about your photo booth
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Booth Title</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="bg-zinc-950 border-white/10 text-white"
                                        placeholder="e.g. My Awesome Party"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">URL Slug</Label>
                                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                                        <span>pictureme.ai/booth/</span>
                                        <Input
                                            value={formData.slug}
                                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                            className="bg-zinc-950 border-white/10 text-white flex-1 font-mono"
                                            placeholder="my-party"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Description (Optional)</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="bg-zinc-950 border-white/10 text-white min-h-[100px]"
                                        placeholder="Describe what this booth is for..."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Monetization */}
                        <Card className="bg-zinc-900 border-white/10">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-green-400" />
                                    <CardTitle className="text-white">Monetization</CardTitle>
                                </div>
                                <CardDescription className="text-zinc-400">
                                    Choose how users can access your booth
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Access Type</Label>
                                    <Select
                                        value={formData.eventMode || "free"}
                                        onValueChange={(value) => setFormData({ ...formData, eventMode: value as any })}
                                    >
                                        <SelectTrigger className="bg-zinc-950 border-white/10 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-white/10">
                                            <SelectItem value="free">Free - No restrictions</SelectItem>
                                            <SelectItem value="pay_per_photo">Pay Per Photo - Charge via Stripe</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {formData.eventMode === 'pay_per_photo' && (
                                    <div className="space-y-2 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                                        <Label className="text-zinc-300">Price Per Photo (USD)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="e.g. 2.99"
                                            className="bg-zinc-950 border-white/10 text-white"
                                        />
                                        <p className="text-xs text-zinc-500">
                                            Users will pay via Stripe before generating photos
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Privacy */}
                        <Card className="bg-zinc-900 border-white/10">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-amber-400" />
                                    <CardTitle className="text-white">Privacy & Access</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-zinc-300">Public Access</Label>
                                        <p className="text-xs text-zinc-500">Anyone with the link can access your booth</p>
                                    </div>
                                    <Switch
                                        checked={formData.is_active}
                                        onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                                    />
                                </div>

                                <Separator className="bg-white/10" />

                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label className="text-zinc-300">Enable Photo Feed</Label>
                                        <p className="text-xs text-zinc-500">Allow users to see photos from others</p>
                                    </div>
                                    <Switch
                                        checked={formData.settings?.feedEnabled}
                                        onCheckedChange={(c) => setFormData({
                                            ...formData,
                                            settings: { ...formData.settings, feedEnabled: c }
                                        })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'design':
                return (
                    <div className="h-full p-6 space-y-6 overflow-hidden">
                        <Card className="bg-zinc-900 border-white/10">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-purple-400" />
                                    <CardTitle className="text-white">Branding</CardTitle>
                                </div>
                                <CardDescription className="text-zinc-400">
                                    Customize your booth's appearance
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Logo URL</Label>
                                    <Input
                                        value={formData.branding?.logoPath || ""}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            branding: { ...formData.branding, logoPath: e.target.value }
                                        })}
                                        className="bg-zinc-950 border-white/10 text-white"
                                        placeholder="https://..."
                                    />
                                </div>
                                <Separator className="bg-white/10" />
                                <div className="flex items-center justify-between">
                                    <Label className="text-zinc-300">Show Logo in Booth</Label>
                                    <Switch
                                        checked={formData.branding?.showLogoInBooth}
                                        onCheckedChange={(c) => setFormData({
                                            ...formData,
                                            branding: { ...formData.branding, showLogoInBooth: c }
                                        })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-zinc-300">Show Logo in Feed</Label>
                                    <Switch
                                        checked={formData.branding?.showLogoInFeed}
                                        onCheckedChange={(c) => setFormData({
                                            ...formData,
                                            branding: { ...formData.branding, showLogoInFeed: c }
                                        })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'experience':
                return (
                    <div className="h-full overflow-y-auto p-6">
                        <div className="max-w-5xl mx-auto">
                            <EventTemplates
                                formData={formData}
                                setFormData={setFormData}
                                currentUser={currentUser}
                                onPreviewModeChange={() => { }}
                            />
                        </div>
                    </div>
                );

            case 'workflow':
                return (
                    <div className="h-full p-6 space-y-6 overflow-hidden">
                        <Card className="bg-zinc-900 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">Sharing Options</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-zinc-300">Enable Email Sharing</Label>
                                    <Switch
                                        checked={formData.sharing?.emailEnabled}
                                        onCheckedChange={(c) => setFormData({
                                            ...formData,
                                            sharing: { ...formData.sharing, emailEnabled: c }
                                        })}
                                    />
                                </div>
                                <Separator className="bg-white/10" />
                                <div className="flex items-center justify-between">
                                    <Label className="text-zinc-300">Group Photos into Albums</Label>
                                    <Switch
                                        checked={formData.sharing?.groupPhotosIntoAlbums}
                                        onCheckedChange={(c) => setFormData({
                                            ...formData,
                                            sharing: { ...formData.sharing, groupPhotosIntoAlbums: c }
                                        })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'settings':
                return (
                    <div className="h-full p-6 space-y-6 overflow-hidden">
                        <Card className="bg-zinc-900 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">AI Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Default AI Model</Label>
                                    <select
                                        value={formData.settings?.aiModel || "nano-banana"}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            settings: { ...formData.settings, aiModel: e.target.value }
                                        })}
                                        className="w-full bg-zinc-950 border border-white/10 rounded-md p-2 text-white"
                                    >
                                        <option value="nano-banana">Nano Banana [Standard - 1 token]</option>
                                        <option value="nano-banana-pro">Nano Banana Pro [Premium - 15 tokens]</option>
                                        <option value="flux-realism">Flux Realism [Pro - 2 tokens]</option>
                                        <option value="seedream-v4">Seedream v4 [Standard - 1 token]</option>
                                    </select>
                                    <p className="text-xs text-zinc-500">
                                        Choose the AI model used for generating photos
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            default:
                return null;
        }
    };

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
            preview={<LivePreview formData={formData} currentStep={currentStep} />}
        >
            {renderStepContent()}
        </BoothEditorLayout>
    );
}
