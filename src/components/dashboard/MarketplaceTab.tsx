import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingBag,
  Search,
  Star,
  Coins,
  Eye,
  Download,
  Plus,
  Trash2,
  Sparkles,
  Crown,
  Building2,
  Loader2,
  Heart,
  Check,
  Wand2,
  Grid3X3,
  Library,
  Upload,
  X,
  ImagePlus,
  Video,
  Image as ImageIcon,
  Lock,
  Globe,
  Zap,
  Settings2,
  Clock,
} from "lucide-react";
import { User } from "@/services/eventsApi";
import { ENV } from "@/config/env";
import { toast } from "sonner";
import { AI_MODELS, LOCAL_IMAGE_MODELS, LOCAL_VIDEO_MODELS } from "@/services/aiProcessor";
import { MarketplaceTemplate } from "@/services/marketplaceApi";

import { Slider } from "@/components/ui/slider";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketplaceTabProps {
  currentUser: User;
}

interface PipelineConfig {
  imageModel?: string;
  faceswapEnabled?: boolean;
  faceswapModel?: string;
  videoEnabled?: boolean;
  videoModel?: string;
  badgeEnabled?: boolean;
}

interface AccessOverrides {
  leadCaptureRequired?: boolean;
  requirePayment?: boolean;
  hardWatermark?: boolean;
  disableDownloads?: boolean;
  allowFreePreview?: boolean;
}

// Interface moved to shared marketplaceApi.ts

interface LibraryItem {
  id: string;
  template_id: string;
  type: string;
  name: string;
  preview_url?: string;
  template_type: string;
  purchased_at: string;
  times_used: number;
}

interface LoRAModel {
  id: string;
  name: string;
  description: string;
  preview_url: string;
  price: number;
  category: string;
  creator: string;
  downloads: number;
  rating: number;
  is_owned: boolean;
}

const CATEGORIES = [
  'All', 'General', 'Events', 'Portraits', 'Products', 'Weddings',
  'Corporate', 'Fantasy', 'Nature', 'Holidays', 'Sports'
];

const IMAGE_MODELS = LOCAL_IMAGE_MODELS.map(m => ({
  value: m.id,
  label: m.name,
  tokens: m.cost,
  description: m.description
}));

const VIDEO_MODELS = LOCAL_VIDEO_MODELS.map(m => ({
  value: m.id,
  label: m.name,
  tokens: m.cost,
  description: m.description
}));

const FACESWAP_MODELS = [
  { value: 'default', label: 'Standard Faceswap', tokens: 2 },
  { value: 'high-quality', label: 'High Quality', tokens: 5 },
];

// Cache marketplace data (keyed by user to prevent cross-user data leaks)
let cachedTemplates: MarketplaceTemplate[] | null = null;
let cachedLoraModels: LoRAModel[] | null = null;
let cachedLibrary: LibraryItem[] | null = null;
let cachedUserId: string | number | null = null;

