import React, { useMemo, useState, useEffect } from "react";
import { BadgeTemplateEditor, BadgeTemplateConfig } from "@/components/templates";
import { BADGE_LAYOUT_PRESETS } from "./layoutPresets";
import { BadgeLayoutTemplate, BadgePrintSettings, BadgeProConfig } from "./types";
import { normalizePrintSettings } from "./units";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, LayoutTemplate as LayoutTemplateIcon, Printer, Scan } from "lucide-react";
import { BadgePrintPreview } from "./BadgePrintPreview";
import { exportBadgeAsPdf, exportBadgeAsPng } from "./exportUtils";

interface BadgeDesignerProProps {
  config: BadgeProConfig;
  onChange: (config: BadgeProConfig) => void;
  eventName?: string;
  albumCode?: string;
  className?: string;
  onTabChange?: (tab: 'design' | 'content' | 'print') => void;
}

function applyLayoutTemplate(template: BadgeLayoutTemplate, config: BadgeProConfig): BadgeProConfig {
  return {
    ...config,
    layout: template.layout,
    layoutTemplateId: template.id,
    print: { ...normalizePrintSettings(template.print) },
    customPositions: template.positions || config.customPositions,
    useCustomPositions: true,
    qrCode: {
      ...config.qrCode,
      size: template.qrSize || config.qrCode.size,
    },
    photoPlacement: {
      ...config.photoPlacement,
      size: template.photoSize || config.photoPlacement.size,
    },
    backgroundColor: template.backgroundColor || config.backgroundColor,
    backgroundUrl: template.backgroundUrl || config.backgroundUrl,
  };
}

export function BadgeDesignerPro({ config, onChange, eventName, albumCode, className, onTabChange }: BadgeDesignerProProps) {
  const [activeTab, setActiveTab] = useState<"design" | "content" | "print">("design");
  const [snapToGrid, setSnapToGrid] = useState(true);

  const print = useMemo(() => normalizePrintSettings(config.print), [config.print]);

  const handleTabChange = (val: string) => {
    const tab = val as "design" | "content" | "print";
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Optional grid snapping for custom positions
  React.useEffect(() => {
    if (!snapToGrid || !config.customPositions) return;
    const snapValue = (v?: number) => (v === undefined ? undefined : Math.round(v / 2) * 2);
    const snapped = Object.fromEntries(
      Object.entries(config.customPositions).map(([key, pos]: any) => [
        key,
        pos
          ? {
              ...pos,
              x: snapValue(pos.x),
              y: snapValue(pos.y),
              width: snapValue(pos.width),
              height: snapValue(pos.height),
            }
          : pos,
      ])
    );
    // Avoid unnecessary onChange if nothing changed
    if (JSON.stringify(snapped) !== JSON.stringify(config.customPositions)) {
      onChange({
        ...config,
        customPositions: snapped as any,
        useCustomPositions: true,
      });
    }
  }, [snapToGrid, config.customPositions]);

  const handlePrintChange = (updates: Partial<BadgePrintSettings>) => {
    onChange({
      ...config,
      print: normalizePrintSettings({ ...print, ...updates }),
    });
  };

  const handleExport = async (mode: "png" | "pdf") => {
    try {
      if (mode === "png") {
        await exportBadgeAsPng(config, print, albumCode);
        toast.success("Exported PNG at 300 DPI");
      } else {
        await exportBadgeAsPdf(config, print, albumCode);
        toast.success("Exported PDF at real size");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || `Failed to export ${mode.toUpperCase()}`);
    }
  };

  const handleTemplateSelect = (preset: BadgeLayoutTemplate) => {
    onChange(applyLayoutTemplate(preset, config));
    toast.success(`Applied layout: ${preset.name}`);
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 bg-zinc-900/50 border border-white/10 p-1 w-full justify-start h-auto">
          <TabsTrigger 
            value="design"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 rounded-md px-4 py-2"
          >
            Design
          </TabsTrigger>
          <TabsTrigger 
            value="content"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 rounded-md px-4 py-2"
          >
            Content
          </TabsTrigger>
          <TabsTrigger 
            value="print"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 rounded-md px-4 py-2"
          >
            Print Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="space-y-6">
          <BadgeTemplateEditor
            config={config}
            onChange={onChange}
            eventName={eventName}
            className="bg-zinc-900/30 p-0 border-0"
            activeTab="design"
          />
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <BadgeTemplateEditor
            config={config}
            onChange={onChange}
            eventName={eventName}
            className="bg-zinc-900/30 p-0 border-0"
            activeTab="content"
          />
        </TabsContent>

        <TabsContent value="print" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card className="bg-zinc-900/30 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <LayoutTemplateIcon className="w-4 h-4 text-indigo-400" />
                  Layout Templates
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {BADGE_LAYOUT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleTemplateSelect(preset)}
                    className="text-left p-4 rounded-xl border border-white/5 bg-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">{preset.name}</p>
                      <Badge variant="secondary" className="text-[10px] bg-black/40 text-zinc-400">
                        {preset.print.widthInches}"×{preset.print.heightInches}"
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-2">{preset.description}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/30 border-white/10">
              <CardHeader>
                <CardTitle className="text-base text-white">Print Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Label className="text-xs text-zinc-400 uppercase tracking-wider">Dimensions</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500">Width (in)</Label>
                        <Input
                          type="number"
                          value={print.widthInches}
                          step="0.01"
                          min="0.5"
                          onChange={(e) => handlePrintChange({ widthInches: parseFloat(e.target.value) })}
                          className="bg-black/40 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500">Height (in)</Label>
                        <Input
                          type="number"
                          value={print.heightInches}
                          step="0.01"
                          min="0.5"
                          onChange={(e) => handlePrintChange({ heightInches: parseFloat(e.target.value) })}
                          className="bg-black/40 border-white/10 text-white"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-xs text-zinc-400 uppercase tracking-wider">Print Quality</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500">DPI</Label>
                        <Input
                          type="number"
                          value={print.dpi}
                          min="72"
                          max="1200"
                          onChange={(e) => handlePrintChange({ dpi: parseInt(e.target.value, 10) })}
                          className="bg-black/40 border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] text-zinc-500">Bleed (in)</Label>
                        <Input
                          type="number"
                          value={print.bleedInches || 0}
                          step="0.01"
                          min="0"
                          onChange={(e) => handlePrintChange({ bleedInches: parseFloat(e.target.value) })}
                          className="bg-black/40 border-white/10 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-white/5" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Snap to grid</p>
                    <p className="text-xs text-zinc-500">Auto-align elements to 2% increments</p>
                  </div>
                  <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} className="data-[state=checked]:bg-indigo-600" />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => handleExport("png")} className="flex-1 border-white/10 hover:bg-white/5 text-zinc-300 hover:text-white">
                    <Download className="w-4 h-4 mr-2" />
                    PNG (300 DPI)
                  </Button>
                  <Button onClick={() => handleExport("pdf")} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
                    <Printer className="w-4 h-4 mr-2" />
                    PDF (Print Ready)
                  </Button>
                </div>

                <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-3 flex gap-3">
                  <Scan className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-indigo-300">High-Resolution QR</p>
                    <p className="text-[10px] text-indigo-300/70 leading-relaxed">
                      Generates vector-quality QR codes for crisp printing at any size.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
