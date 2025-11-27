/**
 * BadgeCreator Component
 * 
 * Creates customizable event badges with QR codes, photos, and branding.
 * Used for album tracking registration and standalone badge printing.
 */

import { useState, useRef } from 'react';
import { 
  QrCode, Download, Printer, User, Calendar, Building2,
  RotateCcw, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export type BadgeLayout = 'portrait' | 'landscape' | 'square';

interface BadgeData {
  visitorName?: string;
  visitorNumber?: number;
  eventName?: string;
  dateTime?: Date;
  photoUrl?: string;
  qrCode?: string;
  customField1?: string;
  customField2?: string;
}

interface BadgeCreatorProps {
  layout?: BadgeLayout;
  eventName?: string;
  eventLogo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  initialData?: BadgeData;
  showQR?: boolean;
  showName?: boolean;
  showDateTime?: boolean;
  showEventName?: boolean;
  onExport?: (dataUrl: string) => void;
  className?: string;
}

export function BadgeCreator({
  layout = 'portrait',
  eventName = 'Event',
  eventLogo,
  primaryColor = '#06B6D4',
  secondaryColor = '#8B5CF6',
  initialData,
  showQR = true,
  showName = true,
  showDateTime = true,
  showEventName = true,
  onExport,
  className = '',
}: BadgeCreatorProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [badgeData, setBadgeData] = useState<BadgeData>({
    visitorName: initialData?.visitorName || '',
    visitorNumber: initialData?.visitorNumber,
    eventName: eventName,
    dateTime: initialData?.dateTime || new Date(),
    photoUrl: initialData?.photoUrl,
    qrCode: initialData?.qrCode || `BADGE-${Date.now()}`,
    customField1: initialData?.customField1 || '',
    customField2: initialData?.customField2 || '',
  });

  // Badge dimensions based on layout
  const getDimensions = () => {
    switch (layout) {
      case 'portrait':
        return { width: 300, height: 450, aspectClass: 'aspect-[2/3]' };
      case 'landscape':
        return { width: 450, height: 300, aspectClass: 'aspect-[3/2]' };
      case 'square':
        return { width: 350, height: 350, aspectClass: 'aspect-square' };
      default:
        return { width: 300, height: 450, aspectClass: 'aspect-[2/3]' };
    }
  };

  const { aspectClass } = getDimensions();

  const handleExport = async (format: 'png' | 'pdf') => {
    if (!badgeRef.current) return;

    try {
      // Use html2canvas for export
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(badgeRef.current, {
        backgroundColor: null,
        scale: 2,
      });

      const dataUrl = canvas.toDataURL('image/png');

      if (format === 'png') {
        // Download as PNG
        const link = document.createElement('a');
        link.download = `badge-${badgeData.qrCode}.png`;
        link.href = dataUrl;
        link.click();
        toast.success('Badge downloaded as PNG');
      } else {
        // For PDF, we'd need jsPDF - simplified for now
        toast.info('PDF export coming soon');
      }

      onExport?.(dataUrl);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export badge');
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Badge Preview */}
      <div className="flex justify-center">
        <div
          ref={badgeRef}
          className={`${aspectClass} w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl`}
          style={{
            background: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 100%)`,
          }}
        >
          <div className="h-full flex flex-col p-6 relative">
            {/* Header with gradient */}
            <div 
              className="absolute top-0 left-0 right-0 h-24 -mx-6 -mt-6"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
              }}
            />

            {/* Logo / Event Name */}
            <div className="relative z-10 text-center mb-4">
              {eventLogo ? (
                <img 
                  src={eventLogo} 
                  alt={eventName}
                  className="h-12 mx-auto mb-2"
                />
              ) : showEventName && (
                <h2 className="text-white font-bold text-lg drop-shadow-md">
                  {badgeData.eventName}
                </h2>
              )}
            </div>

            {/* Photo Area */}
            <div className="flex-1 flex items-center justify-center my-4">
              {badgeData.photoUrl ? (
                <img
                  src={badgeData.photoUrl}
                  alt="Visitor"
                  className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div 
                  className="w-32 h-32 rounded-full flex items-center justify-center border-4 border-white shadow-lg"
                  style={{ backgroundColor: `${primaryColor}30` }}
                >
                  <User className="w-16 h-16" style={{ color: primaryColor }} />
                </div>
              )}
            </div>

            {/* Visitor Info */}
            <div className="text-center space-y-2">
              {showName && (
                <h3 className="text-xl font-bold text-white">
                  {badgeData.visitorName || `Visitor #${badgeData.visitorNumber || '---'}`}
                </h3>
              )}
              
              {badgeData.customField1 && (
                <p className="text-sm text-zinc-300">{badgeData.customField1}</p>
              )}
              
              {badgeData.customField2 && (
                <p className="text-sm text-zinc-400">{badgeData.customField2}</p>
              )}

              {showDateTime && (
                <p className="text-xs text-zinc-400 flex items-center justify-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {badgeData.dateTime?.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>

            {/* QR Code */}
            {showQR && (
              <div className="mt-4 flex justify-center">
                <div className="bg-white p-2 rounded-lg">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <QrCode className="w-12 h-12 text-zinc-800" />
                  </div>
                  <p className="text-[8px] text-center text-zinc-500 mt-1 font-mono">
                    {badgeData.qrCode?.slice(0, 12)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <Card className="bg-zinc-900/50 border-white/10">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Visitor Name</Label>
              <Input
                value={badgeData.visitorName}
                onChange={(e) => setBadgeData({ ...badgeData, visitorName: e.target.value })}
                placeholder="Enter name"
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Visitor Number</Label>
              <Input
                type="number"
                value={badgeData.visitorNumber || ''}
                onChange={(e) => setBadgeData({ ...badgeData, visitorNumber: parseInt(e.target.value) || undefined })}
                placeholder="#"
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Custom Field 1</Label>
              <Input
                value={badgeData.customField1}
                onChange={(e) => setBadgeData({ ...badgeData, customField1: e.target.value })}
                placeholder="e.g., Company"
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400 text-xs">Custom Field 2</Label>
              <Input
                value={badgeData.customField2}
                onChange={(e) => setBadgeData({ ...badgeData, customField2: e.target.value })}
                placeholder="e.g., Role"
                className="bg-black/40 border-white/10 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <Button
          variant="outline"
          onClick={() => setBadgeData({
            ...badgeData,
            visitorName: '',
            visitorNumber: undefined,
            customField1: '',
            customField2: '',
          })}
          className="border-white/20 text-zinc-300"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExport('png')}
          className="border-white/20 text-zinc-300"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PNG
        </Button>
        <Button
          onClick={handlePrint}
          style={{ backgroundColor: primaryColor }}
          className="text-white"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>
    </div>
  );
}

export default BadgeCreator;

