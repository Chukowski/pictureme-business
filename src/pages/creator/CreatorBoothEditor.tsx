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
import { EventEditorLayout } from "@/components/admin/event-editor/EventEditorLayout";
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
import { Button } from "@/components/ui/button";
import { Sparkles, Image, Settings, Globe, Lock } from "lucide-react";
import { EventTemplates } from "@/components/admin/event-editor/EventTemplates";
import { CreatorNavbar } from "@/components/creator/CreatorNavbar";
import { Separator } from "@/components/ui/separator";

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
    const [currentStep, setCurrentStep] = useState('overview');

    const [formData, setFormData] = useState<EventFormData>({
        slug: "",
        title: "",
        description: "",
        is_active: true,
        start_date: "",
        end_date: "",

        // Default to 'free' mode for simplicity for now, essentially standard booth
        eventMode: "free",
        is_booth: true, // IMPORTANT: Flag as booth

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
                navigate("/creator");
                return;
            }

            setFormData((prev) => ({
                ...prev,
                ...booth,
                // Ensure theme is merged
                theme: { ...prev.theme, ...(booth.theme || {}) },
                // Ensure templates are preserved
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
                // Ensure defaults are set if missing
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

    // Custom Step Navigation for Creator
    // We reuse EventEditorLayout but might need to customize steps or just use the layout part
    const editorSteps = [
        { id: 'overview', label: 'Overview', icon: Globe },
        { id: 'experience', label: 'Experience', icon: Sparkles },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col">
            <CreatorNavbar user={currentUser || null} />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Editor */}
                <div className="w-1/2 border-r border-white/10 flex flex-col bg-zinc-950/50">
                    {/* Steps Header */}
                    <div className="flex items-center gap-1 p-4 border-b border-white/10 overflow-x-auto">
                        {editorSteps.map((step) => (
                            <button
                                key={step.id}
                                onClick={() => setCurrentStep(step.id)}
                                className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                                ${currentStep === step.id
                                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}
                            `}
                            >
                                <step.icon className="w-4 h-4" />
                                {step.label}
                            </button>
                        ))}
                        <div className="flex-1" />
                        <Button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {currentStep === 'overview' && (
                            <div className="space-y-6 max-w-2xl mx-auto">
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

                                <Card className="bg-zinc-900 border-white/10">
                                    <CardHeader>
                                        <CardTitle className="text-white">Visibility</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-zinc-950/50">
                                            <div className="space-y-0.5">
                                                <Label className="text-white">Active Status</Label>
                                                <p className="text-xs text-zinc-500">
                                                    When inactive, the booth URL will not be accessible
                                                </p>
                                            </div>
                                            <Switch
                                                checked={formData.is_active}
                                                onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {currentStep === 'experience' && (
                            <div className="space-y-6">
                                {/* Reuse EventTemplates component but maybe simplify it? 
                                 For now, standard one is fine as it handles template selection well.
                             */}
                                <EventTemplates
                                    formData={formData}
                                    setFormData={setFormData}
                                    currentUser={currentUser}
                                    onPreviewModeChange={() => { }} // No external preview mode change needed for now
                                />
                            </div>
                        )}

                        {currentStep === 'settings' && (
                            <div className="space-y-6 max-w-2xl mx-auto">
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
                                                <option value="nano-banana">Flux [Standard]</option>
                                                <option value="flux-realism">Flux Realism [Pro]</option>
                                                <option value="sdxl">SDXL Lightning [Fast]</option>
                                            </select>
                                            <p className="text-xs text-zinc-500">
                                                Choose the AI model used for generating photos.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

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
                        )}
                    </div>
                </div>

                {/* Right Panel - Preview */}
                <div className="w-1/2 bg-zinc-950 border-l border-white/10 relative">
                    <LivePreview
                        formData={formData}
                        currentStep={currentStep === 'experience' ? 'experience' : 'setup'}
                    />
                </div>
            </div>
        </div>
    );
}
