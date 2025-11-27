import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  createEvent,
  updateEvent,
  getUserEvents,
  getCurrentUser,
  type EventConfig,
  type Template,
  type AlbumStation,
  type AlbumTrackingConfig,
  type SharingOverrides,
  type AspectRatio,
} from "@/services/eventsApi";
import { 
  ArrowLeft, Plus, Save, Trash2, Image as ImageIcon, Upload, Download, FileJson, 
  Settings, Palette, Layers, Copy, ExternalLink, Lock, Zap, Users, CreditCard, 
  QrCode, Eye, EyeOff, Printer, Video, Sparkles, Mail, MessageSquare, 
  BadgeCheck, LayoutGrid, Moon, Sun, PartyPopper, Building2, Baby, Gift,
  Info, ChevronRight, Crown, Library, Loader2, MapPin, Camera, Gamepad2, 
  MonitorPlay, GripVertical, BookOpen, Ratio
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeatureGate, FeatureLockBadge } from "@/components/FeatureGate";
import { hasFeature, getPlanFeatures } from "@/lib/planFeatures";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getDefaultTemplates } from "@/services/adminStorage";
import { uploadTemplateImage, exportTemplates, importTemplates } from "@/services/templateStorage";
// MediaLibrary removed - using simplified inline image management
import { PromptHelper } from "@/components/PromptHelper";

