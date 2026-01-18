import { useState, useRef } from "react";
// Force HMR update
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Sparkles, Image as ImageIcon, Trash2, Copy, Video, Smile, Lock,
  Download, Upload, Monitor, LayoutTemplate, FileJson, FileUp, Dice5,
  Type, ImagePlus, Stamp, Maximize2, Minimize2, Check, ExternalLink, Settings2, Coins
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PromptHelper } from "@/components/PromptHelper";
import { EditorSectionProps } from "./types";
import { Template } from "@/services/eventsApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgeTemplateEditor, BadgeTemplateConfig, DEFAULT_BADGE_CONFIG } from "@/components/templates/BadgeTemplateEditor";
import { BadgeDesignerPro } from "@/badge-pro";
import { exportTemplates, importTemplates } from "@/services/templateStorage";
import { uploadTemplateImage } from "@/services/templateStorage";
import { toast } from "sonner";

import { LOCAL_IMAGE_MODELS, LOCAL_VIDEO_MODELS, AI_MODELS } from "@/services/aiProcessor";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TemplateLibrary, MarketplaceTemplate } from "@/components/creator/TemplateLibrary";
import { getMarketplaceTemplates } from "@/services/marketplaceApi";
import { useMyTemplates } from "@/hooks/useMyTemplates";
import { useEffect } from "react";

interface ExtendedEditorProps extends EditorSectionProps {
  onPreviewModeChange?: (mode: 'event' | 'badge' | 'template') => void;
  variant?: 'admin' | 'creator';
}

// Normalize model IDs from production (fal-ai/...) to simplified names
function normalizeModelId(modelId?: string): string {
  if (!modelId) return 'nano-banana';

  // If it's a full fal-ai ID, find the short ID
  const found = Object.values(AI_MODELS).find(m => m.id === modelId);
  if (found) return found.shortId;

  // Already normalized/short ID
  const validShortIds = Object.values(AI_MODELS).map(m => m.shortId);
  if (validShortIds.includes(modelId)) {
    return modelId;
  }

  // Legacy mappings
  if (modelId.includes('seedream/v4.5')) return 'seedream-v4.5';
  if (modelId.includes('seedream')) return 'seedream-v4';
  if (modelId.includes('flux')) return 'flux-realism';

  return modelId; // Return as-is if unknown
}

// Token Estimate Helper Component
function TemplateTokenSummary({ template }: { template: Template }) {
  const calculateTotal = () => {
    let total = 0;

    // Base Image Cost
    const modelId = template.pipelineConfig?.imageModel || 'nano-banana';
    const imageModel = Object.values(AI_MODELS).find(m => m.shortId === modelId || m.id === modelId);
    total += imageModel?.cost || 1;

    // Video Cost
    if (template.pipelineConfig?.videoEnabled) {
      const vModelId = template.pipelineConfig?.videoModel || 'wan-v2';
      const videoModel = Object.values(AI_MODELS).find(m => m.shortId === vModelId || m.id === vModelId);
      total += videoModel?.cost || 15;
    }

    return total;
  };

  const total = calculateTotal();

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/10 rounded-full border border-black/5">
      <Coins className="w-3 h-3 text-amber-400" />
      <span className="text-[10px] font-black">{total}</span>
    </div>
  );
}

