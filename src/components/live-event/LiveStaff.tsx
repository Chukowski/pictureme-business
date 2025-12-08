import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Users, ShieldCheck, Camera, Monitor, Copy } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

interface LiveStaffProps {
  event: any;
}

export function LiveStaff({ event }: LiveStaffProps) {
  const [showRegQr, setShowRegQr] = useState(false);

  const copyPin = () => {
    navigator.clipboard.writeText(event?.settings?.staffAccessCode || '');
    toast.success('Staff PIN copied');
  };

  const getRegistrationUrl = () => {
    if (!event?.user_slug || !event?.slug) return '';
    return `${window.location.origin}/${event.user_slug}/${event.slug}/registration`;
  };

  const openStaffPanel = () => {
    if (!event?.postgres_event_id) {
      toast.error('Event ID not found');
      return;
    }
    const url = `${window.location.origin}/e/${event.postgres_event_id}/${event.slug}/staff`;
    window.open(url, '_blank');
  };

  const openBigScreen = () => {
    if (!event?.postgres_event_id) {
      toast.error('Event ID not found');
      return;
    }
    const url = `${window.location.origin}/e/${event.postgres_event_id}/${event.slug}/bigscreen`;
    window.open(url, '_blank');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card className="bg-zinc-900/50 border-white/10 col-span-full lg:col-span-2">
        <CardHeader>
           <CardTitle className="text-white text-base">Staff Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <Button 
              className="h-24 flex flex-col gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
              onClick={() => setShowRegQr(!showRegQr)}
            >
              <QrCode className="w-6 h-6 text-[#D1F349]" />
              <span className="text-xs">{showRegQr ? 'Hide QR' : 'Registration QR'}</span>
            </Button>
            <Button 
              className="h-24 flex flex-col gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
              onClick={() => window.open(getRegistrationUrl().replace('registration', 'booth'), '_blank')}
            >
              <Camera className="w-6 h-6 text-cyan-400" />
              <span className="text-xs">Open Booth</span>
            </Button>
            <Button 
              className="h-24 flex flex-col gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
              onClick={openStaffPanel}
            >
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <span className="text-xs">Full Staff Panel</span>
            </Button>
            <Button 
              className="h-24 flex flex-col gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
              onClick={openBigScreen}
            >
              <Monitor className="w-6 h-6 text-purple-400" />
              <span className="text-xs">Open Big Screen</span>
            </Button>
            <Button 
              className="h-24 flex flex-col gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
            >
              <Users className="w-6 h-6 text-amber-400" />
              <span className="text-xs">Manage Team</span>
            </Button>
          </div>

          {showRegQr && (
            <div className="mt-6 flex flex-col items-center justify-center p-6 bg-white rounded-xl animate-in fade-in zoom-in duration-300">
               <QRCodeSVG value={getRegistrationUrl()} size={200} />
               <p className="mt-4 text-sm text-zinc-500 font-mono break-all text-center">{getRegistrationUrl()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-base">Access Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="p-3 rounded-lg bg-black/30 border border-white/5">
              <p className="text-xs text-zinc-500 mb-1">Staff PIN Code</p>
              <div className="flex items-center justify-between">
                <code className="text-xl font-mono font-bold text-white tracking-widest">
                  {event?.settings?.staffAccessCode || '----'}
                </code>
                <Button size="sm" variant="ghost" onClick={copyPin}>
                  <Copy className="w-4 h-4 text-zinc-400" />
                </Button>
              </div>
           </div>
           <div className="text-xs text-zinc-500">
             <p>Share this PIN with on-site staff for access to:</p>
             <ul className="list-disc pl-4 mt-2 space-y-1">
               <li>Album Management</li>
               <li>Manual Registration</li>
               <li>Quick Approvals</li>
             </ul>
           </div>
           
           <Button variant="ghost" className="w-full text-xs text-zinc-400 hover:text-white" onClick={copyPin}>
             <Copy className="w-3 h-3 mr-2" /> Copy Access Instructions
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}