export default function AdminEventForm() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isEdit = Boolean(eventId);

  const currentUser = useMemo(() => getCurrentUser(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Refs for file inputs
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  // State for current template being edited (for media library and prompt suggestions)
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState<number | null>(null);
  
  // Library modal state
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryTemplates, setLibraryTemplates] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  // Event mode types
  type EventMode = 'free' | 'lead_capture' | 'pay_per_photo' | 'pay_per_album';
  type ThemePreset = 'classic_dark' | 'clean_light' | 'neon_party' | 'corporate' | 'kids_fun' | 'holiday' | 'custom';

  // Form state
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    description: "",
    is_active: true,
    start_date: "",
    end_date: "",
    
    // Event Mode & Rules (Tab 1)
    eventMode: "free" as EventMode,
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
    },
    
    // Theme & Branding (Tab 2)
    theme: {
      preset: "classic_dark" as ThemePreset,
      brandName: "Akitá",
      primaryColor: "#6366F1", // Indigo
      secondaryColor: "#F59E0B", // Amber
      accentColor: "#10B981", // Emerald
      tagline: "AI-powered photo experiences",
      mode: "dark" as "light" | "dark",
      cardRadius: "xl" as "none" | "sm" | "md" | "lg" | "xl" | "2xl",
      buttonStyle: "solid" as "solid" | "outline" | "ghost",
    },
    branding: {
      logoPath: "",
      footerPath: "",
      sponsorLogos: [] as string[],
      headerBackgroundColor: "#FFFFFF",
      footerBackgroundColor: "#000000",
      taglineText: "",
      showLogoInBooth: true,
      showLogoInFeed: true,
      showSponsorStrip: false,
      includeLogoOnPrints: true,
      watermark: {
        enabled: false,
        type: "image" as "image" | "text",
        imageUrl: "",
        text: "",
        position: "bottom-right" as "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center",
        size: 15,
        opacity: 0.7,
        pattern: "step_repeat" as "step_repeat" | "strip_bottom" | "corner",
      },
    },
    
    // Badge Creator settings
    badgeCreator: {
      enabled: false,
      mode: "simple" as "simple" | "ai",
      templateId: "",
      layout: "portrait" as "portrait" | "landscape" | "square",
      includeQR: false,
      fields: {
        showName: true,
        showDate: true,
        showEventName: true,
        customField1: "",
        customField2: "",
      },
    },
    
    // Sharing settings
    sharing: {
      emailEnabled: true,
      whatsappEnabled: false,
      smsEnabled: false,
      emailTemplate: "",
      emailAfterBuy: true,
      groupPhotosIntoAlbums: false,
    },
    
    // Album Tracking (Business: Event Pro+)
    albumTracking: {
      enabled: false,
      albumType: "individual" as "individual" | "group",
      stations: [] as AlbumStation[],
      rules: {
        maxPhotosPerAlbum: 5,
        allowReEntry: false,
        requireStaffApproval: false,
        printReady: false,
      },
      badgeIntegration: {
        autoGenerateBadge: false,
        badgeLayout: "portrait" as "portrait" | "landscape" | "square",
        includeQR: true,
        includeName: true,
        includeDateTime: true,
        customFields: [] as string[],
      },
    },
    
    // Sharing Overrides (Business: Event Pro+)
    sharingOverrides: {
      enabled: false,
      defaultAspectRatio: "auto" as AspectRatio,
      availableRatios: ["1:1", "4:5", "9:16", "16:9"] as string[],
      shareTemplateId: "",
    },
    
    // Legacy settings (kept for compatibility)
    settings: {
      aiModel: "seedream-t2i",
      imageSize: { width: 1080, height: 1920 },
      feedEnabled: true,
      moderationEnabled: false,
      maxPhotosPerSession: 5,
    },
    templates: [] as Template[],
  });

  useEffect(() => {
    if (!currentUser) {
      navigate("/admin/auth");
      return;
    }

    if (isEdit && eventId) {
      loadEvent();
    }
    // Don't load default templates for new events - start with empty array
  }, [currentUser, isEdit, eventId, navigate]);

  const loadEvent = async () => {
    try {
      setIsLoading(true);
      const events = await getUserEvents();
      const event = events.find((e) => e._id === eventId);

      if (!event) {
        toast.error("Event not found");
        navigate("/admin/events");
        return;
      }

      // Map event data to form
      setFormData((prev) => ({
        ...prev,
        slug: event.slug,
        title: event.title,
        description: event.description || "",
        is_active: event.is_active,
        start_date: event.start_date || "",
        end_date: event.end_date || "",
        theme: {
          brandName: event.theme?.brandName || prev.theme.brandName,
          primaryColor: event.theme?.primaryColor || prev.theme.primaryColor,
          secondaryColor: event.theme?.secondaryColor || prev.theme.secondaryColor,
          tagline: event.theme?.tagline || prev.theme.tagline,
          mode: event.theme?.mode || prev.theme.mode,
        },
        branding: {
          ...prev.branding,
          ...(event.branding || {}),
          // Ensure watermark is always defined with all required properties
          watermark: event.branding?.watermark ? {
            enabled: event.branding.watermark.enabled,
            type: event.branding.watermark.type,
            imageUrl: event.branding.watermark.imageUrl || "",
            text: event.branding.watermark.text || "",
            position: event.branding.watermark.position,
            size: event.branding.watermark.size,
            opacity: event.branding.watermark.opacity,
          } : prev.branding.watermark,
        },
        settings: {
          aiModel: event.settings?.aiModel || prev.settings.aiModel,
          imageSize: event.settings?.imageSize || prev.settings.imageSize,
          feedEnabled: event.settings?.feedEnabled ?? prev.settings.feedEnabled,
          moderationEnabled: event.settings?.moderationEnabled ?? prev.settings.moderationEnabled,
          maxPhotosPerSession: event.settings?.maxPhotosPerSession || prev.settings.maxPhotosPerSession,
        },
        templates: event.templates || [],
      }));
    } catch (error: any) {
      toast.error(error.message || "Failed to load event");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.slug || !formData.title) {
      toast.error("Slug and title are required");
      return;
    }

    if (formData.templates.length === 0) {
      toast.error("At least one template is required");
      return;
    }

    setIsSaving(true);

    try {
      if (isEdit && eventId) {
        await updateEvent(eventId, formData);
        toast.success("Event updated successfully");
      } else {
        await createEvent(formData);
        toast.success("Event created successfully");
      }
      navigate("/admin/events");
    } catch (error: any) {
      toast.error(error.message || "Failed to save event");
    } finally {
      setIsSaving(false);
    }
  };

  const addTemplate = () => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: "New Template",
      description: "",
      images: [],
      prompt: "",
      active: true,
      includeHeader: false,
      campaignText: "",
    };
    setFormData((prev) => ({
      ...prev,
      templates: [...prev.templates, newTemplate],
    }));
  };

  // Load templates from user's library
  const loadLibraryTemplates = async () => {
    setIsLoadingLibrary(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/marketplace/my-library", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const library = await response.json();
        // Filter only templates
        const templates = library.filter((item: any) => item.type === "template");
        setLibraryTemplates(templates);
      }
      
      // Also get marketplace templates the user owns
      const marketplaceRes = await fetch("/api/marketplace/templates", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (marketplaceRes.ok) {
        const marketplace = await marketplaceRes.json();
        const owned = marketplace.filter((t: any) => t.is_owned);
        // Merge with library, avoiding duplicates
        setLibraryTemplates(prev => {
          const ids = new Set(prev.map(t => t.id));
          const newTemplates = owned.filter((t: any) => !ids.has(t.id));
          return [...prev, ...newTemplates];
        });
      }
    } catch (error) {
      console.error("Error loading library:", error);
      toast.error("Failed to load library templates");
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  // Add template from library to event
  const addTemplateFromLibrary = (libraryTemplate: any) => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: libraryTemplate.name,
      description: libraryTemplate.description || "",
      images: libraryTemplate.preview_url ? [libraryTemplate.preview_url] : [],
      prompt: libraryTemplate.prompt || "",
      active: true,
      includeHeader: false,
      campaignText: "",
      // Store reference to marketplace template
      marketplaceTemplateId: libraryTemplate.id,
    };
    
    setFormData((prev) => ({
      ...prev,
      templates: [...prev.templates, newTemplate],
    }));
    
    setShowLibraryModal(false);
    toast.success(`Added "${libraryTemplate.name}" to event templates`);
  };

  // Open library modal
  useEffect(() => {
    if (showLibraryModal) {
      loadLibraryTemplates();
    }
  }, [showLibraryModal]);

  const updateTemplate = (index: number, updates: Partial<Template>) => {
    setFormData((prev) => ({
      ...prev,
      templates: prev.templates.map((t, i) =>
        i === index ? { ...t, ...updates } : t
      ),
    }));
  };

  const deleteTemplate = async (index: number) => {
    const templateName = formData.templates[index]?.name || "Template";

    if (!confirm(`Delete "${templateName}"?`)) {
      return;
    }

    // Update local state first for immediate UI feedback
    const updatedTemplates = formData.templates.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      templates: updatedTemplates,
    }));

    // If editing an existing event, save the change immediately
    if (isEdit && eventId) {
      try {
        await updateEvent(eventId, { ...formData, templates: updatedTemplates });
        toast.success("Template deleted successfully");
      } catch (error: any) {
        // Revert on error
        setFormData((prev) => ({
          ...prev,
          templates: formData.templates,
        }));
        toast.error(error.message || "Failed to delete template");
      }
    } else {
      // For new events, just update local state
      toast.success("Template removed (save to confirm)");
    }
  };

  const loadDefaultTemplates = () => {
    const defaultTemplates = getDefaultTemplates();
    setFormData((prev) => ({ ...prev, templates: defaultTemplates }));
    toast.success("Default templates loaded");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, templateIndex: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const urls: string[] = [];

      for (const file of Array.from(files)) {
        const url = await uploadTemplateImage(file);
        urls.push(url);
        toast.success(`Uploaded: ${file.name}`);
      }

      // Add URLs to template images
      updateTemplate(templateIndex, {
        images: [...formData.templates[templateIndex].images, ...urls],
      });

      toast.success(`${urls.length} image(s) uploaded successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload images");
    } finally {
      setIsUploading(false);
      if (imageUploadRef.current) {
        imageUploadRef.current.value = "";
      }
    }
  };

  const handleExportTemplates = () => {
    if (formData.templates.length === 0) {
      toast.error("No templates to export");
      return;
    }

    exportTemplates(formData.templates, formData.title || "event");
    toast.success("Templates exported successfully");
  };

  const handleImportTemplates = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedTemplates = await importTemplates(file);
      setFormData((prev) => ({
        ...prev,
        templates: [...prev.templates, ...importedTemplates],
      }));
      toast.success(`Imported ${importedTemplates.length} template(s)`);
    } catch (error: any) {
      toast.error(error.message || "Failed to import templates");
    } finally {
      if (jsonImportRef.current) {
        jsonImportRef.current.value = "";
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 md:mb-8">
          <Button variant="ghost" onClick={() => navigate("/admin/events")} className="shrink-0 text-zinc-400 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              {isEdit ? "Edit Event" : "Create New Event"}
            </h1>
            <p className="text-sm md:text-base text-zinc-400 mt-1">
              {isEdit ? "Update your event details" : "Set up a new photo booth event"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-xl">
              <TabsTrigger
                value="basic"
                className="flex items-center gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-3 rounded-lg transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Basic Info</span>
                <span className="sm:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger
                value="branding"
                className="flex items-center gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-3 rounded-lg transition-all"
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline">Branding</span>
                <span className="sm:hidden">Brand</span>
              </TabsTrigger>
              <TabsTrigger
                value="templates"
                className="flex items-center gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-3 rounded-lg transition-all"
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Templates</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6 mt-6">
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Basic Information</CardTitle>
                  <CardDescription className="text-zinc-400">Event details and settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="slug" className="text-zinc-300">
                        Slug <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="slug"
                        placeholder="my-event"
                        value={formData.slug}
                        onChange={(e) =>
                          setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                        }
                        required
                        disabled={isEdit}
                        className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                      />
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/40 border border-white/5">
                          <span className="text-zinc-500">Event URL</span>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-indigo-400 max-w-[200px] truncate">
                              /{currentUser?.slug}/{formData.slug || "my-event"}
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                const url = `${window.location.origin}/${currentUser?.slug}/${formData.slug || "my-event"}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Event URL copied");
                              }}
                              className="text-zinc-400 hover:text-white transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/40 border border-white/5">
                          <span className="text-zinc-500">Feed URL</span>
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-indigo-400 max-w-[200px] truncate">
                              /{currentUser?.slug}/{formData.slug || "my-event"}/feed
                            </code>
                            <button
                              type="button"
                              onClick={() => {
                                const url = `${window.location.origin}/${currentUser?.slug}/${formData.slug || "my-event"}/feed`;
                                navigator.clipboard.writeText(url);
                                toast.success("Feed URL copied");
                              }}
                              className="text-zinc-400 hover:text-white transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-zinc-300">
                        Title <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="My Photo Booth Event"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        required
                        className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-zinc-300">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Brief description of your event"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                      className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="start_date" className="text-zinc-300">Start Date</Label>
                      <Input
                        id="start_date"
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) =>
                          setFormData({ ...formData, start_date: e.target.value })
                        }
                        className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date" className="text-zinc-300">End Date</Label>
                      <Input
                        id="end_date"
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) =>
                          setFormData({ ...formData, end_date: e.target.value })
                        }
                        className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5">
                    <div>
                      <Label htmlFor="is_active" className="cursor-pointer text-white font-medium">
                        Event Active
                      </Label>
                      <p className="text-sm text-zinc-400">
                        Allow users to access this event
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_active: checked })
                      }
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Event Mode Card */}
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Event Mode
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Choose how guests interact with photos. This sets default behavior for all templates.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Free Experience */}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        eventMode: 'free',
                        rules: { ...formData.rules, leadCaptureEnabled: false, requirePaymentBeforeDownload: false, allowFreePreview: true }
                      })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.eventMode === 'free'
                          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${formData.eventMode === 'free' ? 'bg-emerald-500/20' : 'bg-zinc-800'}`}>
                          <Sparkles className={`w-5 h-5 ${formData.eventMode === 'free' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-white">Free Experience</div>
                          <p className="text-xs text-zinc-400 mt-1">No payment, no data capture. Guests download freely.</p>
                        </div>
                      </div>
                    </button>

                    {/* Lead Capture Only */}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        eventMode: 'lead_capture',
                        rules: { ...formData.rules, leadCaptureEnabled: true, requirePaymentBeforeDownload: false, allowFreePreview: true }
                      })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.eventMode === 'lead_capture'
                          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${formData.eventMode === 'lead_capture' ? 'bg-blue-500/20' : 'bg-zinc-800'}`}>
                          <Users className={`w-5 h-5 ${formData.eventMode === 'lead_capture' ? 'text-blue-400' : 'text-zinc-500'}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-white">Lead Capture Only</div>
                          <p className="text-xs text-zinc-400 mt-1">Guests see photo but must provide email/phone to download.</p>
                        </div>
                      </div>
                    </button>

                    {/* Pay Per Photo */}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        eventMode: 'pay_per_photo',
                        rules: { ...formData.rules, leadCaptureEnabled: true, requirePaymentBeforeDownload: true, allowFreePreview: true, hardWatermarkOnPreviews: true }
                      })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.eventMode === 'pay_per_photo'
                          ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${formData.eventMode === 'pay_per_photo' ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>
                          <CreditCard className={`w-5 h-5 ${formData.eventMode === 'pay_per_photo' ? 'text-amber-400' : 'text-zinc-500'}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-white">Pay Per Photo</div>
                          <p className="text-xs text-zinc-400 mt-1">Preview with watermark, pay via Stripe to unlock clean photo.</p>
                        </div>
                      </div>
                    </button>

                    {/* Pay Per Album */}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        eventMode: 'pay_per_album',
                        rules: { ...formData.rules, leadCaptureEnabled: true, requirePaymentBeforeDownload: true, allowFreePreview: true, hardWatermarkOnPreviews: true }
                      })}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        formData.eventMode === 'pay_per_album'
                          ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${formData.eventMode === 'pay_per_album' ? 'bg-purple-500/20' : 'bg-zinc-800'}`}>
                          <LayoutGrid className={`w-5 h-5 ${formData.eventMode === 'pay_per_album' ? 'text-purple-400' : 'text-zinc-500'}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-white">Pay Per Album</div>
                          <p className="text-xs text-zinc-400 mt-1">Collect all photos, send email to unlock entire album.</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Event Rules & Toggles Card */}
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-zinc-400" />
                    Event Rules
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Fine-tune behavior for this event. Templates can override these settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Lead & Payment */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Lead & Payment
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-300">Lead Capture</span>
                        </div>
                        <Switch
                          checked={formData.rules.leadCaptureEnabled}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            rules: { ...formData.rules, leadCaptureEnabled: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-300">Require Payment</span>
                        </div>
                        <Switch
                          checked={formData.rules.requirePaymentBeforeDownload}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            rules: { ...formData.rules, requirePaymentBeforeDownload: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-300">Allow Free Preview</span>
                        </div>
                        <Switch
                          checked={formData.rules.allowFreePreview}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            rules: { ...formData.rules, allowFreePreview: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-300">QR to Payment</span>
                        </div>
                        <Switch
                          checked={formData.rules.enableQRToPayment}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            rules: { ...formData.rules, enableQRToPayment: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Display & Access */}
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Display & Access
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-300">Feed Enabled</span>
                        </div>
                        <Switch
                          checked={formData.rules.feedEnabled}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            rules: { ...formData.rules, feedEnabled: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <EyeOff className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-300">Staff-only Mode</span>
                        </div>
                        <Switch
                          checked={formData.rules.staffOnlyMode}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            rules: { ...formData.rules, staffOnlyMode: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-300">Hard Watermark</span>
                        </div>
                        <Switch
                          checked={formData.rules.hardWatermarkOnPreviews}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            rules: { ...formData.rules, hardWatermarkOnPreviews: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-300">Timeline Split View</span>
                        </div>
                        <Switch
                          checked={formData.rules.allowTimelineSplitView}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            rules: { ...formData.rules, allowTimelineSplitView: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Features
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <Printer className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-300">Print Station</span>
                        </div>
                        <Switch
                          checked={formData.rules.allowPrintStation}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            rules: { ...formData.rules, allowPrintStation: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <div className="flex items-center gap-2">
                          <BadgeCheck className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm text-zinc-300">Badge Creator</span>
                        </div>
                        <Switch
                          checked={formData.rules.enableBadgeCreator}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            rules: { ...formData.rules, enableBadgeCreator: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Badge Creator Settings - Only show when enabled */}
              {formData.rules.enableBadgeCreator && (
                <Card className="bg-zinc-900/50 border-amber-500/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BadgeCheck className="w-5 h-5 text-amber-400" />
                      Badge Creator Settings
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Configure how badges are generated for this event
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Badge Mode */}
                    <div className="space-y-3">
                      <Label className="text-zinc-300">Badge Mode</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            badgeCreator: { ...formData.badgeCreator, mode: 'simple' }
                          })}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            formData.badgeCreator.mode === 'simple'
                              ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                              : 'border-white/10 bg-black/20 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${formData.badgeCreator.mode === 'simple' ? 'bg-amber-500/20' : 'bg-zinc-800'}`}>
                              <ImageIcon className={`w-5 h-5 ${formData.badgeCreator.mode === 'simple' ? 'text-amber-400' : 'text-zinc-500'}`} />
                            </div>
                            <div>
                              <div className="font-semibold text-white">Simple Mode</div>
                              <p className="text-xs text-zinc-400 mt-1">Original photo + badge overlay + text. Fast, no extra tokens.</p>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (hasFeature(currentUser?.role, 'badgeCreatorAI')) {
                              setFormData({
                                ...formData,
                                badgeCreator: { ...formData.badgeCreator, mode: 'ai' }
                              });
                            }
                          }}
                          disabled={!hasFeature(currentUser?.role, 'badgeCreatorAI')}
                          className={`p-4 rounded-xl border text-left transition-all relative ${
                            formData.badgeCreator.mode === 'ai'
                              ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500'
                              : 'border-white/10 bg-black/20 hover:border-white/20'
                          } ${!hasFeature(currentUser?.role, 'badgeCreatorAI') ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className="absolute -top-2 right-2">
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {hasFeature(currentUser?.role, 'badgeCreatorAI') ? (
                                <>
                                  <Crown className="w-3 h-3 inline mr-1" />
                                  Premium
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3 inline mr-1" />
                                  Masters
                                </>
                              )}
                            </span>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${formData.badgeCreator.mode === 'ai' ? 'bg-purple-500/20' : 'bg-zinc-800'}`}>
                              <Sparkles className={`w-5 h-5 ${formData.badgeCreator.mode === 'ai' ? 'text-purple-400' : 'text-zinc-500'}`} />
                            </div>
                            <div>
                              <div className="font-semibold text-white">AI Mode</div>
                              <p className="text-xs text-zinc-400 mt-1">Transform into character (LEGO, superhero, etc.) then insert in badge. Uses tokens.</p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Badge Layout */}
                    <div className="space-y-3">
                      <Label className="text-zinc-300">Badge Layout</Label>
                      <div className="flex gap-3">
                        {(['portrait', 'landscape', 'square'] as const).map((layout) => (
                          <button
                            key={layout}
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              badgeCreator: { ...formData.badgeCreator, layout }
                            })}
                            className={`flex-1 p-3 rounded-lg border transition-all ${
                              formData.badgeCreator.layout === layout
                                ? 'border-amber-500 bg-amber-500/10'
                                : 'border-white/10 bg-black/20 hover:border-white/20'
                            }`}
                          >
                            <div className={`mx-auto mb-2 border-2 ${
                              formData.badgeCreator.layout === layout ? 'border-amber-400' : 'border-zinc-600'
                            } ${
                              layout === 'portrait' ? 'w-6 h-8' :
                              layout === 'landscape' ? 'w-8 h-6' : 'w-7 h-7'
                            } rounded`} />
                            <span className={`text-xs capitalize ${
                              formData.badgeCreator.layout === layout ? 'text-amber-300' : 'text-zinc-400'
                            }`}>{layout}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Badge Fields */}
                    <div className="space-y-3">
                      <Label className="text-zinc-300">Badge Fields</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                          <span className="text-sm text-zinc-300">Name</span>
                          <Switch
                            checked={formData.badgeCreator.fields.showName}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              badgeCreator: { 
                                ...formData.badgeCreator, 
                                fields: { ...formData.badgeCreator.fields, showName: checked }
                              }
                            })}
                            className="data-[state=checked]:bg-amber-600"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                          <span className="text-sm text-zinc-300">Date</span>
                          <Switch
                            checked={formData.badgeCreator.fields.showDate}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              badgeCreator: { 
                                ...formData.badgeCreator, 
                                fields: { ...formData.badgeCreator.fields, showDate: checked }
                              }
                            })}
                            className="data-[state=checked]:bg-amber-600"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                          <span className="text-sm text-zinc-300">Event</span>
                          <Switch
                            checked={formData.badgeCreator.fields.showEventName}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              badgeCreator: { 
                                ...formData.badgeCreator, 
                                fields: { ...formData.badgeCreator.fields, showEventName: checked }
                              }
                            })}
                            className="data-[state=checked]:bg-amber-600"
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                          <span className="text-sm text-zinc-300">QR Code</span>
                          <Switch
                            checked={formData.badgeCreator.includeQR}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              badgeCreator: { ...formData.badgeCreator, includeQR: checked }
                            })}
                            className="data-[state=checked]:bg-amber-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Custom Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs">Custom Field 1</Label>
                        <Input
                          value={formData.badgeCreator.fields.customField1}
                          onChange={(e) => setFormData({
                            ...formData,
                            badgeCreator: { 
                              ...formData.badgeCreator, 
                              fields: { ...formData.badgeCreator.fields, customField1: e.target.value }
                            }
                          })}
                          placeholder="e.g., Company, Role, VIP..."
                          className="bg-black/40 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs">Custom Field 2</Label>
                        <Input
                          value={formData.badgeCreator.fields.customField2}
                          onChange={(e) => setFormData({
                            ...formData,
                            badgeCreator: { 
                              ...formData.badgeCreator, 
                              fields: { ...formData.badgeCreator.fields, customField2: e.target.value }
                            }
                          })}
                          placeholder="e.g., Booth Number, Access Level..."
                          className="bg-black/40 border-white/10 text-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Album Tracking Section (Event Pro+ only) */}
              {hasFeature(currentUser?.role, 'albumTracking') && (
                <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-cyan-400" />
                          Album Tracking Mode
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Pro
                          </span>
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                          Multi-station album workflow for guided experiences
                        </CardDescription>
                      </div>
                      <Switch
                        checked={formData.albumTracking.enabled}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          albumTracking: { ...formData.albumTracking, enabled: checked }
                        })}
                        className="data-[state=checked]:bg-cyan-600"
                      />
                    </div>
                  </CardHeader>
                  
                  {formData.albumTracking.enabled && (
                    <CardContent className="space-y-6">
                      {/* Album Type */}
                      <div className="space-y-3">
                        <Label className="text-zinc-300">Album Type</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              albumTracking: { ...formData.albumTracking, albumType: 'individual' }
                            })}
                            className={`p-4 rounded-xl border text-left transition-all ${
                              formData.albumTracking.albumType === 'individual'
                                ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500'
                                : 'border-white/10 bg-black/20 hover:border-white/20'
                            }`}
                          >
                            <Users className="w-5 h-5 text-cyan-400 mb-2" />
                            <div className="font-medium text-white">Individual</div>
                            <p className="text-xs text-zinc-400 mt-1">One badge per person, personal album</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              albumTracking: { ...formData.albumTracking, albumType: 'group' }
                            })}
                            className={`p-4 rounded-xl border text-left transition-all ${
                              formData.albumTracking.albumType === 'group'
                                ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500'
                                : 'border-white/10 bg-black/20 hover:border-white/20'
                            }`}
                          >
                            <Users className="w-5 h-5 text-purple-400 mb-2" />
                            <div className="font-medium text-white">Group</div>
                            <p className="text-xs text-zinc-400 mt-1">One badge for group, shared album</p>
                          </button>
                        </div>
                      </div>

                      {/* Stations Setup */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-zinc-300">Event Stations</Label>
                            <p className="text-xs text-zinc-500 mt-1">
                              Define the stations visitors will pass through. Each station scans the visitor's badge QR.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newStation: AlbumStation = {
                                id: crypto.randomUUID(),
                                name: `Station ${formData.albumTracking.stations.length + 1}`,
                                description: '',
                                type: formData.albumTracking.stations.length === 0 ? 'registration' : 'booth',
                                order: formData.albumTracking.stations.length,
                              };
                              setFormData({
                                ...formData,
                                albumTracking: {
                                  ...formData.albumTracking,
                                  stations: [...formData.albumTracking.stations, newStation]
                                }
                              });
                            }}
                            className="border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Station
                          </Button>
                        </div>
                        
                        {formData.albumTracking.stations.length === 0 ? (
                          <div className="text-center py-8 text-zinc-500 border-2 border-dashed border-white/10 rounded-xl">
                            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>No stations configured. Add your first station to start.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {formData.albumTracking.stations.map((station, index) => (
                              <div 
                                key={station.id}
                                className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3"
                              >
                                <div className="flex items-center gap-3">
                                  <GripVertical className="w-4 h-4 text-zinc-500 cursor-grab" />
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Input
                                      value={station.name}
                                      onChange={(e) => {
                                        const updated = [...formData.albumTracking.stations];
                                        updated[index] = { ...station, name: e.target.value };
                                        setFormData({
                                          ...formData,
                                          albumTracking: { ...formData.albumTracking, stations: updated }
                                        });
                                      }}
                                      placeholder="Station name"
                                      className="bg-black/40 border-white/10 text-white"
                                    />
                                    <select
                                      value={station.type}
                                      onChange={(e) => {
                                        const updated = [...formData.albumTracking.stations];
                                        updated[index] = { ...station, type: e.target.value as AlbumStation['type'] };
                                        setFormData({
                                          ...formData,
                                          albumTracking: { ...formData.albumTracking, stations: updated }
                                        });
                                      }}
                                      className="h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
                                    >
                                      <option value="registration">📝 Registration</option>
                                      <option value="booth">📷 Photo Booth</option>
                                      <option value="playground">🎮 Playground</option>
                                      <option value="viewer">🖥️ Album Viewer</option>
                                    </select>
                                    <Input
                                      value={station.description}
                                      onChange={(e) => {
                                        const updated = [...formData.albumTracking.stations];
                                        updated[index] = { ...station, description: e.target.value };
                                        setFormData({
                                          ...formData,
                                          albumTracking: { ...formData.albumTracking, stations: updated }
                                        });
                                      }}
                                      placeholder="Description (optional)"
                                      className="bg-black/40 border-white/10 text-white"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      const updated = formData.albumTracking.stations.filter((_, i) => i !== index);
                                      setFormData({
                                        ...formData,
                                        albumTracking: { ...formData.albumTracking, stations: updated }
                                      });
                                    }}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Album Rules */}
                      <div className="space-y-3">
                        <Label className="text-zinc-300">Album Rules</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs">Max Photos per Album</Label>
                            <Input
                              type="number"
                              min={1}
                              max={50}
                              value={formData.albumTracking.rules.maxPhotosPerAlbum}
                              onChange={(e) => setFormData({
                                ...formData,
                                albumTracking: {
                                  ...formData.albumTracking,
                                  rules: { ...formData.albumTracking.rules, maxPhotosPerAlbum: parseInt(e.target.value) || 5 }
                                }
                              })}
                              className="bg-black/40 border-white/10 text-white"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                              <span className="text-xs text-zinc-300">Re-entry</span>
                              <Switch
                                checked={formData.albumTracking.rules.allowReEntry}
                                onCheckedChange={(checked) => setFormData({
                                  ...formData,
                                  albumTracking: {
                                    ...formData.albumTracking,
                                    rules: { ...formData.albumTracking.rules, allowReEntry: checked }
                                  }
                                })}
                                className="data-[state=checked]:bg-cyan-600"
                              />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                              <span className="text-xs text-zinc-300">Staff Approval</span>
                              <Switch
                                checked={formData.albumTracking.rules.requireStaffApproval}
                                onCheckedChange={(checked) => setFormData({
                                  ...formData,
                                  albumTracking: {
                                    ...formData.albumTracking,
                                    rules: { ...formData.albumTracking.rules, requireStaffApproval: checked }
                                  }
                                })}
                                className="data-[state=checked]:bg-cyan-600"
                              />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                              <span className="text-xs text-zinc-300">Print Ready</span>
                              <Switch
                                checked={formData.albumTracking.rules.printReady}
                                onCheckedChange={(checked) => setFormData({
                                  ...formData,
                                  albumTracking: {
                                    ...formData.albumTracking,
                                    rules: { ...formData.albumTracking.rules, printReady: checked }
                                  }
                                })}
                                className="data-[state=checked]:bg-cyan-600"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Badge Integration */}
                      <div className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BadgeCheck className="w-4 h-4 text-amber-400" />
                            <Label className="text-zinc-300">Auto-Generate Badge on Registration</Label>
                          </div>
                          <Switch
                            checked={formData.albumTracking.badgeIntegration.autoGenerateBadge}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              albumTracking: {
                                ...formData.albumTracking,
                                badgeIntegration: { ...formData.albumTracking.badgeIntegration, autoGenerateBadge: checked }
                              }
                            })}
                            className="data-[state=checked]:bg-amber-600"
                          />
                        </div>
                        
                        {formData.albumTracking.badgeIntegration.autoGenerateBadge && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            <div className="space-y-2">
                              <Label className="text-zinc-400 text-xs">Layout</Label>
                              <select
                                value={formData.albumTracking.badgeIntegration.badgeLayout}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  albumTracking: {
                                    ...formData.albumTracking,
                                    badgeIntegration: { 
                                      ...formData.albumTracking.badgeIntegration, 
                                      badgeLayout: e.target.value as 'portrait' | 'landscape' | 'square' 
                                    }
                                  }
                                })}
                                className="w-full h-9 px-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
                              >
                                <option value="portrait">Portrait</option>
                                <option value="landscape">Landscape</option>
                                <option value="square">Square</option>
                              </select>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                              <span className="text-xs text-zinc-300">QR Code</span>
                              <Switch
                                checked={formData.albumTracking.badgeIntegration.includeQR}
                                onCheckedChange={(checked) => setFormData({
                                  ...formData,
                                  albumTracking: {
                                    ...formData.albumTracking,
                                    badgeIntegration: { ...formData.albumTracking.badgeIntegration, includeQR: checked }
                                  }
                                })}
                                className="data-[state=checked]:bg-amber-600"
                              />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                              <span className="text-xs text-zinc-300">Name</span>
                              <Switch
                                checked={formData.albumTracking.badgeIntegration.includeName}
                                onCheckedChange={(checked) => setFormData({
                                  ...formData,
                                  albumTracking: {
                                    ...formData.albumTracking,
                                    badgeIntegration: { ...formData.albumTracking.badgeIntegration, includeName: checked }
                                  }
                                })}
                                className="data-[state=checked]:bg-amber-600"
                              />
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                              <span className="text-xs text-zinc-300">Date/Time</span>
                              <Switch
                                checked={formData.albumTracking.badgeIntegration.includeDateTime}
                                onCheckedChange={(checked) => setFormData({
                                  ...formData,
                                  albumTracking: {
                                    ...formData.albumTracking,
                                    badgeIntegration: { ...formData.albumTracking.badgeIntegration, includeDateTime: checked }
                                  }
                                })}
                                className="data-[state=checked]:bg-amber-600"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-6 mt-6">
              {/* Theme Presets Card */}
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Palette className="w-5 h-5 text-purple-400" />
                    Booth Theme
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Choose a preset theme or customize your own look
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme Presets Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Classic Dark */}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        theme: { 
                          ...formData.theme, 
                          preset: 'classic_dark', 
                          mode: 'dark',
                          primaryColor: '#6366F1',
                          secondaryColor: '#F59E0B',
                          accentColor: '#10B981'
                        }
                      })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formData.theme.preset === 'classic_dark'
                          ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 mb-2 flex items-center justify-center">
                        <Moon className="w-5 h-5 text-indigo-400" />
                      </div>
                      <span className="text-xs font-medium text-white">Classic Dark</span>
                    </button>

                    {/* Clean Light */}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        theme: { 
                          ...formData.theme, 
                          preset: 'clean_light', 
                          mode: 'light',
                          primaryColor: '#3B82F6',
                          secondaryColor: '#8B5CF6',
                          accentColor: '#10B981'
                        }
                      })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formData.theme.preset === 'clean_light'
                          ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-white to-gray-100 border border-gray-200 mb-2 flex items-center justify-center">
                        <Sun className="w-5 h-5 text-yellow-500" />
                      </div>
                      <span className="text-xs font-medium text-white">Clean Light</span>
                    </button>

                    {/* Neon Party */}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        theme: { 
                          ...formData.theme, 
                          preset: 'neon_party', 
                          mode: 'dark',
                          primaryColor: '#EC4899',
                          secondaryColor: '#06B6D4',
                          accentColor: '#FBBF24'
                        }
                      })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formData.theme.preset === 'neon_party'
                          ? 'border-pink-500 bg-pink-500/10 ring-1 ring-pink-500'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-purple-900 via-pink-900 to-cyan-900 border border-pink-500/50 mb-2 flex items-center justify-center">
                        <PartyPopper className="w-5 h-5 text-pink-400" />
                      </div>
                      <span className="text-xs font-medium text-white">Neon Party</span>
                    </button>

                    {/* Corporate */}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        theme: { 
                          ...formData.theme, 
                          preset: 'corporate', 
                          mode: 'light',
                          primaryColor: '#1E40AF',
                          secondaryColor: '#64748B',
                          accentColor: '#059669'
                        }
                      })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formData.theme.preset === 'corporate'
                          ? 'border-blue-700 bg-blue-700/10 ring-1 ring-blue-700'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-slate-100 to-blue-50 border border-blue-200 mb-2 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-700" />
                      </div>
                      <span className="text-xs font-medium text-white">Corporate</span>
                    </button>

                    {/* Kids / Fun */}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        theme: { 
                          ...formData.theme, 
                          preset: 'kids_fun', 
                          mode: 'light',
                          primaryColor: '#F97316',
                          secondaryColor: '#A855F7',
                          accentColor: '#22C55E'
                        }
                      })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formData.theme.preset === 'kids_fun'
                          ? 'border-orange-500 bg-orange-500/10 ring-1 ring-orange-500'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-yellow-200 via-pink-200 to-cyan-200 border border-orange-300 mb-2 flex items-center justify-center">
                        <Baby className="w-5 h-5 text-orange-500" />
                      </div>
                      <span className="text-xs font-medium text-white">Kids / Fun</span>
                    </button>

                    {/* Holiday */}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        theme: { 
                          ...formData.theme, 
                          preset: 'holiday', 
                          mode: 'dark',
                          primaryColor: '#DC2626',
                          secondaryColor: '#16A34A',
                          accentColor: '#FBBF24'
                        }
                      })}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        formData.theme.preset === 'holiday'
                          ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="w-full aspect-video rounded-lg bg-gradient-to-br from-red-900 via-green-900 to-red-900 border border-red-500/50 mb-2 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-red-400" />
                      </div>
                      <span className="text-xs font-medium text-white">Holiday</span>
                    </button>
                  </div>

                  {/* Custom Theme Section */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-white">Custom Colors</h4>
                        <p className="text-xs text-zinc-500">Fine-tune your theme colors</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          theme: { ...formData.theme, preset: 'custom' }
                        })}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                          formData.theme.preset === 'custom'
                            ? 'bg-white text-black'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                      >
                        {formData.theme.preset === 'custom' ? 'Custom Active' : 'Enable Custom'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs">Primary Color</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={formData.theme.primaryColor}
                            onChange={(e) => setFormData({
                              ...formData,
                              theme: { ...formData.theme, primaryColor: e.target.value, preset: 'custom' }
                            })}
                            className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                          />
                          <Input
                            value={formData.theme.primaryColor}
                            onChange={(e) => setFormData({
                              ...formData,
                              theme: { ...formData.theme, primaryColor: e.target.value, preset: 'custom' }
                            })}
                            className="bg-black/40 border-white/10 text-white font-mono text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs">Secondary Color</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={formData.theme.secondaryColor}
                            onChange={(e) => setFormData({
                              ...formData,
                              theme: { ...formData.theme, secondaryColor: e.target.value, preset: 'custom' }
                            })}
                            className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                          />
                          <Input
                            value={formData.theme.secondaryColor}
                            onChange={(e) => setFormData({
                              ...formData,
                              theme: { ...formData.theme, secondaryColor: e.target.value, preset: 'custom' }
                            })}
                            className="bg-black/40 border-white/10 text-white font-mono text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs">Accent Color</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={formData.theme.accentColor}
                            onChange={(e) => setFormData({
                              ...formData,
                              theme: { ...formData.theme, accentColor: e.target.value, preset: 'custom' }
                            })}
                            className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent"
                          />
                          <Input
                            value={formData.theme.accentColor}
                            onChange={(e) => setFormData({
                              ...formData,
                              theme: { ...formData.theme, accentColor: e.target.value, preset: 'custom' }
                            })}
                            className="bg-black/40 border-white/10 text-white font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Theme Preview */}
                  <div className="pt-4 border-t border-white/10">
                    <Label className="text-zinc-400 text-xs mb-3 block">Preview</Label>
                    <div 
                      className={`p-4 rounded-xl border ${
                        formData.theme.mode === 'dark' 
                          ? 'bg-zinc-900 border-zinc-700' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-8 h-8 rounded-lg"
                          style={{ backgroundColor: formData.theme.primaryColor }}
                        />
                        <div>
                          <div className={`text-sm font-semibold ${formData.theme.mode === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {formData.title || 'Event Title'}
                          </div>
                          <div className={`text-xs ${formData.theme.mode === 'dark' ? 'text-zinc-400' : 'text-gray-500'}`}>
                            {formData.theme.tagline}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                          style={{ backgroundColor: formData.theme.primaryColor }}
                        >
                          Primary Button
                        </button>
                        <button 
                          type="button"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ 
                            backgroundColor: `${formData.theme.secondaryColor}20`,
                            color: formData.theme.secondaryColor,
                            border: `1px solid ${formData.theme.secondaryColor}40`
                          }}
                        >
                          Secondary
                        </button>
                        <span 
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{ 
                            backgroundColor: `${formData.theme.accentColor}20`,
                            color: formData.theme.accentColor
                          }}
                        >
                          Accent Badge
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Branding & Logos Card */}
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-blue-400" />
                    Branding & Logos
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    Upload logos and configure branding elements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Tagline Text (Optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.branding.taglineText}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            branding: { ...formData.branding, taglineText: e.target.value },
                          })
                        }
                        placeholder="Leave empty for no tagline"
                        className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                      />
                      {formData.branding.taglineText && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              branding: { ...formData.branding, taglineText: "" },
                            });
                            toast.success("Tagline removed");
                          }}
                          className="shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Logo Image URL (Optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.branding.logoPath}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              branding: { ...formData.branding, logoPath: e.target.value },
                            })
                          }
                          placeholder="https://... or leave empty"
                          className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                try {
                                  setIsUploading(true);
                                  const url = await uploadTemplateImage(file);
                                  setFormData({
                                    ...formData,
                                    branding: { ...formData.branding, logoPath: url },
                                  });
                                  toast.success("Logo uploaded successfully");
                                } catch (error: any) {
                                  toast.error(error.message || "Failed to upload logo");
                                } finally {
                                  setIsUploading(false);
                                }
                              }
                            };
                            input.click();
                          }}
                          disabled={isUploading}
                          className="shrink-0 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                        {formData.branding.logoPath && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                branding: { ...formData.branding, logoPath: "" },
                              });
                              toast.success("Logo removed");
                            }}
                            className="shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {formData.branding.logoPath && (
                        <div className="relative mt-2 p-2 rounded-lg bg-black/40 border border-white/5">
                          <img
                            src={formData.branding.logoPath}
                            alt="Logo preview"
                            className="w-full h-20 object-contain"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-zinc-300">Footer Image URL (Optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.branding.footerPath}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              branding: { ...formData.branding, footerPath: e.target.value },
                            })
                          }
                          placeholder="https://... or leave empty"
                          className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                try {
                                  setIsUploading(true);
                                  const url = await uploadTemplateImage(file);
                                  setFormData({
                                    ...formData,
                                    branding: { ...formData.branding, footerPath: url },
                                  });
                                  toast.success("Footer uploaded successfully");
                                } catch (error: any) {
                                  toast.error(error.message || "Failed to upload footer");
                                } finally {
                                  setIsUploading(false);
                                }
                              }
                            };
                            input.click();
                          }}
                          disabled={isUploading}
                          className="shrink-0 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                        {formData.branding.footerPath && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                branding: { ...formData.branding, footerPath: "" },
                              });
                              toast.success("Footer removed");
                            }}
                            className="shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {formData.branding.footerPath && (
                        <div className="relative mt-2 p-2 rounded-lg bg-black/40 border border-white/5">
                          <img
                            src={formData.branding.footerPath}
                            alt="Footer preview"
                            className="w-full h-20 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300">Header Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.branding.headerBackgroundColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            branding: { ...formData.branding, headerBackgroundColor: e.target.value },
                          })
                        }
                        className="w-20 h-10 p-1 bg-black/40 border-white/10"
                      />
                      <Input
                        value={formData.branding.headerBackgroundColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            branding: { ...formData.branding, headerBackgroundColor: e.target.value },
                          })
                        }
                        placeholder="#FFFFFF"
                        className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Logo Display Toggles */}
                  <div className="border-t border-white/10 pt-6 space-y-4">
                    <div>
                      <Label className="text-base font-semibold text-white">Logo Display Options</Label>
                      <p className="text-xs text-zinc-400">Control where your logo appears</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <span className="text-sm text-zinc-300">Show Logo in Booth</span>
                        <Switch
                          checked={formData.branding.showLogoInBooth}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            branding: { ...formData.branding, showLogoInBooth: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <span className="text-sm text-zinc-300">Show Logo in Feed</span>
                        <Switch
                          checked={formData.branding.showLogoInFeed}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            branding: { ...formData.branding, showLogoInFeed: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <span className="text-sm text-zinc-300">Show Sponsor Strip</span>
                        <Switch
                          checked={formData.branding.showSponsorStrip}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            branding: { ...formData.branding, showSponsorStrip: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                        <span className="text-sm text-zinc-300">Include Logo on Prints</span>
                        <Switch
                          checked={formData.branding.includeLogoOnPrints}
                          onCheckedChange={(checked) => setFormData({
                            ...formData,
                            branding: { ...formData.branding, includeLogoOnPrints: checked }
                          })}
                          className="data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Watermark Section */}
                  <div className="border-t border-white/10 pt-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-semibold text-white">Watermark (Optional)</Label>
                        <p className="text-xs text-zinc-400">Add a watermark overlay to your photos</p>
                      </div>
                      <Switch
                        checked={formData.branding.watermark?.enabled || false}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            branding: {
                              ...formData.branding,
                              watermark: {
                                enabled: checked,
                                type: formData.branding.watermark?.type || "image",
                                imageUrl: formData.branding.watermark?.imageUrl || "",
                                text: formData.branding.watermark?.text || "",
                                position: formData.branding.watermark?.position || "bottom-right",
                                size: formData.branding.watermark?.size || 15,
                                opacity: formData.branding.watermark?.opacity || 0.7,
                              },
                            },
                          })
                        }
                        className="data-[state=checked]:bg-indigo-600"
                      />
                    </div>

                    {formData.branding.watermark?.enabled && (() => {
                      const watermark = formData.branding.watermark || {
                        enabled: false,
                        type: "image" as const,
                        imageUrl: "",
                        text: "",
                        position: "bottom-right" as const,
                        size: 15,
                        opacity: 0.7,
                      };

                      return (
                        <div className="space-y-6 pl-4 border-l-2 border-indigo-500/30">
                          <div className="space-y-2">
                            <Label className="text-zinc-300">Watermark Type</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={watermark.type === "image" ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    branding: {
                                      ...formData.branding,
                                      watermark: { ...watermark, type: "image" },
                                    },
                                  })
                                }
                                className={watermark.type === "image"
                                  ? "bg-indigo-600 text-white hover:bg-indigo-500"
                                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                                }
                              >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Image
                              </Button>
                              <Button
                                type="button"
                                variant={watermark.type === "text" ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    branding: {
                                      ...formData.branding,
                                      watermark: { ...watermark, type: "text" },
                                    },
                                  })
                                }
                                className={watermark.type === "text"
                                  ? "bg-indigo-600 text-white hover:bg-indigo-500"
                                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                                }
                              >
                                Text
                              </Button>
                            </div>
                          </div>

                          {watermark.type === "image" ? (
                            <div className="space-y-2">
                              <Label className="text-zinc-300">Watermark Image URL</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={watermark.imageUrl || ""}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      branding: {
                                        ...formData.branding,
                                        watermark: { ...watermark, imageUrl: e.target.value },
                                      },
                                    })
                                  }
                                  placeholder="https://..."
                                  className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = async (e) => {
                                      const file = (e.target as HTMLInputElement).files?.[0];
                                      if (file) {
                                        try {
                                          setIsUploading(true);
                                          const url = await uploadTemplateImage(file);
                                          setFormData({
                                            ...formData,
                                            branding: {
                                              ...formData.branding,
                                              watermark: { ...watermark, imageUrl: url },
                                            },
                                          });
                                          toast.success("Watermark uploaded successfully");
                                        } catch (error: any) {
                                          toast.error(error.message || "Failed to upload watermark");
                                        } finally {
                                          setIsUploading(false);
                                        }
                                      }
                                    };
                                    input.click();
                                  }}
                                  disabled={isUploading}
                                  className="shrink-0 border-white/10 bg-white/5 hover:bg-white/10 text-white"
                                >
                                  <Upload className="w-4 h-4" />
                                </Button>
                              </div>
                              {watermark.imageUrl && (
                                <div className="mt-2 p-2 rounded-lg bg-black/40 border border-white/5 inline-block">
                                  <img
                                    src={watermark.imageUrl}
                                    alt="Watermark preview"
                                    className="w-32 h-32 object-contain"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Label className="text-zinc-300">Watermark Text</Label>
                              <Input
                                value={watermark.text || ""}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    branding: {
                                      ...formData.branding,
                                      watermark: { ...watermark, text: e.target.value },
                                    },
                                  })
                                }
                                placeholder="© 2025 Your Company"
                                className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-zinc-300">Position</Label>
                              <select
                                className="flex h-10 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={watermark.position}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    branding: {
                                      ...formData.branding,
                                      watermark: {
                                        ...watermark,
                                        position: e.target.value as any,
                                      },
                                    },
                                  })
                                }
                              >
                                <option value="top-left">Top Left</option>
                                <option value="top-right">Top Right</option>
                                <option value="bottom-left">Bottom Left</option>
                                <option value="bottom-right">Bottom Right</option>
                                <option value="center">Center</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-zinc-300">Size (% of width): {watermark.size}%</Label>
                              <input
                                type="range"
                                min="5"
                                max="50"
                                value={watermark.size}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    branding: {
                                      ...formData.branding,
                                      watermark: { ...watermark, size: parseInt(e.target.value) },
                                    },
                                  })
                                }
                                className="w-full accent-indigo-500"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-zinc-300">Opacity: {Math.round(watermark.opacity * 100)}%</Label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={watermark.opacity}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  branding: {
                                    ...formData.branding,
                                    watermark: { ...watermark, opacity: parseFloat(e.target.value) },
                                  },
                                })
                              }
                              className="w-full accent-indigo-500"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-6 mt-6">
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-white">Templates & Prompts</CardTitle>
                      <CardDescription className="text-zinc-400">
                        Configure AI backgrounds and prompts for your event
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={loadDefaultTemplates}
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                      >
                        Load Defaults
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => jsonImportRef.current?.click()}
                        disabled={isUploading}
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                      >
                        <FileJson className="w-4 h-4 mr-1" />
                        Import JSON
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportTemplates}
                        disabled={formData.templates.length === 0}
                        className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export JSON
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowLibraryModal(true)}
                        className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
                      >
                        <Library className="w-4 h-4 mr-1" />
                        From Library
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addTemplate}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Template
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {formData.templates.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-white/10 rounded-xl">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No templates yet. Add one to get started or import from your library.</p>
                    </div>
                  ) : (
                    <Accordion type="single" collapsible className="space-y-4">
                      {formData.templates.map((template, index) => (
                        <AccordionItem
                          key={template.id}
                          value={template.id}
                          className="border border-white/10 rounded-xl bg-black/20 overflow-hidden"
                        >
                          <AccordionTrigger className="px-4 py-3 hover:bg-white/5 hover:no-underline">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-white">{template.name}</span>
                              {!template.active && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">Inactive</span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4 pt-2 border-t border-white/5">
                            <div className="space-y-6 pt-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label className="text-zinc-300">Template Name</Label>
                                  <Input
                                    value={template.name}
                                    onChange={(e) =>
                                      updateTemplate(index, { name: e.target.value })
                                    }
                                    placeholder="Ocean Depths"
                                    className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-zinc-300">Description</Label>
                                  <Input
                                    value={template.description}
                                    onChange={(e) =>
                                      updateTemplate(index, {
                                        description: e.target.value,
                                      })
                                    }
                                    placeholder="Underwater exploration"
                                    className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-zinc-300">
                                  AI Prompt <span className="text-red-400">*</span>
                                </Label>
                                <Textarea
                                  value={template.prompt}
                                  onChange={(e) =>
                                    updateTemplate(index, { prompt: e.target.value })
                                  }
                                  placeholder="Create a professional scene by compositing these images..."
                                  rows={6}
                                  className="font-mono text-sm bg-black/40 border-white/10 text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500"
                                />
                                <p className="text-xs text-zinc-500">
                                  💡 Use compositing language: "Create a scene by compositing these images...", "Preserve the person from first image...", "Add elements from second image..."
                                </p>
                                <div className="mt-3">
                                  <PromptHelper
                                    onSelectPrompt={(prompt) => {
                                      updateTemplate(index, { prompt });
                                    }}
                                    currentPrompt={template.prompt}
                                    section="template"
                                    placeholder="Describe what you want to create or ask AI to improve your prompt..."
                                  />
                                </div>
                              </div>

                              <div className="space-y-3 p-4 rounded-lg bg-black/20 border border-white/5">
                                <div className="flex items-center justify-between">
                                  <Label className="text-zinc-300 font-medium">Background Images</Label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'image/*';
                                      input.multiple = true;
                                      input.onchange = (e) => handleImageUpload(e as any, index);
                                      input.click();
                                    }}
                                    disabled={isUploading}
                                    className="border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200"
                                  >
                                    <Upload className="w-4 h-4 mr-1" />
                                    {isUploading ? "Uploading..." : "Upload"}
                                  </Button>
                                </div>
                                
                                {/* Show selected images grid */}
                                {template.images.length > 0 && (
                                  <div className="grid grid-cols-4 gap-2">
                                    {template.images.map((url, imgIdx) => (
                                      <div key={imgIdx} className="relative group">
                                        <img
                                          src={url}
                                          alt={`Background ${imgIdx + 1}`}
                                          className="w-full h-16 object-cover rounded-lg border border-white/10"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = template.images.filter((_, i) => i !== imgIdx);
                                            updateTemplate(index, { images: updated });
                                          }}
                                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <Textarea
                                  value={template.images.join("\n")}
                                  onChange={(e) =>
                                    updateTemplate(index, {
                                      images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                                    })
                                  }
                                  placeholder="Or paste image URLs here (one per line)"
                                  rows={2}
                                  className="font-mono text-xs bg-black/40 border-white/10 text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500"
                                />
                              </div>

                              {/* Element Images for mixing (Seedream, Imagen) */}
                              <div className="space-y-3 p-4 rounded-lg bg-black/20 border border-white/5">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Label className="text-zinc-300 font-medium">Element Images</Label>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                      Props/objects to mix. Works with Seedream & Nano Banana.
                                    </p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'image/*';
                                      input.multiple = true;
                                      input.onchange = async (e) => {
                                        const files = (e.target as HTMLInputElement).files;
                                        if (!files) return;
                                        try {
                                          setIsUploading(true);
                                          const urls: string[] = [];
                                          for (const file of Array.from(files)) {
                                            const url = await uploadTemplateImage(file);
                                            urls.push(url);
                                          }
                                          const currentElements = template.elementImages || [];
                                          updateTemplate(index, {
                                            elementImages: [...currentElements, ...urls],
                                          });
                                          toast.success(`${urls.length} element image(s) uploaded`);
                                        } catch (error: any) {
                                          toast.error(error.message || "Failed to upload element images");
                                        } finally {
                                          setIsUploading(false);
                                        }
                                      };
                                      input.click();
                                    }}
                                    disabled={isUploading}
                                    className="border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200"
                                  >
                                    <Upload className="w-4 h-4 mr-1" />
                                    Upload
                                  </Button>
                                </div>
                                {(template.elementImages?.length || 0) > 0 && (
                                  <div className="grid grid-cols-4 gap-2">
                                    {template.elementImages?.map((url, imgIdx) => (
                                      <div key={imgIdx} className="relative group">
                                        <img
                                          src={url}
                                          alt={`Element ${imgIdx + 1}`}
                                          className="w-full h-16 object-cover rounded-lg border border-white/10"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = template.elementImages?.filter((_, i) => i !== imgIdx);
                                            updateTemplate(index, { elementImages: updated });
                                          }}
                                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <Textarea
                                  value={(template.elementImages || []).join("\n")}
                                  onChange={(e) =>
                                    updateTemplate(index, {
                                      elementImages: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                                    })
                                  }
                                  placeholder="Or paste element image URLs here (one per line)"
                                  rows={2}
                                  className="font-mono text-xs bg-black/40 border-white/10 text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-zinc-300">Campaign Text (overlay on image)</Label>
                                <Input
                                  value={template.campaignText || ""}
                                  onChange={(e) =>
                                    updateTemplate(index, {
                                      campaignText: e.target.value,
                                    })
                                  }
                                  placeholder="Need extra hands?"
                                  className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                                />
                              </div>

                              {/* Template Toggles */}
                              <div className="border-t border-white/10 pt-4 space-y-4">
                                <Label className="text-sm font-semibold text-white">Template Settings</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                    <Label className="text-sm text-zinc-300">Active</Label>
                                    <Switch
                                      checked={template.active}
                                      onCheckedChange={(checked) =>
                                        updateTemplate(index, { active: checked })
                                      }
                                      className="data-[state=checked]:bg-indigo-600"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                    <Label className="text-sm text-zinc-300">🎨 Custom Prompt</Label>
                                    <Switch
                                      checked={template.isCustomPrompt || false}
                                      onCheckedChange={(checked) =>
                                        updateTemplate(index, { isCustomPrompt: checked })
                                      }
                                      className="data-[state=checked]:bg-indigo-600"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                    <Label className="text-sm text-zinc-300">Include All Overlays</Label>
                                    <Switch
                                      checked={template.includeBranding ?? true}
                                      onCheckedChange={(checked) =>
                                        updateTemplate(index, { includeBranding: checked })
                                      }
                                      className="data-[state=checked]:bg-indigo-600"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                    <Label className="text-sm text-zinc-300">Include Header Logo</Label>
                                    <Switch
                                      checked={template.includeHeader || false}
                                      onCheckedChange={(checked) =>
                                        updateTemplate(index, { includeHeader: checked })
                                      }
                                      className="data-[state=checked]:bg-indigo-600"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                    <Label className="text-sm text-zinc-300">Include Tagline</Label>
                                    <Switch
                                      checked={template.includeTagline ?? true}
                                      onCheckedChange={(checked) =>
                                        updateTemplate(index, { includeTagline: checked })
                                      }
                                      className="data-[state=checked]:bg-indigo-600"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                    <Label className="text-sm text-zinc-300">Include Watermark</Label>
                                    <Switch
                                      checked={template.includeWatermark ?? true}
                                      onCheckedChange={(checked) =>
                                        updateTemplate(index, { includeWatermark: checked })
                                      }
                                      className="data-[state=checked]:bg-indigo-600"
                                    />
                                  </div>
                                </div>
                                {template.isCustomPrompt && (
                                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-md">
                                    <p className="text-xs text-indigo-300">
                                      ✨ <strong>Custom Prompt Template:</strong> Users can write their own AI prompts and select any background from the event's media library.
                                    </p>
                                  </div>
                                )}
                                <p className="text-xs text-zinc-500">
                                  💡 Toggle "Include All Overlays" to disable all branding for this template. Individual toggles control specific elements.
                                </p>
                              </div>

                              {/* Generation Pipeline */}
                              <div className="border-t border-white/10 pt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Label className="text-sm font-semibold text-white flex items-center gap-2">
                                      <Sparkles className="w-4 h-4 text-purple-400" />
                                      Generation Pipeline
                                    </Label>
                                    <p className="text-xs text-zinc-500">Configure AI models for this template</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {/* Base Image Model */}
                                  <div className="space-y-2">
                                    <Label className="text-zinc-400 text-xs">Base Image Model</Label>
                                    <select
                                      value={template.pipelineConfig?.imageModel || 'seedream-t2i'}
                                      onChange={(e) => updateTemplate(index, {
                                        pipelineConfig: {
                                          ...template.pipelineConfig,
                                          imageModel: e.target.value
                                        }
                                      })}
                                      className="w-full h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
                                    >
                                      <option value="seedream-t2i">Seedream v4 — 1 token (Fast, mixing)</option>
                                      <option value="nano-banana">Nano Banana / Imagen 3 — 1 token</option>
                                      <option value="nano-banana-pro">Nano Banana Pro — 4 tokens (High quality)</option>
                                      <option value="flux-realism">Flux Realism — 2 tokens</option>
                                    </select>
                                  </div>

                                  {/* Aspect Ratio */}
                                  <div className="space-y-2">
                                    <Label className="text-zinc-400 text-xs flex items-center gap-1">
                                      <Ratio className="w-3 h-3" />
                                      Aspect Ratio
                                    </Label>
                                    <select
                                      value={template.aspectRatio || 'auto'}
                                      onChange={(e) => updateTemplate(index, {
                                        aspectRatio: e.target.value as AspectRatio
                                      })}
                                      className="w-full h-10 px-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
                                    >
                                      <option value="auto">Auto (Model Default)</option>
                                      <option value="1:1">1:1 — Square</option>
                                      <option value="4:5">4:5 — Portrait (Instagram)</option>
                                      <option value="3:2">3:2 — Classic Photo</option>
                                      <option value="16:9">16:9 — Landscape (Video)</option>
                                      <option value="9:16">9:16 — Stories/Reels</option>
                                    </select>
                                  </div>

                                  {/* Faceswap */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1">
                                        <Label className="text-zinc-400 text-xs">Faceswap</Label>
                                        <FeatureLockBadge feature="faceswap" userRole={currentUser?.role} />
                                      </div>
                                      <Switch
                                        checked={template.pipelineConfig?.faceswapEnabled || false}
                                        onCheckedChange={(checked) => updateTemplate(index, {
                                          pipelineConfig: {
                                            ...template.pipelineConfig,
                                            faceswapEnabled: checked
                                          }
                                        })}
                                        disabled={!hasFeature(currentUser?.role, 'faceswap')}
                                        className="data-[state=checked]:bg-purple-600"
                                      />
                                    </div>
                                    {template.pipelineConfig?.faceswapEnabled && hasFeature(currentUser?.role, 'faceswap') && (
                                      <select
                                        value={template.pipelineConfig?.faceswapModel || 'default'}
                                        onChange={(e) => updateTemplate(index, {
                                          pipelineConfig: {
                                            ...template.pipelineConfig,
                                            faceswapModel: e.target.value
                                          }
                                        })}
                                        className="w-full h-9 px-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
                                      >
                                        <option value="default">Default Faceswap</option>
                                        <option value="high-quality">High Quality</option>
                                      </select>
                                    )}
                                  </div>
                                </div>

                                {/* Video Generation */}
                                <FeatureGate feature="videoGeneration" userRole={currentUser?.role}>
                                  <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Video className="w-4 h-4 text-cyan-400" />
                                        <Label className="text-sm text-zinc-300">Generate Video from Image</Label>
                                        <FeatureLockBadge feature="videoGeneration" userRole={currentUser?.role} />
                                      </div>
                                      <Switch
                                        checked={template.pipelineConfig?.videoEnabled || false}
                                        onCheckedChange={(checked) => updateTemplate(index, {
                                          pipelineConfig: {
                                            ...template.pipelineConfig,
                                            videoEnabled: checked
                                          }
                                        })}
                                        disabled={!hasFeature(currentUser?.role, 'videoGeneration')}
                                        className="data-[state=checked]:bg-cyan-600"
                                      />
                                    </div>
                                    {template.pipelineConfig?.videoEnabled && (
                                      <select
                                        value={template.pipelineConfig?.videoModel || 'wan-v2'}
                                        onChange={(e) => updateTemplate(index, {
                                          pipelineConfig: {
                                            ...template.pipelineConfig,
                                            videoModel: e.target.value
                                          }
                                        })}
                                        className="w-full h-9 px-3 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
                                      >
                                        <option value="wan-v2">Wan v2.2 — 150 tokens (5s video)</option>
                                        <option value="kling-pro">Kling Pro — 200 tokens (5s video)</option>
                                        <option value="veo-3.1">Veo 3.1 — 300 tokens (Premium quality)</option>
                                      </select>
                                    )}
                                  </div>
                                </FeatureGate>

                                {/* Badge Generation */}
                                <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <BadgeCheck className="w-4 h-4 text-amber-400" />
                                      <Label className="text-sm text-zinc-300">Generate Badge Version</Label>
                                    </div>
                                    <Switch
                                      checked={template.pipelineConfig?.badgeEnabled || false}
                                      onCheckedChange={(checked) => updateTemplate(index, {
                                        pipelineConfig: {
                                          ...template.pipelineConfig,
                                          badgeEnabled: checked
                                        }
                                      })}
                                      className="data-[state=checked]:bg-amber-600"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Access & Monetization Overrides */}
                              <div className="border-t border-white/10 pt-4 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <Label className="text-sm font-semibold text-white flex items-center gap-2">
                                      <CreditCard className="w-4 h-4 text-emerald-400" />
                                      Access & Monetization
                                    </Label>
                                    <p className="text-xs text-zinc-500">Override event settings for this template</p>
                                  </div>
                                  <Switch
                                    checked={template.overrideEventSettings || false}
                                    onCheckedChange={(checked) => updateTemplate(index, {
                                      overrideEventSettings: checked
                                    })}
                                    className="data-[state=checked]:bg-emerald-600"
                                  />
                                </div>

                                {template.overrideEventSettings && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4 border-l-2 border-emerald-500/30">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                      <Label className="text-sm text-zinc-300">Lead Capture Required</Label>
                                      <Switch
                                        checked={template.accessOverrides?.leadCaptureRequired || false}
                                        onCheckedChange={(checked) => updateTemplate(index, {
                                          accessOverrides: {
                                            ...template.accessOverrides,
                                            leadCaptureRequired: checked
                                          }
                                        })}
                                        className="data-[state=checked]:bg-emerald-600"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                      <Label className="text-sm text-zinc-300">Require Payment</Label>
                                      <Switch
                                        checked={template.accessOverrides?.requirePayment || false}
                                        onCheckedChange={(checked) => updateTemplate(index, {
                                          accessOverrides: {
                                            ...template.accessOverrides,
                                            requirePayment: checked
                                          }
                                        })}
                                        className="data-[state=checked]:bg-emerald-600"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                      <Label className="text-sm text-zinc-300">Hard Watermark</Label>
                                      <Switch
                                        checked={template.accessOverrides?.hardWatermark || false}
                                        onCheckedChange={(checked) => updateTemplate(index, {
                                          accessOverrides: {
                                            ...template.accessOverrides,
                                            hardWatermark: checked
                                          }
                                        })}
                                        className="data-[state=checked]:bg-emerald-600"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                      <Label className="text-sm text-zinc-300">Disable Downloads</Label>
                                      <Switch
                                        checked={template.accessOverrides?.disableDownloads || false}
                                        onCheckedChange={(checked) => updateTemplate(index, {
                                          accessOverrides: {
                                            ...template.accessOverrides,
                                            disableDownloads: checked
                                          }
                                        })}
                                        className="data-[state=checked]:bg-emerald-600"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-end pt-4 border-t border-white/10">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteTemplate(index)}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete Template
                                </Button>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit buttons - Full width below tabs */}
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/events")}
                  disabled={isSaving}
                  className="sm:w-auto border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="sm:w-auto sm:min-w-[200px] bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : isEdit ? "Update Event" : "Create Event"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Hidden file inputs */}
          <input
            ref={jsonImportRef}
            type="file"
            accept=".json"
            onChange={handleImportTemplates}
            className="hidden"
          />
        </form>
      </div>

      {/* Library Templates Modal */}
      <Dialog open={showLibraryModal} onOpenChange={setShowLibraryModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Library className="w-5 h-5 text-indigo-400" />
              Add Template from Library
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Select a template from your library or marketplace purchases to add to this event.
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {isLoadingLibrary ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : libraryTemplates.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <Library className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No templates in your library yet.</p>
                <p className="text-sm mt-2">
                  Visit the <span className="text-indigo-400">Marketplace</span> to browse and purchase templates.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {libraryTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="group relative bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer"
                    onClick={() => addTemplateFromLibrary(template)}
                  >
                    {template.preview_url ? (
                      <img
                        src={template.preview_url}
                        alt={template.name}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="w-full h-32 bg-zinc-800 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}
                    <div className="p-3">
                      <h4 className="text-white font-medium text-sm truncate">{template.name}</h4>
                      <p className="text-zinc-500 text-xs mt-1 truncate">
                        {template.category || "Template"}
                      </p>
                    </div>
                    <div className="absolute inset-0 bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-indigo-600 text-white text-sm px-3 py-1 rounded-full">
                        Add to Event
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
