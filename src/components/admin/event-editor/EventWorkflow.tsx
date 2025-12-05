import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Plus, Trash2, Users, MapPin, UserCheck, Printer, BadgeCheck, LayoutTemplate, ExternalLink, Copy, Settings2 } from "lucide-react";
import { EditorSectionProps } from "./types";
import { AlbumStation } from "@/services/eventsApi";
import { toast } from "sonner";

export function EventWorkflow({ formData, setFormData }: EditorSectionProps) {
  // Helper to update tracking config
  const updateTracking = (updates: any) => {
    setFormData({
      ...formData,
      albumTracking: { ...formData.albumTracking, ...updates }
    });
  };

  // Helper to update tracking rules
  const updateRules = (updates: any) => {
    setFormData({
      ...formData,
      albumTracking: {
        ...formData.albumTracking,
        rules: { ...formData.albumTracking.rules, ...updates }
      }
    });
  };

  // Helper to update badge integration
  const updateBadge = (updates: any) => {
    setFormData({
      ...formData,
      albumTracking: {
        ...formData.albumTracking,
        badgeIntegration: { ...formData.albumTracking.badgeIntegration, ...updates }
      }
    });
  };

  // Station Management
  const addStation = () => {
    const newStation: AlbumStation = {
      id: crypto.randomUUID(),
      name: `Station ${formData.albumTracking.stations.length + 1}`,
      description: "",
      type: 'booth',
      requiresScanner: false,
      order: formData.albumTracking.stations.length
    };
    updateTracking({ stations: [...formData.albumTracking.stations, newStation] });
  };

  const updateStation = (index: number, updates: Partial<AlbumStation>) => {
    const newStations = [...formData.albumTracking.stations];
    newStations[index] = { ...newStations[index], ...updates };
    updateTracking({ stations: newStations });
  };

  const removeStation = (index: number) => {
    const newStations = formData.albumTracking.stations.filter((_, i) => i !== index);
    updateTracking({ stations: newStations });
  };

  const copyStationUrl = (stationId: string) => {
    const url = `${window.location.origin}/station/${stationId}`;
    navigator.clipboard.writeText(url);
    toast.success("Station URL copied to clipboard");
  };

  return (
    <div className="space-y-8">


      <section>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl font-semibold text-white">Album Tracking</h2>
            <p className="text-zinc-400">Track visitors, assign personal QR codes, and manage multi-station events.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="tracking-enabled" className="text-white font-medium cursor-pointer">Enable Tracking</Label>
            <Switch
              id="tracking-enabled"
              checked={formData.albumTracking.enabled}
              onCheckedChange={(checked) => updateTracking({ enabled: checked })}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>
        </div>

        {formData.albumTracking.enabled ? (
          <div className="space-y-6 mt-6">
            {/* Core Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    Tracking Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Album Type</Label>
                    <Select 
                      value={formData.albumTracking.albumType} 
                      onValueChange={(v: any) => updateTracking({ albumType: v })}
                    >
                      <SelectTrigger className="bg-black/40 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                        <SelectItem value="individual">Individual (One QR per person)</SelectItem>
                        <SelectItem value="group">Group (Shared QR code)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-zinc-500">
                      "Individual" tracks each guest separately. "Group" is best for families or teams.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300">Max Photos Per Album</Label>
                    <Input
                      type="number"
                      value={formData.albumTracking.rules.maxPhotosPerAlbum}
                      onChange={(e) => updateRules({ maxPhotosPerAlbum: parseInt(e.target.value) || 0 })}
                      className="bg-black/40 border-white/10 text-white"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-emerald-400" />
                    Approval & Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                    <div>
                      <Label className="text-zinc-300 font-medium">Require Staff Approval</Label>
                      <p className="text-xs text-zinc-500">Photos must be approved before appearing in album</p>
                    </div>
                    <Switch
                      checked={formData.albumTracking.rules.requireStaffApproval}
                      onCheckedChange={(c) => updateRules({ requireStaffApproval: c })}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                    <div>
                      <Label className="text-zinc-300 font-medium">Allow Re-Entry</Label>
                      <p className="text-xs text-zinc-500">Scan same QR code multiple times</p>
                    </div>
                    <Switch
                      checked={formData.albumTracking.rules.allowReEntry}
                      onCheckedChange={(c) => updateRules({ allowReEntry: c })}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>

                   <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                    <div>
                      <Label className="text-zinc-300 font-medium">Print Ready Mode</Label>
                      <p className="text-xs text-zinc-500">Optimize workflow for onsite printing</p>
                    </div>
                    <Switch
                      checked={formData.albumTracking.rules.printReady}
                      onCheckedChange={(c) => updateRules({ printReady: c })}
                      className="data-[state=checked]:bg-zinc-600"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Badge Integration - Simplified for Workflow */}
            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-purple-400" />
                  Badge Logistics
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Configure how badges are handled at registration stations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5">
                  <div>
                    <Label className="text-zinc-300 font-medium">Auto-Generate Badges</Label>
                    <p className="text-xs text-zinc-500">Create a badge immediately upon registration</p>
                  </div>
                  <Switch
                    checked={formData.albumTracking.badgeIntegration.autoGenerateBadge}
                    onCheckedChange={(c) => updateBadge({ autoGenerateBadge: c })}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>

                {formData.albumTracking.badgeIntegration.autoGenerateBadge && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-3">
                    <LayoutTemplate className="w-5 h-5 text-purple-300" />
                    <div>
                      <p className="text-sm text-purple-200">Badge Template is active</p>
                      <p className="text-xs text-purple-300/70">Edit the design in the <strong>Experience</strong> tab.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Station Configuration */}
            <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-amber-400" />
                    Stations
                  </CardTitle>
                  <Button onClick={addStation} size="sm" className="bg-zinc-800 text-white hover:bg-zinc-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Station
                  </Button>
                </div>
                <CardDescription className="text-zinc-400">
                  Define physical locations where guests can interact (Registration, Photo Booths, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {formData.albumTracking.stations.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                    <p className="text-zinc-500 mb-2">No stations defined.</p>
                    <Button onClick={addStation} variant="link" className="text-indigo-400">
                      Create your first station
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.albumTracking.stations.map((station, index) => (
                      <div key={station.id} className="flex flex-col gap-4 p-4 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex items-center gap-4">
                           <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 font-mono text-sm shrink-0">
                            {index + 1}
                          </div>
                          
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div className="space-y-1">
                              <Input 
                                value={station.name}
                                onChange={(e) => updateStation(index, { name: e.target.value })}
                                placeholder="Station Name"
                                className="bg-transparent border-white/10 text-white h-9"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                               <Select 
                                  value={station.type} 
                                  onValueChange={(v: any) => updateStation(index, { type: v })}
                                >
                                  <SelectTrigger className="bg-zinc-900 border-white/10 text-white h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                    <SelectItem value="registration">Registration</SelectItem>
                                    <SelectItem value="booth">Photo Booth</SelectItem>
                                    <SelectItem value="playground">Playground</SelectItem>
                                    <SelectItem value="viewer">Viewer / Kiosk</SelectItem>
                                  </SelectContent>
                                </Select>
                                
                                {station.type !== 'registration' && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900 border border-white/5 ml-auto md:ml-0">
                                    <QrCode className={`w-4 h-4 ${station.requiresScanner ? 'text-emerald-400' : 'text-zinc-600'}`} />
                                    <Switch
                                      checked={station.requiresScanner}
                                      onCheckedChange={(c) => updateStation(index, { requiresScanner: c })}
                                      className="scale-75 data-[state=checked]:bg-emerald-600"
                                    />
                                  </div>
                                )}
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeStation(index)}
                            className="text-zinc-600 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Station Actions */}
                        <div className="flex items-center justify-end gap-2 pl-12 border-t border-white/5 pt-3">
                           <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-white/10"
                            onClick={() => copyStationUrl(station.id)}
                          >
                            <Copy className="w-3 h-3 mr-2" />
                            Copy URL
                          </Button>
                           <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs text-zinc-400 hover:text-white hover:bg-white/10"
                            onClick={() => window.open(`${window.location.origin}/station/${station.id}`, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            Open Station
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
           <div className="mt-8 p-8 border border-white/10 rounded-2xl bg-zinc-900/30 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <QrCode className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Tracking Disabled</h3>
            <p className="text-zinc-400 max-w-md mb-6">
              Enable Album Tracking to manage guest registration, assign QR codes, and track photos across multiple booth stations.
            </p>
            <Button onClick={() => updateTracking({ enabled: true })} className="bg-white text-black hover:bg-zinc-200">
              Enable Features
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