export default function MarketplaceTab({ currentUser }: MarketplaceTabProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Invalidate cache if user changed
  if (cachedUserId !== currentUser.id) {
    cachedTemplates = null;
    cachedLoraModels = null;
    cachedLibrary = null;
    cachedUserId = currentUser.id;
  }

  const [activeSection, setActiveSection] = useState<'templates' | 'lora' | 'library'>('templates');
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>(cachedTemplates || []);
  const [loraModels, setLoraModels] = useState<LoRAModel[]>(cachedLoraModels || []);
  const [myLibrary, setMyLibrary] = useState<LibraryItem[]>(cachedLibrary || []);
  const [isLoading, setIsLoading] = useState(!cachedTemplates);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('popular');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'business'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // View Controls State (Internal)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridColumns, setZoomLevel] = useState([4]);

  // Sync search from URL
  useEffect(() => {
    const search = searchParams.get('search');
    if (search !== null) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  // Create Template Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createTab, setCreateTab] = useState<'basic' | 'pipeline' | 'settings'>('basic');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    template_type: 'individual' as 'individual' | 'business',
    category: 'General',
    tags: [] as string[],
    backgrounds: [] as string[],
    element_images: [] as string[],
    prompt: '',
    negative_prompt: '',
    price: 0,
    tokens_cost: 2,
    is_public: true,
    // Pipeline config
    pipeline_config: {
      imageModel: 'seedream-t2i',
      faceswapEnabled: false,
      faceswapModel: 'default',
      videoEnabled: false,
      videoModel: 'wan-v2',
      badgeEnabled: false,
    } as PipelineConfig,
    // Access overrides (for business templates)
    access_overrides: {
      leadCaptureRequired: false,
      requirePayment: false,
      hardWatermark: false,
      disableDownloads: false,
      allowFreePreview: true,
    } as AccessOverrides,
    // Business config (full event template)
    include_header: true,
    include_branding: true,
    include_tagline: false,
    include_watermark: false,
    campaign_text: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [backgroundInput, setBackgroundInput] = useState('');
  const [elementInput, setElementInput] = useState('');

  const isBusiness = currentUser.role?.startsWith('business') || currentUser.role === 'superadmin';

  const getTemplateImage = (template: MarketplaceTemplate) => {
    return template.preview_url ||
      (template.backgrounds && template.backgrounds[0]) ||
      (template.preview_images && template.preview_images[0]) ||
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
  };

  useEffect(() => {
    if (!cachedTemplates) {
      fetchMarketplaceData();
    }
  }, []);

  const fetchMarketplaceData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("auth_token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const [templatesRes, loraRes, libraryRes] = await Promise.all([
        fetch(`${ENV.API_URL}/api/marketplace/templates`, { headers }),
        fetch(`${ENV.API_URL}/api/marketplace/lora-models`, { headers }),
        token ? fetch(`${ENV.API_URL}/api/marketplace/my-library`, { headers }) : Promise.resolve(null)
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        cachedTemplates = data || [];
        setTemplates(data || []);
      }

      if (loraRes.ok) {
        const loraData = await loraRes.json();
        cachedLoraModels = loraData || [];
        setLoraModels(loraData || []);
      }

      if (libraryRes && libraryRes.ok) {
        const libraryData = await libraryRes.json();
        cachedLibrary = libraryData || [];
        setMyLibrary(libraryData || []);
      }

      // Reconcile owned templates not present in library
      const libraryList = cachedLibrary || [];
      const libraryIds = new Set(libraryList.map((item) => item.template_id));
      const ownedMissing = (cachedTemplates || []).filter((t) => t.is_owned && !libraryIds.has(t.id));
      if (ownedMissing.length > 0) {
        const synthesized: LibraryItem[] = ownedMissing.map((t) => ({
          id: `owned_${t.id}`,
          template_id: t.id,
          type: 'template',
          name: t.name,
          preview_url: getTemplateImage(t),
          template_type: t.template_type,
          purchased_at: new Date().toISOString(),
          times_used: 0,
        }));
        const merged = [...synthesized, ...libraryList];
        cachedLibrary = merged;
        setMyLibrary(merged);
      }
    } catch (error) {
      console.error("Error fetching marketplace data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (template: MarketplaceTemplate) => {
    setIsPurchasing(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`${ENV.API_URL}/api/marketplace/purchase/${template.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (template.price === 0) {
          toast.success(`Added "${template.name}" to your library!`);
        } else {
          toast.success(`Purchased "${template.name}" for ${result.tokens_spent} tokens!`);
        }

        const newLibraryItem: LibraryItem = {
          id: `lib_${template.id}`,
          template_id: template.id,
          type: 'template',
          name: template.name,
          preview_url: template.preview_url,
          template_type: template.template_type,
          purchased_at: new Date().toISOString(),
          times_used: 0
        };
        setMyLibrary([newLibraryItem, ...myLibrary]);
        cachedLibrary = [newLibraryItem, ...(cachedLibrary || [])];

        setTemplates(templates.map(t =>
          t.id === template.id ? { ...t, is_owned: true } : t
        ));

        setSelectedTemplate(null);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Purchase failed");
      }
    } catch (error) {
      toast.error("Purchase failed. Please try again.");
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRemoveFromLibrary = async (item: LibraryItem) => {
    setMyLibrary((myLibrary || []).filter(t => t.id !== item.id));
    cachedLibrary = (cachedLibrary || []).filter(t => t.id !== item.id);
    toast.success("Removed from library");
  };

  const calculateTokensCost = () => {
    let total = 0;
    const imageModel = IMAGE_MODELS.find(m => m.value === newTemplate.pipeline_config.imageModel);
    if (imageModel) total += imageModel.tokens;

    if (newTemplate.pipeline_config.faceswapEnabled) {
      const faceswapModel = FACESWAP_MODELS.find(m => m.value === newTemplate.pipeline_config.faceswapModel);
      if (faceswapModel) total += faceswapModel.tokens;
    }

    if (newTemplate.pipeline_config.videoEnabled) {
      const videoModel = VIDEO_MODELS.find(m => m.value === newTemplate.pipeline_config.videoModel);
      if (videoModel) total += videoModel.tokens;
    }

    return total;
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.description) {
      toast.error("Name and description are required");
      return;
    }

    if (newTemplate.backgrounds.length === 0) {
      toast.error("At least one background image is required");
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem("auth_token");

      // Build the template data
      const templateData = {
        name: newTemplate.name,
        description: newTemplate.description,
        template_type: newTemplate.template_type,
        category: newTemplate.category,
        tags: newTemplate.tags,
        backgrounds: newTemplate.backgrounds,
        element_images: newTemplate.element_images,
        prompt: newTemplate.prompt,
        negative_prompt: newTemplate.negative_prompt,
        price: newTemplate.price,
        tokens_cost: calculateTokensCost(),
        is_public: newTemplate.is_public,
        pipeline_config: newTemplate.pipeline_config,
        // For business templates, include full config
        business_config: newTemplate.template_type === 'business' ? {
          name: newTemplate.name,
          description: newTemplate.description,
          images: newTemplate.backgrounds,
          elementImages: newTemplate.element_images,
          prompt: newTemplate.prompt,
          active: true,
          includeHeader: newTemplate.include_header,
          includeBranding: newTemplate.include_branding,
          includeTagline: newTemplate.include_tagline,
          includeWatermark: newTemplate.include_watermark,
          campaignText: newTemplate.campaign_text,
          pipelineConfig: newTemplate.pipeline_config,
          accessOverrides: newTemplate.access_overrides,
        } : null,
      };

      const response = await fetch(`${ENV.API_URL}/api/marketplace/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(templateData)
      });

      if (response.ok) {
        toast.success(`Template "${newTemplate.name}" created!`);
        cachedTemplates = null;
        await fetchMarketplaceData();
        resetNewTemplate();
        setShowCreateModal(false);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to create template");
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    } finally {
      setIsCreating(false);
    }
  };

  const resetNewTemplate = () => {
    setNewTemplate({
      name: '',
      description: '',
      template_type: 'individual',
      category: 'General',
      tags: [],
      backgrounds: [],
      element_images: [],
      prompt: '',
      negative_prompt: '',
      price: 0,
      tokens_cost: 2,
      is_public: true,
      pipeline_config: {
        imageModel: 'seedream-t2i',
        faceswapEnabled: false,
        faceswapModel: 'default',
        videoEnabled: false,
        videoModel: 'wan-v2',
        badgeEnabled: false,
      },
      access_overrides: {
        leadCaptureRequired: false,
        requirePayment: false,
        hardWatermark: false,
        disableDownloads: false,
        allowFreePreview: true,
      },
      include_header: true,
      include_branding: true,
      include_tagline: false,
      include_watermark: false,
      campaign_text: '',
    });
    setCreateTab('basic');
  };

  const addTag = () => {
    if (tagInput && !newTemplate.tags.includes(tagInput)) {
      setNewTemplate({ ...newTemplate, tags: [...newTemplate.tags, tagInput] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setNewTemplate({ ...newTemplate, tags: newTemplate.tags.filter(t => t !== tag) });
  };

  const addBackground = () => {
    if (backgroundInput && !newTemplate.backgrounds.includes(backgroundInput)) {
      setNewTemplate({ ...newTemplate, backgrounds: [...newTemplate.backgrounds, backgroundInput] });
      setBackgroundInput('');
    }
  };

  const removeBackground = (url: string) => {
    setNewTemplate({ ...newTemplate, backgrounds: newTemplate.backgrounds.filter(b => b !== url) });
  };

  const addElement = () => {
    if (elementInput && !newTemplate.element_images.includes(elementInput)) {
      setNewTemplate({ ...newTemplate, element_images: [...newTemplate.element_images, elementInput] });
      setElementInput('');
    }
  };

  const removeElement = (url: string) => {
    setNewTemplate({ ...newTemplate, element_images: newTemplate.element_images.filter(e => e !== url) });
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesType = typeFilter === 'all' || template.template_type === typeFilter;

    if (template.template_type === 'business' && !isBusiness) return false;

    return matchesSearch && matchesCategory && matchesType;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'popular': return b.downloads - a.downloads;
      case 'rating': return b.rating - a.rating;
      case 'newest': return 0;
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      default: return 0;
    }
  });

  const isInLibrary = (templateId: string) => (myLibrary || []).some(t => t.template_id === templateId);

  return (
    <div className="flex flex-col animate-in fade-in duration-500 w-full">
      <div className="flex-none space-y-6 pb-6">
        {/* Section Tabs & Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <div className="flex w-full md:w-auto p-1 bg-[#18181b] rounded-full border border-white/5 shadow-2xl shadow-black/50 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveSection('templates')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeSection === 'templates'
                ? 'bg-[#D1F349] text-black shadow-lg shadow-[#D1F349]/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Grid3X3 className="w-4 h-4" />
              Templates
            </button>
            {isBusiness && (
              <button
                onClick={() => setActiveSection('lora')}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeSection === 'lora'
                  ? 'bg-[#D1F349] text-black shadow-lg shadow-[#D1F349]/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Wand2 className="w-4 h-4" />
                LoRA
              </button>
            )}
            <button
              onClick={() => setActiveSection('library')}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 rounded-full text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeSection === 'library'
                ? 'bg-[#D1F349] text-black shadow-lg shadow-[#D1F349]/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Library className="w-4 h-4" />
              Library
              {myLibrary && myLibrary.length > 0 && (
                <Badge className={`ml-2 border-0 px-1.5 h-4 min-w-[16px] text-[10px] flex items-center justify-center ${activeSection === 'library' ? 'bg-[#101112]/20 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                  {myLibrary.length}
                </Badge>
              )}
            </button>
          </div>
        </div>

        {/* Templates Section Filters */}
        {activeSection === 'templates' && (
          <div className="flex flex-col sm:flex-row gap-3 items-center bg-[#18181b] p-3 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 w-full shadow-xl">
            <div className="relative w-full md:w-[280px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 md:h-10 pl-10 pr-4 bg-card/50 rounded-xl border-none text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#D1F349]/50"
              />
            </div>

            <div className="flex w-full sm:w-auto gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="flex-1 sm:w-[140px] h-12 md:h-10 bg-card/50 border-none rounded-2xl text-zinc-300 text-sm focus:ring-0">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-white/10 rounded-xl">
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-zinc-300 focus:bg-zinc-800 focus:text-white rounded-lg cursor-pointer">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="flex-1 sm:w-[140px] h-12 md:h-10 bg-card/50 border-none rounded-2xl text-zinc-300 text-sm focus:ring-0">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-white/10 rounded-xl">
                  <SelectItem value="popular" className="text-zinc-300 focus:bg-zinc-800 focus:text-white rounded-lg cursor-pointer">Most Popular</SelectItem>
                  <SelectItem value="newest" className="text-zinc-300 focus:bg-zinc-800 focus:text-white rounded-lg cursor-pointer">Newest</SelectItem>
                  <SelectItem value="price-low" className="text-zinc-300 focus:bg-zinc-800 focus:text-white rounded-lg cursor-pointer">Price: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-px h-px sm:h-6 bg-white/5 mx-1" />

            {/* View Controls (Integrated) */}
            <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2">
              <div className="h-12 md:h-9 px-3 hidden sm:flex flex-1 sm:flex-none items-center bg-card/50 rounded-2xl min-w-[100px]">
                <Slider
                  value={gridColumns}
                  onValueChange={setZoomLevel}
                  min={2}
                  max={6}
                  step={1}
                  disabled={viewMode === 'list'}
                  className={`w-full sm:w-24 [&_.bg-primary]:bg-[#D1F349] [&_.border-primary]:border-[#D1F349] ${viewMode === 'list' ? 'opacity-30' : ''}`}
                />
              </div>
              <div className="flex items-center gap-1 p-1 bg-card/50 rounded-2xl w-full sm:w-auto">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center h-10 md:w-8 md:h-8 rounded-xl transition-all",
                    viewMode === 'list' ? "bg-[#333333] text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"
                  )}
                  title="List View"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "flex-1 sm:flex-none flex items-center justify-center h-10 md:w-8 md:h-8 rounded-xl transition-all",
                    viewMode === 'grid' ? "bg-[#D1F349] text-black shadow-md" : "text-zinc-500 hover:text-zinc-300"
                  )}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="min-h-0 pr-2 pb-20">
        {activeSection === 'templates' && (

          isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-10 h-10 animate-spin text-[#D1F349]" />
            </div>
          ) : (
            <>
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-[#18181b] border border-white/5 flex items-center justify-center mb-6 rotate-3">
                    <ShoppingBag className="w-10 h-10 text-zinc-600" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No templates found</h3>
                  <p className="text-zinc-500">Try adjusting your filters or search terms</p>
                </div>
              ) : (
                <div
                  className={cn(
                    "grid gap-4 md:gap-6 transition-all duration-300",
                    viewMode === 'list' ? "grid-cols-1" : "grid-cols-2 md:grid-cols-4"
                  )}
                  style={viewMode === 'grid' ? {
                    gridTemplateColumns: `repeat(${window.innerWidth < 768 ? 2 : gridColumns[0]}, minmax(0, 1fr))`
                  } : {}}
                >
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`group relative bg-[#18181b] rounded-3xl overflow-hidden border border-white/5 hover:border-[#D1F349]/30 transition-all duration-500 hover:shadow-2xl hover:shadow-[#D1F349]/5 ${viewMode === 'list' ? 'flex flex-row h-40 md:h-48' : ''}`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      {/* Image Area */}
                      <div className={`relative overflow-hidden bg-card ${viewMode === 'list' ? 'w-40 md:w-64 aspect-auto h-full shrink-0' : 'aspect-square'}`}>
                        <img
                          src={getTemplateImage(template)}
                          alt={template.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-transparent to-transparent opacity-80" />

                        {/* Status Badges */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                          {template.price === 0 && (
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide border border-emerald-500/20 backdrop-blur-md">
                              Free
                            </span>
                          )}
                          {template.template_type === 'business' && (
                            <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wide border border-purple-500/20 backdrop-blur-md">
                              Business
                            </span>
                          )}
                          {(template.is_owned || isInLibrary(template.id)) && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#D1F349] text-black text-[10px] font-bold uppercase tracking-wide shadow-lg shadow-[#D1F349]/20">
                              Owned
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className={`p-3 md:p-5 relative ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2 gap-1 md:gap-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-black text-white text-base md:text-xl leading-[1.1] truncate group-hover:text-[#D1F349] transition-colors uppercase tracking-tight">{template.name}</h3>
                            <p className="text-[10px] md:text-xs text-zinc-500 font-bold mt-0.5 md:mt-1 uppercase">{template.category}</p>
                          </div>
                          {template.price > 0 && (
                            <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 md:py-1 rounded-lg border border-white/5 shrink-0 self-start">
                              <Coins className="w-3 h-3 text-[#D1F349]" />
                              <span className="text-[10px] md:text-xs font-bold text-white">{template.price}</span>
                            </div>
                          )}
                        </div>

                        <p className={`text-xs md:text-sm text-zinc-400 line-clamp-2 leading-relaxed ${viewMode === 'list' ? 'mb-auto block' : 'hidden sm:block mb-3 h-10'}`}>
                          {template.description}
                        </p>

                        <div className="flex items-center gap-2 mt-auto">
                          <Button
                            className={`flex-1 rounded-2xl h-10 md:h-11 text-xs md:text-sm font-black uppercase tracking-wide transition-all ${(template.is_owned || isInLibrary(template.id))
                              ? 'bg-zinc-800 text-zinc-500'
                              : 'bg-[#D1F349] text-black hover:bg-[#b0cc3d] shadow-lg shadow-[#D1F349]/10'
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (template.is_owned || isInLibrary(template.id)) {
                                setActiveSection('library');
                              } else {
                                handlePurchase(template);
                              }
                            }}
                          >
                            {(template.is_owned || isInLibrary(template.id)) ? 'Owned' : (template.price === 0 ? 'Add' : 'Get')}
                          </Button>

                          <button
                            className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors border border-white/5 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTemplate(template);
                            }}
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )
        )}

        {/* LoRA Models Section (Redesigned) */}
        {activeSection === 'lora' && isBusiness && (
          <div
            className={cn(
              "grid gap-6 transition-all duration-300",
              viewMode === 'list' ? "grid-cols-1" : ""
            )}
            style={viewMode === 'grid' ? {
              gridTemplateColumns: `repeat(${window.innerWidth < 768 ? 2 : gridColumns[0]}, minmax(0, 1fr))`
            } : {}}
          >
            {loraModels.length > 0 ? (
              loraModels.map((model) => (
                <div
                  key={model.id}
                  className={`group relative bg-[#18181b] rounded-3xl overflow-hidden border border-white/5 hover:border-purple-500/30 transition-all duration-300 ${viewMode === 'list' ? 'flex flex-row h-40 md:h-48' : ''}`}
                >
                  <div className={`bg-card relative ${viewMode === 'list' ? 'w-40 md:w-64 aspect-auto h-full shrink-0' : 'aspect-square'}`}>
                    <img src={model.preview_url} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                    <div className="absolute top-3 right-3 bg-[#101112]/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10">
                      <span className="text-xs font-bold text-white">${model.price}</span>
                    </div>
                  </div>
                  <div className={`p-3 md:p-5 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-2 gap-1 md:gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-white text-base md:text-xl truncate uppercase tracking-tight">{model.name}</h3>
                        <p className="text-[10px] md:text-xs text-zinc-500 font-bold mt-0.5 md:mt-1 uppercase">{model.category}</p>
                      </div>
                    </div>
                    <p className={`text-xs md:text-sm text-zinc-400 line-clamp-2 leading-relaxed ${viewMode === 'list' ? 'mb-auto block' : 'hidden sm:block mb-3 h-10'}`}>
                      {model.description}
                    </p>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black uppercase tracking-wide text-xs h-10 md:h-11">
                      View Model
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-center bg-[#18181b] rounded-3xl border border-white/5 border-dashed">
                <Wand2 className="w-16 h-16 text-zinc-600 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">LoRA Models Coming Soon</h3>
                <p className="text-zinc-500 max-w-md mx-auto mb-8">Train and share custom AI models to create unique styles for your events.</p>
                <Button className="bg-[#D1F349] text-black font-bold rounded-full px-8 h-12">
                  Join Waitlist
                </Button>
              </div>
            )}
          </div>
        )}

        {/* My Library Section (Redesigned) */}
        {activeSection === 'library' && (
          <>
            {(!myLibrary || myLibrary.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-[#18181b] rounded-3xl border border-white/5 border-dashed">
                <Library className="w-16 h-16 text-zinc-700 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">Your library is empty</h3>
                <p className="text-zinc-500 max-w-md mx-auto mb-8">Browse the marketplace to find professionally crafted templates.</p>
                <Button
                  onClick={() => setActiveSection('templates')}
                  className="bg-white text-black font-bold rounded-full px-8 h-12 hover:bg-zinc-200"
                >
                  Browse Templates
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "grid gap-4 md:gap-6 transition-all duration-300",
                  viewMode === 'list' ? "grid-cols-1" : "grid-cols-2 md:grid-cols-4"
                )}
                style={viewMode === 'grid' ? {
                  gridTemplateColumns: `repeat(${window.innerWidth < 768 ? 2 : gridColumns[0]}, minmax(0, 1fr))`
                } : {}}
              >
                {myLibrary.map((item) => (
                  <div
                    key={item.id}
                    className={`group relative bg-[#18181b] rounded-3xl overflow-hidden border border-white/5 hover:border-white/20 transition-all duration-300 ${viewMode === 'list' ? 'flex flex-row h-32 md:h-40' : ''}`}
                  >
                    <div className={`bg-card relative ${viewMode === 'list' ? 'w-32 md:w-48 aspect-auto h-full shrink-0' : 'aspect-square'}`}>
                      <img
                        src={item.preview_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-[#101112]/60 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                        <Button size="sm" className="rounded-xl bg-white text-black font-bold hover:bg-zinc-200">
                          Use
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-xl text-white hover:bg-white/20">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-[#101112]/50 backdrop-blur-md border border-white/10 text-white">
                          {item.template_type === 'business' ? 'Business' : 'Individual'}
                        </Badge>
                      </div>
                    </div>
                    <div className={`p-3 md:p-4 flex items-center justify-between ${viewMode === 'list' ? 'flex-1' : ''}`}>
                      <div className="min-w-0 pr-2">
                        <h3 className="font-black text-white text-base md:text-lg truncate uppercase tracking-tight">{item.name}</h3>
                        <p className="text-[10px] md:text-xs text-zinc-500 font-bold hidden sm:block">Used {item.times_used} times</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="md:hidden h-8 px-4 rounded-xl bg-[#D1F349] text-black font-black uppercase text-[10px] tracking-wider"
                          onClick={() => navigate('/creator/studio?view=create', { state: { selectedTemplateId: item.template_id } })}
                        >
                          Use
                        </Button>
                        <button
                          onClick={() => handleRemoveFromLibrary(item)}
                          className="w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all border border-white/5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="bg-[#18181b] border-white/5 text-white max-w-4xl p-0 overflow-hidden gap-0 rounded-[2rem] shadow-2xl">
          {selectedTemplate && (
            <div className="flex flex-col md:flex-row h-[85vh] md:h-auto md:max-h-[85vh]">
              {/* Left: Image */}
              <div className="w-full md:w-1/2 bg-[#101112] relative max-h-[40vh] md:max-h-none overflow-hidden group">
                <img
                  src={getTemplateImage(selectedTemplate)}
                  alt={selectedTemplate.name}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#18181b] via-transparent to-transparent opacity-60 md:hidden" />

                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  {selectedTemplate.price === 0 && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-none backdrop-blur-md">FREE</Badge>
                  )}
                  {selectedTemplate.template_type === 'business' && (
                    <Badge className="bg-purple-500/20 text-purple-400 border-none backdrop-blur-md">Business</Badge>
                  )}
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex-1 flex flex-col p-6 md:p-8 overflow-y-auto bg-[#18181b]">
                <DialogHeader className="mb-6 space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <DialogTitle className="text-3xl font-black uppercase tracking-tight text-white mb-2">{selectedTemplate.name}</DialogTitle>
                      <DialogDescription className="text-zinc-400 text-base font-medium flex items-center gap-2">
                        By <span className="text-white border-b border-white/10 pb-0.5">{selectedTemplate.creator?.name || 'PictureMe'}</span>
                      </DialogDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {selectedTemplate.price > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                          <Coins className="w-4 h-4 text-[#D1F349]" />
                          <span className="text-sm font-bold text-white">{selectedTemplate.price} Tokens</span>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-8 flex-1">
                  {/* Description */}
                  <div>
                    <p className="text-zinc-300 leading-relaxed text-sm md:text-base">{selectedTemplate.description}</p>
                  </div>

                  {/* Pipeline Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-card/50 border border-white/5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-zinc-500 mb-0.5">Model</p>
                        <p className="text-xs font-bold text-white truncate max-w-[120px]">
                          {IMAGE_MODELS.find(m => m.value === selectedTemplate.pipeline_config?.imageModel)?.label || 'Standard'}
                        </p>
                      </div>
                    </div>

                    {selectedTemplate.pipeline_config?.faceswapEnabled && (
                      <div className="p-3 rounded-xl bg-card/50 border border-white/5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-pink-400">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-zinc-500 mb-0.5">Feature</p>
                          <p className="text-xs font-bold text-white">Faceswap Enabled</p>
                        </div>
                      </div>
                    )}

                    {selectedTemplate.pipeline_config?.videoEnabled && (
                      <div className="p-3 rounded-xl bg-card/50 border border-white/5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-purple-400">
                          <Video className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-zinc-500 mb-0.5">Feature</p>
                          <p className="text-xs font-bold text-white">Video Ready</p>
                        </div>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-card/50 border border-white/5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-yellow-400">
                        <Star className="w-5 h-5 fill-yellow-400" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-zinc-500 mb-0.5">Rating</p>
                        <p className="text-xs font-bold text-white">{selectedTemplate.rating} / 5</p>
                      </div>
                    </div>
                  </div>

                  {/* Prompt Preview */}
                  {selectedTemplate.prompt && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-zinc-500">Prompt Preview</h4>
                      <div className="bg-[#101112]/40 p-4 rounded-xl border border-white/5 font-mono text-xs text-zinc-400 leading-relaxed max-h-32 overflow-y-auto">
                        {selectedTemplate.prompt}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors">#{tag}</Badge>
                    ))}
                  </div>
                </div>

                <DialogFooter className="mt-8 pt-6 border-t border-white/5">
                  <div className="w-full flex gap-3">
                    {(selectedTemplate.is_owned || isInLibrary(selectedTemplate.id)) ? (
                      <>
                        <Button className="flex-1 h-12 bg-white text-black font-bold text-base hover:bg-zinc-200 rounded-xl" disabled>
                          <Check className="w-5 h-5 mr-2" />
                          Owned
                        </Button>
                        <Button className="flex-1 h-12 bg-[#D1F349] text-black font-bold text-base hover:bg-[#b0cc3d] rounded-xl shadow-lg shadow-[#D1F349]/20 transition-all hover:scale-[1.02]">
                          Use in Studio
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" className="h-12 px-6 border-white/10 bg-transparent text-white hover:bg-white/5 hover:text-white rounded-xl">
                          <Heart className="w-5 h-5" />
                        </Button>
                        <Button
                          className="flex-1 h-12 bg-[#D1F349] text-black font-bold text-base hover:bg-[#b0cc3d] rounded-xl shadow-lg shadow-[#D1F349]/20 transition-all hover:scale-[1.02]"
                          onClick={() => handlePurchase(selectedTemplate)}
                          disabled={isPurchasing}
                        >
                          {isPurchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                              {selectedTemplate.price === 0 ? "Add to Library - Free" : `Purchase for ${selectedTemplate.price} Tokens`}
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        if (!open) resetNewTemplate();
        setShowCreateModal(open);
      }}>
        <DialogContent className="bg-card border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Create New Template
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Create a template to share or sell in the marketplace
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <Tabs value={createTab} onValueChange={(v) => setCreateTab(v as 'basic' | 'pipeline' | 'settings')} className="mt-4">
            <TabsList className="bg-zinc-800/50 border border-white/10">
              <TabsTrigger value="basic" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400">
                <ImageIcon className="w-4 h-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400">
                <Zap className="w-4 h-4 mr-2" />
                AI Pipeline
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400">
                <Settings2 className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-zinc-300">Template Name</Label>
                  <Input
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="My Awesome Template"
                    className="mt-1 bg-zinc-800 border-white/10 text-white"
                  />
                </div>

                <div className="col-span-2">
                  <Label className="text-zinc-300">Description</Label>
                  <Textarea
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="Describe your template..."
                    className="mt-1 bg-zinc-800 border-white/10 text-white"
                    rows={3}
                  />
                </div>

                <div>
                  <Label className="text-zinc-300">Type</Label>
                  <Select
                    value={newTemplate.template_type}
                    onValueChange={(v) => setNewTemplate({ ...newTemplate, template_type: v as 'individual' | 'business' })}
                  >
                    <SelectTrigger className="mt-1 bg-zinc-800 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10">
                      <SelectItem value="individual" className="text-white">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Individual (Photo Booth)
                        </div>
                      </SelectItem>
                      <SelectItem value="business" className="text-white">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Business (Event Template)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-zinc-300">Category</Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}
                  >
                    <SelectTrigger className="mt-1 bg-zinc-800 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10">
                      {CATEGORIES.filter(c => c !== 'All').map(cat => (
                        <SelectItem key={cat} value={cat} className="text-white">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label className="text-zinc-300">Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag"
                    className="bg-zinc-800 border-white/10 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {newTemplate.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newTemplate.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="border-white/10 text-zinc-300">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-1 hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Background Images */}
              <div>
                <Label className="text-zinc-300">Background Images *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={backgroundInput}
                    onChange={(e) => setBackgroundInput(e.target.value)}
                    placeholder="Paste image URL"
                    className="bg-zinc-800 border-white/10 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBackground())}
                  />
                  <Button type="button" onClick={addBackground} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                    <ImagePlus className="w-4 h-4" />
                  </Button>
                </div>
                {newTemplate.backgrounds.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {newTemplate.backgrounds.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded overflow-hidden bg-zinc-800">
                        <img src={url} alt={`bg-${i}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeBackground(url)}
                          className="absolute top-1 right-1 bg-[#101112]/60 rounded p-1 hover:bg-red-500 transition-colors"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Element Images (for mixing) */}
              <div>
                <Label className="text-zinc-300">Element Images (for mixing)</Label>
                <p className="text-xs text-zinc-500 mt-1">Optional: Add element images for models that support mixing (Seedream, Imagen)</p>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={elementInput}
                    onChange={(e) => setElementInput(e.target.value)}
                    placeholder="Paste element image URL"
                    className="bg-zinc-800 border-white/10 text-white"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addElement())}
                  />
                  <Button type="button" onClick={addElement} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                    <ImagePlus className="w-4 h-4" />
                  </Button>
                </div>
                {newTemplate.element_images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {newTemplate.element_images.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded overflow-hidden bg-zinc-800">
                        <img src={url} alt={`elem-${i}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeElement(url)}
                          className="absolute top-1 right-1 bg-[#101112]/60 rounded p-1 hover:bg-red-500 transition-colors"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Prompt */}
              <div>
                <Label className="text-zinc-300">AI Prompt</Label>
                <Textarea
                  value={newTemplate.prompt}
                  onChange={(e) => setNewTemplate({ ...newTemplate, prompt: e.target.value })}
                  placeholder="Describe the style and elements for AI generation..."
                  className="mt-1 bg-zinc-800 border-white/10 text-white"
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Pipeline Tab */}
            <TabsContent value="pipeline" className="space-y-6 mt-4">
              {/* Image Model */}
              <div className="space-y-3">
                <Label className="text-zinc-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Base Image Model
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {IMAGE_MODELS.map((model) => (
                    <div
                      key={model.value}
                      onClick={() => setNewTemplate({
                        ...newTemplate,
                        pipeline_config: { ...newTemplate.pipeline_config, imageModel: model.value }
                      })}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${newTemplate.pipeline_config.imageModel === model.value
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-white/10 hover:border-white/20 bg-zinc-800/50'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{model.label}</span>
                        <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                          {model.tokens} token{model.tokens > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{model.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Faceswap */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Faceswap
                  </Label>
                  <Switch
                    checked={newTemplate.pipeline_config.faceswapEnabled}
                    onCheckedChange={(checked) => setNewTemplate({
                      ...newTemplate,
                      pipeline_config: { ...newTemplate.pipeline_config, faceswapEnabled: checked }
                    })}
                  />
                </div>
                {newTemplate.pipeline_config.faceswapEnabled && (
                  <Select
                    value={newTemplate.pipeline_config.faceswapModel}
                    onValueChange={(v) => setNewTemplate({
                      ...newTemplate,
                      pipeline_config: { ...newTemplate.pipeline_config, faceswapModel: v }
                    })}
                  >
                    <SelectTrigger className="bg-zinc-800 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10">
                      {FACESWAP_MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value} className="text-white">
                          {model.label} (+{model.tokens} tokens)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Video Generation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-zinc-300 flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Video Generation
                  </Label>
                  <Switch
                    checked={newTemplate.pipeline_config.videoEnabled}
                    onCheckedChange={(checked) => setNewTemplate({
                      ...newTemplate,
                      pipeline_config: { ...newTemplate.pipeline_config, videoEnabled: checked }
                    })}
                  />
                </div>
                {newTemplate.pipeline_config.videoEnabled && (
                  <div className="grid grid-cols-3 gap-3">
                    {VIDEO_MODELS.map((model) => (
                      <div
                        key={model.value}
                        onClick={() => setNewTemplate({
                          ...newTemplate,
                          pipeline_config: { ...newTemplate.pipeline_config, videoModel: model.value }
                        })}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${newTemplate.pipeline_config.videoModel === model.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 hover:border-white/20 bg-zinc-800/50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white text-sm">{model.label}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-zinc-500">{model.description}</p>
                          <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                            {model.tokens}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Badge */}
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Badge Mode (Premium)
                </Label>
                <Switch
                  checked={newTemplate.pipeline_config.badgeEnabled}
                  onCheckedChange={(checked) => setNewTemplate({
                    ...newTemplate,
                    pipeline_config: { ...newTemplate.pipeline_config, badgeEnabled: checked }
                  })}
                />
              </div>

              {/* Estimated Cost */}
              <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Estimated tokens per generation:</span>
                  <Badge className="bg-indigo-500 text-white text-lg px-3">
                    {calculateTokensCost()} tokens
                  </Badge>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6 mt-4">
              {/* Visibility */}
              <div className="space-y-3">
                <Label className="text-zinc-300">Visibility</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setNewTemplate({ ...newTemplate, is_public: true })}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${newTemplate.is_public
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-white/10 hover:border-white/20 bg-zinc-800/50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-emerald-400" />
                      <span className="font-medium text-white">Public</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Anyone can see and use this template</p>
                  </div>
                  <div
                    onClick={() => setNewTemplate({ ...newTemplate, is_public: false })}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${!newTemplate.is_public
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-white/10 hover:border-white/20 bg-zinc-800/50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-amber-400" />
                      <span className="font-medium text-white">Private</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">Only you can see and use this template</p>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-300">Price (tokens)</Label>
                  <p className="text-xs text-zinc-500 mb-2">0 = free template</p>
                  <Input
                    type="number"
                    min={0}
                    value={newTemplate.price}
                    onChange={(e) => setNewTemplate({ ...newTemplate, price: parseInt(e.target.value) || 0 })}
                    className="bg-zinc-800 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Tokens per use</Label>
                  <p className="text-xs text-zinc-500 mb-2">Auto-calculated from pipeline</p>
                  <Input
                    type="number"
                    min={1}
                    value={calculateTokensCost()}
                    disabled
                    className="bg-zinc-800/50 border-white/10 text-zinc-400"
                  />
                </div>
              </div>

              {/* Business Template Options */}
              {newTemplate.template_type === 'business' && (
                <div className="space-y-4 p-4 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Business Template Options
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-400 text-sm">Include Header</Label>
                      <Switch
                        checked={newTemplate.include_header}
                        onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, include_header: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-400 text-sm">Include Branding</Label>
                      <Switch
                        checked={newTemplate.include_branding}
                        onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, include_branding: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-400 text-sm">Include Tagline</Label>
                      <Switch
                        checked={newTemplate.include_tagline}
                        onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, include_tagline: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-zinc-400 text-sm">Include Watermark</Label>
                      <Switch
                        checked={newTemplate.include_watermark}
                        onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, include_watermark: checked })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-zinc-400 text-sm">Campaign Text (optional)</Label>
                    <Input
                      value={newTemplate.campaign_text}
                      onChange={(e) => setNewTemplate({ ...newTemplate, campaign_text: e.target.value })}
                      placeholder="e.g., 'Need extra hands?'"
                      className="mt-1 bg-zinc-800 border-white/10 text-white"
                    />
                  </div>

                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <h5 className="text-sm font-medium text-zinc-300">Access Overrides</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-400 text-xs">Lead Capture Required</Label>
                        <Switch
                          checked={newTemplate.access_overrides.leadCaptureRequired}
                          onCheckedChange={(checked) => setNewTemplate({
                            ...newTemplate,
                            access_overrides: { ...newTemplate.access_overrides, leadCaptureRequired: checked }
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-400 text-xs">Require Payment</Label>
                        <Switch
                          checked={newTemplate.access_overrides.requirePayment}
                          onCheckedChange={(checked) => setNewTemplate({
                            ...newTemplate,
                            access_overrides: { ...newTemplate.access_overrides, requirePayment: checked }
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-400 text-xs">Hard Watermark</Label>
                        <Switch
                          checked={newTemplate.access_overrides.hardWatermark}
                          onCheckedChange={(checked) => setNewTemplate({
                            ...newTemplate,
                            access_overrides: { ...newTemplate.access_overrides, hardWatermark: checked }
                          })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-zinc-400 text-xs">Disable Downloads</Label>
                        <Switch
                          checked={newTemplate.access_overrides.disableDownloads}
                          onCheckedChange={(checked) => setNewTemplate({
                            ...newTemplate,
                            access_overrides: { ...newTemplate.access_overrides, disableDownloads: checked }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                resetNewTemplate();
                setShowCreateModal(false);
              }}
              className="border-white/10 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={isCreating}
              className="bg-lime-500 hover:bg-lime-600 text-black font-medium"
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
