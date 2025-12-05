/**
 * BadgeTemplateEditor Component
 * 
 * Allows users to configure badge templates for registration stations.
 * Refactored for better UX with side-by-side preview.
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  Calendar,
  PartyPopper,
  Upload,
  Trash2,
  LayoutTemplate,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  Loader2,
  Download,
  Sparkles,
  Palette,
  CheckCircle2
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
    sourceTemplateId?: string; // Use existing template for badge photo enhancement
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

// AI Models available (matching production)
const AI_MODELS = [
  { value: 'nano-banana', label: 'Nano Banana (Fast)', desc: 'Gemini 2.5 Flash' },
  { value: 'nano-banana-pro', label: 'Nano Banana Pro (Quality)', desc: 'Gemini 3 Pro' },
  { value: 'seedream-v4', label: 'SeeDream v4', desc: 'Artistic styles' },
  { value: 'seedream-v4.5', label: 'SeeDream 4.5 (Latest)', desc: 'ByteDance latest' },
  { value: 'flux-realism', label: 'Flux Realism', desc: 'Photorealistic' },
  { value: 'flux-2-pro', label: 'Flux 2 Pro', desc: 'Professional' },
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
    model: 'nano-banana',
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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <Label className="text-white font-medium text-base">Enable Badge Generation</Label>
            <p className="text-xs text-zinc-400">
              Automatically create badges for guests
            </p>
          </div>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => updateConfig({ enabled })}
          disabled={disabled}
          className="data-[state=checked]:bg-purple-600"
        />
      </div>

      {config.enabled && (
        <Tabs defaultValue="design" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-zinc-900/50 border border-white/10 rounded-lg p-1">
            <TabsTrigger 
              value="design" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 rounded-md text-xs"
            >
              <Palette className="w-3.5 h-3.5 mr-1.5" />
              Design
            </TabsTrigger>
            <TabsTrigger 
              value="content" 
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-zinc-400 rounded-md text-xs"
            >
              <LayoutTemplate className="w-3.5 h-3.5 mr-1.5" />
              Content
            </TabsTrigger>
            <TabsTrigger 
              value="ai" 
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white text-zinc-400 rounded-md text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI Pipeline
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Visual Design */}
          <TabsContent value="design" className="mt-4 space-y-6">
            {/* Layout */}
            <div className="space-y-3">
              <Label className="text-zinc-300 text-xs uppercase tracking-wider">Layout & Size</Label>
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
                        "p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-2",
                        config.layout === option.value
                          ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                      )}
                    >
                      <Icon className="w-5 h-5 text-zinc-300" />
                      <span className="text-xs font-medium text-white">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Background */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 text-xs uppercase tracking-wider">Background</Label>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-indigo-400"
                  onClick={() => downloadTemplateExample(config.layout)}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download Template
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  className="hidden"
                />
                
                {config.backgroundUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-white/10 group aspect-video">
                    <img
                      src={config.backgroundUrl}
                      alt="Badge background"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                    className="h-full min-h-[80px] border-dashed border-white/20 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white hover:border-white/30"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload Image
                  </Button>
                )}

                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400">Fallback Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={config.backgroundColor || '#1e293b'}
                      onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                      disabled={disabled}
                      className="w-10 h-10 p-1 bg-black/40 border-white/10"
                    />
                    <Input
                      type="text"
                      value={config.backgroundColor || '#1e293b'}
                      onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                      disabled={disabled}
                      className="flex-1 bg-black/40 border-white/10 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Content & Placement */}
          <TabsContent value="content" className="mt-4 space-y-6">
            {/* Photo Placement */}
            <div className="space-y-3">
              <Label className="text-zinc-300 text-xs uppercase tracking-wider">Photo Placement</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-zinc-500">Position</Label>
                  <Select
                    value={config.photoPlacement.position}
                    onValueChange={(position: any) => updatePhotoPlacement({ position })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHOTO_POSITIONS.map((pos) => (
                        <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-zinc-500">Shape</Label>
                  <Select
                    value={config.photoPlacement.shape}
                    onValueChange={(shape: any) => updatePhotoPlacement({ shape })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHOTO_SHAPES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-zinc-500">Size</Label>
                  <Select
                    value={config.photoPlacement.size || 'medium'}
                    onValueChange={(size: any) => updatePhotoPlacement({ size })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHOTO_SIZES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* Fields */}
            <div className="space-y-3">
              <Label className="text-zinc-300 text-xs uppercase tracking-wider">Visible Fields</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'showName', label: 'Visitor Name', icon: User },
                  { key: 'showDateTime', label: 'Date & Time', icon: Calendar },
                  { key: 'showEventName', label: 'Event Name', icon: PartyPopper },
                ].map((field) => (
                  <div key={field.key} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2">
                      <field.icon className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-xs text-zinc-300">{field.label}</span>
                    </div>
                    <Switch
                      checked={(config.fields as any)[field.key]}
                      onCheckedChange={(c) => updateFields({ [field.key]: c })}
                      className="scale-75 data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                ))}
              </div>
              
              <div className="pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-zinc-500">Custom Field 1 Label</Label>
                    <Input
                      value={config.fields.customField1}
                      onChange={(e) => updateFields({ customField1: e.target.value })}
                      placeholder="e.g. Company"
                      className="h-8 text-xs bg-black/40 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-zinc-500">Custom Field 2 Label</Label>
                    <Input
                      value={config.fields.customField2}
                      onChange={(e) => updateFields({ customField2: e.target.value })}
                      placeholder="e.g. Role"
                      className="h-8 text-xs bg-black/40 border-white/10 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-white/5" />

            {/* QR Code */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 text-xs uppercase tracking-wider">QR Code</Label>
                <Switch
                  checked={config.qrCode.enabled}
                  onCheckedChange={(c) => updateQrCode({ enabled: c })}
                  className="scale-75 data-[state=checked]:bg-indigo-600"
                />
              </div>
              
              {config.qrCode.enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-zinc-500">Position</Label>
                    <Select
                      value={config.qrCode.position}
                      onValueChange={(position: any) => updateQrCode({ position })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QR_POSITIONS.map((pos) => (
                          <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-zinc-500">Size</Label>
                    <Select
                      value={config.qrCode.size}
                      onValueChange={(size: any) => updateQrCode({ size })}
                    >
                      <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QR_SIZES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 3: AI Pipeline */}
          <TabsContent value="ai" className="mt-4 space-y-6">
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div>
                <Label className="text-purple-200 font-medium">Enable AI Processing</Label>
                <p className="text-xs text-purple-300/70">Enhance visitor photos using AI</p>
              </div>
              <Switch
                checked={config.aiPipeline.enabled}
                onCheckedChange={(enabled) => updateAiPipeline({ enabled })}
                disabled={disabled}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>

            {config.aiPipeline.enabled && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-zinc-300 text-xs uppercase tracking-wider">Configuration</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-zinc-500">Model</Label>
                      <Select
                        value={config.aiPipeline.model}
                        onValueChange={(model) => updateAiPipeline({ model })}
                      >
                        <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_MODELS.map((model) => (
                            <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-zinc-500">Output Ratio</Label>
                      <Select
                        value={config.aiPipeline.outputRatio || '1:1'}
                        onValueChange={(ratio: any) => updateAiPipeline({ outputRatio: ratio })}
                      >
                        <SelectTrigger className="h-8 text-xs bg-black/40 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OUTPUT_RATIOS.map((ratio) => (
                            <SelectItem key={ratio.value} value={ratio.value}>
                              {ratio.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-zinc-500">Prompt</Label>
                    <Textarea
                      value={config.aiPipeline.prompt}
                      onChange={(e) => updateAiPipeline({ prompt: e.target.value })}
                      placeholder="Describe the style..."
                      className="min-h-[80px] text-xs bg-black/40 border-white/10 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-zinc-300 text-xs uppercase tracking-wider">Reference Images</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {config.aiPipeline.referenceImages?.map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-md overflow-hidden border border-white/10">
                        <img src={img} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeRefImage(i)}
                          className="absolute top-0 right-0 bg-red-500/80 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                    {(config.aiPipeline.referenceImages?.length || 0) < 4 && (
                      <button
                        onClick={() => refImageInputRef.current?.click()}
                        disabled={isUploadingRef}
                        className="aspect-square rounded-md border border-dashed border-white/20 flex items-center justify-center hover:bg-white/5 transition-colors"
                      >
                        {isUploadingRef ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : <Upload className="w-4 h-4 text-zinc-500" />}
                      </button>
                    )}
                    <input
                      ref={refImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleRefImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

export default BadgeTemplateEditor;
