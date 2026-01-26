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
import { AssetManager } from "./AssetManager";

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

  // Form State
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: "",
    type: "new_feature",
    content: "",
    visibility: "global",
    published: true,
    cta_label: "",
    cta_url: ""
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

  const resetForm = () => {
    setFormData({
      title: "",
      type: "new_feature",
      content: "",
      visibility: "global",
      published: true,
      cta_label: "",
      cta_url: ""
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

