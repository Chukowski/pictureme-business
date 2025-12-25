import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
    <div className="space-y-6 max-w-[1280px] mx-auto">
      {/* Section Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveSection('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'templates'
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-400 hover:text-white'
              }`}
          >
            <Grid3X3 className="w-4 h-4" />
            Templates
          </button>
          {isBusiness && (
            <button
              onClick={() => setActiveSection('lora')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'lora'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-white'
                }`}
            >
              <Wand2 className="w-4 h-4" />
              LoRA Models
            </button>
          )}
          <button
            onClick={() => setActiveSection('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSection === 'library'
              ? 'bg-indigo-600 text-white'
              : 'text-zinc-400 hover:text-white'
              }`}
          >
            <Library className="w-4 h-4" />
            My Library
            {myLibrary && myLibrary.length > 0 && (
              <Badge className="ml-1 bg-zinc-700 text-white">{myLibrary.length}</Badge>
            )}
          </button>
        </div>

        {isBusiness && (
          <Button
            className="bg-lime-500 hover:bg-lime-600 text-black font-medium"
            onClick={() => setShowCreateModal(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        )}
      </div>

      {/* Templates Section */}
      {activeSection === 'templates' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-white/10 text-white"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[150px] bg-zinc-900/50 border-white/10 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat} className="text-white">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isBusiness && (
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'individual' | 'business')}>
                <SelectTrigger className="w-[140px] bg-zinc-900/50 border-white/10 text-white">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all" className="text-white">All Types</SelectItem>
                  <SelectItem value="individual" className="text-white">Individual</SelectItem>
                  <SelectItem value="business" className="text-white">Business</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] bg-zinc-900/50 border-white/10 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                <SelectItem value="popular" className="text-white">Most Popular</SelectItem>
                <SelectItem value="rating" className="text-white">Highest Rated</SelectItem>
                <SelectItem value="newest" className="text-white">Newest</SelectItem>
                <SelectItem value="price-low" className="text-white">Price: Low to High</SelectItem>
                <SelectItem value="price-high" className="text-white">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="bg-zinc-900/50 border-white/10 overflow-hidden group hover:border-white/20 transition-all cursor-pointer relative"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-800">
                    <img
                      src={getTemplateImage(template)}
                      alt={template.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                      {template.price === 0 && (
                        <Badge className="bg-emerald-500 text-white">FREE</Badge>
                      )}
                      {template.is_premium && (
                        <Badge className="bg-amber-500 text-black">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                      {template.template_type === 'business' && (
                        <Badge className="bg-purple-500 text-white">
                          <Building2 className="w-3 h-3 mr-1" />
                          Business
                        </Badge>
                      )}
                      {!template.is_public && (
                        <Badge className="bg-zinc-600 text-white">
                          <Lock className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      )}
                    </div>

                    {/* Price */}
                    {template.price > 0 && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-black/60 backdrop-blur-sm text-white">
                          <Coins className="w-3 h-3 mr-1 text-yellow-400" />
                          {template.price}
                        </Badge>
                      </div>
                    )}

                    {template.template_type === 'business' && !isBusiness && (
                      <div className="absolute bottom-2 right-2">
                        <Badge className="bg-purple-500/90 text-white text-[10px]">
                          Requires Business Plan
                        </Badge>
                      </div>
                    )}

                    {/* Owned Badge */}
                    {(template.is_owned || isInLibrary(template.id)) && (
                      <div className="absolute bottom-2 right-2">
                        <Badge className="bg-emerald-500/90 text-white">
                          <Check className="w-3 h-3 mr-1" />
                          Owned
                        </Badge>
                      </div>
                    )}

                    {/* Pipeline indicators */}
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {template.pipeline_config?.videoEnabled && (
                        <Badge className="bg-indigo-500/80 text-white text-xs">
                          <Video className="w-3 h-3" />
                        </Badge>
                      )}
                      {template.pipeline_config?.faceswapEnabled && (
                        <Badge className="bg-pink-500/80 text-white text-xs">
                          <Sparkles className="w-3 h-3" />
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold text-white truncate">{template.name}</h3>
                    <p className="text-sm text-zinc-400 truncate mt-1">{template.description}</p>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span>{template.rating}</span>
                        <span>•</span>
                        <Download className="w-3 h-3" />
                        <span>{template.downloads}</span>
                      </div>
                      <Badge variant="outline" className="text-xs border-white/10 text-zinc-400">
                        {template.category}
                      </Badge>
                    </div>
                  </CardContent>

                  {/* Hover overlay actions */}
                  <div className="absolute inset-0 bg-black/65 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4 pointer-events-none group-hover:pointer-events-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-white border-white/30 hover:bg-white/10 bg-white/5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(template);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" /> Preview
                    </Button>
                    {template.is_owned || isInLibrary(template.id) ? (
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveSection('library');
                        }}
                      >
                        Use
                      </Button>
                    ) : (
                      (() => {
                        const locked = template.template_type === 'business' && !isBusiness;
                        const isFree = (template.tokens_cost || 0) === 0;
                        return (
                          <Button
                            size="sm"
                            className={`text-white ${locked ? 'bg-white/10 text-white/60 border border-white/20 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePurchase(template);
                            }}
                            disabled={locked}
                          >
                            {isFree ? (
                              <>
                                <Plus className="w-4 h-4 mr-1" /> Add
                              </>
                            ) : (
                              <>
                                <Coins className="w-4 h-4 mr-1" /> {template.tokens_cost}
                              </>
                            )}
                          </Button>
                        );
                      })()
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {filteredTemplates.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
              <h3 className="text-lg font-semibold text-white">No templates found</h3>
              <p className="text-zinc-400 mt-1">Try adjusting your filters</p>
            </div>
          )}
        </>
      )}

      {/* LoRA Models Section */}
      {activeSection === 'lora' && isBusiness && (
        <div className="space-y-6">
          {loraModels.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loraModels.map((model) => (
                  <Card key={model.id} className="bg-zinc-900/50 border-white/10 overflow-hidden hover:border-indigo-500/30 transition-all">
                    <div className="relative aspect-video overflow-hidden bg-zinc-800">
                      <img
                        src={model.preview_url}
                        alt={model.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                        }}
                      />
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-black/60 backdrop-blur-sm text-white">
                          ${model.price}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-white">{model.name}</h3>
                          <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{model.description}</p>
                        </div>
                        <Badge variant="outline" className="border-white/10 text-xs text-zinc-400">
                          {model.category}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span>{model.rating}</span>
                          <span>•</span>
                          <Download className="w-3 h-3" />
                          <span>{model.downloads}</span>
                        </div>
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                          Buy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* How it works + Upcoming */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="bg-zinc-900/50 border-white/10 lg:col-span-2">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      How LoRA Marketplace Works
                    </div>
                    <ol className="space-y-2 text-sm text-zinc-300 list-decimal list-inside">
                      <li>Pick a model with a style you like.</li>
                      <li>Apply it to your templates or badges from the editor.</li>
                      <li>Pay per use or own it if marked “Owned”.</li>
                      <li>Preview sample outputs before applying.</li>
                    </ol>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900/50 border-white/10">
                  <CardContent className="p-5 space-y-2">
                    <div className="flex items-center gap-2 text-white font-semibold">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Upcoming Models
                    </div>
                    <div className="space-y-2 text-sm text-zinc-300">
                      <div className="p-3 rounded-lg bg-zinc-800/60 flex items-center justify-between">
                        <span>Neon Portrait v2</span>
                        <Badge className="bg-amber-500/20 text-amber-400">Soon</Badge>
                      </div>
                      <div className="p-3 rounded-lg bg-zinc-800/60 flex items-center justify-between">
                        <span>Product Hero Light</span>
                        <Badge className="bg-amber-500/20 text-amber-400">Soon</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="text-center py-12 space-y-4">
              <Wand2 className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
              <h3 className="text-lg font-semibold text-white">LoRA Model Marketplace</h3>
              <p className="text-zinc-400 mt-1">Coming soon: Train and share custom AI models</p>
              <Button className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                Join Waitlist
              </Button>
              <div className="max-w-xl mx-auto text-left bg-zinc-900/50 border border-white/10 rounded-2xl p-5">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Upcoming Models
                </h4>
                <ul className="text-sm text-zinc-300 mt-2 space-y-1 list-disc list-inside">
                  <li>Neon Portrait v2</li>
                  <li>Product Hero Light</li>
                  <li>Studio Cinematic Pack</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Library Section */}
      {activeSection === 'library' && (
        <>
          {(!myLibrary || myLibrary.length === 0) ? (
            <div className="text-center py-12">
              <Library className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
              <h3 className="text-lg font-semibold text-white">Your library is empty</h3>
              <p className="text-zinc-400 mt-1">Browse the marketplace to add templates</p>
              <Button
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => setActiveSection('templates')}
              >
                Browse Templates
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(myLibrary || []).map((item) => (
                <Card
                  key={item.id}
                  className="bg-zinc-900/50 border-white/10 overflow-hidden group"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-800">
                    <img
                      src={item.preview_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        Use in Event
                      </Button>
                    </div>

                    <div className="absolute top-2 left-2">
                      <Badge className={item.template_type === 'business' ? 'bg-purple-500 text-white' : 'bg-indigo-500 text-white'}>
                        {item.template_type === 'business' ? 'Business' : 'Individual'}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{item.name}</h3>
                        <p className="text-sm text-zinc-400">
                          Used {item.times_used} times
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromLibrary(item);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Template Preview Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-3xl">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedTemplate.name}</DialogTitle>
                    <DialogDescription className="text-zinc-400 mt-1">
                      by {selectedTemplate.creator?.name || 'Unknown'}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    {selectedTemplate.price === 0 ? (
                      <Badge className="bg-emerald-500 text-white">FREE</Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/20">
                        <Coins className="w-3 h-3 mr-1" />
                        {selectedTemplate.price} tokens
                      </Badge>
                    )}
                    {selectedTemplate.template_type === 'business' && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/20">
                        Business
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-4">
                <img
                  src={getTemplateImage(selectedTemplate)}
                  alt={selectedTemplate.name}
                  className="w-full h-64 object-cover rounded-lg bg-zinc-800"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                  }}
                />
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-zinc-300">{selectedTemplate.description}</p>

                {selectedTemplate.prompt && (
                  <div className="bg-zinc-800/50 p-3 rounded-lg">
                    <p className="text-xs text-zinc-500 mb-1">Prompt</p>
                    <p className="text-sm text-zinc-300">{selectedTemplate.prompt}</p>
                  </div>
                )}

                {/* Pipeline info */}
                {selectedTemplate.pipeline_config && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {IMAGE_MODELS.find(m => m.value === selectedTemplate.pipeline_config?.imageModel)?.label || 'Image'}
                    </Badge>
                    {selectedTemplate.pipeline_config.faceswapEnabled && (
                      <Badge variant="outline" className="border-pink-500/30 text-pink-400">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Faceswap
                      </Badge>
                    )}
                    {selectedTemplate.pipeline_config.videoEnabled && (
                      <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                        <Video className="w-3 h-3 mr-1" />
                        {VIDEO_MODELS.find(m => m.value === selectedTemplate.pipeline_config?.videoModel)?.label || 'Video'}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-white/10 text-zinc-400">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-6 text-sm text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>{selectedTemplate.rating} rating</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    <span>{selectedTemplate.downloads.toLocaleString()} downloads</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span>{selectedTemplate.tokens_cost} tokens/use</span>
                  </div>
                  <Badge variant="outline" className="border-white/10 text-zinc-400">
                    {selectedTemplate.category}
                  </Badge>
                </div>
              </div>

              <DialogFooter className="mt-6">
                {(selectedTemplate.is_owned || isInLibrary(selectedTemplate.id)) ? (
                  <div className="flex items-center gap-3 w-full justify-between">
                    <Badge className="bg-emerald-500/20 text-emerald-400">
                      <Check className="w-4 h-4 mr-1" />
                      In Your Library
                    </Badge>
                    <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">
                      Use in Event
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">
                      <Heart className="w-4 h-4 mr-2" />
                      Save for Later
                    </Button>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => handlePurchase(selectedTemplate)}
                      disabled={isPurchasing}
                    >
                      {isPurchasing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : selectedTemplate.price === 0 ? (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Library
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 mr-2" />
                          Buy for {selectedTemplate.price} tokens
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        if (!open) resetNewTemplate();
        setShowCreateModal(open);
      }}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
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
                    <SelectContent className="bg-zinc-900 border-white/10">
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
                    <SelectContent className="bg-zinc-900 border-white/10">
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
                          className="absolute top-1 right-1 bg-black/60 rounded p-1 hover:bg-red-500 transition-colors"
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
                          className="absolute top-1 right-1 bg-black/60 rounded p-1 hover:bg-red-500 transition-colors"
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
                    <SelectContent className="bg-zinc-900 border-white/10">
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
    </div>
  );
}
