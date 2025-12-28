/**
 * StaffAlbumTools Component
 * 
 * Staff-only tools for managing albums in multi-station events.
 * Includes photo approval, album completion, sending, and presentation controls.
 */

import { useState, useEffect, useRef } from 'react';
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
import { sendAlbumEmail, getEmailStatus, getEventAlbums, updateAlbumStatus, getPaymentRequests, type Album, type PaymentRequest } from '@/services/eventsApi';
import { QRCodeSVG } from 'qrcode.react';
import { CreditCard, CheckSquare, Bell, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const prevPaymentRequestsCount = useRef(0);

  // Play notification sound when new payment request arrives
  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      
      // Two-tone notification
      setTimeout(() => {
        oscillator.frequency.value = 1000;
      }, 150);
      
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 300);
    } catch (e) {
      console.log('Could not play notification sound');
    }
  };

  // Check email configuration and load albums on mount
  useEffect(() => {
    getEmailStatus().then(status => {
      setEmailConfigured(status.configured);
    }).catch(() => {
      setEmailConfigured(false);
    });

    if (postgresEventId) {
      loadAlbums();
      loadPaymentRequests();
    }
  }, [postgresEventId]);

  // Poll for payment requests every 10 seconds
  useEffect(() => {
    if (!postgresEventId) return;
    
    const interval = setInterval(() => {
      loadPaymentRequests();
    }, 10000);
    
    return () => clearInterval(interval);
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

  const loadPaymentRequests = async () => {
    if (!postgresEventId) return;
    try {
      const requests = await getPaymentRequests(postgresEventId);
      
      // Check if we have new payment requests
      if (requests.length > prevPaymentRequestsCount.current && prevPaymentRequestsCount.current > 0) {
        // New payment request arrived!
        playNotificationSound();
        toast.info(`💳 New payment request!`, {
          description: `${requests[0]?.owner_name || requests[0]?.code || 'A visitor'} wants to pay`,
          duration: 10000,
        });
      }
      
      prevPaymentRequestsCount.current = requests.length;
      setPaymentRequests(requests);
    } catch (error) {
      console.error('Failed to load payment requests:', error);
    }
  };

  const handleMarkAsPaid = async (albumCode: string) => {
    try {
      await updateAlbumStatus(albumCode, 'paid');
      toast.success('Album marked as paid!');
      loadAlbums();
      loadPaymentRequests();
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to mark as paid');
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
      
      console.log('📧 Sending email with logo:', eventLogoUrl);
      
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
    if (!eventSlug) {
      toast.error('Event URLs not configured');
      return;
    }
    let displayUrl: string;
    if (postgresEventId) {
      displayUrl = `${window.location.origin}/e/${postgresEventId}/${eventSlug}/bigscreen`;
    } else if (userSlug) {
      displayUrl = `${window.location.origin}/${userSlug}/${eventSlug}/bigscreen`;
    } else {
      toast.error('Unable to open Big Screen');
      return;
    }
    window.open(displayUrl, 'bigscreen', 'width=1920,height=1080');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Payment Requests Alert */}
      {paymentRequests.length > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30 animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-400">
                  {paymentRequests.length} Payment Request{paymentRequests.length > 1 ? 's' : ''}
                </h3>
                <p className="text-xs text-amber-400/70">Visitors waiting to pay</p>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {paymentRequests.map((req) => (
                <div 
                  key={req.code}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#101112]/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white">{req.code}</span>
                    {req.owner_name && (
                      <span className="text-zinc-400 text-sm">• {req.owner_name}</span>
                    )}
                    <Badge className="bg-zinc-700 text-zinc-300 text-xs">
                      {req.photo_count} photos
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleMarkAsPaid(req.code)}
                    className="bg-green-600 hover:bg-green-500 text-white"
                  >
                    <DollarSign className="w-3 h-3 mr-1" />
                    Mark Paid
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-white/10">
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
            <p className="text-2xl font-bold text-white">{stats.totalAlbums}</p>
            <p className="text-xs text-zinc-400">Total Albums</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-white/10">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-2xl font-bold text-white">{stats.completedAlbums}</p>
            <p className="text-xs text-zinc-400">Completed</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-white/10">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-amber-400" />
            <p className="text-2xl font-bold text-white">{stats.pendingApproval}</p>
            <p className="text-xs text-zinc-400">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-white/10">
          <CardContent className="p-4 text-center">
            <Camera className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold text-white">{stats.totalPhotos}</p>
            <p className="text-xs text-zinc-400">Total Photos</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tools */}
      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-card/50 border border-white/10">
          <TabsTrigger value="manage" className="data-[state=active]:bg-white/10 text-zinc-400 data-[state=active]:text-white">
            Manage
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

        {/* Manage Tab - Album approval and payment */}
        <TabsContent value="manage" className="mt-4">
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Manage Albums</CardTitle>
              <CardDescription className="text-zinc-400">
                Approve albums and manage payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Album Selector for Management */}
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Select Album to Manage</Label>
                <Select
                  value={selectedAlbumCode}
                  onValueChange={setSelectedAlbumCode}
                  disabled={isLoadingAlbums}
                >
                  <SelectTrigger className="bg-[#101112]/40 border-white/10 text-white">
                    <SelectValue placeholder={isLoadingAlbums ? "Loading albums..." : "Select an album"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10">
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
                              album.status === 'paid' ? 'bg-cyan-500/20 text-cyan-400' :
                              album.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-zinc-500/20 text-zinc-400'
                            }`}>
                              {album.status}
                            </span>
                            {album.payment_status === 'paid' && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                                💰 Paid
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedAlbumCode && (() => {
                const album = albums.find(a => a.code === selectedAlbumCode);
                if (!album) return null;
                
                return (
                  <div className="space-y-3">
                    {/* Album Info */}
                    <div className="p-3 rounded-lg bg-[#101112]/30 border border-white/5">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-zinc-500">Owner:</span>
                          <span className="text-white ml-2">{album.owner_name || 'Anonymous'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Photos:</span>
                          <span className="text-white ml-2">{album.photo_count || 0}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Status:</span>
                          <span className={`ml-2 ${
                            album.status === 'completed' ? 'text-green-400' :
                            album.status === 'paid' ? 'text-cyan-400' :
                            'text-amber-400'
                          }`}>{album.status}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Payment:</span>
                          <span className={`ml-2 ${
                            album.payment_status === 'paid' ? 'text-green-400' : 'text-zinc-400'
                          }`}>{album.payment_status || 'unpaid'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Mark as Completed */}
                      <Button
                        onClick={async () => {
                          try {
                            await updateAlbumStatus(selectedAlbumCode, 'completed');
                            toast.success('Album marked as completed');
                            loadAlbums();
                          } catch (error) {
                            toast.error('Failed to update album');
                          }
                        }}
                        disabled={album.status === 'completed' || album.status === 'paid'}
                        className="bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Approve
                      </Button>

                      {/* Mark as Paid */}
                      <Button
                        onClick={async () => {
                          try {
                            await updateAlbumStatus(selectedAlbumCode, 'paid');
                            toast.success('Album marked as paid - downloads unlocked');
                            loadAlbums();
                          } catch (error) {
                            toast.error('Failed to update album');
                          }
                        }}
                        disabled={album.status === 'paid'}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Mark Paid
                      </Button>
                    </div>

                    {/* Archive Option */}
                    {album.status !== 'archived' && (
                      <Button
                        onClick={async () => {
                          try {
                            await updateAlbumStatus(selectedAlbumCode, 'archived');
                            toast.success('Album archived');
                            loadAlbums();
                          } catch (error) {
                            toast.error('Failed to archive album');
                          }
                        }}
                        variant="outline"
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/10"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Archive Album
                      </Button>
                    )}
                  </div>
                );
              })()}

              {!selectedAlbumCode && (
                <p className="text-center text-zinc-500 py-4">
                  Select an album to manage
                </p>
              )}

              <hr className="border-white/10" />

              {/* Auto-Approve Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#101112]/30 border border-white/5">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Tab */}
        <TabsContent value="send" className="mt-4">
          <Card className="bg-card/50 border-white/10">
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
                  <SelectTrigger className="bg-[#101112]/40 border-white/10 text-white">
                    <SelectValue placeholder={isLoadingAlbums ? "Loading albums..." : "Select an album"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10">
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
                    className="flex-1 bg-[#101112]/40 border-white/10 text-zinc-400 text-sm"
                  />
                  <Button
                    onClick={handleCopyUrl}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10"
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
                    className="flex-1 bg-[#101112]/40 border-white/10 text-white placeholder:text-zinc-600"
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
                    className="flex-1 bg-[#101112]/40 border-white/10 text-white placeholder:text-zinc-600"
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
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
                <Button
                  onClick={handlePrintQueue}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10"
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
          <Card className="bg-card/50 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">Big Screen Display</CardTitle>
              <CardDescription className="text-zinc-400">
                Show albums on event displays
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-[#101112]/30 border border-white/5">
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
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10"
                  >
                    <Laptop className="w-4 h-4 mr-2" />
                    Open Display
                  </Button>
                  <Button
                    onClick={() => setShowQR(!showQR)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    QR for Display
                  </Button>
                </div>
              )}

              {bigScreenMode && showQR && eventSlug && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={postgresEventId 
                      ? `${window.location.origin}/e/${postgresEventId}/${eventSlug}/bigscreen`
                      : `${window.location.origin}/${userSlug}/${eventSlug}/bigscreen`
                    }
                    size={150}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card className="bg-card/50 border-white/10">
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
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>

              {userSlug && eventSlug && (
                <Button
                  onClick={() => window.open(`/${userSlug}/${eventSlug}/registration`, '_blank')}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10"
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
