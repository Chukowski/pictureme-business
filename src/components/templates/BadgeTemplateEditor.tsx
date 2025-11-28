/**
 * BadgeTemplateEditor Component
 * 
 * Allows users to configure badge templates for registration stations.
 * Includes AI pipeline configuration, background upload, and custom fields.
 * 
 * Badge Generation Flow:
 * 1. User takes/uploads photo at Registration
 * 2. Photo is processed with AI (using badge template pipeline)
 * 3. AI generates image in specified ratio
 * 4. System composites: Background + AI-generated photo + QR + Text fields
 * 5. Final badge is ready for download/print
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  QrCode,
  User,
  Calendar,
  PartyPopper,
  Type,
  Image as ImageIcon,
  Upload,
  Trash2,
  LayoutTemplate,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Eye,
  Loader2,
  Download,
  Wand2,
  Sparkles,
  Settings2,
  Palette,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Element position type for custom positioning (percentages 0-100)
export interface ElementPosition {
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  width?: number; // percentage of badge width (optional)
  height?: number; // percentage of badge height (optional)
}

// Custom element positions for visual editor
export interface CustomElementPositions {
  photo?: ElementPosition;
  name?: ElementPosition;
  eventName?: ElementPosition;
  dateTime?: ElementPosition;
  customField1?: ElementPosition;
  customField2?: ElementPosition;
  qrCode?: ElementPosition;
}

export interface BadgeTemplateConfig {
  enabled: boolean;
  layout: 'portrait' | 'landscape' | 'square';
  backgroundUrl?: string;
  backgroundColor?: string;
  
  // AI Pipeline Configuration
  aiPipeline: {
    enabled: boolean;
    prompt: string;
    model: string;
    referenceImages: string[];
    outputRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  };
  
  // Fields configuration
  fields: {
    showName: boolean;
    showDateTime: boolean;
    showEventName: boolean;
    customField1: string;
    customField2: string;
  };
  
  // QR Code configuration
  qrCode: {
    enabled: boolean;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    size: 'small' | 'medium' | 'large';
  };
  
  // Photo placement
  photoPlacement: {
    position: 'top' | 'center' | 'left' | 'right';
    shape: 'circle' | 'rounded' | 'square';
    size: 'small' | 'medium' | 'large';
  };
  
  // Custom element positions (optional - for visual editor)
  customPositions?: CustomElementPositions;
  
  // Use custom positions instead of preset positions
  useCustomPositions?: boolean;
  
  // Text styling
  textStyle?: {
    nameColor?: string;
    nameFontSize?: number; // percentage of badge height
    eventNameColor?: string;
    eventNameFontSize?: number;
    dateTimeColor?: string;
    dateTimeFontSize?: number;
    fontFamily?: string;
  };
}

interface BadgeTemplateEditorProps {
  config: BadgeTemplateConfig;
  onChange: (config: BadgeTemplateConfig) => void;
  eventName?: string;
  disabled?: boolean;
  className?: string;
}

// Layout options with dimensions
const LAYOUT_OPTIONS = [
  { value: 'portrait', label: 'Portrait', icon: RectangleVertical, dimensions: '3×4', width: 600, height: 800 },
  { value: 'landscape', label: 'Landscape', icon: RectangleHorizontal, dimensions: '4×3', width: 800, height: 600 },
  { value: 'square', label: 'Square', icon: Square, dimensions: '1:1', width: 600, height: 600 },
] as const;

// AI output ratio options
const OUTPUT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)', desc: 'Best for profile photos' },
  { value: '3:4', label: 'Portrait (3:4)', desc: 'Standard portrait' },
  { value: '4:3', label: 'Landscape (4:3)', desc: 'Standard landscape' },
  { value: '9:16', label: 'Story (9:16)', desc: 'Full portrait' },
  { value: '16:9', label: 'Wide (16:9)', desc: 'Widescreen' },
] as const;

// AI Models available
const AI_MODELS = [
  { value: 'fal-ai/bytedance/seedream/v4/edit', label: 'Seedream v4 (Recommended)', desc: 'Best quality' },
  { value: 'fal-ai/flux-realism', label: 'Flux Realism', desc: 'Photorealistic' },
  { value: 'fal-ai/gemini-flash', label: 'Gemini Flash', desc: 'Fast generation' },
] as const;

const QR_POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'center', label: 'Center' },
] as const;

const QR_SIZES = [
  { value: 'small', label: 'Small', size: '15%' },
  { value: 'medium', label: 'Medium', size: '20%' },
  { value: 'large', label: 'Large', size: '25%' },
] as const;

const PHOTO_POSITIONS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
] as const;

const PHOTO_SHAPES = [
  { value: 'circle', label: 'Circle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
] as const;

const PHOTO_SIZES = [
  { value: 'small', label: 'Small', percent: '25%' },
  { value: 'medium', label: 'Medium', percent: '35%' },
  { value: 'large', label: 'Large', percent: '45%' },
] as const;

// Default element positions (percentages)
export const DEFAULT_ELEMENT_POSITIONS: CustomElementPositions = {
  photo: { x: 50, y: 20, width: 30, height: 30 },
  name: { x: 50, y: 55 },
  eventName: { x: 50, y: 62 },
  dateTime: { x: 50, y: 68 },
  customField1: { x: 50, y: 74 },
  customField2: { x: 50, y: 80 },
  qrCode: { x: 50, y: 88, width: 15, height: 15 },
};

// Default config
export const DEFAULT_BADGE_CONFIG: BadgeTemplateConfig = {
  enabled: false,
  layout: 'portrait',
  backgroundColor: '#1e293b',
  aiPipeline: {
    enabled: false,
    prompt: 'Create a professional portrait photo with a clean, modern background. Keep the person\'s face and features accurate.',
    model: 'fal-ai/bytedance/seedream/v4/edit',
    referenceImages: [],
    outputRatio: '1:1',
  },
  fields: {
    showName: true,
    showDateTime: true,
    showEventName: true,
    customField1: '',
    customField2: '',
  },
  useCustomPositions: false,
  customPositions: { ...DEFAULT_ELEMENT_POSITIONS },
  textStyle: {
    nameColor: '#ffffff',
    nameFontSize: 6,
    eventNameColor: 'rgba(255,255,255,0.8)',
    eventNameFontSize: 3.5,
    dateTimeColor: 'rgba(255,255,255,0.6)',
    dateTimeFontSize: 2.8,
    fontFamily: 'sans-serif',
  },
  qrCode: {
    enabled: true,
    position: 'bottom-right',
    size: 'medium',
  },
  photoPlacement: {
    position: 'top',
    shape: 'circle',
    size: 'medium',
  },
};

export function BadgeTemplateEditor({
  config,
  onChange,
  eventName = 'Event Name',
  disabled = false,
  className
}: BadgeTemplateEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  const updateConfig = (updates: Partial<BadgeTemplateConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateFields = (updates: Partial<BadgeTemplateConfig['fields']>) => {
    onChange({ ...config, fields: { ...config.fields, ...updates } });
  };

  const updateQrCode = (updates: Partial<BadgeTemplateConfig['qrCode']>) => {
    onChange({ ...config, qrCode: { ...config.qrCode, ...updates } });
  };

  const updatePhotoPlacement = (updates: Partial<BadgeTemplateConfig['photoPlacement']>) => {
    onChange({ ...config, photoPlacement: { ...config.photoPlacement, ...updates } });
  };

  const updateAiPipeline = (updates: Partial<BadgeTemplateConfig['aiPipeline']>) => {
    onChange({ ...config, aiPipeline: { ...config.aiPipeline, ...updates } });
  };

  // Handle background upload
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateConfig({ backgroundUrl: reader.result as string });
        setIsUploading(false);
        toast.success('Background uploaded');
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload background');
      setIsUploading(false);
    }
  };

  // Handle reference image upload for AI
  const handleRefImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploadingRef(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImages = [...(config.aiPipeline.referenceImages || []), reader.result as string];
        updateAiPipeline({ referenceImages: newImages });
        setIsUploadingRef(false);
        toast.success('Reference image added');
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
        setIsUploadingRef(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload reference image');
      setIsUploadingRef(false);
    }
  };

  const removeBackground = () => {
    updateConfig({ backgroundUrl: undefined });
  };

  const removeRefImage = (index: number) => {
    const newImages = config.aiPipeline.referenceImages.filter((_, i) => i !== index);
    updateAiPipeline({ referenceImages: newImages });
  };

  // Download template background example
  const downloadTemplateExample = (layout: typeof config.layout) => {
    const layoutConfig = LAYOUT_OPTIONS.find(l => l.value === layout);
    if (!layoutConfig) return;

    const canvas = document.createElement('canvas');
    canvas.width = layoutConfig.width;
    canvas.height = layoutConfig.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw guidelines
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([10, 5]);
    ctx.lineWidth = 2;

    // Photo area (top center)
    const photoSize = Math.min(canvas.width, canvas.height) * 0.35;
    const photoX = (canvas.width - photoSize) / 2;
    const photoY = canvas.height * 0.1;
    ctx.strokeRect(photoX, photoY, photoSize, photoSize);

    // QR area (bottom right)
    const qrSize = Math.min(canvas.width, canvas.height) * 0.2;
    ctx.strokeRect(canvas.width - qrSize - 20, canvas.height - qrSize - 20, qrSize, qrSize);

    // Text area (bottom)
    ctx.strokeRect(20, canvas.height - 150, canvas.width - 40, 100);

    // Add labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Photo Area', canvas.width / 2, photoY + photoSize / 2);
    ctx.fillText('QR Code', canvas.width - qrSize / 2 - 20, canvas.height - qrSize / 2 - 20);
    ctx.fillText('Text Fields', canvas.width / 2, canvas.height - 100);

    // Add dimensions
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${layoutConfig.width} × ${layoutConfig.height}px`, canvas.width / 2, 30);

    // Download
    const link = document.createElement('a');
    link.download = `badge-template-${layout}-${layoutConfig.width}x${layoutConfig.height}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    toast.success(`Downloaded ${layout} template (${layoutConfig.width}×${layoutConfig.height}px)`);
  };

  // Badge preview dimensions
  const previewDimensions = {
    portrait: { width: 180, height: 240 },
    landscape: { width: 240, height: 180 },
    square: { width: 200, height: 200 },
  };

  const dims = previewDimensions[config.layout];
  const photoSizeMap = { small: 50, medium: 70, large: 90 };
  const photoSize = photoSizeMap[config.photoPlacement.size || 'medium'];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-black/30 border border-white/10">
        <div className="space-y-0.5">
          <Label className="text-white font-medium">Badge Template</Label>
          <p className="text-xs text-zinc-400">
            Configure badge design for registration station
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => updateConfig({ enabled })}
          disabled={disabled}
          className="data-[state=checked]:bg-indigo-600"
        />
      </div>

      {config.enabled && (
        <Tabs defaultValue="design" className="space-y-4">
          <TabsList className="bg-black/30 border border-white/10 p-1">
            <TabsTrigger value="design" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400">
              <Palette className="w-4 h-4 mr-2" />
              Design
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-zinc-400">
              <Wand2 className="w-4 h-4 mr-2" />
              AI Pipeline
            </TabsTrigger>
            <TabsTrigger value="fields" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-zinc-400">
              <Type className="w-4 h-4 mr-2" />
              Fields
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-zinc-400">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-4">
            {/* Layout Selection */}
            <Card className="bg-black/30 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-indigo-400" />
                  Layout & Size
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {LAYOUT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateConfig({ layout: option.value })}
                        disabled={disabled}
                        className={cn(
                          "p-4 rounded-xl border text-center transition-all",
                          config.layout === option.value
                            ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        )}
                      >
                        <Icon className="w-6 h-6 mx-auto mb-2 text-zinc-300" />
                        <p className="text-sm font-medium text-white">{option.label}</p>
                        <p className="text-xs text-zinc-400">{option.width}×{option.height}px</p>
                      </button>
                    );
                  })}
                </div>

                {/* Download Template Examples */}
                <div className="pt-4 border-t border-white/10">
                  <Label className="text-xs text-zinc-400 mb-2 block">Download Background Template</Label>
                  <div className="flex flex-wrap gap-2">
                    {LAYOUT_OPTIONS.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                        onClick={() => downloadTemplateExample(option.value)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        {option.label} ({option.width}×{option.height})
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    Download a template with guidelines to design your custom background
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Background */}
            <Card className="bg-black/30 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  Background
                </CardTitle>
                <CardDescription className="text-zinc-400">Upload a custom background or use a solid color</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  className="hidden"
                />
                
                {config.backgroundUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/10">
                    <img
                      src={config.backgroundUrl}
                      alt="Badge background"
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeBackground}
                        disabled={disabled}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-dashed border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Background Image
                  </Button>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Background Color (Fallback)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.backgroundColor || '#1e293b'}
                      onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                      disabled={disabled}
                      className="w-12 h-10 p-1 bg-black/40 border-white/10"
                    />
                    <Input
                      type="text"
                      value={config.backgroundColor || '#1e293b'}
                      onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                      disabled={disabled}
                      placeholder="#1e293b"
                      className="flex-1 bg-black/40 border-white/10 text-white placeholder:text-zinc-600 font-mono text-sm focus:border-indigo-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photo Placement */}
            <Card className="bg-black/30 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-400" />
                  Photo Placement
                </CardTitle>
                <CardDescription className="text-zinc-400">Configure visitor photo display</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Position</Label>
                    <Select
                      value={config.photoPlacement.position}
                      onValueChange={(position: BadgeTemplateConfig['photoPlacement']['position']) => 
                        updatePhotoPlacement({ position })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="bg-black/40 border-white/10 text-white focus:border-indigo-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PHOTO_POSITIONS.map((pos) => (
                          <SelectItem key={pos.value} value={pos.value}>
                            {pos.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Shape</Label>
                    <Select
                      value={config.photoPlacement.shape}
                      onValueChange={(shape: BadgeTemplateConfig['photoPlacement']['shape']) => 
                        updatePhotoPlacement({ shape })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="bg-black/40 border-white/10 text-white focus:border-indigo-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PHOTO_SHAPES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400">Size</Label>
                    <Select
                      value={config.photoPlacement.size || 'medium'}
                      onValueChange={(size: BadgeTemplateConfig['photoPlacement']['size']) => 
                        updatePhotoPlacement({ size })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="bg-black/40 border-white/10 text-white focus:border-indigo-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PHOTO_SIZES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label} ({s.percent})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code Settings */}
            <Card className="bg-black/30 border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-cyan-400" />
                    QR Code
                  </CardTitle>
                  <Switch
                    checked={config.qrCode.enabled}
                    onCheckedChange={(enabled) => updateQrCode({ enabled })}
                    disabled={disabled}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                </div>
                <CardDescription className="text-zinc-400">Links to visitor's album for photo collection</CardDescription>
              </CardHeader>
              {config.qrCode.enabled && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">Position</Label>
                      <Select
                        value={config.qrCode.position}
                        onValueChange={(position: BadgeTemplateConfig['qrCode']['position']) => 
                          updateQrCode({ position })
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger className="bg-black/40 border-white/10 text-white focus:border-indigo-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QR_POSITIONS.map((pos) => (
                            <SelectItem key={pos.value} value={pos.value}>
                              {pos.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">Size</Label>
                      <Select
                        value={config.qrCode.size}
                        onValueChange={(size: BadgeTemplateConfig['qrCode']['size']) => 
                          updateQrCode({ size })
                        }
                        disabled={disabled}
                      >
                        <SelectTrigger className="bg-black/40 border-white/10 text-white focus:border-indigo-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QR_SIZES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label} ({s.size})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* AI Pipeline Tab */}
          <TabsContent value="ai" className="space-y-4">
            <Card className="bg-black/30 border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    AI Photo Enhancement
                  </CardTitle>
                  <Switch
                    checked={config.aiPipeline.enabled}
                    onCheckedChange={(enabled) => updateAiPipeline({ enabled })}
                    disabled={disabled}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
                <CardDescription className="text-zinc-400">
                  Process visitor photos with AI before adding to badge
                </CardDescription>
              </CardHeader>
              {config.aiPipeline.enabled && (
                <CardContent className="space-y-4">
                  {/* Token Warning */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-400">Token Usage</p>
                        <p className="text-xs text-amber-200/70">
                          AI processing uses tokens. Each badge generation will consume tokens based on your plan.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Model Selection */}
                  <div className="space-y-2">
                    <Label className="text-zinc-300">AI Model</Label>
                    <Select
                      value={config.aiPipeline.model}
                      onValueChange={(model) => updateAiPipeline({ model })}
                      disabled={disabled}
                    >
                      <SelectTrigger className="bg-black/40 border-white/10 text-white focus:border-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_MODELS.map((model) => (
                          <SelectItem key={model.value} value={model.value}>
                            <div>
                              <span>{model.label}</span>
                              <span className="text-xs text-zinc-400 ml-2">({model.desc})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Output Ratio */}
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Output Ratio</Label>
                    <Select
                      value={config.aiPipeline.outputRatio}
                      onValueChange={(ratio: BadgeTemplateConfig['aiPipeline']['outputRatio']) => 
                        updateAiPipeline({ outputRatio: ratio })
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="bg-black/40 border-white/10 text-white focus:border-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTPUT_RATIOS.map((ratio) => (
                          <SelectItem key={ratio.value} value={ratio.value}>
                            <div>
                              <span>{ratio.label}</span>
                              <span className="text-xs text-zinc-400 ml-2">({ratio.desc})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* AI Prompt */}
                  <div className="space-y-2">
                    <Label className="text-zinc-300">AI Prompt</Label>
                    <Textarea
                      value={config.aiPipeline.prompt}
                      onChange={(e) => updateAiPipeline({ prompt: e.target.value })}
                      disabled={disabled}
                      placeholder="Describe how the AI should enhance the photo..."
                      className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 min-h-[100px] focus:border-purple-500"
                    />
                    <p className="text-xs text-zinc-500">
                      Describe the style, background, or enhancements you want applied to visitor photos.
                    </p>
                  </div>

                  {/* Reference Images */}
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Reference Images (Optional)</Label>
                    <p className="text-xs text-zinc-500 mb-2">
                      Add style reference images for the AI to match
                    </p>
                    
                    <input
                      ref={refImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleRefImageUpload}
                      className="hidden"
                    />

                    <div className="grid grid-cols-4 gap-2">
                      {config.aiPipeline.referenceImages?.map((img, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={img}
                            alt={`Reference ${i + 1}`}
                            className="w-full aspect-square object-cover rounded-xl border border-white/10"
                          />
                          <button
                            type="button"
                            onClick={() => removeRefImage(i)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                      
                      {(config.aiPipeline.referenceImages?.length || 0) < 4 && (
                        <button
                          type="button"
                          onClick={() => refImageInputRef.current?.click()}
                          disabled={disabled || isUploadingRef}
                          className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center hover:border-purple-500/50 hover:bg-white/5 transition-colors"
                        >
                          {isUploadingRef ? (
                            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                          ) : (
                            <Upload className="w-6 h-6 text-zinc-500" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Fields Tab */}
          <TabsContent value="fields" className="space-y-4">
            <Card className="bg-black/30 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Type className="w-4 h-4 text-emerald-400" />
                  Display Fields
                </CardTitle>
                <CardDescription className="text-zinc-400">Select which information to display on the badge</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-white">Visitor Name</span>
                    </div>
                    <Switch
                      checked={config.fields.showName}
                      onCheckedChange={(showName) => updateFields({ showName })}
                      disabled={disabled}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-white">Date & Time</span>
                    </div>
                    <Switch
                      checked={config.fields.showDateTime}
                      onCheckedChange={(showDateTime) => updateFields({ showDateTime })}
                      disabled={disabled}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <PartyPopper className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-white">Event Name</span>
                    </div>
                    <Switch
                      checked={config.fields.showEventName}
                      onCheckedChange={(showEventName) => updateFields({ showEventName })}
                      disabled={disabled}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <Label className="text-xs text-zinc-400">Custom Fields (Labels)</Label>
                  <Input
                    value={config.fields.customField1}
                    onChange={(e) => updateFields({ customField1: e.target.value })}
                    placeholder="Custom field 1 label (e.g., Company)"
                    disabled={disabled}
                    className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                  />
                  <Input
                    value={config.fields.customField2}
                    onChange={(e) => updateFields({ customField2: e.target.value })}
                    placeholder="Custom field 2 label (e.g., Role)"
                    disabled={disabled}
                    className="bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-emerald-500"
                  />
                  <p className="text-xs text-zinc-500">
                    Custom fields will be filled in by visitors during registration
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <Card className="bg-black/30 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  Badge Preview
                </CardTitle>
                <CardDescription className="text-zinc-400">See how badges will look</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div
                    className="relative rounded-xl overflow-hidden border-2 border-white/20 shadow-xl"
                    style={{
                      width: dims.width,
                      height: dims.height,
                      backgroundColor: config.backgroundColor || '#1e293b',
                      backgroundImage: config.backgroundUrl ? `url(${config.backgroundUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Photo placeholder - use custom positions if enabled */}
                    {config.useCustomPositions && config.customPositions?.photo ? (
                      <div
                        className={cn(
                          "absolute bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center",
                          config.photoPlacement.shape === 'circle' && "rounded-full",
                          config.photoPlacement.shape === 'rounded' && "rounded-lg"
                        )}
                        style={{ 
                          width: photoSize, 
                          height: photoSize,
                          left: `${config.customPositions.photo.x}%`,
                          top: `${config.customPositions.photo.y}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <User className="w-6 h-6 text-white/50" />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "absolute bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center",
                          config.photoPlacement.shape === 'circle' && "rounded-full",
                          config.photoPlacement.shape === 'rounded' && "rounded-lg",
                          config.photoPlacement.position === 'top' && "top-4 left-1/2 -translate-x-1/2",
                          config.photoPlacement.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                          config.photoPlacement.position === 'left' && "top-1/2 left-4 -translate-y-1/2",
                          config.photoPlacement.position === 'right' && "top-1/2 right-4 -translate-y-1/2"
                        )}
                        style={{ width: photoSize, height: photoSize }}
                      >
                        <User className="w-6 h-6 text-white/50" />
                      </div>
                    )}

                    {/* AI badge indicator */}
                    {config.aiPipeline.enabled && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-purple-500/80 text-white text-[10px]">
                          <Sparkles className="w-2 h-2 mr-1" />
                          AI Enhanced
                        </Badge>
                      </div>
                    )}

                    {/* QR Code placeholder - use custom positions if enabled */}
                    {config.qrCode.enabled && (
                      config.useCustomPositions && config.customPositions?.qrCode ? (
                        <div
                          className="absolute bg-white p-1 rounded"
                          style={{
                            width: config.qrCode.size === 'small' ? 30 : config.qrCode.size === 'medium' ? 40 : 50,
                            height: config.qrCode.size === 'small' ? 30 : config.qrCode.size === 'medium' ? 40 : 50,
                            left: `${config.customPositions.qrCode.x}%`,
                            top: `${config.customPositions.qrCode.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          <QrCode className="w-full h-full text-zinc-800" />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "absolute bg-white p-1 rounded",
                            config.qrCode.position === 'top-left' && "top-2 left-2",
                            config.qrCode.position === 'top-right' && "top-2 right-2",
                            config.qrCode.position === 'bottom-left' && "bottom-2 left-2",
                            config.qrCode.position === 'bottom-right' && "bottom-2 right-2",
                            config.qrCode.position === 'center' && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                          )}
                          style={{
                            width: config.qrCode.size === 'small' ? 30 : config.qrCode.size === 'medium' ? 40 : 50,
                            height: config.qrCode.size === 'small' ? 30 : config.qrCode.size === 'medium' ? 40 : 50,
                          }}
                        >
                          <QrCode className="w-full h-full text-zinc-800" />
                        </div>
                      )
                    )}

                    {/* Fields preview - use custom positions if enabled */}
                    {config.useCustomPositions && config.customPositions?.name ? (
                      <>
                        {config.fields.showName && (
                          <p 
                            className="absolute text-xs font-semibold text-white truncate"
                            style={{
                              left: `${config.customPositions.name?.x || 50}%`,
                              top: `${config.customPositions.name?.y || 72}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            John Doe
                          </p>
                        )}
                        {config.fields.showEventName && (
                          <p 
                            className="absolute text-[10px] text-zinc-300 truncate"
                            style={{
                              left: `${config.customPositions.eventName?.x || 50}%`,
                              top: `${config.customPositions.eventName?.y || 80}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            {eventName}
                          </p>
                        )}
                        {config.fields.showDateTime && (
                          <p 
                            className="absolute text-[10px] text-zinc-400"
                            style={{
                              left: `${config.customPositions.dateTime?.x || 50}%`,
                              top: `${config.customPositions.dateTime?.y || 87}%`,
                              transform: 'translate(-50%, -50%)',
                            }}
                          >
                            Nov 28, 2025 • 2:30 PM
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="absolute bottom-2 left-2 right-2 space-y-0.5">
                        {config.fields.showName && (
                          <p className="text-xs font-semibold text-white truncate">John Doe</p>
                        )}
                        {config.fields.showEventName && (
                          <p className="text-[10px] text-zinc-300 truncate">{eventName}</p>
                        )}
                        {config.fields.showDateTime && (
                          <p className="text-[10px] text-zinc-400">Nov 28, 2025 • 2:30 PM</p>
                        )}
                        {config.fields.customField1 && (
                          <p className="text-[10px] text-zinc-400 truncate">{config.fields.customField1}: <span className="text-zinc-300">Value</span></p>
                        )}
                        {config.fields.customField2 && (
                          <p className="text-[10px] text-zinc-400 truncate">{config.fields.customField2}: <span className="text-zinc-300">Value</span></p>
                        )}
                      </div>
                    )}

                    {/* Custom positions indicator */}
                    {config.useCustomPositions && (
                      <div className="absolute bottom-1 right-1">
                        <Badge className="bg-cyan-500/80 text-white text-[8px]">
                          Custom Layout
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Custom Layout Tip */}
                <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                  <p className="text-xs text-cyan-400">
                    <strong>💡 Tip:</strong> Use the <span className="font-semibold">Playground → Badge Test</span> to drag and position elements exactly where you want them, then save the custom layout.
                  </p>
                </div>
                
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-medium text-white mb-2">Badge Generation Flow</h4>
                  <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
                    <li>Visitor takes/uploads photo at Registration Station</li>
                    {config.aiPipeline.enabled && (
                      <li className="text-purple-400">Photo is enhanced with AI ({config.aiPipeline.outputRatio} ratio)</li>
                    )}
                    <li>System composites badge with background + photo + QR + fields</li>
                    <li>Badge is ready for download/print</li>
                  </ol>
                </div>

                <p className="text-xs text-zinc-500 text-center mt-3">
                  This is a simplified preview. Actual badge will include real visitor data.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default BadgeTemplateEditor;