export function EventTemplates({ formData, setFormData, onPreviewModeChange, variant = 'admin' }: ExtendedEditorProps) {
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [showLibrary, setShowLibrary] = useState(false);
  const [marketplaceTemplates, setMarketplaceTemplates] = useState<MarketplaceTemplate[]>([]);
  const { templates: myLibraryTemplates } = useMyTemplates();
  const importInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load marketplace templates
  useEffect(() => {
    if (variant === 'creator') {
      getMarketplaceTemplates().then(data => setMarketplaceTemplates(data as any)).catch(console.error);
    }
  }, [variant]);

  const templates = formData.templates || [];
  const badgeEnabled = formData.badgeTemplate?.enabled;

  // Update Badge Template
  const updateBadgeTemplate = (config: BadgeTemplateConfig) => {
    setFormData({
      ...formData,
      badgeTemplate: config
    });
  };

  // Handle tab change and notify parent for preview
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onPreviewModeChange) {
      const isBadgePro = tab === 'badge-pro';
      const isBadge = tab === 'badge';

      if (isBadgePro) {
        onPreviewModeChange('badge-pro' as any);
      } else {
        onPreviewModeChange(isBadge ? 'badge' : 'event');
      }
    }
  };

  // Import templates from JSON
  const handleImportTemplates = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedTemplates = await importTemplates(file);
      setFormData({
        ...formData,
        templates: [...templates, ...importedTemplates]
      });
      toast.success(`Imported ${importedTemplates.length} template(s)`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to import templates');
    }
    e.target.value = '';
  };

  // Export all templates to JSON
  const handleExportTemplates = () => {
    if (templates.length === 0) {
      toast.error('No templates to export');
      return;
    }
    exportTemplates(templates, formData.title || 'event');
    toast.success('Templates exported');
  };

  // Export single template to JSON
  const handleExportSingleTemplate = (template: Template, e: React.MouseEvent) => {
    e.stopPropagation();
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      templates: [template],
    };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `template-${template.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported "${template.name}"`);
  };

  // Export badge config to JSON
  const handleExportBadge = () => {
    if (!formData.badgeTemplate?.enabled) {
      toast.error('Badge template is not enabled');
      return;
    }
    const exportData = {
      version: '1.0',
      type: 'badge',
      exportDate: new Date().toISOString(),
      eventName: formData.title,
      badgeTemplate: formData.badgeTemplate,
    };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `badge-config-${(formData.title || 'event').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Badge config exported');
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files || e.target.files.length === 0) return;

    try {
      setIsUploading(true);
      const files = Array.from(e.target.files);
      const uploadPromises = files.map(file => uploadTemplateImage(file));
      const uploadedUrls = await Promise.all(uploadPromises);

      const currentImages = templates[index].images || [];
      updateTemplate(index, {
        images: [...currentImages, ...uploadedUrls]
      });
      toast.success(`Uploaded ${files.length} image(s)`);
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const addTemplate = () => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: `New Template ${templates.length + 1}`,
      description: "AI Generated Scene",
      images: [],
      prompt: "",
      active: true,
      pipelineConfig: {
        imageModel: "nano-banana", // Default to fast model
        forceInstructions: false,
        faceswapEnabled: false,
        videoEnabled: false,
      },
      // Branding options
      includeHeader: true,
      includeTagline: false,
      includeWatermark: false,
      campaignText: "",
      // Default overrides
      accessOverrides: {},
      stationsAssigned: 'all'
    };
    setFormData({
      ...formData,
      templates: [...templates, newTemplate]
    });
    setEditingTemplateIndex(templates.length);
    setIsSheetOpen(true);
  };

  const updateTemplate = (index: number, updates: Partial<Template>) => {
    const newTemplates = [...templates];
    newTemplates[index] = { ...newTemplates[index], ...updates };
    setFormData({ ...formData, templates: newTemplates });
  };

  const removeTemplate = (index: number) => {
    const newTemplates = templates.filter((_, i) => i !== index);
    setFormData({ ...formData, templates: newTemplates });
    if (editingTemplateIndex === index) {
      setIsSheetOpen(false);
      setEditingTemplateIndex(null);
    } else if (editingTemplateIndex !== null && editingTemplateIndex > index) {
      setEditingTemplateIndex(editingTemplateIndex - 1);
    }
  };

  const addFromLibrary = (tpl: MarketplaceTemplate) => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: tpl.name || `Template ${templates.length + 1}`,
      description: tpl.description || 'New visual experience',
      prompt: tpl.prompt || '',
      negativePrompt: '',
      images: tpl.images || (tpl.preview_url ? [tpl.preview_url] : []),
      backgrounds: tpl.backgrounds || [],
      aspectRatio: tpl.aspectRatio || '9:16',
      pipelineConfig: {
        imageModel: tpl.pipeline_config?.imageModel || tpl.ai_model || 'nano-banana',
        videoModel: tpl.pipeline_config?.videoModel,
        videoEnabled: tpl.type === 'video' || tpl.media_type === 'video' || tpl.pipeline_config?.videoEnabled || false
      }
    };
    const newTemplates = [...templates, newTemplate];
    setFormData({ ...formData, templates: newTemplates });
    setShowLibrary(false);
    toast.success(`Added style: ${tpl.name}`);
    setEditingTemplateIndex(newTemplates.length - 1);
  };

  const duplicateTemplate = (index: number) => {
    const templateToCopy = templates[index];
    const newTemplate = {
      ...templateToCopy,
      id: crypto.randomUUID(),
      name: `${templateToCopy.name} (Copy)`,
    };
    const newTemplates = [...templates, newTemplate];
    setFormData({ ...formData, templates: newTemplates });
  };

  const currentTemplate = editingTemplateIndex !== null ? templates[editingTemplateIndex] : null;
  const albumCode = (formData as any)?.slug || (formData as any)?._id || '';

  return (
    <>
      <div className="space-y-8">
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2">Experience & Design</h2>
              <p className="text-zinc-400">Define the AI scenes and badge designs for your guests.</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="bg-[#101112]/30 border border-white/10 p-1 w-full sm:w-auto flex">
              <TabsTrigger value="templates" className="flex-1 sm:flex-none data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Templates
              </TabsTrigger>
              {badgeEnabled && (
                <>
                  <TabsTrigger value="badge" className="flex-1 sm:flex-none data-[state=active]:bg-purple-600 data-[state=active]:text-white text-zinc-400">
                    <LayoutTemplate className="w-4 h-4 mr-2" />
                    Visitor Badge
                  </TabsTrigger>
                  <TabsTrigger value="badge-pro" className="flex-1 sm:flex-none data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-zinc-400">
                    <LayoutTemplate className="w-4 h-4 mr-2" />
                    Badge Pro
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="templates" className="space-y-6">
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="grid grid-cols-2 sm:flex gap-2">
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportTemplates}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => importInputRef.current?.click()}
                    className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 h-10 sm:h-9"
                  >
                    <FileUp className="w-4 h-4 mr-1 sm:mr-2" />
                    Import JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportTemplates}
                    disabled={templates.length === 0}
                    className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 h-10 sm:h-9"
                  >
                    <Download className="w-4 h-4 mr-1 sm:mr-2" />
                    Export JSON
                  </Button>
                </div>
                <div className={cn(
                  "grid gap-2 sm:flex",
                  variant === 'creator' ? "grid-cols-2" : "grid-cols-1"
                )}>
                  {variant === 'creator' && (
                    <Button
                      variant="outline"
                      onClick={() => setShowLibrary(true)}
                      className="border-[#D1F349]/20 text-[#D1F349] hover:bg-[#D1F349]/5 h-10 sm:h-9 text-xs sm:text-sm px-2 sm:px-4"
                    >
                      <Sparkles className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                      <span className="truncate">Add Style from Library</span>
                    </Button>
                  )}
                  <Button
                    onClick={addTemplate}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white h-10 sm:h-9 text-xs sm:text-sm px-2 sm:px-4"
                  >
                    <Plus className="w-4 h-4 mr-1 sm:mr-2 shrink-0" />
                    Add New Template
                  </Button>
                </div>
              </div>

              {/* Templates Grid */}
              {templates.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl bg-card/30">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 mx-auto flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">No Templates Yet</h3>
                  <p className="text-zinc-400 max-w-sm mx-auto mb-6">Create your first AI experience template to get started.</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={addTemplate} variant="outline" className="border-white/10 text-white hover:bg-white/5">
                      Create Template
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => importInputRef.current?.click()}
                      className="border-white/10 text-white hover:bg-white/5"
                    >
                      <FileUp className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {templates.map((template: Template, index: number) => (
                    <Card
                      key={template.id}
                      className={cn(
                        "bg-card/50 border-white/10 backdrop-blur-sm overflow-hidden group hover:border-white/20 transition-all cursor-pointer",
                        !template.active && "opacity-60"
                      )}
                      onClick={() => {
                        setEditingTemplateIndex(index);
                        setIsSheetOpen(true);
                      }}
                    >
                      <div className="aspect-video bg-[#101112]/40 relative">
                        {template.images && template.images.length > 0 ? (
                          <img
                            src={template.images[0]}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
                            <ImageIcon className="w-8 h-8 text-white/20" />
                          </div>
                        )}

                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-7 w-7 bg-[#101112]/50 hover:bg-[#101112]/70 text-white border border-white/10"
                            onClick={(e) => handleExportSingleTemplate(template, e)}
                            title="Export template"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-7 w-7 bg-[#101112]/50 hover:bg-[#101112]/70 text-white border border-white/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateTemplate(index);
                            }}
                            title="Duplicate template"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTemplate(index);
                            }}
                            title="Delete template"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                          {template.pipelineConfig?.videoEnabled && (
                            <Badge variant="secondary" className="h-5 bg-[#101112]/50 text-white backdrop-blur-sm border border-white/10 text-[10px] px-1.5">
                              <Video className="w-3 h-3 mr-1" /> Video
                            </Badge>
                          )}
                          {template.pipelineConfig?.faceswapEnabled && (
                            <Badge variant="secondary" className="h-5 bg-[#101112]/50 text-white backdrop-blur-sm border border-white/10 text-[10px] px-1.5">
                              <Smile className="w-3 h-3 mr-1" /> Face
                            </Badge>
                          )}
                          {template.accessOverrides?.requirePayment && (
                            <Badge variant="secondary" className="h-5 bg-amber-500/80 text-white backdrop-blur-sm border border-amber-500/20 text-[10px] px-1.5">
                              $$$
                            </Badge>
                          )}
                        </div>

                        {!template.active && (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#101112]/60 backdrop-blur-sm">
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">Inactive</Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-white truncate text-xs sm:text-sm">{template.name}</h3>
                            <p className="text-[10px] sm:text-xs text-zinc-500 truncate">{template.description || "No description"}</p>
                          </div>
                          {template.pipelineConfig?.imageModel && (
                            <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-zinc-500 shrink-0" title={template.pipelineConfig.imageModel}>
                              {normalizeModelId(template.pipelineConfig.imageModel).split('-')[0]}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {badgeEnabled && (
              <TabsContent value="badge" className="space-y-6">
                {/* Export Badge Config */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportBadge}
                    className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Badge Config
                  </Button>
                </div>

                {/* Template selector for badge photo */}
                <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-white font-medium">Use Template for Badge Photo</Label>
                        <p className="text-xs text-zinc-500">Apply an AI template to enhance the badge photo</p>
                      </div>
                      <Switch
                        checked={!!formData.badgeTemplate?.aiPipeline?.sourceTemplateId}
                        onCheckedChange={(checked) => {
                          updateBadgeTemplate({
                            ...formData.badgeTemplate!,
                            aiPipeline: {
                              ...formData.badgeTemplate!.aiPipeline,
                              sourceTemplateId: checked ? templates[0]?.id : undefined,
                              enabled: checked
                            }
                          });
                        }}
                        className="data-[state=checked]:bg-purple-600"
                      />
                    </div>

                    {formData.badgeTemplate?.aiPipeline?.sourceTemplateId && (
                      <Select
                        value={formData.badgeTemplate.aiPipeline.sourceTemplateId}
                        onValueChange={(v) => {
                          updateBadgeTemplate({
                            ...formData.badgeTemplate!,
                            aiPipeline: {
                              ...formData.badgeTemplate!.aiPipeline,
                              sourceTemplateId: v
                            }
                          });
                        }}
                      >
                        <SelectTrigger className="bg-[#101112]/40 border-white/10 text-white">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-zinc-800">
                          {templates.filter(t => t.active).map((template) => (
                            <SelectItem key={template.id} value={template.id} className="text-white">
                              <div className="flex items-center gap-2">
                                {template.images?.[0] && (
                                  <img src={template.images[0]} className="w-6 h-6 rounded object-cover" />
                                )}
                                {template.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>

                {/* Badge Template Editor */}
                <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <BadgeTemplateEditor
                      config={formData.badgeTemplate || DEFAULT_BADGE_CONFIG}
                      onChange={updateBadgeTemplate}
                      eventName={formData.title}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {badgeEnabled && (
              <TabsContent value="badge-pro" className="space-y-6">
                <Card className="bg-card/20 border-white/5 backdrop-blur-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Badge Creator Pro</h3>
                        <p className="text-sm text-zinc-400">Print-ready layout with DPI, bleed, and presets.</p>
                      </div>
                      <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40">Beta</Badge>
                    </div>
                    <BadgeDesignerPro
                      config={formData.badgeTemplate || DEFAULT_BADGE_CONFIG}
                      onChange={updateBadgeTemplate}
                      eventName={formData.title}
                      albumCode={albumCode}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </section>

        {/* Template Editor Sheet */}
        <Sheet
          open={isSheetOpen}
          onOpenChange={(open) => {
            setIsSheetOpen(open);
            if (!open) setIsExpanded(false);
          }}
        >
          <SheetContent
            side="right"
            className={cn(
              "p-0 border-l border-white/10 shadow-2xl transition-all duration-500 h-[100dvh] flex flex-col overflow-hidden [-webkit-overflow-scrolling:touch]",
              variant === 'creator' ? "bg-[#101112]" : "bg-[#18181b]",
              isExpanded ? "w-screen sm:max-w-none inset-0" : "w-full sm:max-w-xl"
            )}
          >
            {currentTemplate && editingTemplateIndex !== null && (
              <>
                <SheetHeader className={cn(
                  "p-6 border-b border-white/10 shrink-0",
                  variant === 'creator' ? "bg-[#101112]" : "bg-card/50"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center translate-y-[-2px]",
                        variant === 'creator' ? "bg-[#D1F349]/10" : "bg-indigo-500/10"
                      )}>
                        <Sparkles className={cn("w-5 h-5", variant === 'creator' ? "text-[#D1F349]" : "text-indigo-400")} />
                      </div>
                      <div>
                        <SheetTitle className="text-white text-xl font-black uppercase tracking-tight">
                          {variant === 'creator' ? 'Scene Designer' : 'Template Architect'}
                        </SheetTitle>
                        <SheetDescription className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest opacity-60">
                          {variant === 'creator' ? 'Fine-tune your AI scene & visual style' : 'Refine the AI vision & experience'}
                        </SheetDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mr-8">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{currentTemplate.active ? 'Status: Live' : 'Status: Draft'}</span>
                        <Switch
                          checked={currentTemplate.active}
                          onCheckedChange={(checked) => updateTemplate(editingTemplateIndex, { active: checked })}
                          className={cn("scale-75", variant === 'creator' ? "data-[state=checked]:bg-[#D1F349]" : "data-[state=checked]:bg-emerald-500")}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-white/5"
                      >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </SheetHeader>

                <div className={cn(
                  "flex-1 overflow-hidden",
                  isExpanded ? "flex" : "flex flex-col"
                )}>
                  {/* Scrollable Form Content */}
                  <div className={cn(
                    "flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar [-webkit-overflow-scrolling:touch]",
                    isExpanded && "max-w-2xl border-r border-white/5"
                  )} ref={scrollRef}>
                    {/* Internal Navigation for Mobile/Collapsed or Quick Jumps */}
                    {!isExpanded && (
                      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar border-b border-white/5 mb-6 [-webkit-overflow-scrolling:touch]">
                        {['Config', 'Prompts', 'Assets', 'Overlay', 'Rules'].map(tag => (
                          <Badge key={tag} variant="outline" className="px-3 py-1 bg-white/5 border-white/10 text-zinc-400 font-medium">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Basic Info */}
                    <Card className={cn(
                      "border-white/10 shadow-2xl overflow-hidden mb-8",
                      variant === 'creator' ? "bg-[#1A1A1A]" : "bg-white/5"
                    )}>
                      <div className={cn(
                        "p-4 border-b border-white/5",
                        variant === 'creator' ? "bg-white/5" : "bg-indigo-500/10"
                      )}>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <Plus className={cn("w-4 h-4", variant === 'creator' ? "text-[#D1F349]" : "text-indigo-400")} />
                          General Information
                        </h4>
                      </div>
                      <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label className={cn(
                              "font-bold uppercase tracking-widest text-[10px]",
                              variant === 'creator' ? "text-zinc-500" : "text-zinc-300"
                            )}>Template Name</Label>
                            <Input
                              value={currentTemplate.name}
                              onChange={(e) => updateTemplate(editingTemplateIndex, { name: e.target.value })}
                              className={cn(
                                "border-white/5 text-white h-12 rounded-xl transition-all",
                                variant === 'creator' ? "bg-[#0D0D0D]/50 focus:bg-zinc-800/80" : "bg-[#101112]/40 border-white/10"
                              )}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className={cn(
                              "font-bold uppercase tracking-widest text-[10px]",
                              variant === 'creator' ? "text-zinc-500" : "text-zinc-300"
                            )}>Description</Label>
                            <Input
                              value={currentTemplate.description}
                              onChange={(e) => updateTemplate(editingTemplateIndex, { description: e.target.value })}
                              className={cn(
                                "border-white/5 text-white h-12 rounded-xl transition-all",
                                variant === 'creator' ? "bg-[#0D0D0D]/50 focus:bg-zinc-800/80" : "bg-[#101112]/40 border-white/10"
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pipeline Configuration */}
                    <Card className={cn(
                      "border-white/10 shadow-2xl overflow-hidden",
                      variant === 'creator' ? "bg-[#101112]" : "bg-white/5"
                    )}>
                      <div className={cn(
                        "p-4 border-b border-white/5 flex items-center justify-between",
                        variant === 'creator' ? "bg-[#101112]" : "bg-indigo-500/10"
                      )}>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                          <Settings2 className={cn("w-4 h-4", variant === 'creator' ? "text-[#D1F349]" : "text-indigo-400")} />
                          Intelligence Engine
                        </h4>
                        <div className="flex items-center gap-3">
                          <TemplateTokenSummary template={currentTemplate} />
                          <Badge variant="outline" className={cn(
                            "text-[10px] uppercase font-black tracking-tighter",
                            variant === 'creator' ? "bg-[#D1F349]/10 text-[#D1F349] border-[#D1F349]/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                          )}>Pipeline v3</Badge>
                        </div>
                      </div>

                      <CardContent className="p-6 space-y-8">
                        {/* Image Generation Section */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                              <ImageIcon className="w-3 h-3" />
                              Primary Image Engine
                            </Label>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-[11px] text-zinc-500">Base Model</Label>
                              <Select
                                value={normalizeModelId(currentTemplate.pipelineConfig?.imageModel) || 'nano-banana'}
                                onValueChange={(v) => updateTemplate(editingTemplateIndex, {
                                  pipelineConfig: { ...currentTemplate.pipelineConfig, imageModel: v }
                                })}
                              >
                                <SelectTrigger className={cn(
                                  "border-white/5 transition-colors h-12 rounded-xl",
                                  variant === 'creator' ? "bg-[#0D0D0D]/50 hover:bg-zinc-800/80" : "bg-black/40"
                                )}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#101112] border-white/10 text-white">
                                  {LOCAL_IMAGE_MODELS.map(m => (
                                    <SelectItem key={m.shortId} value={m.shortId}>
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold">{m.name}</span>
                                          {m.cost && (
                                            <Badge variant="outline" className="h-4 px-1 text-[9px] border-[#D1F349]/30 text-[#D1F349] bg-[#D1F349]/5 font-black uppercase tracking-tighter">
                                              {m.cost}
                                            </Badge>
                                          )}
                                        </div>
                                        <span className="text-[10px] text-zinc-500">{m.description}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-[11px] text-zinc-500">Output Geometry</Label>
                              <Select
                                value={currentTemplate.aspectRatio || 'auto'}
                                onValueChange={(v: any) => updateTemplate(editingTemplateIndex, { aspectRatio: v })}
                              >
                                <SelectTrigger className={cn(
                                  "border-white/5 transition-colors h-12 rounded-xl",
                                  variant === 'creator' ? "bg-[#0D0D0D]/50 hover:bg-zinc-800/80" : "bg-black/40"
                                )}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#101112] border-white/10 text-white">
                                  <SelectItem value="auto">Auto-detect (Match User)</SelectItem>
                                  <SelectItem value="1:1">Standard Square (1:1)</SelectItem>
                                  <SelectItem value="3:2">Classic Photo (3:2)</SelectItem>
                                  <SelectItem value="4:5">Insta Portrait (4:5)</SelectItem>
                                  <SelectItem value="9:16">Reels/Story (9:16)</SelectItem>
                                  <SelectItem value="16:9">Wide View (16:9)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* Extra Image Flags */}
                          <div className="pt-4 grid grid-cols-2 gap-4 border-t border-white/5">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Strict Prompting</Label>
                                <Switch
                                  checked={currentTemplate.pipelineConfig?.forceInstructions}
                                  onCheckedChange={(c) => updateTemplate(editingTemplateIndex, {
                                    pipelineConfig: { ...currentTemplate.pipelineConfig, forceInstructions: c }
                                  })}
                                  className={cn("scale-75", variant === 'creator' ? "data-[state=checked]:bg-[#D1F349]" : "data-[state=checked]:bg-indigo-600")}
                                />
                              </div>
                              <span className="text-[9px] text-zinc-600 leading-tight">Better adherence to complex descriptions</span>
                            </div>

                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Preserve Face</Label>
                                <Switch
                                  checked={currentTemplate.pipelineConfig?.faceswapEnabled}
                                  onCheckedChange={(c) => updateTemplate(editingTemplateIndex, {
                                    pipelineConfig: { ...currentTemplate.pipelineConfig, faceswapEnabled: c }
                                  })}
                                  className={cn("scale-75", variant === 'creator' ? "data-[state=checked]:bg-[#D1F349]" : "data-[state=checked]:bg-indigo-600")}
                                />
                              </div>
                              <span className="text-[9px] text-zinc-600 leading-tight">Advanced face-swap for maximum realism</span>
                            </div>
                          </div>
                        </div>

                        {/* Motion Engine Section */}
                        <div className="space-y-4 pt-6 border-t border-white/10">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                                <Video className="w-3 h-3" />
                                Motion Engine (Video)
                              </Label>
                              <p className="text-[10px] text-zinc-500">Convert the generated photo into a cinematic video clip.</p>
                            </div>
                            <Switch
                              checked={currentTemplate.pipelineConfig?.videoEnabled}
                              onCheckedChange={(c) => updateTemplate(editingTemplateIndex, {
                                pipelineConfig: { ...currentTemplate.pipelineConfig, videoEnabled: c }
                              })}
                              className={cn(variant === 'creator' ? "data-[state=checked]:bg-[#D1F349]" : "data-[state=checked]:bg-indigo-600")}
                            />
                          </div>

                          {currentTemplate.pipelineConfig?.videoEnabled && (
                            <div className={cn(
                              "grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300",
                              variant === 'creator' ? "bg-white/5 border-white/5" : "bg-indigo-500/5 border border-indigo-500/10"
                            )}>
                              <div className="space-y-2">
                                <Label className="text-[11px] text-zinc-500">Video Synthesis Model</Label>
                                <Select
                                  value={currentTemplate.pipelineConfig?.videoModel || 'wan-v2'}
                                  onValueChange={(v) => updateTemplate(editingTemplateIndex, {
                                    pipelineConfig: { ...currentTemplate.pipelineConfig, videoModel: v }
                                  })}
                                >
                                  <SelectTrigger className={cn(
                                    "border-white/5 transition-colors h-12 rounded-xl text-white",
                                    variant === 'creator' ? "bg-[#0D0D0D]/50 hover:bg-zinc-800/80" : "bg-black/40 border-white/10"
                                  )}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-[#101112] border-white/10 text-white">
                                    {LOCAL_VIDEO_MODELS.map(m => (
                                      <SelectItem key={m.shortId} value={m.shortId}>
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold">{m.name}</span>
                                            {m.cost && (
                                              <Badge variant="outline" className="h-4 px-1 text-[9px] border-[#D1F349]/30 text-[#D1F349] bg-[#D1F349]/5 font-black uppercase tracking-tighter">
                                                {m.cost}
                                              </Badge>
                                            )}
                                          </div>
                                          <span className="text-[10px] text-zinc-500">{m.description}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex items-center justify-center">
                                <div className="text-center p-3 rounded-lg bg-black/20 border border-white/5 w-full">
                                  <span className="text-[10px] text-zinc-500 uppercase font-black block mb-1">Workflow Info</span>
                                  <span className="text-[10px] text-zinc-400">Photo is generated first, then animated. High token cost.</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Advanced/Experimental Section */}
                        <div className="space-y-4 pt-6 border-t border-white/10">
                          <Label className={cn(
                            "font-bold uppercase tracking-widest text-[10px] flex items-center gap-2",
                            variant === 'creator' ? "text-zinc-500" : "text-zinc-400"
                          )}>
                            <Settings2 className="w-3 h-3" />
                            Advanced Configuration
                          </Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <Label className="text-[11px] text-zinc-500">Multi-Subject Engine</Label>
                              <Select
                                value={currentTemplate.pipelineConfig?.groupImageModel ? normalizeModelId(currentTemplate.pipelineConfig.groupImageModel) : 'same'}
                                onValueChange={(v) => updateTemplate(editingTemplateIndex, {
                                  pipelineConfig: { ...currentTemplate.pipelineConfig, groupImageModel: v === 'same' ? undefined : v }
                                })}
                              >
                                <SelectTrigger className={cn(
                                  "border-white/5 transition-colors h-12 rounded-xl text-white",
                                  variant === 'creator' ? "bg-[#0D0D0D]/50 hover:bg-zinc-800/80" : "bg-black/40"
                                )}>
                                  <SelectValue placeholder="Match Individual" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#101112] border-white/10 text-white">
                                  <SelectItem value="same">Inherit Primary Engine</SelectItem>
                                  {LOCAL_IMAGE_MODELS.map(m => (
                                    <SelectItem key={`group-${m.shortId}`} value={m.shortId}>{m.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[11px] text-zinc-500 flex items-center gap-1">
                                <Dice5 className="w-3 h-3" />
                                Generation Seed
                              </Label>
                              <Input
                                value={currentTemplate.pipelineConfig?.seed?.toString() || ''}
                                onChange={(e) => updateTemplate(editingTemplateIndex, {
                                  pipelineConfig: { ...currentTemplate.pipelineConfig, seed: e.target.value ? parseInt(e.target.value) : undefined }
                                })}
                                placeholder="Random"
                                className={cn(
                                  "border-white/5 text-white h-12 rounded-xl transition-all",
                                  variant === 'creator' ? "bg-[#0D0D0D]/50 focus:bg-zinc-800/80" : "bg-black/40 border-white/10"
                                )}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <div className="space-y-0.5">
                              <Label className="text-zinc-300 text-xs font-bold">Free Prompt Mode</Label>
                              <p className="text-[10px] text-zinc-500">Let guests write their own descriptions during the session.</p>
                            </div>
                            <Switch
                              checked={currentTemplate.isCustomPrompt === true}
                              onCheckedChange={(c) => updateTemplate(editingTemplateIndex, { isCustomPrompt: c })}
                              className="scale-75 data-[state=checked]:bg-orange-600"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Prompts */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-6 w-1 rounded-full bg-indigo-500"></div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest">Narrative Blueprint</h4>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className={cn(
                              "font-bold uppercase tracking-widest text-[10px]",
                              variant === 'creator' ? "text-zinc-500" : "text-zinc-400"
                            )}>Positive Prompt</Label>
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px]">The Visual Goal</Badge>
                          </div>
                          <div className="relative group">
                            <Textarea
                              value={currentTemplate.prompt}
                              onChange={(e) => updateTemplate(editingTemplateIndex, { prompt: e.target.value })}
                              className={cn(
                                "text-white font-mono text-sm min-h-[140px] transition-all resize-none shadow-inner border-white/5",
                                variant === 'creator' ? "bg-[#0D0D0D]/50 focus:bg-zinc-800/80" : "bg-black/60 border-white/10 focus:ring-indigo-500/20"
                              )}
                              placeholder="Describe the desired outcome in high detail..."
                            />
                            <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ImageIcon className="w-4 h-4 text-zinc-600" />
                            </div>
                          </div>
                          <div className="pt-2">
                            <PromptHelper
                              onSelectPrompt={(prompt) => updateTemplate(editingTemplateIndex, { prompt })}
                              currentPrompt={currentTemplate.prompt}
                              section="template"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <Label className={cn(
                              "font-bold uppercase tracking-widest text-[10px] flex items-center gap-2",
                              variant === 'creator' ? "text-zinc-500" : "text-zinc-400"
                            )}>
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                              Negative constraints
                            </Label>
                            <Textarea
                              value={currentTemplate.negativePrompt || ''}
                              onChange={(e) => updateTemplate(editingTemplateIndex, { negativePrompt: e.target.value })}
                              className={cn(
                                "text-zinc-300 font-mono text-xs min-h-[90px] transition-all border-white/5",
                                variant === 'creator' ? "bg-[#0D0D0D]/50 focus:bg-zinc-800/80" : "bg-black/40 focus:border-red-500/30"
                              )}
                              placeholder="blurry, distorted, low quality..."
                            />
                          </div>

                          <div className="space-y-3">
                            <Label className={cn(
                              "font-bold uppercase tracking-widest text-[10px] flex items-center gap-2",
                              variant === 'creator' ? "text-zinc-500" : "text-zinc-400"
                            )}>
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                              Group Multiplier
                            </Label>
                            <Textarea
                              value={currentTemplate.groupPrompt || ''}
                              onChange={(e) => updateTemplate(editingTemplateIndex, { groupPrompt: e.target.value })}
                              className={cn(
                                "text-zinc-300 font-mono text-xs min-h-[90px] transition-all border-white/5",
                                variant === 'creator' ? "bg-[#0D0D0D]/50 focus:bg-zinc-800/80" : "bg-black/40 focus:border-purple-500/30"
                              )}
                              placeholder="Override prompt for groups of people..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reference Images */}
                    <div className="space-y-4">
                      <Label className="text-zinc-300">Reference / Background Images</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {currentTemplate.images.map((img, i) => (
                          <div key={i} className="aspect-square relative rounded-lg overflow-hidden group">
                            <img src={img} className="w-full h-full object-cover" />
                            <button
                              onClick={() => {
                                const newImages = currentTemplate.images.filter((_, idx) => idx !== i);
                                updateTemplate(editingTemplateIndex, { images: newImages });
                              }}
                              className="absolute inset-0 bg-[#101112]/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                        <button
                          className="aspect-square rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/5 hover:border-white/30 transition-all"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.multiple = true;
                            input.onchange = (e) => handleImageUpload(e as any, editingTemplateIndex!);
                            input.click();
                          }}
                        >
                          <Plus className="w-6 h-6 mb-1" />
                          <span className="text-xs">{isUploading ? '...' : 'Upload'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Element/Prop Images (for mixing) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-300 flex items-center gap-2">
                          <ImagePlus className="w-4 h-4 text-emerald-400" />
                          Element Images (for mixing)
                        </Label>
                        <span className="text-[10px] text-zinc-500">Props, overlays, style refs</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(currentTemplate.elementImages || []).map((img, i) => (
                          <div key={i} className="aspect-square relative rounded-lg overflow-hidden group border border-emerald-500/30">
                            <img src={img} className="w-full h-full object-cover" />
                            <button
                              onClick={() => {
                                const newImages = (currentTemplate.elementImages || []).filter((_, idx) => idx !== i);
                                updateTemplate(editingTemplateIndex, { elementImages: newImages });
                              }}
                              className="absolute inset-0 bg-[#101112]/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          className="aspect-square rounded-lg border border-dashed border-emerald-500/30 flex flex-col items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/50 transition-all"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.multiple = true;
                            input.onchange = async (e: any) => {
                              if (!e.target.files || e.target.files.length === 0) return;
                              try {
                                setIsUploading(true);
                                const files = Array.from(e.target.files) as File[];
                                const uploadPromises = files.map(file => uploadTemplateImage(file));
                                const uploadedUrls = await Promise.all(uploadPromises);
                                const currentElements = currentTemplate.elementImages || [];
                                updateTemplate(editingTemplateIndex!, {
                                  elementImages: [...currentElements, ...uploadedUrls]
                                });
                                toast.success(`Uploaded ${files.length} element(s)`);
                              } catch (error) {
                                toast.error("Failed to upload elements");
                              } finally {
                                setIsUploading(false);
                              }
                            };
                            input.click();
                          }}
                        >
                          <Plus className="w-4 h-4 mb-1" />
                          <span className="text-[10px]">Add</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500">Used by Seedream/Imagen for mixing multiple images into the scene</p>
                    </div>

                    {/* Campaign Text & Branding */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                        <Type className="w-4 h-4 text-cyan-400" />
                        Branding & Overlay
                      </h4>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-zinc-300 text-xs">Campaign Text (Overlay)</Label>
                          <Input
                            value={currentTemplate.campaignText || ''}
                            onChange={(e) => updateTemplate(editingTemplateIndex, { campaignText: e.target.value })}
                            placeholder="e.g., #MyEvent2025"
                            className="bg-[#101112]/40 border-white/10 text-white text-sm"
                          />
                          <p className="text-[10px] text-zinc-500">Text to overlay on the final image</p>
                        </div>
                      </div>

                      <div className="space-y-3 bg-[#101112]/20 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-zinc-300 text-xs block">Include Header Logo</Label>
                            <span className="text-[10px] text-zinc-500">Show event logo on result</span>
                          </div>
                          <Switch
                            checked={currentTemplate.includeHeader !== false}
                            onCheckedChange={(c) => updateTemplate(editingTemplateIndex, { includeHeader: c })}
                            className="scale-75 data-[state=checked]:bg-cyan-600"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-zinc-300 text-xs block">Include Tagline</Label>
                            <span className="text-[10px] text-zinc-500">Show event tagline</span>
                          </div>
                          <Switch
                            checked={currentTemplate.includeTagline === true}
                            onCheckedChange={(c) => updateTemplate(editingTemplateIndex, { includeTagline: c })}
                            className="scale-75 data-[state=checked]:bg-cyan-600"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-zinc-300 text-xs block">Include Watermark</Label>
                            <span className="text-[10px] text-zinc-500">Apply watermark overlay</span>
                          </div>
                          <Switch
                            checked={currentTemplate.includeWatermark === true}
                            onCheckedChange={(c) => updateTemplate(editingTemplateIndex, { includeWatermark: c })}
                            className="scale-75 data-[state=checked]:bg-cyan-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Access Overrides */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                      <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-400" />
                        Access Overrides
                      </h4>
                      <div className="space-y-3 bg-[#101112]/20 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-zinc-300 text-xs block">Require Payment</Label>
                            <span className="text-[10px] text-zinc-500">Force payment for this template</span>
                          </div>
                          <Switch
                            checked={currentTemplate.accessOverrides?.requirePayment}
                            onCheckedChange={(c) => updateTemplate(editingTemplateIndex, {
                              accessOverrides: { ...currentTemplate.accessOverrides, requirePayment: c }
                            })}
                            className="scale-75 data-[state=checked]:bg-amber-600"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-zinc-300 text-xs block">Lead Capture</Label>
                            <span className="text-[10px] text-zinc-500">Collect email before download</span>
                          </div>
                          <Switch
                            checked={currentTemplate.accessOverrides?.leadCaptureRequired}
                            onCheckedChange={(c) => updateTemplate(editingTemplateIndex, {
                              accessOverrides: { ...currentTemplate.accessOverrides, leadCaptureRequired: c }
                            })}
                            className="scale-75 data-[state=checked]:bg-blue-600"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-zinc-300 text-xs block">Hard Watermark</Label>
                            <span className="text-[10px] text-zinc-500">Burn watermark into final image</span>
                          </div>
                          <Switch
                            checked={currentTemplate.accessOverrides?.hardWatermark}
                            onCheckedChange={(c) => updateTemplate(editingTemplateIndex, {
                              accessOverrides: { ...currentTemplate.accessOverrides, hardWatermark: c }
                            })}
                            className="scale-75 data-[state=checked]:bg-zinc-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Station Assignment */}
                    {variant !== 'creator' && formData.albumTracking?.enabled && (
                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-cyan-400" />
                          Station Availability
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 rounded bg-[#101112]/20 border border-white/5">
                            <Label className="text-zinc-300 text-xs">All Stations</Label>
                            <Switch
                              checked={!currentTemplate.stationsAssigned || currentTemplate.stationsAssigned === 'all'}
                              onCheckedChange={(c) => updateTemplate(editingTemplateIndex, {
                                stationsAssigned: c ? 'all' : []
                              })}
                              className="scale-75 data-[state=checked]:bg-cyan-600"
                            />
                          </div>

                          {currentTemplate.stationsAssigned !== 'all' && formData.albumTracking.stations?.map(station => (
                            <div key={station.id} className="flex items-center justify-between p-2 rounded bg-[#101112]/20 border border-white/5 ml-4">
                              <Label className="text-zinc-400 text-xs">{station.name}</Label>
                              <Switch
                                checked={Array.isArray(currentTemplate.stationsAssigned) && currentTemplate.stationsAssigned.includes(station.id)}
                                onCheckedChange={(c) => {
                                  const current = Array.isArray(currentTemplate.stationsAssigned) ? currentTemplate.stationsAssigned : [];
                                  const newStations = c
                                    ? [...current, station.id]
                                    : current.filter(id => id !== station.id);
                                  updateTemplate(editingTemplateIndex, { stationsAssigned: newStations });
                                }}
                                className="scale-75 data-[state=checked]:bg-cyan-600"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded Sidebar Preview */}
                  {isExpanded && (
                    <div className="flex-1 overflow-y-auto bg-[#09090b] p-10 flex flex-col">
                      <div className="max-w-md mx-auto w-full space-y-8">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Preview Mockup</h3>
                          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-2 py-0">Draft View</Badge>
                        </div>

                        {/* Mock Phone Preview */}
                        <div className="relative mx-auto w-full aspect-[9/19.5] max-w-[320px] bg-[#101112] rounded-[2.5rem] border-[8px] border-zinc-900 shadow-2xl overflow-hidden ring-1 ring-white/10">
                          {/* Screen Content */}
                          <div className="absolute inset-0 flex flex-col">
                            {/* Status Bar */}
                            <div className="h-6 w-full flex items-center justify-between px-6 py-4 text-[10px] text-zinc-500">
                              <span>9:41</span>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-2 rounded-[1px] bg-zinc-600"></div>
                                <div className="w-4 h-2 rounded-[1px] bg-zinc-600"></div>
                              </div>
                            </div>

                            {/* Hero/Visual */}
                            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                              <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-xl shadow-indigo-500/5">
                                <Sparkles className="w-10 h-10 text-indigo-400 animate-pulse" />
                              </div>
                              <h4 className="text-xl font-black text-white mb-2 leading-tight uppercase tracking-tight">{currentTemplate.name}</h4>
                              <p className="text-xs text-zinc-400 max-w-[200px] leading-relaxed opacity-80">{currentTemplate.description || "Experimental style"}</p>

                              <div className="mt-8 grid grid-cols-2 gap-2 w-full">
                                <div className="aspect-square rounded-lg bg-zinc-800/50 border border-white/5 flex items-center justify-center">
                                  {currentTemplate.images?.[0] ? <img src={currentTemplate.images[0]} className="w-full h-full object-cover rounded-lg" /> : <ImageIcon className="w-4 h-4 text-zinc-600" />}
                                </div>
                                <div className="aspect-square rounded-lg bg-zinc-800/50 border border-white/5 flex items-center justify-center">
                                  <ImageIcon className="w-4 h-4 text-zinc-600" />
                                </div>
                              </div>
                            </div>

                            {/* CTA */}
                            <div className="p-6">
                              <Button className="w-full h-12 bg-indigo-600 rounded-xl font-bold shadow-lg shadow-indigo-600/20">Generate Photo</Button>
                            </div>
                          </div>
                        </div>

                        {/* Technical Summary */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Ratio</span>
                            <span className="text-sm font-bold text-white">{currentTemplate.aspectRatio || 'Auto'}</span>
                          </div>
                          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Model</span>
                            <span className="text-sm font-bold text-indigo-400 uppercase">{normalizeModelId(currentTemplate.pipelineConfig?.imageModel).split('-')[0]}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <SheetFooter className={cn(
                  "p-6 border-t border-white/10 bg-card/50 shrink-0",
                  isExpanded ? "sm:justify-start" : "sm:justify-center"
                )}>
                  <Button
                    onClick={() => setIsSheetOpen(false)}
                    className={cn(
                      "font-black text-[13px] uppercase tracking-[0.2em] rounded-xl shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99]",
                      variant === 'creator' ? "bg-[#D1F349] text-black hover:bg-[#c2e13a]" : "bg-white text-black hover:bg-zinc-200",
                      isExpanded ? "w-auto px-12 h-12" : "w-full h-12"
                    )}
                  >
                    {variant === 'creator' ? 'Finish Designer' : 'Save & Complete Session'}
                  </Button>
                </SheetFooter>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 overflow-hidden bg-[#101112]">
          <TemplateLibrary
            onSelect={addFromLibrary}
            onClose={() => setShowLibrary(false)}
            marketplaceTemplates={marketplaceTemplates}
            myLibraryTemplates={myLibraryTemplates.map(t => ({
              id: t.id,
              name: t.name,
              prompt: t.prompt,
              ai_model: t.model,
              aspectRatio: t.aspectRatio,
              type: t.type as any,
              preview_url: t.image
            }))}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
