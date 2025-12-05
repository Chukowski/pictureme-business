import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Moon, Sun, PartyPopper, Building2, Baby, Gift, Upload, Image as ImageIcon, Palette, Layers, Stamp, Loader2 } from "lucide-react";
import { EditorSectionProps } from "./types";
import { uploadTemplateImage } from "@/services/templateStorage";
import { toast } from "sonner";

export function EventDesign({ formData, setFormData }: EditorSectionProps) {
  const [isUploading, setIsUploading] = useState<string | null>(null);

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
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm mb-6">
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
                  className={`p-4 rounded-xl border text-center transition-all group ${
                    formData.theme.preset === theme.id
                      ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
                      : 'border-white/10 bg-black/20 hover:border-white/20'
                  }`}
                >
                  <div className={`w-full aspect-video rounded-lg mb-3 flex items-center justify-center transition-colors ${
                    formData.theme.preset === theme.id ? theme.color + '/20' : 'bg-zinc-800 group-hover:bg-zinc-700'
                  }`}>
                    <theme.icon className={`w-6 h-6 ${
                      formData.theme.preset === theme.id ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
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
           <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm h-full">
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
                    className="bg-black/40 border-white/10 text-white font-mono"
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
                    className="bg-black/40 border-white/10 text-white font-mono"
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
                    className="bg-black/40 border-white/10 text-white font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Options */}
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm h-full">
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
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Color Mode</Label>
                   <div className="flex gap-1 p-1 rounded-lg bg-black/40 border border-white/10">
                    <button
                      type="button"
                      onClick={() => updateTheme({ mode: 'light' })}
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-all ${
                        formData.theme.mode === 'light'
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
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-all ${
                        formData.theme.mode === 'dark'
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
                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
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
                    <SelectTrigger className="bg-black/40 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logos & Assets */}
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm mb-6">
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
                <div 
                  className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer min-h-[160px]"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    className="hidden"
                    onChange={(e) => handleLogoUpload(e, 'logoPath')}
                  />
                  {formData.branding.logoPath ? (
                    <div className="relative group w-full">
                      <img 
                        src={formData.branding.logoPath.startsWith('http') 
                          ? formData.branding.logoPath 
                          : `${window.location.origin}/${formData.branding.logoPath}`
                        } 
                        alt="Logo" 
                        className="h-16 mx-auto object-contain" 
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateBranding({ logoPath: "" });
                        }}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">Remove</span>
                        ×
                      </button>
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
              </div>

              {/* Footer Logo */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Footer Logo</Label>
                <div 
                  className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors cursor-pointer min-h-[160px]"
                  onClick={() => document.getElementById('footer-upload')?.click()}
                >
                   <input
                    id="footer-upload"
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg"
                    className="hidden"
                    onChange={(e) => handleLogoUpload(e, 'footerPath')}
                  />
                  {formData.branding.footerPath ? (
                    <div className="relative group w-full">
                      <img 
                        src={formData.branding.footerPath.startsWith('http') 
                          ? formData.branding.footerPath 
                          : `${window.location.origin}/${formData.branding.footerPath}`
                        } 
                        alt="Footer" 
                        className="h-16 mx-auto object-contain" 
                      />
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          updateBranding({ footerPath: "" });
                        }}
                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">Remove</span>
                        ×
                      </button>
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
              </div>

              {/* Brand Name */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Brand Name</Label>
                  <Input
                    value={formData.theme.brandName}
                    onChange={(e) => updateTheme({ brandName: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className="bg-black/40 border-white/10 text-white"
                  />
                </div>
                
                {/* Display Toggles */}
                <div className="space-y-3 pt-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wider">Visibility</Label>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">Show in Booth</span>
                    <Switch 
                      checked={formData.branding.showLogoInBooth !== false}
                      onCheckedChange={(c) => updateBranding({ showLogoInBooth: c })}
                      className="data-[state=checked]:bg-indigo-600 scale-75"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-300">Show in Feed</span>
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
          </CardContent>
        </Card>

        {/* Watermark Configuration */}
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
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
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          formData.branding.watermark?.type === 'image'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                            : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700'
                        }`}
                      >
                        Image Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => updateWatermark({ type: 'text' })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                          formData.branding.watermark?.type === 'text'
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
                        className="bg-black/40 border-white/10 text-white"
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
                      <SelectTrigger className="bg-black/40 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
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
                            className={`p-2 text-xs rounded-md border ${
                              formData.branding.watermark?.position === pos
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
