import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  createEvent,
  updateEvent,
  getUserEvents,
  getCurrentUser,
  type EventConfig,
  type Template,
} from "@/services/eventsApi";
import { ArrowLeft, Plus, Save, Trash2, Image as ImageIcon, Upload, Download, FileJson } from "lucide-react";
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
    },
    branding: {
      logoPath: "/src/assets/backgrounds/logo-akita.png",
      footerPath: "/src/assets/backgrounds/Footer_DoLess_Transparent.png",
      headerBackgroundColor: "#FFFFFF",
      footerBackgroundColor: "#000000",
      taglineText: "Powered by Akitá — experiencias visuales para tus eventos.",
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

  const deleteTemplate = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      templates: prev.templates.filter((_, i) => i !== index),
    }));
    toast.success("Template deleted");
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
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/admin/events")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isEdit ? "Edit Event" : "Create New Event"}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? "Update your event details" : "Set up a new photo booth event"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Event details and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">
                    Slug <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="slug"
                    placeholder="my-event"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                    }
                    required
                    disabled={isEdit} // Don't allow changing slug for existing events
                  />
                  <p className="text-xs text-muted-foreground">
                    URL: /{currentUser?.slug}/{formData.slug || "my-event"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="My Photo Booth Event"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your event"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Event Active
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to access this event
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle>Branding & Overlays</CardTitle>
              <CardDescription>
                Customize logo, footer, and tagline for your event photos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tagline Text (Optional)</Label>
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
                  />
                  {formData.branding.taglineText && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          branding: { ...formData.branding, taglineText: "" },
                        });
                        toast.success("Tagline removed");
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {!formData.branding.taglineText && (
                  <p className="text-xs text-muted-foreground">
                    No tagline - photos will not include tagline text
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo Image URL (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.branding.logoPath}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          branding: { ...formData.branding, logoPath: e.target.value },
                        })
                      }
                      placeholder="https://storage.akitapr.com/... or leave empty"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    {formData.branding.logoPath && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            branding: { ...formData.branding, logoPath: "" },
                          });
                          toast.success("Logo removed");
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {formData.branding.logoPath && (
                    <div className="relative">
                      <img
                        src={formData.branding.logoPath}
                        alt="Logo preview"
                        className="w-full h-20 object-contain bg-gray-100 rounded"
                      />
                    </div>
                  )}
                  {!formData.branding.logoPath && (
                    <p className="text-xs text-muted-foreground">
                      No logo - photos will not include a header logo
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Footer Image URL (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.branding.footerPath}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          branding: { ...formData.branding, footerPath: e.target.value },
                        })
                      }
                      placeholder="https://storage.akitapr.com/... or leave empty"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                    >
                      <Upload className="w-4 h-4" />
                    </Button>
                    {formData.branding.footerPath && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            branding: { ...formData.branding, footerPath: "" },
                          });
                          toast.success("Footer removed");
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {formData.branding.footerPath && (
                    <div className="relative">
                      <img
                        src={formData.branding.footerPath}
                        alt="Footer preview"
                        className="w-full h-20 object-contain bg-gray-100 rounded"
                      />
                    </div>
                  )}
                  {!formData.branding.footerPath && (
                    <p className="text-xs text-muted-foreground">
                      No footer - photos will not include a footer image
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Header Background Color</Label>
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
                    className="w-20"
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
                  />
                </div>
              </div>

              {/* Watermark Section */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Watermark (Optional)</Label>
                    <p className="text-xs text-muted-foreground">Add a watermark overlay to your photos</p>
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
                  <div className="space-y-4 pl-4 border-l-2">
                    <div className="space-y-2">
                      <Label>Watermark Type</Label>
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
                        >
                          <ImageIcon className="w-4 h-4 mr-1" />
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
                        >
                          Text
                        </Button>
                      </div>
                    </div>

                    {watermark.type === "image" ? (
                      <div className="space-y-2">
                        <Label>Watermark Image URL</Label>
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
                            placeholder="https://storage.akitapr.com/..."
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
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
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                        </div>
                        {watermark.imageUrl && (
                          <img
                            src={watermark.imageUrl}
                            alt="Watermark preview"
                            className="w-32 h-32 object-contain bg-gray-100 rounded"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Watermark Text</Label>
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
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                        <Label>Size (% of width): {watermark.size}%</Label>
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
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Opacity: {Math.round(watermark.opacity * 100)}%</Label>
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
                        className="w-full"
                      />
                    </div>
                  </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Templates & Prompts</CardTitle>
                  <CardDescription>
                    Configure AI backgrounds and prompts for your event
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadDefaultTemplates}
                  >
                    Load Defaults
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => jsonImportRef.current?.click()}
                    disabled={isUploading}
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
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Export JSON
                  </Button>
                  <Button type="button" size="sm" onClick={addTemplate}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Template
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {formData.templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No templates yet. Add one to get started.</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {formData.templates.map((template, index) => (
                    <AccordionItem key={template.id} value={template.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">{template.name}</span>
                          {!template.active && (
                            <span className="text-xs text-muted-foreground">(Inactive)</span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Template Name</Label>
                              <Input
                                value={template.name}
                                onChange={(e) =>
                                  updateTemplate(index, { name: e.target.value })
                                }
                                placeholder="Ocean Depths"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                value={template.description}
                                onChange={(e) =>
                                  updateTemplate(index, {
                                    description: e.target.value,
                                  })
                                }
                                placeholder="Underwater exploration"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>
                              AI Prompt <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                              value={template.prompt}
                              onChange={(e) =>
                                updateTemplate(index, { prompt: e.target.value })
                              }
                              placeholder="Create a professional scene by compositing these images..."
                              rows={6}
                              className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
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
                              <Label>Background Images</Label>
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
                              className="font-mono text-xs"
                            />
                            <p className="text-xs text-muted-foreground">
                              💡 Upload images to cloud storage or paste URLs (one per line)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Campaign Text (overlay on image)</Label>
                            <Input
                              value={template.campaignText || ""}
                              onChange={(e) =>
                                updateTemplate(index, {
                                  campaignText: e.target.value,
                                })
                              }
                              placeholder="Need extra hands?"
                            />
                          </div>

                          {/* Template Toggles */}
                          <div className="border-t pt-4 space-y-3">
                            <Label className="text-sm font-semibold">Template Settings</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={template.active}
                                  onCheckedChange={(checked) =>
                                    updateTemplate(index, { active: checked })
                                  }
                                />
                                <Label className="text-sm">Active</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={template.isCustomPrompt || false}
                                  onCheckedChange={(checked) =>
                                    updateTemplate(index, { isCustomPrompt: checked })
                                  }
                                />
                                <Label className="text-sm">🎨 Custom Prompt Template</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={template.includeBranding ?? true}
                                  onCheckedChange={(checked) =>
                                    updateTemplate(index, { includeBranding: checked })
                                  }
                                />
                                <Label className="text-sm">Include All Overlays</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={template.includeHeader || false}
                                  onCheckedChange={(checked) =>
                                    updateTemplate(index, { includeHeader: checked })
                                  }
                                />
                                <Label className="text-sm">Include Header Logo</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={template.includeTagline ?? true}
                                  onCheckedChange={(checked) =>
                                    updateTemplate(index, { includeTagline: checked })
                                  }
                                />
                                <Label className="text-sm">Include Tagline</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={template.includeWatermark ?? true}
                                  onCheckedChange={(checked) =>
                                    updateTemplate(index, { includeWatermark: checked })
                                  }
                                />
                                <Label className="text-sm">Include Watermark</Label>
                              </div>
                            </div>
                            {template.isCustomPrompt && (
                              <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  ✨ <strong>Custom Prompt Template:</strong> Users can write their own AI prompts and select any background from the event's media library.
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              💡 Toggle "Include All Overlays" to disable all branding for this template. Individual toggles control specific elements.
                            </p>
                          </div>

                          <div className="flex justify-end pt-4 border-t">
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

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/events")}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : isEdit ? "Update Event" : "Create Event"}
            </Button>
          </div>

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
