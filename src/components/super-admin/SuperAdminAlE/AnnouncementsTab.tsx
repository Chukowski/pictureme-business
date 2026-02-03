import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Plus, Edit2, Trash2, Eye, Megaphone,
  Sparkles, Image as ImageIcon, Check, X, Bell
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  type Announcement
} from "@/services/contentApi";
import { getMarketplaceTemplates, type MarketplaceTemplate } from "@/services/marketplaceApi";
import { ENV } from "@/config/env";
import { TechnicalTooltip } from "./ale-shared";

export function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // Template picker state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Announcement & { notify_via_ale: boolean }>>({
    title: "",
    type: "new_feature",
    content: "",
    visibility: "global",
    published: true,
    cta_label: "",
    cta_url: "",
    image_url: "",
    notify_via_ale: true
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setIsLoading(true);
      const data = await getAdminAnnouncements();
      const list = data?.announcements || [];
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Failed to load announcements:", error);
      toast.error("Failed to load announcements");
      setAnnouncements([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (filterType === "all") return true;
    if (filterType === "features") return a.type === 'new_feature' || a.type === 'update';
    if (filterType === "tips") return a.type === 'pro_tip';
    if (filterType === "alerts") return a.type === 'alert' || a.type === 'maintenance';
    return true;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'pro_tip':
        return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">Pro Tip 💡</Badge>;
      case 'alert':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Alert ⚠️</Badge>;
      case 'maintenance':
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Maintenance 🔧</Badge>;
      case 'new_feature':
        return <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">New Feature 🚀</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Title and content are required");
      return;
    }

    try {
      setIsSaving(true);
      if (editingId) {
        await updateAnnouncement(editingId, formData);
        toast.success("Announcement updated");
      } else {
        await createAnnouncement(formData);
        toast.success("Announcement created");
      }
      setIsDialogOpen(false);
      loadAnnouncements();
      resetForm();
    } catch (error) {
      toast.error("Failed to save announcement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await deleteAnnouncement(id);
      toast.success("Announcement deleted");
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      toast.error("Failed to delete announcement");
    }
  };

  const handleTogglePublish = async (id: number, currentStatus: boolean) => {
    try {
      // For toggle publish, we can optionally notify via Al-e if turning it ON
      const shouldNotify = !currentStatus;
      await publishAnnouncement(id, !currentStatus, shouldNotify);
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, published: !currentStatus } : a));
      toast.success(currentStatus ? "Announcement unpublished" : "Announcement published & Al-e notified");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const openEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      type: announcement.type,
      content: announcement.content,
      visibility: announcement.visibility,
      published: announcement.published,
      cta_label: announcement.cta_label || "",
      cta_url: announcement.cta_url || "",
      image_url: announcement.image_url || "",
      notify_via_ale: false // Default to false for edits unless requested
    });
    setEditingId(announcement.id);
    setIsDialogOpen(true);
  };

  const uploadImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      setIsUploadingImage(true);
      const fd = new FormData();
      formData.append ? null : null; // dummy
      fd.append('file', file);
      fd.append('category', 'media');
      
      const response = await fetch(`${ENV.API_URL}/api/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: fd
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, image_url: data.url }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImageFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    await uploadImageFile(files[0]);
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: "" });
  };

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const data = await getMarketplaceTemplates({ 
        search: templateSearch,
        limit: 50 
      });
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleSelectTemplate = (template: MarketplaceTemplate) => {
    const imageUrl = template.preview_url || template.preview_images?.[0] || "";
    setFormData({ ...formData, image_url: imageUrl });
    setShowTemplatePicker(false);
    toast.success(`Template "${template.name}" selected`);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      type: "new_feature",
      content: "",
      visibility: "global",
      published: true,
      cta_label: "",
      cta_url: "",
      image_url: "",
      notify_via_ale: true
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-mono font-bold text-white uppercase tracking-widest">Broadcast_Center</h2>
            <TechnicalTooltip text="Manage platform announcements and Al-e automated notifications.">
              <Megaphone className="w-4 h-4 text-zinc-500" />
            </TechnicalTooltip>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')} className="h-7 text-[10px] uppercase tracking-wider font-mono">All</Button>
            <Button size="sm" variant={filterType === 'features' ? 'default' : 'outline'} onClick={() => setFilterType('features')} className="h-7 text-[10px] uppercase tracking-wider font-mono text-indigo-400">Features</Button>
            <Button size="sm" variant={filterType === 'tips' ? 'default' : 'outline'} onClick={() => setFilterType('tips')} className="h-7 text-[10px] uppercase tracking-wider font-mono text-purple-400">Tips</Button>
            <Button size="sm" variant={filterType === 'alerts' ? 'default' : 'outline'} onClick={() => setFilterType('alerts')} className="h-7 text-[10px] uppercase tracking-wider font-mono text-red-400">Alerts</Button>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 font-mono text-[10px] uppercase tracking-widest px-6 h-10">
          <Plus className="w-4 h-4 mr-2" />
          Initialize_Transmission
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="bg-zinc-900/30 border-white/5 p-12 text-center text-zinc-600 font-mono text-xs uppercase tracking-widest italic">
            No active transmissions detected in this sector.
          </Card>
        ) : (
          filteredAnnouncements.map(announcement => (
            <Card key={announcement.id} className="bg-zinc-900/20 border-white/5 overflow-hidden hover:bg-white/[0.02] transition-all group">
              <div className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-6 min-w-0">
                  <div className="flex flex-col items-center gap-1.5">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-10 w-10 p-0 rounded-full border border-white/5 hover:bg-white/5 transition-all" 
                      onClick={() => handleTogglePublish(announcement.id, announcement.published)}
                    >
                      {announcement.published ? <Eye className="w-5 h-5 text-emerald-400" /> : <Eye className="w-5 h-5 text-zinc-700" />}
                    </Button>
                    <span className={`text-[8px] uppercase font-mono font-bold tracking-widest ${announcement.published ? 'text-emerald-500/50' : 'text-zinc-700'}`}>
                      {announcement.published ? 'ONLINE' : 'STAGED'}
                    </span>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <h3 className="font-mono font-bold text-white tracking-wider truncate text-sm uppercase">{announcement.title}</h3>
                      {getTypeBadge(announcement.type)}
                      <Badge variant="outline" className="text-[8px] h-4 border-white/10 text-zinc-500 uppercase font-mono tracking-tighter">
                        SCOPE: {announcement.visibility.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-sans line-clamp-1 opacity-80">{announcement.content}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-zinc-600 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5" onClick={() => openEdit(announcement)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-zinc-600 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/10" onClick={() => handleDelete(announcement.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[650px] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg uppercase tracking-[0.2em] text-indigo-400">
              {editingId ? "Update_Protocol" : "New_Transmission_Protocol"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-6 font-mono">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Signal_Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger className="bg-zinc-900/50 border-white/5 h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10 text-white font-mono text-xs">
                    <SelectItem value="new_feature">New Feature 🚀</SelectItem>
                    <SelectItem value="update">Update 📦</SelectItem>
                    <SelectItem value="maintenance">Maintenance 🔧</SelectItem>
                    <SelectItem value="pro_tip">Pro Tip 💡</SelectItem>
                    <SelectItem value="alert">Alert ⚠️</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Audience_Scope</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(val: any) => setFormData({ ...formData, visibility: val })}
                >
                  <SelectTrigger className="bg-zinc-900/50 border-white/5 h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10 text-white font-mono text-xs">
                    <SelectItem value="global">GLOBAL_SYNC</SelectItem>
                    <SelectItem value="business_only">BUSINESS_SECTOR</SelectItem>
                    <SelectItem value="personal_only">PERSONAL_SECTOR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Transmission_Title</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="bg-zinc-900/50 border-white/5 h-10 text-xs placeholder:text-zinc-700"
                placeholder="e.g., Live Mode initialized"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Data_Payload</Label>
              <Textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="bg-zinc-900/50 border-white/5 min-h-[120px] text-xs font-sans placeholder:text-zinc-700"
                placeholder="Transmission details..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-widest text-zinc-500">Visual_Asset (Optional)</Label>
              <div className="space-y-2">
                {formData.image_url ? (
                  <div className="relative group">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-full h-44 object-cover rounded-lg border border-white/10"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full h-8 w-8 p-0"
                      onClick={handleRemoveImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="announcement-image-upload"
                        disabled={isUploadingImage}
                      />
                      <label
                        htmlFor="announcement-image-upload"
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                          isDragging 
                            ? 'border-indigo-500 bg-indigo-500/10' 
                            : 'border-white/5 hover:border-white/10 bg-zinc-900/30'
                        }`}
                      >
                        {isUploadingImage ? (
                          <Loader2 className="w-8 h-8 animate-spin text-zinc-700" />
                        ) : (
                          <>
                            <ImageIcon className={`w-6 h-6 mb-2 transition-colors pointer-events-none ${
                              isDragging ? 'text-indigo-400' : 'text-zinc-700'
                            }`} />
                            <p className="text-[9px] uppercase tracking-widest text-zinc-600">UPLINK_ASSET</p>
                          </>
                        )}
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTemplatePicker(true);
                        loadTemplates();
                      }}
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/5 rounded-lg hover:border-white/10 transition-all bg-zinc-900/30 group"
                    >
                      <Sparkles className="w-6 h-6 text-zinc-700 mb-2 group-hover:text-indigo-400 transition-colors" />
                      <p className="text-[9px] uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400 transition-colors">VAULT_ASSET</p>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">CTA_LABEL</Label>
                <Input
                  value={formData.cta_label}
                  onChange={e => setFormData({ ...formData, cta_label: e.target.value })}
                  className="bg-zinc-900/50 border-white/5 h-10 text-xs placeholder:text-zinc-700"
                  placeholder="EXECUTE_ACTION"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-zinc-500">CTA_ENDPOINT</Label>
                <Input
                  value={formData.cta_url}
                  onChange={e => setFormData({ ...formData, cta_url: e.target.value })}
                  className="bg-zinc-900/50 border-white/5 h-10 text-xs placeholder:text-zinc-700"
                  placeholder="/internal/sector"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Bell className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] uppercase font-bold text-white tracking-widest">Al-e_Notification</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">Engage neural link for this broadcast</p>
                </div>
              </div>
              <Switch
                checked={formData.notify_via_ale}
                onCheckedChange={checked => setFormData({ ...formData, notify_via_ale: checked })}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch
                checked={formData.published}
                onCheckedChange={checked => setFormData({ ...formData, published: checked })}
                className="data-[state=checked]:bg-emerald-600"
              />
              <Label className="text-[10px] uppercase tracking-widest text-zinc-400">Initialize_Deployment_Immediately</Label>
            </div>
          </div>

          <DialogFooter className="bg-zinc-900/50 -mx-6 -mb-6 p-6 flex gap-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white">ABORT</Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 font-mono text-[10px] uppercase tracking-widest flex-1">
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              {editingId ? "COMMIT_CHANGES" : "INITIALIZE_BROADCAST"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Picker Dialog */}
      <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-4xl max-h-[85vh] overflow-hidden flex flex-col font-mono">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-[0.2em] text-indigo-400 text-sm">SELECT_VAULT_ASSET</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 flex-1 overflow-hidden flex flex-col pt-4">
            <div className="relative">
              <Input
                placeholder="Search vaults..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadTemplates()}
                className="bg-zinc-900/50 border-white/5 h-12 pl-10 text-xs"
              />
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
              {isLoadingTemplates ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-10 h-10 animate-spin text-indigo-500/20" />
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-700 border border-dashed border-white/5 rounded-2xl">
                  <Sparkles className="w-12 h-12 opacity-10 mb-4" />
                  <p className="text-[10px] uppercase tracking-[0.3em]">No_Assets_Located</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {templates.map((template) => {
                    const imageUrl = template.preview_url || template.preview_images?.[0];
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-white/5 hover:border-indigo-500/50 transition-all hover:scale-[1.02] bg-zinc-900/20"
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={template.name}
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-zinc-800" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <p className="text-[10px] font-bold text-white truncate uppercase tracking-widest mb-1">{template.name}</p>
                          <p className="text-[8px] text-indigo-400 truncate uppercase tracking-tighter opacity-60">{template.category}</p>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-6">
            <Button variant="ghost" onClick={() => setShowTemplatePicker(false)} className="w-full border border-white/5 uppercase tracking-widest text-[9px] h-10">CLOSE_VAULT</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
