import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, Share2, ShieldCheck, Printer, LayoutTemplate, AlertTriangle } from "lucide-react";
import { EditorSectionProps } from "./types";

export function EventSettings({ formData, setFormData }: EditorSectionProps) {
  const updateRules = (updates: any) => {
    setFormData({
      ...formData,
      rules: { ...formData.rules, ...updates }
    });
  };

  const updateSharing = (updates: any) => {
    setFormData({
      ...formData,
      sharing: { ...formData.sharing, ...updates }
    });
  };

  const updateSettings = (updates: any) => {
    setFormData({
      ...formData,
      settings: { ...formData.settings, ...updates }
    });
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold text-white mb-2">Settings & Logic</h2>
        <p className="text-zinc-400 mb-6">Fine-tune access, payment, and sharing rules.</p>

        <div className="space-y-6">
          {/* Access & Security */}
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Access & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                <div>
                  <Label className="text-zinc-300 font-medium">Staff Only Mode</Label>
                  <p className="text-xs text-zinc-500">Restricts entire event access to staff</p>
                </div>
                <Switch
                  checked={formData.rules.staffOnlyMode}
                  onCheckedChange={(c) => updateRules({ staffOnlyMode: c })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>
              
              <div className="p-3 rounded-lg bg-black/30 border border-white/5 space-y-3">
                 <div className="space-y-0.5">
                    <Label className="text-zinc-300 font-medium">Staff Access PIN</Label>
                    <p className="text-xs text-zinc-500">Code to access Staff Dashboard & Tools (required for Staff Only Mode)</p>
                 </div>
                 <Input 
                    value={formData.settings?.staffAccessCode || ''}
                    onChange={(e) => updateSettings({ staffAccessCode: e.target.value })}
                    placeholder="Enter 4-digit PIN (e.g. 1234)"
                    className="bg-black/40 border-white/10 text-white max-w-[200px]"
                    maxLength={6}
                  />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                <div>
                  <Label className="text-zinc-300 font-medium">Allow Free Previews</Label>
                  <p className="text-xs text-zinc-500">Guests can see watermarked results before paying/emailing</p>
                </div>
                <Switch
                  checked={formData.rules.allowFreePreview}
                  onCheckedChange={(c) => updateRules({ allowFreePreview: c })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                <div>
                  <Label className="text-zinc-300 font-medium">Hard Watermark on Previews</Label>
                  <p className="text-xs text-zinc-500">Burn watermark into preview images (can't be removed)</p>
                </div>
                <Switch
                  checked={formData.rules.hardWatermarkOnPreviews}
                  onCheckedChange={(c) => updateRules({ hardWatermarkOnPreviews: c })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                <div>
                  <Label className="text-zinc-300 font-medium">Blur on Unpaid Gallery</Label>
                  <p className="text-xs text-zinc-500">Apply blur effect to photos in gallery/big screen when unpaid</p>
                </div>
                <Switch
                  checked={formData.rules.blurOnUnpaidGallery !== false}
                  onCheckedChange={(c) => updateRules({ blurOnUnpaidGallery: c })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                <div>
                  <Label className="text-zinc-300 font-medium">Show Payment Card on Shared Album</Label>
                  <p className="text-xs text-zinc-500">Display payment required message when user views unpaid album</p>
                </div>
                <Switch
                  checked={formData.rules.showPaymentCardOnSharedAlbum !== false}
                  onCheckedChange={(c) => updateRules({ showPaymentCardOnSharedAlbum: c })}
                  className="data-[state=checked]:bg-emerald-600"
                />
              </div>

              <div className="space-y-2 p-3 rounded-lg bg-black/30 border border-white/5">
                <Label className="text-zinc-300 font-medium">Max Photos Per Session</Label>
                <p className="text-xs text-zinc-500 mb-2">Limit how many photos a guest can generate</p>
                <Input 
                  type="number"
                  value={formData.settings?.maxPhotosPerSession || ''}
                  onChange={(e) => updateSettings({ maxPhotosPerSession: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Unlimited"
                  className="bg-black/40 border-white/10 text-white max-w-[150px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment & Leads */}
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                Payment & Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                <div>
                  <Label className="text-zinc-300 font-medium">Lead Capture</Label>
                  <p className="text-xs text-zinc-500">Require Email/Phone to view or download</p>
                </div>
                <Switch
                  checked={formData.rules.leadCaptureEnabled}
                  onCheckedChange={(c) => updateRules({ leadCaptureEnabled: c })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                <div>
                  <Label className="text-zinc-300 font-medium">Require Payment</Label>
                  <p className="text-xs text-zinc-500">Charge via Stripe before download</p>
                </div>
                <Switch
                  checked={formData.rules.requirePaymentBeforeDownload}
                  onCheckedChange={(c) => updateRules({ requirePaymentBeforeDownload: c })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>

              {formData.rules.requirePaymentBeforeDownload && (
                <div className="space-y-3 pl-4 border-l-2 border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-zinc-300 text-sm">Show QR for Payment</Label>
                    <Switch
                      checked={formData.rules.enableQRToPayment}
                      onCheckedChange={(c) => updateRules({ enableQRToPayment: c })}
                      className="scale-75 data-[state=checked]:bg-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-zinc-300 text-sm">Use Stripe Code</Label>
                      <p className="text-[10px] text-zinc-500">Use generated code instead of direct link</p>
                    </div>
                    <Switch
                      checked={formData.rules.useStripeCodeForPayment}
                      onCheckedChange={(c) => updateRules({ useStripeCodeForPayment: c })}
                      className="scale-75 data-[state=checked]:bg-blue-500"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Safety */}
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Content Safety
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                <div>
                  <Label className="text-zinc-300 font-medium">Content Moderation</Label>
                  <p className="text-xs text-zinc-500">Filter NSFW content automatically using AI safety checks</p>
                </div>
                <Switch
                  checked={formData.settings?.moderationEnabled !== false}
                  onCheckedChange={(c) => updateSettings({ moderationEnabled: c })}
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Features */}
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-zinc-400" />
                Advanced Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <div>
                    <Label className="text-zinc-300 font-medium">Timeline Split View</Label>
                    <p className="text-xs text-zinc-500">Show before/after slider in results</p>
                  </div>
                  <Switch
                    checked={formData.rules.allowTimelineSplitView}
                    onCheckedChange={(c) => updateRules({ allowTimelineSplitView: c })}
                    className="data-[state=checked]:bg-zinc-600"
                  />
                </div>
            </CardContent>
          </Card>

          {/* Sharing */}
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-400" />
                Sharing Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <Label className="text-zinc-300 font-medium">Email</Label>
                  <Switch
                    checked={formData.sharing?.emailEnabled}
                    onCheckedChange={(c) => updateSharing({ emailEnabled: c })}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <Label className="text-zinc-300 font-medium">WhatsApp</Label>
                  <Switch
                    checked={formData.sharing?.whatsappEnabled}
                    onCheckedChange={(c) => updateSharing({ whatsappEnabled: c })}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <Label className="text-zinc-300 font-medium">SMS</Label>
                  <Switch
                    checked={formData.sharing?.smsEnabled}
                    onCheckedChange={(c) => updateSharing({ smsEnabled: c })}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
                 <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <Label className="text-zinc-300 font-medium">Email after Payment</Label>
                  <Switch
                    checked={formData.sharing?.emailAfterBuy}
                    onCheckedChange={(c) => updateSharing({ emailAfterBuy: c })}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
              </div>

               {formData.sharing?.emailEnabled && (
                <div className="space-y-2">
                  <Label className="text-zinc-300">Email Template</Label>
                  <Input 
                    value={formData.sharing?.emailTemplate || ''}
                    onChange={(e) => updateSharing({ emailTemplate: e.target.value })}
                    placeholder="Check out your photo from {event_name}!"
                    className="bg-black/40 border-white/10 text-white"
                  />
                  <p className="text-xs text-zinc-500">
                    Available variables: {'{event_name}'}, {'{visitor_name}'}, {'{link}'}
                  </p>
                </div>
              )}

               <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <div>
                    <Label className="text-zinc-300 font-medium">Public Feed</Label>
                    <p className="text-xs text-zinc-500">Show recent photos in a public gallery</p>
                  </div>
                  <Switch
                    checked={formData.rules.feedEnabled}
                    onCheckedChange={(c) => updateRules({ feedEnabled: c })}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>

               <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <div>
                    <Label className="text-zinc-300 font-medium">Group Photos into Albums</Label>
                    <p className="text-xs text-zinc-500">Organize shared photos by session/visitor</p>
                  </div>
                  <Switch
                    checked={formData.sharing?.groupPhotosIntoAlbums}
                    onCheckedChange={(c) => updateSharing({ groupPhotosIntoAlbums: c })}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>
            </CardContent>
          </Card>

          {/* Hardware */}
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Printer className="w-5 h-5 text-zinc-400" />
                Hardware Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <div>
                    <Label className="text-zinc-300 font-medium">Enable Print Station</Label>
                    <p className="text-xs text-zinc-500">Allow sending photos to connected printer</p>
                  </div>
                  <Switch
                    checked={formData.rules.allowPrintStation}
                    onCheckedChange={(c) => updateRules({ allowPrintStation: c })}
                    className="data-[state=checked]:bg-zinc-600"
                  />
                </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
