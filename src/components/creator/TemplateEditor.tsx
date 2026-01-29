import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCurrentUser, type User } from "@/services/eventsApi";
import { submitMarketplaceTemplate, updateMarketplaceTemplate, getMarketplaceTemplate, type MarketplaceTemplate } from "@/services/marketplaceApi";
import { BoothEditorLayout } from "@/components/creator/BoothEditorLayout";
import { TemplatePreview } from "@/components/creator/TemplatePreview";
import { WorkflowBuilder } from "@/components/creator/WorkflowBuilder";
import { LOCAL_IMAGE_MODELS, LOCAL_VIDEO_MODELS, normalizeModelId } from "@/services/aiProcessor";
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
import { 
    Settings2, 
    Palette, 
    Sparkles, 
    Lock, 
    Trash2, 
    Image as ImageIcon, 
    Loader2, 
    Building2, 
    User as UserIcon,
    Coins,
    Wand2,
    Plus,
    X,
    Save,
    Send,
    Gift,
    DollarSign,
    Info,
    Workflow
} from "lucide-react";
import { MediaLibrary } from "@/components/MediaLibrary";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";

export function TemplateEditor() {
    const navigate = useNavigate();
    const location = useLocation();
    const { templateId } = useParams();
    const isEdit = Boolean(templateId);
    
    const [currentUser] = useState<User | null>(() => getCurrentUser());
    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);
    const [currentStep, setCurrentStep] = useState('setup');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [useWorkflow, setUseWorkflow] = useState(false);
    const [wasRestored, setWasRestored] = useState(false);

    const [formData, setFormData] = useState<Partial<MarketplaceTemplate>>(() => {
        // Try to recover from localStorage first (in case of refresh)
        const localStorageKey = `template-draft-${templateId || 'new'}`;
        const savedDraft = localStorage.getItem(localStorageKey);
        
        if (savedDraft) {
            try {
                const parsed = JSON.parse(savedDraft);
                console.log('📦 Restored template from localStorage:', parsed.name);
                setWasRestored(true);
                setTimeout(() => {
                    toast.success(`Restored draft: "${parsed.name}"`, {
                        description: "Your work was automatically saved"
                    });
                }, 500);
                return parsed;
            } catch (e) {
                console.error('Failed to parse saved draft:', e);
            }
        }

        // Then try to recover state from location if available immediately
        const state = window.history.state?.usr as any;
        const initialData: Partial<MarketplaceTemplate> = {
            name: "",
            description: "",
            template_type: "individual",
            media_type: "image",
            category: "General",
            tags: [],
            backgrounds: [],
            preview_images: [],
            prompt: "",
            negative_prompt: "",
            price: 0,
            tokens_cost: 2,
            is_public: true,
            is_adult: false,
            status: 'draft',
            pipeline_config: {
                imageModel: 'seedream-t2i',
                faceswapEnabled: false,
                videoEnabled: false,
            },
            business_config: {
                include_header: true,
                include_branding: true,
                include_tagline: false,
                include_watermark: false,
                campaign_text: '',
                access_overrides: {
                    leadCaptureRequired: false,
                    requirePayment: false,
                    hardWatermark: false,
                    disableDownloads: false,
                    allowFreePreview: true,
                }
            }
        };

        if (state?.action === 'create_template' && state?.creation) {
            const { creation } = state;
            
            // Normalize the model ID from the creation
            const creationModelId = creation.model_id || creation.model || '';
            const normalizedModelId = normalizeModelId(creationModelId);
            
            // Find the correct model shortId from LOCAL_IMAGE_MODELS
            const modelMatch = LOCAL_IMAGE_MODELS.find(m => 
                m.shortId === normalizedModelId || 
                m.id === creationModelId ||
                normalizeModelId(m.id) === normalizedModelId
            );
            
            const correctModelId = modelMatch?.shortId || normalizedModelId || 'seedream-t2i';
            
            console.log('🎨 Template from creation:', {
                original: creationModelId,
                normalized: normalizedModelId,
                matched: modelMatch?.name,
                using: correctModelId
            });
            
            return {
                ...initialData,
                name: creation.prompt ? (creation.prompt.substring(0, 30) + '...') : 'New Template',
                description: creation.prompt || '',
                prompt: creation.prompt || '',
                backgrounds: [creation.url],
                preview_url: creation.url,
                preview_images: [creation.url],
                is_adult: creation.is_adult || false,
                pipeline_config: {
                    ...initialData.pipeline_config,
                    imageModel: correctModelId,
                }
            };
        }
        return initialData;
    });

    const autoSaveTimer = useRef<any>(null);

    useEffect(() => {
        if (isEdit && templateId) {
            loadTemplate();
        }
    }, [isEdit, templateId]);

    const loadTemplate = async () => {
        try {
            setIsLoading(true);
            const template = await getMarketplaceTemplate(templateId!);
            if (template) {
                setFormData(template);
            }
        } catch (error) {
            toast.error("Failed to load template");
            navigate("/creator/templates");
        } finally {
            setIsLoading(false);
        }
    };

    const isProcessingRef = useRef(false);
    const isInitialMount = useRef(true);
    const hasUserInteracted = useRef(false);

    useEffect(() => {
        // Clear history state immediately to prevent re-processing on re-renders/back navigation
        const state = location.state as any;
        if (state?.action === 'create_template' && state?.creation) {
            window.history.replaceState({}, document.title);
        }
        
        // Mark as not initial mount after first render
        const timer = setTimeout(() => {
            isInitialMount.current = false;
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [location]);

    const lastDraftSaved = useRef<string>("");

    // Save to localStorage whenever formData changes (for refresh recovery ONLY)
    // This does NOT save to server - only local storage for crash recovery
    useEffect(() => {
        if (formData.name && formData.name.trim()) {
            const localStorageKey = `template-draft-${formData.id || 'new'}`;
            localStorage.setItem(localStorageKey, JSON.stringify(formData));
        }
    }, [formData]);

    // DISABLED: Auto-save to server (was causing issues with automatic submission)
    // User must manually click "Save Draft" button to save to server
    // localStorage still provides crash recovery

    const handleSaveAction = async (isAutoSave = false) => {
        if (!formData.name) return;
        
        try {
            if (!isAutoSave) {
                setIsSaving(true);
                hasUserInteracted.current = true; // Mark as interacted when manually saving
            }
            
            // CRITICAL: Always ensure status is 'draft' when saving manually
            const draftData = { ...formData, status: 'draft' as const };
            
            let result;
            if (draftData.id) {
                // Always update existing draft - never create new
                result = await updateMarketplaceTemplate(draftData.id, draftData);
                if (!isAutoSave) {
                    console.log('✅ Updated existing draft:', draftData.id);
                }
            } else {
                // Create new draft only if no ID exists
                result = await submitMarketplaceTemplate(draftData);
                console.log('✅ Created new draft:', result.id);
                
                // Update formData with the new ID so subsequent saves update instead of create
                setFormData(result);
                
                // Update URL to edit mode and localStorage key
                window.history.replaceState(null, '', `/creator/templates/${result.id}/edit`);
                
                // Migrate localStorage to use the new ID
                const oldKey = 'template-draft-new';
                const newKey = `template-draft-${result.id}`;
                localStorage.removeItem(oldKey);
                localStorage.setItem(newKey, JSON.stringify(result));
            }
            
            setLastSaved(new Date());
            if (!isAutoSave) toast.success("Draft saved - continue editing");
        } catch (error) {
            console.error('Failed to save draft:', error);
            if (!isAutoSave) toast.error("Failed to save draft");
        } finally {
            if (!isAutoSave) setIsSaving(false);
        }
    };

    const handleSubmitToMarketplace = async () => {
        if (!formData.name) {
            toast.error("Please enter a template name");
            return;
        }

        if (!formData.id) {
            toast.error("Please save as draft first before submitting");
            return;
        }

        try {
            setIsSaving(true);
            
            // CRITICAL: Only submit to marketplace when user explicitly clicks "Submit to Market"
            const dataToSubmit = { ...formData, status: 'pending' as const };
            
            await updateMarketplaceTemplate(formData.id, dataToSubmit);
            
            // Clear localStorage on successful submission
            const localStorageKey = `template-draft-${formData.id}`;
            localStorage.removeItem(localStorageKey);
            
            toast.success("Template submitted for review!");
            
            // Only navigate away after explicit submission
            setTimeout(() => {
                navigate("/creator/templates");
            }, 500);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to submit template");
        } finally {
            setIsSaving(false);
        }
    };

    // Cleanup localStorage when component unmounts
    useEffect(() => {
        return () => {
            // Only clean up if navigating away (not refreshing)
            if (performance.navigation.type !== 1) {
                const localStorageKey = `template-draft-${formData.id || 'new'}`;
                // Only remove if it's been more than 1 minute since last save
                const savedData = localStorage.getItem(localStorageKey);
                if (savedData) {
                    try {
                        const parsed = JSON.parse(savedData);
                        const lastModified = new Date(parsed.updated_at || Date.now());
                        const now = new Date();
                        const minutesSinceLastSave = (now.getTime() - lastModified.getTime()) / 1000 / 60;
                        
                        // Keep draft in localStorage for quick recovery if recently modified
                        if (minutesSinceLastSave > 1) {
                            localStorage.removeItem(localStorageKey);
                        }
                    } catch (e) {
                        // If parse fails, just remove it
                        localStorage.removeItem(localStorageKey);
                    }
                }
            }
        };
    }, [formData.id]);

    const renderStepContent = () => {
        switch (currentStep) {
            case 'setup':
                return (
                    <div className="space-y-6">
                        <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl">Basic Information</CardTitle>
                                <CardDescription>Identify your template in the marketplace</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Template Name</Label>
                                        <Input
                                            id="name"
                                            value={formData.name || ""}
                                            onChange={(e) => {
                                                hasUserInteracted.current = true;
                                                setFormData({ ...formData, name: e.target.value });
                                            }}
                                            placeholder="Retro Cyberpunk Style"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="category">Category</Label>
                                        <select
                                            id="category"
                                            value={formData.category || "General"}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
                                        >
                                            <option value="General">General</option>
                                            <option value="Portrait">Portrait</option>
                                            <option value="Event">Event</option>
                                            <option value="Fashion">Fashion</option>
                                            <option value="Artistic">Artistic</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description || ""}
                                        onChange={(e) => {
                                            hasUserInteracted.current = true;
                                            setFormData({ ...formData, description: e.target.value });
                                        }}
                                        placeholder="Briefly describe what this template does..."
                                        className="h-20 resize-none"
                                    />
                                </div>

                                <Separator className="my-4 opacity-20" />

                                <div className="space-y-3">
                                    <Label>Template Type</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setFormData({ ...formData, template_type: 'individual' })}
                                            className={cn(
                                                "p-4 rounded-xl border-2 text-left transition-all",
                                                formData.template_type === 'individual' 
                                                    ? "border-indigo-500 bg-indigo-500/10" 
                                                    : "border-border bg-card/50 hover:border-indigo-500/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <UserIcon className={cn("w-4 h-4", formData.template_type === 'individual' ? "text-indigo-400" : "text-zinc-500")} />
                                                <span className="font-bold text-sm">Individual</span>
                                            </div>
                                            <p className="text-[10px] text-zinc-500">Best for personal users, social media, and art.</p>
                                        </button>

                                        <button
                                            onClick={() => setFormData({ ...formData, template_type: 'business' })}
                                            className={cn(
                                                "p-4 rounded-xl border-2 text-left transition-all",
                                                formData.template_type === 'business' 
                                                    ? "border-emerald-500 bg-emerald-500/10" 
                                                    : "border-border bg-card/50 hover:border-emerald-500/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <Building2 className={cn("w-4 h-4", formData.template_type === 'business' ? "text-emerald-400" : "text-zinc-500")} />
                                                <span className="font-bold text-sm">Business</span>
                                            </div>
                                            <p className="text-[10px] text-zinc-500">Includes branding placeholders for event photo booths.</p>
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Preview & Cover Image Selection */}
                        <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-purple-500" />
                                    Preview & Cover
                                </CardTitle>
                                <CardDescription>Choose what image represents your template</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <Label className="text-sm font-bold">Cover Image Options</Label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {/* Option 1: Use gallery image as-is */}
                                        {formData.preview_images && formData.preview_images[0] && (
                                            <button
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    preview_url: formData.preview_images[0]
                                                })}
                                                className={cn(
                                                    "relative group overflow-hidden rounded-lg border-2 transition-all aspect-[9/16]",
                                                    formData.preview_url === formData.preview_images[0]
                                                        ? "border-purple-500 ring-2 ring-purple-500/20"
                                                        : "border-white/10 hover:border-purple-500/50"
                                                )}
                                            >
                                                <img
                                                    src={formData.preview_images[0]}
                                                    alt="Gallery result"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                <div className="absolute bottom-2 left-2 right-2">
                                                    <Badge className="bg-purple-500/90 text-white text-[10px]">
                                                        Final Result
                                                    </Badge>
                                                    <p className="text-[10px] text-white/90 mt-1">Use the generated image</p>
                                                </div>
                                                {formData.preview_url === formData.preview_images[0] && (
                                                    <div className="absolute top-2 right-2">
                                                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                                                            <Sparkles className="w-3 h-3 text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        )}

                                        {/* Option 2: Use custom background */}
                                        <button
                                            onClick={() => {
                                                // Open media library to select custom preview
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e: any) => {
                                                    const file = e.target?.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            const dataUrl = event.target?.result as string;
                                                            setFormData({
                                                                ...formData,
                                                                preview_url: dataUrl,
                                                                backgrounds: [...(formData.backgrounds || []), dataUrl]
                                                            });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                };
                                                input.click();
                                            }}
                                            className={cn(
                                                "relative group overflow-hidden rounded-lg border-2 transition-all aspect-[9/16] flex flex-col items-center justify-center gap-2",
                                                formData.preview_url && formData.preview_url !== formData.preview_images?.[0]
                                                    ? "border-purple-500 ring-2 ring-purple-500/20"
                                                    : "border-dashed border-white/20 hover:border-purple-500/50 bg-white/5"
                                            )}
                                        >
                                            {formData.preview_url && formData.preview_url !== formData.preview_images?.[0] ? (
                                                <>
                                                    <img
                                                        src={formData.preview_url}
                                                        alt="Custom preview"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                                    <div className="absolute bottom-2 left-2 right-2">
                                                        <Badge className="bg-amber-500/90 text-white text-[10px]">
                                                            Custom Preview
                                                        </Badge>
                                                        <p className="text-[10px] text-white/90 mt-1">Your selected image</p>
                                                    </div>
                                                    <div className="absolute top-2 right-2">
                                                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                                                            <Sparkles className="w-3 h-3 text-white" />
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-8 h-8 text-purple-400" />
                                                    <div className="text-center px-4">
                                                        <p className="text-xs font-medium text-purple-300">Upload Custom</p>
                                                        <p className="text-[10px] text-zinc-500 mt-1">
                                                            Use a different image as preview
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                        <div className="flex items-start gap-2">
                                            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-[10px] text-blue-300/90 leading-relaxed">
                                                <p className="font-medium mb-1">💡 Pro Tip</p>
                                                <p>You can showcase your <strong>best result</strong> as the preview while keeping the original backgrounds and prompts for users to customize.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional Preview Images */}
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs">Additional Preview Images</Label>
                                        <Badge variant="outline" className="text-[9px]">
                                            {formData.preview_images?.length || 0} images
                                        </Badge>
                                    </div>
                                    <p className="text-[10px] text-zinc-500">
                                        Show multiple variations or angles of your template
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.preview_images?.map((img, idx) => (
                                            <div key={idx} className="relative group">
                                                <img
                                                    src={img}
                                                    alt={`Preview ${idx + 1}`}
                                                    className="w-16 h-24 object-cover rounded-lg border border-white/10"
                                                />
                                                <button
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        preview_images: formData.preview_images?.filter((_, i) => i !== idx)
                                                    })}
                                                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.multiple = true;
                                                input.onchange = (e: any) => {
                                                    const files = Array.from(e.target?.files || []);
                                                    files.forEach((file: any) => {
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            const dataUrl = event.target?.result as string;
                                                            setFormData({
                                                                ...formData,
                                                                preview_images: [...(formData.preview_images || []), dataUrl]
                                                            });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    });
                                                };
                                                input.click();
                                            }}
                                            className="w-16 h-24 rounded-lg border-2 border-dashed border-white/20 hover:border-purple-500/50 flex items-center justify-center transition-all bg-white/5 hover:bg-purple-500/10"
                                        >
                                            <Plus className="w-6 h-6 text-purple-400" />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Coins className="w-5 h-5 text-amber-500" />
                                    Monetization
                                </CardTitle>
                                <CardDescription>Set how much users pay to use your template</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setFormData({ ...formData, tokens_cost: 0, price: 0, is_premium: false })}
                                        className={cn(
                                            "p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-1.5",
                                            formData.tokens_cost === 0 && formData.price === 0 
                                                ? "border-emerald-500 bg-emerald-500/10" 
                                                : "border-border bg-card/50 hover:border-emerald-500/30"
                                        )}
                                    >
                                        <Gift className={cn("w-4 h-4", formData.tokens_cost === 0 && formData.price === 0 ? "text-emerald-400" : "text-zinc-500")} />
                                        <span className="font-bold text-xs">Free</span>
                                    </button>

                                    <button
                                        onClick={() => setFormData({ ...formData, tokens_cost: 2, price: 0, is_premium: false })}
                                        className={cn(
                                            "p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-1.5",
                                            formData.tokens_cost > 0 && formData.price === 0 
                                                ? "border-amber-500 bg-amber-500/10" 
                                                : "border-border bg-card/50 hover:border-amber-500/30"
                                        )}
                                    >
                                        <Coins className={cn("w-4 h-4", formData.tokens_cost > 0 && formData.price === 0 ? "text-amber-400" : "text-zinc-500")} />
                                        <span className="font-bold text-xs">Tokens</span>
                                    </button>

                                    <button
                                        onClick={() => setFormData({ ...formData, price: 0.99, tokens_cost: 0, is_premium: true })}
                                        className={cn(
                                            "p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-1.5",
                                            formData.price > 0 
                                                ? "border-indigo-500 bg-indigo-500/10" 
                                                : "border-border bg-card/50 hover:border-indigo-500/30"
                                        )}
                                    >
                                        <DollarSign className={cn("w-4 h-4", formData.price > 0 ? "text-indigo-400" : "text-zinc-500")} />
                                        <span className="font-bold text-xs">Paid</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                    {formData.tokens_cost > 0 && formData.price === 0 && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <Label className="text-xs">Token Cost</Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={50}
                                                    value={formData.tokens_cost || 2}
                                                    onChange={(e) => setFormData({ ...formData, tokens_cost: parseInt(e.target.value) || 1 })}
                                                    className="w-24 h-8 text-xs"
                                                />
                                                <span className="text-[10px] text-zinc-500">Tokens per generation</span>
                                            </div>
                                        </div>
                                    )}

                                    {formData.price > 0 && (
                                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                            <Label className="text-xs">Price (USD)</Label>
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
                                                    <Input
                                                        type="number"
                                                        min={0.50}
                                                        step={0.01}
                                                        value={formData.price || 0}
                                                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                                        className="w-28 h-8 pl-7 text-xs"
                                                    />
                                                </div>
                                                <span className="text-[10px] text-zinc-500">One-time purchase</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {formData.template_type === 'individual' && (
                                        <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                                            <div className="space-y-0.5">
                                                <Label className="text-red-400 flex items-center gap-2 text-xs font-bold">
                                                    <Lock className="w-3.5 h-3.5" />
                                                    Adult Content (18+)
                                                </Label>
                                                <p className="text-[9px] text-zinc-500">Sensitive content for age-restricted accounts.</p>
                                            </div>
                                            <Switch
                                                checked={formData.is_adult}
                                                onCheckedChange={(checked) => setFormData({ ...formData, is_adult: checked })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'ai':
                return (
                    <div className="space-y-6">
                        <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Wand2 className="w-5 h-5 text-indigo-500" />
                                    AI Configuration
                                </CardTitle>
                                <CardDescription>Fine-tune the generation pipeline</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Primary Prompt</Label>
                                    <Textarea
                                        value={formData.prompt || ""}
                                        onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                                        placeholder="Cyberpunk city with neon lights..."
                                        className="h-24 font-mono text-xs"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Negative Prompt (Optional)</Label>
                                    <Textarea
                                        value={formData.negative_prompt || ""}
                                        onChange={(e) => setFormData({ ...formData, negative_prompt: e.target.value })}
                                        placeholder="blurry, distorted, low quality..."
                                        className="h-20 font-mono text-xs opacity-70"
                                    />
                                </div>

                                {/* Mode Toggle: Simple vs Workflow */}
                                <div className="pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <Label className="text-sm font-bold">Pipeline Mode</Label>
                                            <p className="text-xs text-zinc-500">Choose between simple or advanced workflow</p>
                                        </div>
                                        <div className="flex items-center gap-2 p-1 rounded-lg bg-white/5 border border-white/10">
                                            <Button
                                                variant={!useWorkflow ? "default" : "ghost"}
                                                size="sm"
                                                className="h-8 text-xs"
                                                onClick={() => setUseWorkflow(false)}
                                            >
                                                <Wand2 className="w-3 h-3 mr-1.5" />
                                                Simple
                                            </Button>
                                            <Button
                                                variant={useWorkflow ? "default" : "ghost"}
                                                size="sm"
                                                className="h-8 text-xs"
                                                onClick={() => setUseWorkflow(true)}
                                            >
                                                <Workflow className="w-3 h-3 mr-1.5" />
                                                Workflow
                                            </Button>
                                        </div>
                                    </div>

                                    {!useWorkflow ? (
                                        // Simple Mode
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>AI Model</Label>
                                                <select
                                                    value={formData.pipeline_config?.imageModel}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        pipeline_config: { ...formData.pipeline_config, imageModel: e.target.value }
                                                    })}
                                                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
                                                >
                                                    {LOCAL_IMAGE_MODELS
                                                        .filter(m => !m.isVariant) // Exclude variants
                                                        .map(model => (
                                                            <option key={model.shortId} value={model.shortId}>
                                                                {model.name} ({model.cost} tokens)
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                            <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                                                <Label className="text-xs">Enable Face-Swap</Label>
                                                <Switch
                                                    checked={formData.pipeline_config?.faceswapEnabled}
                                                    onCheckedChange={(checked) => setFormData({
                                                        ...formData,
                                                        pipeline_config: { ...formData.pipeline_config, faceswapEnabled: checked }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        // Workflow Mode
                                        <WorkflowBuilder
                                            workflow={formData.pipeline_config?.workflow}
                                            onChange={(workflow) => setFormData({
                                                ...formData,
                                                pipeline_config: { ...formData.pipeline_config, workflow }
                                            })}
                                        />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'business':
                return (
                    <div className="space-y-6">
                        {formData.template_type === 'business' ? (
                            <>
                                <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                                    <CardHeader>
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            <Building2 className="w-5 h-5 text-emerald-500" />
                                            Business Settings
                                        </CardTitle>
                                        <CardDescription>Configure branding and event behavior</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-4">
                                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Branding Elements</Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-medium">Header Logo</p>
                                                        <p className="text-[10px] text-zinc-500">Allow booth header branding</p>
                                                    </div>
                                                    <Switch
                                                        checked={formData.business_config?.include_header}
                                                        onCheckedChange={(checked) => setFormData({
                                                            ...formData,
                                                            business_config: { ...formData.business_config, include_header: checked }
                                                        })}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-medium">Booth Branding</p>
                                                        <p className="text-[10px] text-zinc-500">Show event logo in UI</p>
                                                    </div>
                                                    <Switch
                                                        checked={formData.business_config?.include_branding}
                                                        onCheckedChange={(checked) => setFormData({
                                                            ...formData,
                                                            business_config: { ...formData.business_config, include_branding: checked }
                                                        })}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-medium">Tagline / Text</p>
                                                        <p className="text-[10px] text-zinc-500">Allow custom event taglines</p>
                                                    </div>
                                                    <Switch
                                                        checked={formData.business_config?.include_tagline}
                                                        onCheckedChange={(checked) => setFormData({
                                                            ...formData,
                                                            business_config: { ...formData.business_config, include_tagline: checked }
                                                        })}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-medium">Watermark</p>
                                                        <p className="text-[10px] text-zinc-500">Apply event watermark</p>
                                                    </div>
                                                    <Switch
                                                        checked={formData.business_config?.include_watermark}
                                                        onCheckedChange={(checked) => setFormData({
                                                            ...formData,
                                                            business_config: { ...formData.business_config, include_watermark: checked }
                                                        })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <Separator className="opacity-10" />

                                        <div className="space-y-4">
                                            <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Access & Overrides</Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-medium">Lead Capture</p>
                                                        <p className="text-[10px] text-zinc-500">Force email collection</p>
                                                    </div>
                                                    <Switch
                                                        checked={formData.business_config?.access_overrides?.leadCaptureRequired}
                                                        onCheckedChange={(checked) => setFormData({
                                                            ...formData,
                                                            business_config: {
                                                                ...formData.business_config,
                                                                access_overrides: { ...formData.business_config.access_overrides, leadCaptureRequired: checked }
                                                            }
                                                        })}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                                                    <div className="space-y-0.5">
                                                        <p className="text-xs font-medium">Disable Downloads</p>
                                                        <p className="text-[10px] text-zinc-500">Restrict image saving</p>
                                                    </div>
                                                    <Switch
                                                        checked={formData.business_config?.access_overrides?.disableDownloads}
                                                        onCheckedChange={(checked) => setFormData({
                                                            ...formData,
                                                            business_config: {
                                                                ...formData.business_config,
                                                                access_overrides: { ...formData.business_config.access_overrides, disableDownloads: checked }
                                                            }
                                                        })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <div className="p-8 text-center bg-card/30 border border-dashed rounded-xl">
                                <Building2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-zinc-500">Business settings not available</h3>
                                <p className="text-sm text-zinc-600 max-w-xs mx-auto mt-2">Change the template type to "Business" in the Setup tab to access these settings.</p>
                                <Button 
                                    variant="outline" 
                                    className="mt-6 border-zinc-700 text-zinc-400 hover:text-white"
                                    onClick={() => setCurrentStep('setup')}
                                >
                                    Back to Setup
                                </Button>
                            </div>
                        )}
                    </div>
                );

            case 'media':
                return (
                    <div className="space-y-6">
                        <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <ImageIcon className="w-5 h-5 text-indigo-500" />
                                    Media & Assets
                                </CardTitle>
                                <CardDescription>Manage the images that define this template</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <Label>Background Images</Label>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                        {formData.backgrounds?.map((url, idx) => (
                                            <div key={idx} className="relative aspect-square rounded-lg border border-white/10 overflow-hidden group">
                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        backgrounds: formData.backgrounds?.filter((_, i) => i !== idx)
                                                    })}
                                                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button className="aspect-square rounded-lg border-2 border-dashed border-white/10 hover:border-indigo-500/50 flex flex-col items-center justify-center gap-2 transition-all group">
                                                    <Plus className="w-6 h-6 text-zinc-600 group-hover:text-indigo-400" />
                                                    <span className="text-[10px] text-zinc-600 group-hover:text-indigo-400">Add Image</span>
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>Select Media</DialogTitle>
                                                </DialogHeader>
                                                <MediaLibrary 
                                                    onSelectMedia={(url) => setFormData({
                                                        ...formData,
                                                        backgrounds: [...(formData.backgrounds || []), url]
                                                    })}
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            default:
                return null;
        }
    };

    const steps = [
        { id: 'setup', label: '1. Setup', icon: Settings2, description: 'Basic info & type' },
        { id: 'ai', label: '2. AI Pipeline', icon: Sparkles, description: 'Prompts & models' },
        { id: 'media', label: '3. Media', icon: ImageIcon, description: 'Assets & previews' },
        ...(formData.template_type === 'business' ? [{ id: 'business', label: '4. Business', icon: Building2, description: 'Branding & access' }] : [])
    ];

    const HeaderActions = (
        <div className="flex items-center gap-2">
            <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs text-zinc-400 hover:text-white"
                onClick={() => handleSaveAction(false)}
                disabled={isSaving}
            >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Draft
            </Button>
            
            {formData.status !== 'published' && formData.status !== 'pending' && (
                <Button 
                    size="sm" 
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                    onClick={handleSubmitToMarketplace}
                    disabled={isSaving}
                >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Submit to Market
                </Button>
            )}
        </div>
    );

    const TemplateSidebarFooter = (
        <div className="p-4 border-y border-white/5 mt-4">
            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-xl p-4">
                <h3 className="text-xs font-medium text-indigo-200 mb-1 flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    Style Submission
                </h3>
                <p className="text-[10px] text-indigo-300/70 mb-3 leading-relaxed">
                    Templates are reviewed by admins before being published to the marketplace.
                </p>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[9px] text-indigo-400/60 uppercase font-bold tracking-tighter">
                        <span>Creator Revenue</span>
                        <span>70%</span>
                    </div>
                    <div className="w-full bg-indigo-500/10 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full w-[70%]" />
                    </div>
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-[#101112]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-zinc-500 text-sm">Loading template...</p>
                </div>
            </div>
        );
    }

    return (
        <BoothEditorLayout
            title={formData.name || "My Template"}
            onTitleChange={(newName) => setFormData({ ...formData, name: newName })}
            isSaving={isSaving}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            steps={steps}
            backUrl="/creator/templates"
            backLabel="My Styles"
            headerActions={HeaderActions}
            sidebarFooter={TemplateSidebarFooter}
            preview={
                <TemplatePreview 
                    formData={formData} 
                    currentStep={currentStep}
                />
            }
        >
            <div className="p-6 pb-32">
                <div className="max-w-3xl mx-auto">
                    {/* Status / Saved Indicator */}
                    <div className="flex items-center justify-between mb-6 px-1">
                        <div className="flex items-center gap-2">
                            {formData.status === 'published' ? (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Published</Badge>
                            ) : formData.status === 'pending' ? (
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">In Review</Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">Draft</Badge>
                            )}
                            
                            {lastSaved && (
                                <span className="text-[10px] text-zinc-500 italic">
                                    Last saved at {lastSaved.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </div>

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
                                    handleSubmitToMarketplace();
                                }
                            }}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
                        >
                            {currentStep === steps[steps.length - 1].id ? 'Submit Template' : 'Next Step'}
                        </button>
                    </div>
                </div>
            </div>
        </BoothEditorLayout>
    );
}
