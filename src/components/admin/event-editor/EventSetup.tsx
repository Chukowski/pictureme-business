import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Sparkles, Users, CreditCard, LayoutGrid, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { EditorSectionProps } from "./types";
import { EventPricing } from "./EventPricing";

export function EventSetup({ formData, setFormData, currentUser, isEdit }: EditorSectionProps) {
  // Helper to update badge template
  const updateBadgeConfig = (enabled: boolean) => {
    setFormData({
      ...formData,
      badgeTemplate: {
        ...(formData.badgeTemplate || {
          enabled: false,
          layout: 'portrait',
          fields: { showName: true, showDateTime: true, showEventName: true, customField1: '', customField2: '' },
          aiPipeline: { enabled: false, prompt: '', model: '', referenceImages: [], outputRatio: '1:1' },
          qrCode: { enabled: true, position: 'bottom-right', size: 'medium' },
          photoPlacement: { position: 'top', shape: 'circle', size: 'medium' }
        }),
        enabled
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Basic Info Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">Event Setup</h2>
          <p className="text-zinc-400">Configure the core details and access mode for your event.</p>
        </div>

        <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-base">Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-zinc-300">
                  Event Slug <span className="text-red-400">*</span>
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
                  className="bg-[#101112]/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                />

                {/* URL Copy Helpers */}
                <div className="space-y-1 mt-2">
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#101112]/40 border border-white/5">
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
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-zinc-300">
                  Event Title <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="My Photo Booth Event"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="bg-[#101112]/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
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
                className="bg-[#101112]/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
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
                  className="bg-[#101112]/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
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
                  className="bg-[#101112]/40 border-white/10 text-white placeholder:text-zinc-600 focus:border-indigo-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Features Section */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-white">Key Features</h3>
          <p className="text-sm text-zinc-400">Enable additional capabilities for this event.</p>
        </div>
        <Card className="bg-card/50 border-white/10 backdrop-blur-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#101112]/30 border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div>
                  <Label className="text-zinc-200 font-medium block cursor-pointer">Include Visitor Badge</Label>
                  <p className="text-xs text-zinc-500">Generate ID badges with QR codes for guests</p>
                </div>
              </div>
              <Switch
                checked={formData.badgeTemplate?.enabled || false}
                onCheckedChange={(c) => updateBadgeConfig(c)}
                className="data-[state=checked]:bg-purple-600"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Event Mode Section */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-white">Experience Mode</h3>
          <p className="text-sm text-zinc-400">How will guests interact with the booth?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free Experience */}
          <button
            type="button"
            onClick={() => setFormData({
              ...formData,
              eventMode: 'free',
              rules: { ...formData.rules, leadCaptureEnabled: false, requirePaymentBeforeDownload: false, allowFreePreview: true }
            })}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${formData.eventMode === 'free'
                ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                : 'border-white/10 bg-card/50 hover:border-white/20 hover:bg-card'
              }`}
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${formData.eventMode === 'free' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                }`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-white mb-1">Free Experience</h4>
              <p className="text-sm text-zinc-400">No payment or data capture. Pure fun for guests.</p>

              {formData.eventMode === 'free' && (
                <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-medium text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active Mode
                </div>
              )}
            </div>
          </button>

          {/* Lead Capture */}
          <button
            type="button"
            onClick={() => setFormData({
              ...formData,
              eventMode: 'lead_capture',
              rules: { ...formData.rules, leadCaptureEnabled: true, requirePaymentBeforeDownload: false, allowFreePreview: true }
            })}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${formData.eventMode === 'lead_capture'
                ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                : 'border-white/10 bg-card/50 hover:border-white/20 hover:bg-card'
              }`}
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${formData.eventMode === 'lead_capture' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'
                }`}>
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-white mb-1">Lead Capture</h4>
              <p className="text-sm text-zinc-400">Collect emails or phone numbers to unlock downloads.</p>
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
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${formData.eventMode === 'pay_per_photo'
                ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                : 'border-white/10 bg-card/50 hover:border-white/20 hover:bg-card'
              }`}
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${formData.eventMode === 'pay_per_photo' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'
                }`}>
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-white mb-1">Pay Per Photo</h4>
              <p className="text-sm text-zinc-400">Watermarked previews. Payment required to download.</p>
            </div>
          </button>

          {/* Pay Per Album */}
          <button
            type="button"
            onClick={() => setFormData({
              ...formData,
              eventMode: 'pay_per_album',
              albumTracking: {
                ...formData.albumTracking,
                enabled: true  // Auto-enable tracking (required for this mode)
              },
              rules: { ...formData.rules, leadCaptureEnabled: true, requirePaymentBeforeDownload: true, allowFreePreview: true, hardWatermarkOnPreviews: true }
            })}
            className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${formData.eventMode === 'pay_per_album'
                ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500'
                : 'border-white/10 bg-card/50 hover:border-white/20 hover:bg-card'
              }`}
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${formData.eventMode === 'pay_per_album' ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400'
                }`}>
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-white mb-1">Pay Per Album</h4>
              <p className="text-sm text-zinc-400">Sell full gallery access. Great for events with many photos.</p>
            </div>
          </button>
        </div>
      </section>

      {/* Pricing Configuration - Shows for paid modes */}
      <EventPricing formData={formData} setFormData={setFormData} />
    </div>
  );
}

