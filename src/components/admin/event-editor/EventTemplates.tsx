import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, Sparkles, Image as ImageIcon, Trash2, Copy, Video, Smile, Lock, 
  Download, Upload, Monitor, LayoutTemplate, FileJson, FileUp, Dice5,
  Type, ImagePlus, Stamp
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PromptHelper } from "@/components/PromptHelper";
import { EditorSectionProps } from "./types";
import { Template } from "@/services/eventsApi";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgeTemplateEditor, BadgeTemplateConfig, DEFAULT_BADGE_CONFIG } from "@/components/templates/BadgeTemplateEditor";
import { exportTemplates, importTemplates } from "@/services/templateStorage";
import { uploadTemplateImage } from "@/services/templateStorage";
import { toast } from "sonner";

interface ExtendedEditorProps extends EditorSectionProps {
  onPreviewModeChange?: (mode: 'event' | 'badge' | 'template') => void;
}

// Normalize model IDs from production (fal-ai/...) to simplified names
function normalizeModelId(modelId?: string): string {
  if (!modelId) return 'nano-banana';
  
  // Already normalized
  if (['nano-banana', 'seedream-v4', 'flux-realism', 'flux-2-pro'].includes(modelId)) {
    return modelId;
  }
  
  // Map fal.ai model IDs to simplified names
  if (modelId.includes('nano-banana')) return 'nano-banana';
  if (modelId.includes('seedream')) return 'seedream-v4';
  if (modelId.includes('flux-2-pro') || modelId.includes('flux/2')) return 'flux-2-pro';
  if (modelId.includes('flux')) return 'flux-realism';
  
  // Legacy names
  if (modelId === 'seedream-t2i') return 'seedream-v4';
  
  return modelId; // Return as-is if unknown
}

