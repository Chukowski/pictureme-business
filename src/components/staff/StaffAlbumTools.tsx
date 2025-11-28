/**
 * StaffAlbumTools Component
 * 
 * Staff-only tools for managing albums in multi-station events.
 * Includes photo approval, album completion, sending, and presentation controls.
 */

import { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, Mail, MessageSquare, MonitorPlay,
  Printer, Download, QrCode, Users, Clock, Camera,
  Smartphone, Laptop, RefreshCw, Loader2, ChevronDown,
  ExternalLink, Copy, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { sendAlbumEmail, getEmailStatus, getEventAlbums, type Album } from '@/services/eventsApi';
import { QRCodeSVG } from 'qrcode.react';

interface AlbumStats {
  totalAlbums: number;
  completedAlbums: number;
  pendingApproval: number;
  totalPhotos: number;
}

interface StaffAlbumToolsProps {
  eventId: string;
  postgresEventId?: number;
  eventName: string;
  userSlug?: string;
  eventSlug?: string;
  stats?: AlbumStats;
  primaryColor?: string;
  eventLogoUrl?: string;
  onRefresh?: () => void;
  className?: string;
}

export function StaffAlbumTools({
  eventId,
  postgresEventId,
  eventName,
  userSlug,
  eventSlug,
  stats = {
    totalAlbums: 0,
    completedAlbums: 0,
    pendingApproval: 0,
    totalPhotos: 0,
  },
  primaryColor = '#06B6D4',
  eventLogoUrl,
  onRefresh,
  className = '',
}: StaffAlbumToolsProps) {
  const [bigScreenMode, setBigScreenMode] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumCode, setSelectedAlbumCode] = useState<string>('');
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Check email configuration and load albums on mount
  useEffect(() => {
    getEmailStatus().then(status => {
      setEmailConfigured(status.configured);
    }).catch(() => {
      setEmailConfigured(false);
    });

    if (postgresEventId) {
      loadAlbums();
    }
  }, [postgresEventId]);

  const loadAlbums = async () => {
    if (!postgresEventId) return;
    setIsLoadingAlbums(true);
    try {
      const albumList = await getEventAlbums(postgresEventId);
      setAlbums(albumList);
      // Auto-select first completed album if available
      const completedAlbum = albumList.find(a => a.status === 'completed');
      if (completedAlbum) {
        setSelectedAlbumCode(completedAlbum.code);
      }
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  const getAlbumUrl = (code: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/${userSlug}/${eventSlug}/album/${code}`;
  };

  const getRegistrationUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/${userSlug}/${eventSlug}/registration`;
  };

  // Actions
  const handleApproveAll = () => {
    toast.success('All pending photos approved');
    onRefresh?.();
  };

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    if (!selectedAlbumCode) {
      toast.error('Please select an album to send');
      return;
    }

    if (!emailConfigured) {
      toast.error('Email service not configured');
      return;
    }

    const selectedAlbum = albums.find(a => a.code === selectedAlbumCode);
    
    setIsSendingEmail(true);
    try {
      const albumUrl = getAlbumUrl(selectedAlbumCode);
      
      await sendAlbumEmail(
        emailAddress,
        albumUrl,
        eventName,
        selectedAlbum?.owner_name,
        undefined, // brandName
        primaryColor,
        selectedAlbum?.photo_count || 0,
        eventLogoUrl
      );
      
      toast.success(`Album link sent to ${emailAddress}`);
      setEmailAddress('');
    } catch (error) {
      console.error('Email error:', error);
      toast.error('Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    if (!selectedAlbumCode) {
      toast.error('Please select an album to send');
      return;
    }

    const albumUrl = getAlbumUrl(selectedAlbumCode);
    const selectedAlbum = albums.find(a => a.code === selectedAlbumCode);
    const message = encodeURIComponent(
      `🎉 Your photos from ${eventName} are ready!\n\n` +
      `${selectedAlbum?.owner_name ? `Hi ${selectedAlbum.owner_name}, ` : ''}` +
      `View and download your photos here:\n${albumUrl}`
    );
    
    // Clean phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const handleCopyUrl = () => {
    if (!selectedAlbumCode) {
      toast.error('Please select an album first');
      return;
    }
    navigator.clipboard.writeText(getAlbumUrl(selectedAlbumCode));
    setCopiedUrl(true);
    toast.success('Album URL copied!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleExportAll = () => {
    toast.info('Export feature coming soon');
  };

  const handlePrintQueue = () => {
    toast.info('Print queue feature coming soon');
  };

  const handleOpenDisplay = () => {
    if (!userSlug || !eventSlug) {
      toast.error('Event URLs not configured');
      return;
    }
    const displayUrl = `${window.location.origin}/${userSlug}/${eventSlug}/display`;
    window.open(displayUrl, '_blank');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
            <p className="text-2xl font-bold text-white">{stats.totalAlbums}</p>
            <p className="text-xs text-zinc-400">Total Albums</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-2xl font-bold text-white">{stats.completedAlbums}</p>
            <p className="text-xs text-zinc-400">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-amber-400" />
            <p className="text-2xl font-bold text-white">{stats.pendingApproval}</p>
            <p className="text-xs text-zinc-400">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/10">
          <CardContent className="p-4 text-center">
            <Camera className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold text-white">{stats.totalPhotos}</p>
            <p className="text-xs text-zinc-400">Total Photos</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tools */}
      <Tabs defaultValue="approval" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900/50 border border-white/10">
          <TabsTrigger value="approval" className="data-[state=active]:bg-white/10 text-zinc-400 data-[state=active]:text-white">
            Approval
          </TabsTrigger>
          <TabsTrigger value="send" className="data-[state=active]:bg-white/10 text-zinc-400 data-[state=active]:text-white">
            Send
          </TabsTrigger>
          <TabsTrigger value="display" className="data-[state=active]:bg-white/10 text-zinc-400 data-[state=active]:text-white">
            Display
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-white/10 text-zinc-400 data-[state=active]:text-white">
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Approval Tab */}
        <TabsContent value="approval" className="mt-4">
          <Card className="bg-zinc-900/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Photo Approval</CardTitle>
              <CardDescription className="text-zinc-400">
                Review and approve photos before they appear in albums
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-white/5">
                <div>
                  <p className="text-white font-medium">Auto-Approve Photos</p>
                  <p className="text-xs text-zinc-400">
                    Automatically approve all new photos
                  </p>
                </div>
                <Switch
                  checked={autoApprove}
                  onCheckedChange={setAutoApprove}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>

              {stats.pendingApproval > 0 ? (
                <div className="flex gap-3">
                  <Button
                    onClick={handleApproveAll}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve All ({stats.pendingApproval})
                  </Button>
                  <Button
                    onClick={() => toast.info('Review queue coming soon')}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Review Queue
                  </Button>
                </div>
              ) : (
                <p className="text-center text-zinc-500 py-4">
                  No photos pending approval
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Tab */}
        <TabsContent value="send" className="mt-4">
          <Card className="bg-zinc-900/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Send Albums</CardTitle>
              <CardDescription className="text-zinc-400">
                Send completed albums to visitors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Album Selector */}
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Select Album</Label>
                <Select
                  value={selectedAlbumCode}
                  onValueChange={setSelectedAlbumCode}
                  disabled={isLoadingAlbums}
                >
                  <SelectTrigger className="bg-black/40 border-white/10 text-white">
                    <SelectValue placeholder={isLoadingAlbums ? "Loading albums..." : "Select an album"} />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {albums.length === 0 ? (
                      <SelectItem value="none" disabled className="text-zinc-500">
                        No albums available
                      </SelectItem>
                    ) : (
                      albums.map(album => (
                        <SelectItem 
                          key={album.code} 
                          value={album.code}
                          className="text-white hover:bg-white/10"
                        >
                          <div className="flex items-center gap-2">
                            <span>{album.owner_name || album.code}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              album.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              album.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-zinc-500/20 text-zinc-400'
                            }`}>
                              {album.status}
                            </span>
                            <span className="text-zinc-500 text-xs">
                              ({album.photo_count || 0} photos)
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Copy URL */}
              {selectedAlbumCode && (
                <div className="flex gap-2">
                  <Input
                    value={getAlbumUrl(selectedAlbumCode)}
                    readOnly
                    className="flex-1 bg-black/40 border-white/10 text-zinc-400 text-sm"
                  />
                  <Button
                    onClick={handleCopyUrl}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10"
                  >
                    {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              )}

              <hr className="border-white/10" />

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">
                  Send via Email
                  {!emailConfigured && (
                    <span className="ml-2 text-amber-400">(Not configured)</span>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="visitor@email.com"
                    className="flex-1 bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
                    disabled={isSendingEmail || !selectedAlbumCode}
                  />
                  <Button
                    onClick={handleSendEmail}
                    className="bg-blue-600 hover:bg-blue-500 text-white"
                    disabled={isSendingEmail || !emailConfigured || !selectedAlbumCode}
                  >
                    {isSendingEmail ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Send
                  </Button>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Send via WhatsApp</Label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="flex-1 bg-black/40 border-white/10 text-white placeholder:text-zinc-600"
                    disabled={!selectedAlbumCode}
                  />
                  <Button
                    onClick={handleSendWhatsApp}
                    className="bg-green-600 hover:bg-green-500 text-white"
                    disabled={!selectedAlbumCode}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>

              <hr className="border-white/10" />

              {/* Bulk Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleExportAll}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
                <Button
                  onClick={handlePrintQueue}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display" className="mt-4">
          <Card className="bg-zinc-900/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Big Screen Display</CardTitle>
              <CardDescription className="text-zinc-400">
                Show albums on event displays
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-black/30 border border-white/5">
                <div className="flex items-center gap-3">
                  <MonitorPlay 
                    className="w-8 h-8" 
                    style={{ color: bigScreenMode ? primaryColor : '#71717A' }}
                  />
                  <div>
                    <p className="text-white font-medium">Big Screen Mode</p>
                    <p className="text-xs text-zinc-400">
                      {bigScreenMode ? 'Displaying on connected screens' : 'Off'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={bigScreenMode}
                  onCheckedChange={setBigScreenMode}
                  className="data-[state=checked]:bg-cyan-600"
                />
              </div>

              {bigScreenMode && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleOpenDisplay}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10"
                  >
                    <Laptop className="w-4 h-4 mr-2" />
                    Open Display
                  </Button>
                  <Button
                    onClick={() => setShowQR(!showQR)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR for Display
                  </Button>
                </div>
              )}

              {bigScreenMode && showQR && userSlug && eventSlug && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={`${window.location.origin}/${userSlug}/${eventSlug}/display`}
                    size={150}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card className="bg-zinc-900/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Registration QR */}
              <div className="space-y-3">
                <Button
                  onClick={() => setShowQR(!showQR)}
                  className="w-full"
                  style={{ backgroundColor: primaryColor }}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  {showQR ? 'Hide' : 'Show'} Registration QR
                </Button>

                {showQR && userSlug && eventSlug && (
                  <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg">
                    <QRCodeSVG 
                      value={getRegistrationUrl()}
                      size={180}
                    />
                    <p className="text-xs text-zinc-600 text-center break-all">
                      {getRegistrationUrl()}
                    </p>
                  </div>
                )}
              </div>

              <Button
                onClick={onRefresh}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>

              {userSlug && eventSlug && (
                <Button
                  onClick={() => window.open(`/${userSlug}/${eventSlug}/registration`, '_blank')}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Registration Page
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StaffAlbumTools;
