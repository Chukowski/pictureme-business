/**
 * StaffAlbumTools Component
 * 
 * Staff-only tools for managing albums in multi-station events.
 * Includes photo approval, album completion, sending, and presentation controls.
 */

import { useState } from 'react';
import {
  CheckCircle2, XCircle, Mail, MessageSquare, MonitorPlay,
  Printer, Download, QrCode, Users, Clock, Camera, Send,
  Smartphone, Laptop, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface AlbumStats {
  totalAlbums: number;
  completedAlbums: number;
  pendingApproval: number;
  totalPhotos: number;
}

interface StaffAlbumToolsProps {
  eventId: string;
  eventName: string;
  stats?: AlbumStats;
  primaryColor?: string;
  onRefresh?: () => void;
  className?: string;
}

export function StaffAlbumTools({
  eventId,
  eventName,
  stats = {
    totalAlbums: 0,
    completedAlbums: 0,
    pendingApproval: 0,
    totalPhotos: 0,
  },
  primaryColor = '#06B6D4',
  onRefresh,
  className = '',
}: StaffAlbumToolsProps) {
  const [bigScreenMode, setBigScreenMode] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Actions
  const handleApproveAll = () => {
    toast.success('All pending photos approved');
  };

  const handleSendBulkEmail = () => {
    if (!emailAddress) {
      toast.error('Please enter an email address');
      return;
    }
    toast.success(`Albums sent to ${emailAddress}`);
    setEmailAddress('');
  };

  const handleSendBulkSMS = () => {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    toast.success(`Album links sent to ${phoneNumber}`);
    setPhoneNumber('');
  };

  const handlePrintQueue = () => {
    toast.success('Print queue opened');
  };

  const handleExportAll = () => {
    toast.success('Exporting all albums...');
  };

  const handleGenerateQR = () => {
    toast.success('Registration QR generated');
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
          <TabsTrigger value="approval" className="data-[state=active]:bg-white/10">
            Approval
          </TabsTrigger>
          <TabsTrigger value="send" className="data-[state=active]:bg-white/10">
            Send
          </TabsTrigger>
          <TabsTrigger value="presentation" className="data-[state=active]:bg-white/10">
            Display
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-white/10">
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

              {stats.pendingApproval > 0 && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleApproveAll}
                    className="flex-1 bg-green-600 hover:bg-green-500"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve All ({stats.pendingApproval})
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/20 text-zinc-300"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Review Queue
                  </Button>
                </div>
              )}

              {stats.pendingApproval === 0 && (
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
              {/* Email */}
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Send via Email</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="visitor@email.com"
                    className="flex-1 bg-black/40 border-white/10 text-white"
                  />
                  <Button
                    onClick={handleSendBulkEmail}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>

              {/* SMS/WhatsApp */}
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Send via SMS/WhatsApp</Label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="flex-1 bg-black/40 border-white/10 text-white"
                  />
                  <Button
                    onClick={handleSendBulkSMS}
                    className="bg-green-600 hover:bg-green-500"
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
                  variant="outline"
                  onClick={handleExportAll}
                  className="border-white/20 text-zinc-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePrintQueue}
                  className="border-white/20 text-zinc-300"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Queue
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Presentation Tab */}
        <TabsContent value="send" className="mt-4">
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
                    variant="outline"
                    className="border-white/20 text-zinc-300"
                  >
                    <Laptop className="w-4 h-4 mr-2" />
                    Open Display
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/20 text-zinc-300"
                  >
                    <Smartphone className="w-4 h-4 mr-2" />
                    QR for Display
                  </Button>
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
              <Button
                onClick={handleGenerateQR}
                className="w-full"
                style={{ backgroundColor: primaryColor }}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Generate Registration QR
              </Button>

              <Button
                variant="outline"
                onClick={onRefresh}
                className="w-full border-white/20 text-zinc-300"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StaffAlbumTools;

