import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Sparkles, Activity, Image as ImageIcon, Check, X
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  getAdminFeaturedTemplates,
  addFeaturedTemplate,
  removeFeaturedTemplate,
  recalculateTrending,
  type Announcement,
  type FeaturedTemplate
} from "@/services/contentApi";
import { getMarketplaceTemplates, type MarketplaceTemplate } from "@/services/marketplaceApi";
import { AssetManager } from "./AssetManager";
import { ENV } from "@/config/env";

export default function SuperAdminContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "announcements");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/super-admin/content?tab=${value}`, { replace: true });
  };

  // Update tab when URL parameter changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Content Manager</h1>
        <p className="text-zinc-400">Manage announcements, featured content, and community creations.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-card border border-white/10">
          <TabsTrigger value="announcements" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <Megaphone className="w-4 h-4 mr-2" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="featured" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <Sparkles className="w-4 h-4 mr-2" />
            Featured Templates
          </TabsTrigger>
          <TabsTrigger value="trending" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <Activity className="w-4 h-4 mr-2" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="creations" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
            <ImageIcon className="w-4 h-4 mr-2" />
            Public Creations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4">
          <AnnouncementsManager />
        </TabsContent>

        <TabsContent value="featured" className="space-y-4">
          <FeaturedTemplatesManager />
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <TrendingManager />
        </TabsContent>

        <TabsContent value="creations" className="space-y-4">
          <AssetManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Sub-components ---

function AnnouncementsManager() {
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
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: "",
    type: "new_feature",
    content: "",
    visibility: "global",
    published: true,
    cta_label: "",
    cta_url: "",
    image_url: ""
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
      await publishAnnouncement(id, !currentStatus);
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, published: !currentStatus } : a));
      toast.success(currentStatus ? "Announcement unpublished" : "Announcement published");
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
      image_url: announcement.image_url || ""
    });
    setEditingId(announcement.id);
    setIsDialogOpen(true);
  };

  const uploadImageFile = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      setIsUploadingImage(true);
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'media');
      
      // Upload to server
      const response = await fetch(`${ENV.API_URL}/api/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
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
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the container, not a child element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) {
      toast.error("No file detected");
      return;
    }

    const file = files[0];
    await uploadImageFile(file);
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
      toast.error("Failed to load templates");
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
      image_url: ""
    });
    setEditingId(null);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-white">Announcements, Tips & Alerts</h2>
          <div className="flex gap-2">
            <Button size="sm" variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')} className="h-7 text-[10px] uppercase tracking-wider">All</Button>
            <Button size="sm" variant={filterType === 'features' ? 'default' : 'outline'} onClick={() => setFilterType('features')} className="h-7 text-[10px] uppercase tracking-wider">Features</Button>
            <Button size="sm" variant={filterType === 'tips' ? 'default' : 'outline'} onClick={() => setFilterType('tips')} className="h-7 text-[10px] uppercase tracking-wider">Tips</Button>
            <Button size="sm" variant={filterType === 'alerts' ? 'default' : 'outline'} onClick={() => setFilterType('alerts')} className="h-7 text-[10px] uppercase tracking-wider">Alerts</Button>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Create New
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="bg-card border-white/10 p-12 text-center text-zinc-500 italic">
            No entries found in this category.
          </Card>
        ) : (
          filteredAnnouncements.map(announcement => (
            <Card key={announcement.id} className="bg-card border-white/10 overflow-hidden hover:bg-white/[0.02] transition-colors">
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex flex-col items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleTogglePublish(announcement.id, announcement.published)}>
                      {announcement.published ? <Eye className="w-4 h-4 text-emerald-400" /> : <Eye className="w-4 h-4 text-zinc-600" />}
                    </Button>
                    <span className="text-[9px] uppercase font-bold text-zinc-600">{announcement.published ? 'Live' : 'Draft'}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-zinc-100 truncate">{announcement.title}</h3>
                      {getTypeBadge(announcement.type)}
                      <Badge variant="outline" className="text-[10px] h-5 opacity-50 uppercase tracking-tighter">{announcement.visibility.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-1">{announcement.content}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => openEdit(announcement)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-red-400" onClick={() => handleDelete(announcement.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-white/10 text-white sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Announcement" : "New Announcement"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: any) => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger className="bg-card border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10 text-white">
                    <SelectItem value="new_feature">New Feature 🚀</SelectItem>
                    <SelectItem value="update">Update 📦</SelectItem>
                    <SelectItem value="maintenance">Maintenance 🔧</SelectItem>
                    <SelectItem value="pro_tip">Pro Tip 💡</SelectItem>
                    <SelectItem value="alert">Alert ⚠️</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(val: any) => setFormData({ ...formData, visibility: val })}
                >
                  <SelectTrigger className="bg-card border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-white/10 text-white">
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="business_only">Business Only</SelectItem>
                    <SelectItem value="personal_only">Personal Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="bg-card border-white/10"
                placeholder="e.g., Live Mode is here!"
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="bg-card border-white/10 min-h-[100px]"
                placeholder="Brief description..."
              />
            </div>

            <div className="space-y-2">
              <Label>Image/Template (Optional)</Label>
              <div className="space-y-2">
                {formData.image_url ? (
                  <div className="relative group">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-full h-40 object-cover rounded-lg border border-white/10"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleRemoveImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
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
                            ? 'border-indigo-500 bg-indigo-500/10 scale-105' 
                            : 'border-white/10 hover:border-white/20 bg-card'
                        }`}
                      >
                        {isUploadingImage ? (
                          <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                        ) : (
                          <>
                            <ImageIcon className={`w-8 h-8 mb-2 transition-colors pointer-events-none ${
                              isDragging ? 'text-indigo-400' : 'text-zinc-500'
                            }`} />
                            <p className={`text-xs transition-colors pointer-events-none ${
                              isDragging ? 'text-indigo-300' : 'text-zinc-400'
                            }`}>
                              {isDragging ? 'Drop image here' : 'Upload or Drag Image'}
                            </p>
                            <p className="text-[10px] text-zinc-600 mt-1 pointer-events-none">PNG, JPG up to 5MB</p>
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
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-lg hover:border-white/20 transition-colors bg-card cursor-pointer"
                    >
                      <Sparkles className="w-8 h-8 text-zinc-500 mb-2" />
                      <p className="text-xs text-zinc-400">Select Template</p>
                      <p className="text-[10px] text-zinc-600 mt-1">From Marketplace</p>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTA Label (Optional)</Label>
                <Input
                  value={formData.cta_label}
                  onChange={e => setFormData({ ...formData, cta_label: e.target.value })}
                  className="bg-card border-white/10"
                  placeholder="Try Now"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA URL (Optional)</Label>
                <Input
                  value={formData.cta_url}
                  onChange={e => setFormData({ ...formData, cta_url: e.target.value })}
                  className="bg-card border-white/10"
                  placeholder="/business/playground"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={formData.published}
                onCheckedChange={checked => setFormData({ ...formData, published: checked })}
              />
              <Label>Publish immediately</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10 text-white hover:bg-white/5">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Picker Dialog */}
      <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
        <DialogContent className="bg-card border-white/10 text-white max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Template from Marketplace</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <Input
              placeholder="Search templates..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadTemplates()}
              className="bg-card border-white/10"
            />

            <div className="flex-1 overflow-y-auto">
              {isLoadingTemplates ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                  <Sparkles className="w-12 h-12 opacity-20 mb-3" />
                  <p className="text-sm">No templates found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {templates.map((template) => {
                    const imageUrl = template.preview_url || template.preview_images?.[0];
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-indigo-500 transition-all hover:scale-105"
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-xs font-bold text-white truncate">{template.name}</p>
                            <p className="text-[10px] text-zinc-400 truncate">{template.category}</p>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplatePicker(false)} className="border-white/10 text-white hover:bg-white/5">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FeaturedTemplatesManager() {
  const [featured, setFeatured] = useState<FeaturedTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTemplateId, setNewTemplateId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadFeatured();
  }, []);

  const loadFeatured = async () => {
    try {
      const data = await getAdminFeaturedTemplates();
      // Go backend returns { templates: [...] }
      const list = data?.templates || [];
      setFeatured(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newTemplateId) return;
    try {
      setIsAdding(true);
      await addFeaturedTemplate({ template_id: newTemplateId, featured_order: featured.length + 1 });
      setNewTemplateId("");
      loadFeatured();
      toast.success("Template featured");
    } catch (error) {
      toast.error("Failed to add template");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await removeFeaturedTemplate(id);
      setFeatured(prev => prev.filter(f => f.id !== id));
      toast.success("Template removed from featured");
    } catch (error) {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-white/10">
        <CardHeader>
          <CardTitle>Featured Templates</CardTitle>
          <CardDescription>Manage templates shown in the Home Dashboard</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Template ID (e.g. evt-123-abc)"
              value={newTemplateId}
              onChange={e => setNewTemplateId(e.target.value)}
              className="bg-card border-white/10 max-w-md"
            />
            <Button onClick={handleAdd} disabled={!newTemplateId || isAdding} className="bg-indigo-600">
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add to Featured
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {featured.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white truncate w-32">{item.template_name || item.template_id}</p>
                    <p className="text-[10px] text-zinc-500">{item.template_id}</p>
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={() => handleRemove(item.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {featured.length === 0 && !isLoading && (
              <p className="text-zinc-500 text-sm col-span-3 text-center py-4">No featured templates yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TrendingManager() {
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await recalculateTrending();
      toast.success("Trending scores recalculated");
    } catch (error) {
      toast.error("Failed to recalculate");
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <Card className="bg-card border-white/10">
      <CardHeader>
        <CardTitle>Trending Logic</CardTitle>
        <CardDescription>Algorithms update automatically every 24h. You can force an update here.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleRecalculate} disabled={isRecalculating} className="bg-amber-600 hover:bg-amber-700 text-white">
          {isRecalculating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Recalculate Trending Scores
        </Button>
      </CardContent>
    </Card>
  );
}

