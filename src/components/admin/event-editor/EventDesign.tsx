import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Moon, Sun, PartyPopper, Building2, Baby, Gift, Upload, Image as ImageIcon, Palette, Layers, Stamp, Loader2, Sparkles, Trash2, Globe, Monitor } from "lucide-react";
import { EditorSectionProps, EventFormData } from "./types";
import { uploadTemplateImage } from "@/services/templateStorage";
import { toast } from "sonner";
import { MediaLibrary } from "@/components/MediaLibrary";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

export function EventDesign({ formData, setFormData, currentUser }: EditorSectionProps) {
  const [isUploading, setIsUploading] = useState<string | null>(null);

  // Determine tier for branding locks
  // Determine tier for branding locks - Robust detection across all potential fields
  const tierIndicators = [
    currentUser?.subscription_tier,
    currentUser?.role,
    currentUser?.tier,
    currentUser?.plan_name,
    currentUser?.plan_id
  ].filter(Boolean).map(t => String(t).toLowerCase());

  const isStudio = tierIndicators.some(t =>
    t.includes('studio') ||
    t.includes('business') ||
    t.includes('enterprise') ||
    t.includes('masters') ||
    t.includes('pro') ||
    t.includes('starter') || // business_starter
    t.includes('eventpro')    // business_eventpro
  ) || currentUser?.is_admin || currentUser?.role === 'superadmin';

  // Helper to update theme
  const updateTheme = (updates: any) => {
    setFormData({
      ...formData,
      theme: { ...formData.theme, ...updates }
    });
  };

  // Helper to update branding
  const updateBranding = (updates: any) => {
    setFormData({
      ...formData,
      branding: { ...formData.branding, ...updates }
    });
  };

  // Handle Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoPath' | 'footerPath') => {
    if (!e.target.files || e.target.files.length === 0) return;

    try {
      setIsUploading(field);
      const file = e.target.files[0];
      const url = await uploadTemplateImage(file);
      updateBranding({ [field]: url });
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Upload failed", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(null);
      e.target.value = ''; // Reset input
    }
  };


  // Helper to update watermark
  const updateWatermark = (updates: any) => {
    setFormData({
      ...formData,
      branding: {
        ...formData.branding,
        watermark: {
          ...(formData.branding.watermark || {
            enabled: false,
            type: "image",
            imageUrl: "",
            text: "",
            position: "bottom-right",
            size: 15,
            opacity: 0.7,
            pattern: "step_repeat",
          }),
          ...updates
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold text-white mb-2">Design & Branding</h2>
        <p className="text-zinc-400 mb-6">Customize the look and feel of your photo booth.</p>

        {/* Theme Presets */}
        <Card className="bg-card/50 border-white/10 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-400" />
              Theme Presets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { id: 'classic_dark', name: 'Classic Dark', icon: Moon, color: 'bg-indigo-500' },
                { id: 'clean_light', name: 'Clean Light', icon: Sun, color: 'bg-blue-500' },
                { id: 'neon_party', name: 'Neon Party', icon: PartyPopper, color: 'bg-pink-500' },
                { id: 'corporate', name: 'Corporate', icon: Building2, color: 'bg-slate-600' },
                { id: 'kids_fun', name: 'Kids / Fun', icon: Baby, color: 'bg-orange-500' },
                { id: 'holiday', name: 'Holiday', icon: Gift, color: 'bg-red-600' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => updateTheme({
                    preset: theme.id,
                    mode: theme.id === 'clean_light' || theme.id === 'corporate' || theme.id === 'kids_fun' ? 'light' : 'dark'
                  })}
                  className={`p-4 rounded-xl border text-center transition-all group ${formData.theme.preset === theme.id
                    ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                    : 'border-white/10 bg-[#101112]/20 hover:border-white/20'
                    }`}
                >
                  <div className={`w-full aspect-video rounded-lg mb-3 flex items-center justify-center transition-colors ${formData.theme.preset === theme.id ? theme.color + '/20' : 'bg-zinc-800 group-hover:bg-zinc-700'
                    }`}>
                    <theme.icon className={`w-6 h-6 ${formData.theme.preset === theme.id ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                      }`} />
                  </div>
                  <span className="text-xs font-medium text-white">{theme.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Brand Colors */}
          <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-400" />
                Brand Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Primary Color</Label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.theme.primaryColor}
                    onChange={(e) => updateTheme({ primaryColor: e.target.value, preset: 'custom' })}
                    className="w-12 h-12 rounded-lg border border-white/10 cursor-pointer bg-transparent p-1"
                  />
                  <Input
                    value={formData.theme.primaryColor}
                    onChange={(e) => updateTheme({ primaryColor: e.target.value, preset: 'custom' })}
                    className="bg-[#101112]/40 border-white/10 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Secondary Color</Label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.theme.secondaryColor || '#F59E0B'}
                    onChange={(e) => updateTheme({ secondaryColor: e.target.value, preset: 'custom' })}
                    className="w-12 h-12 rounded-lg border border-white/10 cursor-pointer bg-transparent p-1"
                  />
                  <Input
                    value={formData.theme.secondaryColor || '#F59E0B'}
                    onChange={(e) => updateTheme({ secondaryColor: e.target.value, preset: 'custom' })}
                    className="bg-[#101112]/40 border-white/10 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-zinc-400 text-xs uppercase tracking-wider">Accent Color</Label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={formData.theme.accentColor || '#10B981'}
                    onChange={(e) => updateTheme({ accentColor: e.target.value, preset: 'custom' })}
                    className="w-12 h-12 rounded-lg border border-white/10 cursor-pointer bg-transparent p-1"
                  />
                  <Input
                    value={formData.theme.accentColor || '#10B981'}
                    onChange={(e) => updateTheme({ accentColor: e.target.value, preset: 'custom' })}
                    className="bg-[#101112]/40 border-white/10 text-white font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Options */}
          <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                Theme Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-zinc-300">Tagline</Label>
                <Input
                  value={formData.theme.tagline || ''}
                  onChange={(e) => updateTheme({ tagline: e.target.value })}
                  placeholder="AI-powered photo experiences"
                  className="bg-[#101112]/40 border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Color Mode</Label>
                  <div className="flex gap-1 p-1 rounded-lg bg-[#101112]/40 border border-white/10">
                    <button
                      type="button"
                      onClick={() => updateTheme({ mode: 'light' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-all ${formData.theme.mode === 'light'
                        ? 'bg-white text-black shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-300'
                        }`}
                    >
                      <Sun className="w-3 h-3" />
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => updateTheme({ mode: 'dark' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-all ${formData.theme.mode === 'dark'
                        ? 'bg-zinc-700 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-300'
                        }`}
                    >
                      <Moon className="w-3 h-3" />
                      Dark
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Card Radius</Label>
                  <Select
                    value={formData.theme.cardRadius || 'xl'}
                    onValueChange={(v: any) => updateTheme({ cardRadius: v })}
                  >
                    <SelectTrigger className="bg-[#101112]/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-zinc-800 text-white">
                      <SelectItem value="none">Square</SelectItem>
                      <SelectItem value="sm">Small</SelectItem>
                      <SelectItem value="md">Medium</SelectItem>
                      <SelectItem value="lg">Large</SelectItem>
                      <SelectItem value="xl">Extra Large</SelectItem>
                      <SelectItem value="2xl">Full (Pill)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Button Style</Label>
                  <Select
                    value={formData.theme.buttonStyle || 'solid'}
                    onValueChange={(v: any) => updateTheme({ buttonStyle: v })}
                  >
                    <SelectTrigger className="bg-[#101112]/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-zinc-800 text-white">
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator className="border-white/5 my-6" />

              <div className="space-y-4">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Booth Background Effect</Label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {([
                    { id: 'none', name: 'Standard', icon: <Monitor className="w-4 h-4 text-zinc-500" /> },
                    { id: 'grid', name: 'Glow Grid', icon: <Sparkles className="w-4 h-4 text-indigo-400" /> },
                    { id: 'particles', name: 'Particles', icon: <div className="w-3 h-3 bg-indigo-500/40 rounded-full blur-[1px]" /> },
                    { id: 'pulse', name: 'Neon Pulse', icon: <div className="w-3 h-3 bg-indigo-500 animate-pulse rounded-full" /> }
                  ] as const).map((anim) => (
                    <button
                      key={anim.id}
                      type="button"
                      onClick={() => updateTheme({ backgroundAnimation: anim.id })}
                      className={cn(
                        "p-3 rounded-xl border transition-all flex items-center gap-3 text-left",
                        formData.theme.backgroundAnimation === anim.id
                          ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-300"
                          : "bg-[#101112]/20 border-white/10 text-zinc-400 hover:border-white/20"
                      )}
                    >
                      {anim.icon}
                      <span className="text-xs font-medium">{anim.name}</span>
                    </button>
                  ))}
                </div>

                <Separator className="border-white/5 my-6" />

                {/* Landing Page Background Images (Slideshow) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                        Landing Page Slideshow
                      </h5>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Showcase your templates as a background loop</p>
                    </div>
                    <Switch
                      checked={(formData.branding as any)?.backgroundSlideshow?.enabled || false}
                      onCheckedChange={(checked) => updateBranding({
                        backgroundSlideshow: { ...((formData.branding as any)?.backgroundSlideshow || {}), enabled: checked }
                      } as any)}
                      className="data-[state=checked]:bg-emerald-600 scale-75"
                    />
                  </div>

                  {((formData.branding as any)?.backgroundSlideshow?.enabled) && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="p-4 rounded-xl bg-[#101112]/40 border border-white/5 space-y-3">
                        <Label className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Select Images from Templates</Label>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[160px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                          {/* Get all images from templates */}
                          {Array.from(new Set(
                            (formData.templates || []).flatMap(t => t.images || [])
                          )).map((imgUrl, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                const current = (formData.branding as any)?.backgroundSlideshow?.images || [];
                                const isSelected = current.includes(imgUrl);
                                updateBranding({
                                  backgroundSlideshow: {
                                    ...((formData.branding as any)?.backgroundSlideshow || {}),
                                    images: isSelected
                                      ? current.filter((u: string) => u !== imgUrl)
                                      : [...current, imgUrl]
                                  }
                                });
                              }}
                              className={cn(
                                "aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                                ((formData.branding as any)?.backgroundSlideshow?.images || []).includes(imgUrl)
                                  ? "border-indigo-500 ring-2 ring-indigo-500/30"
                                  : "border-transparent hover:border-white/20"
                              )}
                            >
                              <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {(formData.templates || []).flatMap(t => t.images || []).length === 0 && (
                            <div className="col-span-full text-center py-4 text-zinc-600 text-[10px] italic">
                              Add templates with images first
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold">Transition (s)</Label>
                          <div className="flex items-center gap-3">
                            <Slider
                              value={[((formData.branding as any)?.backgroundSlideshow?.duration || 5)]}
                              min={2}
                              max={15}
                              step={1}
                              onValueChange={([val]) => updateBranding({
                                backgroundSlideshow: { ...((formData.branding as any)?.backgroundSlideshow || {}), duration: val }
                              } as any)}
                              className="flex-1"
                            />
                            <span className="text-[10px] font-mono text-zinc-400 w-10">{((formData.branding as any)?.backgroundSlideshow?.duration || 5)}s</span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold">Overlay</Label>
                          <span className="text-[10px] text-zinc-500 block">Darkness/Medium/Light</span>
                          <Select
                            value={String((formData.branding as any)?.backgroundSlideshow?.overlayOpacity || 60)}
                            onValueChange={(val) => updateBranding({
                              backgroundSlideshow: { ...((formData.branding as any)?.backgroundSlideshow || {}), overlayOpacity: parseInt(val) }
                            })}
                          >
                            <SelectTrigger className="h-8 bg-[#101112]/40 border-white/10 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-zinc-800 text-white">
                              <SelectItem value="40">Light (40%)</SelectItem>
                              <SelectItem value="60">Medium (60%)</SelectItem>
                              <SelectItem value="80">Dark (80%)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Apply Blur</span>
                        <Switch
                          checked={(formData.branding as any)?.backgroundSlideshow?.blur !== false}
                          onCheckedChange={(c) => updateBranding({
                            backgroundSlideshow: { ...((formData.branding as any)?.backgroundSlideshow || {}), blur: c }
                          } as any)}
                          className="scale-75 data-[state=checked]:bg-indigo-600"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logos & Assets */}
        <Card className="bg-card/50 border-white/10 backdrop-blur-sm mb-6">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-amber-400" />
              Logos & Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Main Logo */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Event Logo</Label>
                <div className="space-y-3">
                  <div
                    className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer min-h-[160px] relative group"
                    onClick={() => !formData.branding.logoPath && document.getElementById('logo-upload')?.click()}
                  >
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, 'logoPath')}
                    />
                    {formData.branding.logoPath ? (
                      <div className="relative w-full">
                        <img
                          src={formData.branding.logoPath.startsWith('http')
                            ? formData.branding.logoPath
                            : `${window.location.origin}/${formData.branding.logoPath}`
                          }
                          alt="Logo"
                          className="h-20 mx-auto object-contain"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateBranding({ logoPath: "" });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-2">
                          {isUploading === 'logoPath' ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : <Upload className="w-5 h-5 text-zinc-400" />}
                        </div>
                        <p className="text-sm text-zinc-400">Click to upload logo</p>
                        <p className="text-xs text-zinc-600 mt-1">PNG, SVG (Transparent)</p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full sm:flex-1 h-8 border-white/10 text-xs">
                          <ImageIcon className="w-3.5 h-3.5 mr-2" />
                          Media Library
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-[#09090b] border-white/10">
                        <DialogHeader>
                          <DialogTitle className="text-white">Media Library</DialogTitle>
                        </DialogHeader>
                        <MediaLibrary
                          selectedUrl={formData.branding.logoPath}
                          onSelectMedia={(url) => updateBranding({ logoPath: url })}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:flex-1 h-8 border-white/10 text-xs"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      <Upload className="w-3.5 h-3.5 mr-2" />
                      Upload New
                    </Button>
                  </div>
                </div>
              </div>

              {/* Footer Logo */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Footer Logo</Label>
                <div className="space-y-3">
                  <div
                    className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer min-h-[160px] relative group"
                    onClick={() => !formData.branding.footerPath && document.getElementById('footer-upload')?.click()}
                  >
                    <input
                      id="footer-upload"
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg"
                      className="hidden"
                      onChange={(e) => handleLogoUpload(e, 'footerPath')}
                    />
                    {formData.branding.footerPath ? (
                      <div className="relative w-full">
                        <img
                          src={formData.branding.footerPath.startsWith('http')
                            ? formData.branding.footerPath
                            : `${window.location.origin}/${formData.branding.footerPath}`
                          }
                          alt="Footer"
                          className="h-20 mx-auto object-contain"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateBranding({ footerPath: "" });
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center mb-2">
                          {isUploading === 'footerPath' ? <Loader2 className="w-5 h-5 animate-spin text-zinc-400" /> : <Upload className="w-5 h-5 text-zinc-400" />}
                        </div>
                        <p className="text-sm text-zinc-400">Click to upload footer</p>
                        <p className="text-xs text-zinc-600 mt-1">PNG, SVG (Transparent)</p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full sm:flex-1 h-8 border-white/10 text-xs">
                          <ImageIcon className="w-3.5 h-3.5 mr-2" />
                          Media Library
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl bg-[#09090b] border-white/10">
                        <DialogHeader>
                          <DialogTitle className="text-white">Media Library</DialogTitle>
                        </DialogHeader>
                        <MediaLibrary
                          selectedUrl={formData.branding.footerPath}
                          onSelectMedia={(url) => updateBranding({ footerPath: url })}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:flex-1 h-8 border-white/10 text-xs"
                      onClick={() => document.getElementById('footer-upload')?.click()}
                    >
                      <Upload className="w-3.5 h-3.5 mr-2" />
                      Upload New
                    </Button>
                  </div>
                </div>
              </div>

              {/* Brand Name & Visibility */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Brand Name</Label>
                  <Input
                    value={formData.theme.brandName}
                    onChange={(e) => updateTheme({ brandName: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className="bg-[#101112]/40 border-white/10 text-white"
                  />
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Display Settings</Label>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Show Logo in Booth</span>
                      <Switch
                        checked={formData.branding.showLogoInBooth !== false}
                        onCheckedChange={(c) => updateBranding({ showLogoInBooth: c })}
                        className="data-[state=checked]:bg-indigo-600 scale-75"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Show Logo in Feed</span>
                      <Switch
                        checked={formData.branding.showLogoInFeed !== false}
                        onCheckedChange={(c) => updateBranding({ showLogoInFeed: c })}
                        className="data-[state=checked]:bg-indigo-600 scale-75"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Include on Prints</span>
                      <Switch
                        checked={formData.branding.includeLogoOnPrints !== false}
                        onCheckedChange={(c) => updateBranding({ includeLogoOnPrints: c })}
                        className="data-[state=checked]:bg-indigo-600 scale-75"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>


            <Separator className="border-white/5 my-6" />

            {/* CTA Button Customization */}
            <div className="space-y-4">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Call-to-Action Button</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Button Text</Label>
                  <Input
                    value={(formData.branding as any)?.ctaButtonText || ""}
                    onChange={(e) => updateBranding({ ctaButtonText: e.target.value })}
                    placeholder="Take a Photo"
                    className="h-9 text-xs bg-[#101112]/40 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Secondary Text (optional)</Label>
                  <Input
                    value={(formData.branding as any)?.ctaSubtext || ""}
                    onChange={(e) => updateBranding({ ctaSubtext: e.target.value })}
                    placeholder="e.g. It's free!"
                    className="h-9 text-xs bg-[#101112]/40 border-white/10"
                  />
                </div>
              </div>
            </div>

            <Separator className="border-white/5 my-6" />

            {/* Footer Links */}
            <div className="space-y-4">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Footer Links</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#101112]/40 border border-white/5">
                  <div>
                    <p className="text-xs font-medium text-white">Show Profile Link</p>
                    <p className="text-[10px] text-zinc-500">Link to your public profile</p>
                  </div>
                  <Switch
                    checked={(formData.branding as any)?.showProfileLink !== false}
                    onCheckedChange={(checked) => updateBranding({ showProfileLink: checked })}
                    className="scale-75 data-[state=checked]:bg-indigo-600"
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#101112]/40 border border-white/5">
                  <div>
                    <p className="text-xs font-medium text-white">Show Live Feed Link</p>
                    <p className="text-[10px] text-zinc-500">Link to this event's photo feed</p>
                  </div>
                  <Switch
                    checked={(formData.branding as any)?.showFeedLink === true}
                    onCheckedChange={(checked) => updateBranding({ showFeedLink: checked })}
                    className="scale-75 data-[state=checked]:bg-indigo-600"
                  />
                </div>
              </div>
            </div>

            <Separator className="border-white/5 my-6" />

            {/* Creator Branding Section (Studio Tier) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-[10px] uppercase tracking-wider font-bold flex items-center gap-2">
                  Business Branding & Links
                  {!isStudio && <Badge variant="secondary" className="text-[9px] h-4 bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Business / Studio Only</Badge>}
                </Label>
                {isStudio && (
                  <Switch
                    checked={formData.branding?.showCreatorBrand}
                    onCheckedChange={(checked) => updateBranding({ showCreatorBrand: checked })}
                    className="data-[state=checked]:bg-indigo-600"
                  />
                )}
              </div>

              {!isStudio ? (
                <div className="p-4 rounded-xl border border-dashed border-white/10 bg-[#101112]/20 flex flex-col items-center text-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Business Branding Locked</p>
                    <p className="text-xs text-muted-foreground max-w-[280px]">Upgrade to <strong>Business</strong> or <strong>Studio</strong> to display your custom links and social info on this booth.</p>
                  </div>
                </div>
              ) : (
                <div className={cn("space-y-4 transition-all duration-300", !formData.branding?.showCreatorBrand && "opacity-50 pointer-events-none grayscale")}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-zinc-400">Display Name</Label>
                      <Input
                        value={formData.branding?.creatorDisplayName || currentUser?.name || ""}
                        onChange={(e) => updateBranding({ creatorDisplayName: e.target.value })}
                        placeholder="e.g. Photography by Alex"
                        className="h-9 text-xs bg-[#101112]/40 border-white/10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-zinc-400">Website</Label>
                      <Input
                        value={formData.branding?.socialWebsite || ""}
                        onChange={(e) => updateBranding({ socialWebsite: e.target.value })}
                        placeholder="https://..."
                        className="h-9 text-xs bg-[#101112]/40 border-white/10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-zinc-400">Social Handles</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#101112]/40 border border-white/10">
                        <span className="text-[10px] font-bold text-zinc-600 pl-1">IG</span>
                        <Input
                          value={formData.branding?.socialInstagram || ""}
                          onChange={(e) => updateBranding({ socialInstagram: e.target.value })}
                          placeholder="username"
                          className="h-7 text-xs bg-transparent border-0 p-0 focus-visible:ring-0"
                        />
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#101112]/40 border border-white/10">
                        <span className="text-[10px] font-bold text-zinc-600 pl-1">TT</span>
                        <Input
                          value={formData.branding?.socialTikTok || ""}
                          onChange={(e) => updateBranding({ socialTikTok: e.target.value })}
                          placeholder="username"
                          className="h-7 text-xs bg-transparent border-0 p-0 focus-visible:ring-0"
                        />
                      </div>
                      <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[#101112]/40 border border-white/10">
                        <span className="text-[10px] font-bold text-zinc-600 pl-1">X</span>
                        <Input
                          value={formData.branding?.socialX || ""}
                          onChange={(e) => updateBranding({ socialX: e.target.value })}
                          placeholder="handle"
                          className="h-7 text-xs bg-transparent border-0 p-0 focus-visible:ring-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bio Links Section */}
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-zinc-400">Featured Links</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-indigo-400 hover:text-indigo-300 px-2"
                        onClick={() => {
                          const currentLinks = (formData.branding as any)?.bioLinks || [];
                          updateBranding({
                            bioLinks: [
                              ...currentLinks,
                              { id: `link-${Date.now()}`, title: '', url: '', enabled: true }
                            ]
                          });
                        }}
                      >
                        + Add Link
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {((formData.branding as any)?.bioLinks || []).map((link: any, index: number) => (
                        <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-[#101112]/40 border border-white/5">
                          <Switch
                            checked={link.enabled}
                            onCheckedChange={(checked) => {
                              const links = [...((formData.branding as any)?.bioLinks || [])];
                              links[index] = { ...link, enabled: checked };
                              updateBranding({ bioLinks: links });
                            }}
                            className="scale-75"
                          />
                          <Input
                            value={link.title}
                            onChange={(e) => {
                              const links = [...((formData.branding as any)?.bioLinks || [])];
                              links[index] = { ...link, title: e.target.value };
                              updateBranding({ bioLinks: links });
                            }}
                            placeholder="Title"
                            className="h-7 text-xs bg-transparent border-white/5 flex-1"
                          />
                          <Input
                            value={link.url}
                            onChange={(e) => {
                              const links = [...((formData.branding as any)?.bioLinks || [])];
                              links[index] = { ...link, url: e.target.value };
                              updateBranding({ bioLinks: links });
                            }}
                            placeholder="https://..."
                            className="h-7 text-xs bg-transparent border-white/5 flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-600 hover:text-red-400"
                            onClick={() => {
                              const links = ((formData.branding as any)?.bioLinks || []).filter((_: any, i: number) => i !== index);
                              updateBranding({ bioLinks: links });
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      {((formData.branding as any)?.bioLinks || []).length === 0 && (
                        <p className="text-center py-4 text-[10px] text-zinc-600 italic">No featured links yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Watermark Configuration */}
        <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Stamp className="w-5 h-5 text-cyan-400" />
                Watermark
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="watermark-enabled" className="text-sm text-zinc-400 cursor-pointer">Enable</Label>
                <Switch
                  id="watermark-enabled"
                  checked={formData.branding.watermark?.enabled || false}
                  onCheckedChange={(c) => updateWatermark({ enabled: c })}
                  className="data-[state=checked]:bg-cyan-600"
                />
              </div>
            </div>
          </CardHeader>
          {formData.branding.watermark?.enabled && (
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Type</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateWatermark({ type: 'image' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.branding.watermark?.type === 'image'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                          : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700'
                          }`}
                      >
                        Image Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => updateWatermark({ type: 'text' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.branding.watermark?.type === 'text'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                          : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700'
                          }`}
                      >
                        Text Overlay
                      </button>
                    </div>
                  </div>

                  {formData.branding.watermark?.type === 'text' ? (
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Watermark Text</Label>
                      <Input
                        value={formData.branding.watermark?.text || ''}
                        onChange={(e) => updateWatermark({ text: e.target.value })}
                        placeholder="© My Event 2024"
                        className="bg-[#101112]/40 border-white/10 text-white"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Watermark Image</Label>
                      <div className="border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer h-[100px]">
                        {formData.branding.watermark?.imageUrl ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <img
                              src={formData.branding.watermark.imageUrl}
                              alt="Watermark"
                              className="max-h-full max-w-full object-contain opacity-50"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateWatermark({ imageUrl: "" });
                              }}
                              className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="w-4 h-4 text-zinc-400 mb-1" />
                            <span className="text-xs text-zinc-500">Upload PNG</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Position & Layout</Label>
                    <Select
                      value={formData.branding.watermark?.pattern || 'corner'}
                      onValueChange={(v: any) => updateWatermark({ pattern: v })}
                    >
                      <SelectTrigger className="bg-[#101112]/40 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-zinc-800 text-white">
                        <SelectItem value="corner">Single Corner</SelectItem>
                        <SelectItem value="strip_bottom">Bottom Strip</SelectItem>
                        <SelectItem value="step_repeat">Step & Repeat (Background)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.branding.watermark?.pattern === 'corner' && (
                    <div className="space-y-2">
                      <Label className="text-zinc-300">Corner</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => updateWatermark({ position: pos })}
                            className={`p-2 text-xs rounded-md border ${formData.branding.watermark?.position === pos
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                              : 'bg-zinc-800 border-transparent text-zinc-400 hover:bg-zinc-700'
                              }`}
                          >
                            {pos.replace('-', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-zinc-300">Size ({formData.branding.watermark?.size || 15}%)</Label>
                      </div>
                      <Slider
                        value={[formData.branding.watermark?.size || 15]}
                        min={5}
                        max={50}
                        step={1}
                        onValueChange={([val]) => updateWatermark({ size: val })}
                        className="py-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-zinc-300">Opacity ({Math.round((formData.branding.watermark?.opacity || 0.7) * 100)}%)</Label>
                      </div>
                      <Slider
                        value={[(formData.branding.watermark?.opacity || 0.7) * 100]}
                        min={10}
                        max={100}
                        step={5}
                        onValueChange={([val]) => updateWatermark({ opacity: val / 100 })}
                        className="py-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  );
}