export function EventTemplates({ formData, setFormData, onPreviewModeChange }: ExtendedEditorProps) {
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const importInputRef = useRef<HTMLInputElement>(null);

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
      // Only show badge preview when explicitly on badge tab
      onPreviewModeChange(tab === 'badge' ? 'badge' : 'event');
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
    }
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

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">Experience & Design</h2>
            <p className="text-zinc-400">Define the AI scenes and badge designs for your guests.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-black/30 border border-white/10 p-1">
             <TabsTrigger value="templates" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400">
              <Sparkles className="w-4 h-4 mr-2" />
              AI Templates
            </TabsTrigger>
             {badgeEnabled && (
              <TabsTrigger value="badge" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-zinc-400">
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Visitor Badge
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
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
                  className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Import JSON
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExportTemplates}
                  disabled={templates.length === 0}
                  className="border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
              </div>
              <Button onClick={addTemplate} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Template
              </Button>
            </div>
        
            {/* Templates Grid */}
            {templates.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-2xl bg-zinc-900/30">
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {templates.map((template: Template, index: number) => (
                  <Card 
                    key={template.id} 
                    className={`bg-zinc-900/50 border-white/10 backdrop-blur-sm overflow-hidden group hover:border-white/20 transition-all cursor-pointer ${!template.active ? 'opacity-60' : ''}`}
                    onClick={() => {
                      setEditingTemplateIndex(index);
                      setIsSheetOpen(true);
                    }}
                  >
                    <div className="aspect-video bg-black/40 relative">
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
                          className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white border border-white/10"
                          onClick={(e) => handleExportSingleTemplate(template, e)}
                          title="Export template"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                         <Button 
                          size="icon" 
                          variant="secondary" 
                          className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white border border-white/10"
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
                          <Badge variant="secondary" className="h-5 bg-black/50 text-white backdrop-blur-sm border border-white/10 text-[10px] px-1.5">
                            <Video className="w-3 h-3 mr-1" /> Video
                          </Badge>
                        )}
                        {template.pipelineConfig?.faceswapEnabled && (
                          <Badge variant="secondary" className="h-5 bg-black/50 text-white backdrop-blur-sm border border-white/10 text-[10px] px-1.5">
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
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">Inactive</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-white truncate pr-4">{template.name}</h3>
                          <p className="text-xs text-zinc-400 line-clamp-1">{template.description || "No description"}</p>
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
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
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
                      <SelectTrigger className="bg-black/40 border-white/10 text-white">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800">
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
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
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
        </Tabs>
      </section>

      {/* Template Editor Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl bg-zinc-950 border-l border-white/10 p-0 flex flex-col overflow-hidden" side="right">
          {currentTemplate && editingTemplateIndex !== null && (
            <>
              <SheetHeader className="p-6 border-b border-white/10 bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-white">Edit Template</SheetTitle>
                  <div className="flex items-center gap-2 mr-8">
                     <Switch
                        checked={currentTemplate.active}
                        onCheckedChange={(checked) => updateTemplate(editingTemplateIndex, { active: checked })}
                        className="data-[state=checked]:bg-emerald-500"
                      />
                      <span className="text-xs text-zinc-400">{currentTemplate.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <SheetDescription className="text-zinc-500">
                  Configure AI prompt and settings for this experience.
                </SheetDescription>
              </SheetHeader>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Template Name</Label>
                      <Input 
                        value={currentTemplate.name}
                        onChange={(e) => updateTemplate(editingTemplateIndex, { name: e.target.value })}
                        className="bg-black/40 border-white/10 text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Description</Label>
                      <Input 
                        value={currentTemplate.description}
                        onChange={(e) => updateTemplate(editingTemplateIndex, { description: e.target.value })}
                        className="bg-black/40 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Pipeline Configuration */}
                <div className="space-y-4 p-4 rounded-lg bg-zinc-900/50 border border-white/5">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    AI Pipeline Settings
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-zinc-300 text-xs">Image Model</Label>
                      <Select 
                        value={normalizeModelId(currentTemplate.pipelineConfig?.imageModel) || 'nano-banana'}
                        onValueChange={(v) => updateTemplate(editingTemplateIndex, { 
                          pipelineConfig: { ...currentTemplate.pipelineConfig, imageModel: v } 
                        })}
                      >
                        <SelectTrigger className="bg-black/40 border-white/10 text-white text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          <SelectItem value="nano-banana">Nano Banana (Fast)</SelectItem>
                          <SelectItem value="seedream-v4">SeeDream v4 (Quality)</SelectItem>
                          <SelectItem value="flux-realism">Flux Realism</SelectItem>
                          <SelectItem value="flux-2-pro">Flux 2 Pro</SelectItem>
                        </SelectContent>
                      </Select>
                      {currentTemplate.pipelineConfig?.imageModel && 
                       currentTemplate.pipelineConfig.imageModel !== normalizeModelId(currentTemplate.pipelineConfig.imageModel) && (
                        <p className="text-[10px] text-amber-400">
                          Original: {currentTemplate.pipelineConfig.imageModel}
                        </p>
                      )}
                    </div>

                     <div className="space-y-2">
                      <Label className="text-zinc-300 text-xs">Aspect Ratio</Label>
                      <Select 
                        value={currentTemplate.aspectRatio || 'auto'}
                        onValueChange={(v: any) => updateTemplate(editingTemplateIndex, { aspectRatio: v })}
                      >
                        <SelectTrigger className="bg-black/40 border-white/10 text-white text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          <SelectItem value="auto">Auto (Match Upload)</SelectItem>
                          <SelectItem value="1:1">Square (1:1)</SelectItem>
                          <SelectItem value="3:2">Landscape (3:2)</SelectItem>
                          <SelectItem value="4:5">Portrait (4:5)</SelectItem>
                          <SelectItem value="16:9">Wide (16:9)</SelectItem>
                          <SelectItem value="9:16">Tall (9:16)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-zinc-300 text-xs">Group Model</Label>
                      <Select 
                        value={currentTemplate.pipelineConfig?.groupImageModel ? normalizeModelId(currentTemplate.pipelineConfig.groupImageModel) : 'same'}
                        onValueChange={(v) => updateTemplate(editingTemplateIndex, { 
                          pipelineConfig: { ...currentTemplate.pipelineConfig, groupImageModel: v === 'same' ? undefined : v } 
                        })}
                      >
                        <SelectTrigger className="bg-black/40 border-white/10 text-white text-xs h-8">
                          <SelectValue placeholder="Same as Individual" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                          <SelectItem value="same">Same as Individual</SelectItem>
                          <SelectItem value="nano-banana">Nano Banana (Fast)</SelectItem>
                          <SelectItem value="seedream-v4">SeeDream v4 (Quality)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Seed Input */}
                    <div className="space-y-2">
                      <Label className="text-zinc-300 text-xs flex items-center gap-1">
                        <Dice5 className="w-3 h-3" />
                        Seed (Optional)
                      </Label>
                      <Input 
                        value={currentTemplate.pipelineConfig?.seed?.toString() || ''}
                        onChange={(e) => updateTemplate(editingTemplateIndex, { 
                          pipelineConfig: { ...currentTemplate.pipelineConfig, seed: e.target.value ? parseInt(e.target.value) : undefined } 
                        })}
                        placeholder="e.g., 12345"
                        className="bg-black/40 border-white/10 text-white text-xs h-8 font-mono"
                      />
                      <p className="text-[10px] text-zinc-500">Leave empty for random results</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-white/5 mt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-300 text-xs">Force Instructions</Label>
                      <Switch 
                        checked={currentTemplate.pipelineConfig?.forceInstructions}
                        onCheckedChange={(c) => updateTemplate(editingTemplateIndex, { 
                          pipelineConfig: { ...currentTemplate.pipelineConfig, forceInstructions: c } 
                        })}
                        className="scale-75 data-[state=checked]:bg-indigo-600"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-300 text-xs">Enable Face Swap</Label>
                      <Switch 
                        checked={currentTemplate.pipelineConfig?.faceswapEnabled}
                        onCheckedChange={(c) => updateTemplate(editingTemplateIndex, { 
                          pipelineConfig: { ...currentTemplate.pipelineConfig, faceswapEnabled: c } 
                        })}
                        className="scale-75 data-[state=checked]:bg-indigo-600"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-300 text-xs">Generate Video</Label>
                      <Switch 
                        checked={currentTemplate.pipelineConfig?.videoEnabled}
                        onCheckedChange={(c) => updateTemplate(editingTemplateIndex, { 
                          pipelineConfig: { ...currentTemplate.pipelineConfig, videoEnabled: c } 
                        })}
                        className="scale-75 data-[state=checked]:bg-indigo-600"
                      />
                    </div>
                    
                    {currentTemplate.pipelineConfig?.videoEnabled && (
                      <div className="space-y-2 pl-4 border-l-2 border-indigo-500/30">
                        <Label className="text-zinc-400 text-[10px]">Video Model</Label>
                        <Select 
                          value={currentTemplate.pipelineConfig?.videoModel || 'wan-v2'}
                          onValueChange={(v) => updateTemplate(editingTemplateIndex, { 
                            pipelineConfig: { ...currentTemplate.pipelineConfig, videoModel: v } 
                          })}
                        >
                          <SelectTrigger className="bg-black/40 border-white/10 text-white text-xs h-7">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                            <SelectItem value="wan-v2">Wan v2 (Fast)</SelectItem>
                            <SelectItem value="kling-pro">Kling Pro</SelectItem>
                            <SelectItem value="veo-3.1">Veo 3.1</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-zinc-300 text-xs block">Custom Prompt Mode</Label>
                        <span className="text-[10px] text-zinc-500">Let users write their own prompts</span>
                      </div>
                      <Switch 
                        checked={currentTemplate.isCustomPrompt === true}
                        onCheckedChange={(c) => updateTemplate(editingTemplateIndex, { isCustomPrompt: c })}
                        className="scale-75 data-[state=checked]:bg-orange-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Prompts */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300 flex items-center justify-between">
                      <span>Positive Prompt</span>
                      <span className="text-xs text-zinc-500">What should appear in the image</span>
                    </Label>
                    <Textarea 
                      value={currentTemplate.prompt}
                      onChange={(e) => updateTemplate(editingTemplateIndex, { prompt: e.target.value })}
                      className="bg-black/40 border-white/10 text-white font-mono text-sm min-h-[120px]"
                      placeholder="A professional studio photo of..."
                    />
                    <div className="mt-2 pt-2 border-t border-white/5">
                       <PromptHelper 
                         onSelectPrompt={(prompt) => updateTemplate(editingTemplateIndex, { prompt })}
                         currentPrompt={currentTemplate.prompt}
                         section="template"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Negative Prompt
                      </span>
                      <span className="text-xs text-zinc-500">What to avoid</span>
                    </Label>
                    <Textarea 
                      value={currentTemplate.negativePrompt || ''}
                      onChange={(e) => updateTemplate(editingTemplateIndex, { negativePrompt: e.target.value })}
                      className="bg-black/40 border-white/10 text-white font-mono text-sm"
                      placeholder="blurry, distorted, ugly, low quality..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-purple-500" />
                       Group Prompt <span className="text-zinc-500 text-xs font-normal">(Optional override for groups)</span>
                    </Label>
                    <Textarea 
                      value={currentTemplate.groupPrompt || ''}
                      onChange={(e) => updateTemplate(editingTemplateIndex, { groupPrompt: e.target.value })}
                      className="bg-black/40 border-white/10 text-white font-mono text-sm"
                      placeholder="Same as above, but for multiple people..."
                    />
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
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
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
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
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
                        className="bg-black/40 border-white/10 text-white text-sm"
                      />
                      <p className="text-[10px] text-zinc-500">Text to overlay on the final image</p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
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
                  <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
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
                {formData.albumTracking?.enabled && (
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-cyan-400" />
                      Station Availability
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded bg-black/20 border border-white/5">
                        <Label className="text-zinc-300 text-xs">All Stations</Label>
                        <Switch 
                          checked={!currentTemplate.stationsAssigned || currentTemplate.stationsAssigned === 'all'}
                          onCheckedChange={(c) => updateTemplate(editingTemplateIndex, { 
                            stationsAssigned: c ? 'all' : [] 
                          })}
                          className="scale-75 data-[state=checked]:bg-cyan-600"
                        />
                      </div>
                      
                      {currentTemplate.stationsAssigned !== 'all' && formData.albumTracking.stations.map(station => (
                        <div key={station.id} className="flex items-center justify-between p-2 rounded bg-black/20 border border-white/5 ml-4">
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

              <SheetFooter className="p-6 border-t border-white/10 bg-zinc-900/50">
                <Button onClick={() => setIsSheetOpen(false)} className="w-full bg-white text-black hover:bg-zinc-200">
                  Done Editing
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
