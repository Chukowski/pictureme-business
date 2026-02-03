import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Trash2, Sparkles, Activity, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import {
  getAdminFeaturedTemplates,
  addFeaturedTemplate,
  removeFeaturedTemplate,
  recalculateTrending,
  type FeaturedTemplate
} from "@/services/contentApi";
import { AssetManager } from "./AssetManager";

export default function SuperAdminContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "featured");

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
    <div className="space-y-6 p-6 text-white">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Content Manager</h1>
        <p className="text-zinc-400">Manage featured content, community creations, and discovery algorithms.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-card border border-white/10">
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
              className="bg-card border-white/10 max-w-md text-white"
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
