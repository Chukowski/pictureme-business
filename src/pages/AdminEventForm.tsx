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
} from "@/services/eventsApi";
import { ArrowLeft, Plus, Save, Trash2, Image as ImageIcon, Upload, Download, FileJson, Settings, Palette, Layers, Copy, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getDefaultTemplates } from "@/services/adminStorage";
import { uploadTemplateImage, exportTemplates, importTemplates } from "@/services/templateStorage";
import { MediaLibrary } from "@/components/MediaLibrary";
import { PromptSuggestions } from "@/components/PromptSuggestions";

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

  // Form state
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    description: "",
    is_active: true,
    start_date: "",
    end_date: "",
    theme: {
      brandName: "Akitá",
      primaryColor: "#0A3D62",
      secondaryColor: "#F39C12",
      tagline: "Experiencias fotográficas impulsadas por AI.",
      mode: "dark" as "light" | "dark",
    },
    branding: {
      logoPath: "", // Empty by default - user must explicitly add
      footerPath: "", // Empty by default - user must explicitly add
      headerBackgroundColor: "#FFFFFF",
      footerBackgroundColor: "#000000",
      taglineText: "", // Empty by default - user must explicitly add
      watermark: {
        enabled: false,
        type: "image" as "image" | "text",
        imageUrl: "",
        text: "",
        position: "bottom-right" as "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center",
        size: 15, // Percentage of image width
        opacity: 0.7,
      },
    },
    settings: {
      aiModel: "fal-ai/bytedance/seedream/v4/edit",
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

                  {/* Theme Mode Selector */}
                  <div className="space-y-3">
                    <Label htmlFor="theme-mode" className="text-zinc-300">Photo Booth Theme</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            theme: { ...formData.theme, mode: "light" },
                          })
                        }
                        className={`p-4 rounded-xl border transition-all ${formData.theme.mode === "light"
                            ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
                            : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                            <div className="w-6 h-6 rounded-full bg-yellow-400/20 flex items-center justify-center">
                              <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-white">Light Mode</div>
                            <div className="text-xs text-zinc-400">Bright and clean interface</div>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            theme: { ...formData.theme, mode: "dark" },
                          })
                        }
                        className={`p-4 rounded-xl border transition-all ${formData.theme.mode === "dark"
                            ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
                            : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center shadow-sm">
                            <div className="w-6 h-6 rounded-full bg-indigo-400/20 flex items-center justify-center">
                              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                              </svg>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-white">Dark Mode</div>
                            <div className="text-xs text-zinc-400">Modern and elegant look</div>
                          </div>
                        </div>
                      </button>
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
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="space-y-6 mt-6">
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Branding & Overlays</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Customize logo, footer, and tagline for your event photos
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
                      <p>No templates yet. Add one to get started.</p>
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
                                  <PromptSuggestions
                                    onSelectPrompt={(prompt) => {
                                      updateTemplate(index, { prompt });
                                    }}
                                    currentPrompt={template.prompt}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-zinc-300">Background Images</Label>
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
                                    className="border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white"
                                  >
                                    <Upload className="w-4 h-4 mr-1" />
                                    {isUploading ? "Uploading..." : "Upload New"}
                                  </Button>
                                </div>
                                <div className="mb-3">
                                  <MediaLibrary
                                    onSelectMedia={(url) => {
                                      const currentImages = template.images;
                                      if (!currentImages.includes(url)) {
                                        updateTemplate(index, {
                                          images: [...currentImages, url],
                                        });
                                      }
                                    }}
                                    onDeleteMedia={async (url) => {
                                      // Remove the URL from template images
                                      const currentImages = template.images;
                                      const updatedImages = currentImages.filter((img) => img !== url);

                                      // Update local state first
                                      updateTemplate(index, {
                                        images: updatedImages,
                                      });

                                      // If editing an existing event, save immediately
                                      if (isEdit && eventId) {
                                        try {
                                          const updatedTemplates = formData.templates.map((t, i) =>
                                            i === index ? { ...t, images: updatedImages } : t
                                          );
                                          await updateEvent(eventId, { ...formData, templates: updatedTemplates });
                                          toast.success("Image removed from template");
                                        } catch (error: any) {
                                          // Revert on error
                                          updateTemplate(index, {
                                            images: currentImages,
                                          });
                                          toast.error(error.message || "Failed to remove image");
                                        }
                                      }
                                    }}
                                    selectedUrl={template.images[0]}
                                    templates={formData.templates}
                                  />
                                </div>
                                <Textarea
                                  value={template.images.join("\n")}
                                  onChange={(e) =>
                                    updateTemplate(index, {
                                      images: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                                    })
                                  }
                                  placeholder="https://storage.akitapr.com/photobooth/templates/ocean.jpg"
                                  rows={3}
                                  className="font-mono text-xs bg-black/40 border-white/10 text-zinc-300 placeholder:text-zinc-600 focus:border-indigo-500"
                                />
                                <p className="text-xs text-zinc-500">
                                  💡 Upload images to cloud storage or paste URLs (one per line)
                                </p>
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
    </div>
  );
}
