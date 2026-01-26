import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
    LayoutGrid, List, BarChart3, Search, Filter,
    MoreHorizontal, Eye, EyeOff, Flag, Trash2,
    ChevronLeft, ChevronRight, Download, CheckSquare,
    Square, AlertCircle, Loader2, Calendar, User,
    ArrowUpDown, Info, Play, Image as ImageIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { ENV } from "@/config/env";
import { toast } from "sonner";
import { format } from "date-fns";
import { AI_MODELS, getModelDisplayName } from "@/services/aiProcessor";

// --- Types ---

interface Asset {
    id: string;
    url: string;
    thumbnail_url: string;
    user_id: string;
    user_email: string;
    username: string;
    user_name: string;
    type: 'image' | 'video';
    model: string;
    model_id: string;
    prompt: string;
    visibility: 'public' | 'private';
    status: 'public' | 'private' | 'flagged';
    is_flagged: boolean;
    likes: number;
    views: number;
    cost: number;
    created_at: string;
}

interface StatsData {
    summary: {
        total: number;
        images: number;
        videos: number;
        public: number;
        private: number;
        flagged: number;
    };
    models_usage: Array<{ model: string; count: number; type: string }>;
    daily_stats: Array<{ date: string; type: string; count: number }>;
    top_users: Array<{ user_id: string; email: string; username: string; count: number }>;
}

export function AssetManager() {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlView = searchParams.get("view") as 'grid' | 'list' | 'stats' || 'grid';

    const [view, setView] = useState<'grid' | 'list' | 'stats'>(urlView);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isStatsLoading, setIsStatsLoading] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [pageSize, setPageSize] = useState(24);

    const [filters, setFilters] = useState({
        user_search: "",
        model: "all",
        asset_type: "all",
        status: "all",
        user_tier: "creators", // Default to creators as per user request
        date_from: "",
        date_to: "",
        sort_by: "created_at",
        sort_order: "desc"
    });

    const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
    const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
    const [columns, setColumns] = useState(4);

    const getModelLabel = (modelId: string) => {
        return getModelDisplayName(modelId);
    };

    useEffect(() => {
        // Update URL when view changes
        if (searchParams.get("view") !== view) {
            const newParams = new URLSearchParams(searchParams);
            newParams.set("view", view);
            setSearchParams(newParams, { replace: true });
        }

        if (view === 'stats') {
            loadStats();
        } else {
            loadAssets();
        }
    }, [view, currentPage, pageSize, filters.sort_by, filters.sort_order]);

    // Handlers for data fetching
    const loadAssets = async (resetPage = false) => {
        setIsLoading(true);
        const pageToLoad = resetPage ? 1 : currentPage;
        if (resetPage) setCurrentPage(1);

        try {
            const token = localStorage.getItem("auth_token");
            const params = new URLSearchParams({
                page: pageToLoad.toString(),
                page_size: pageSize.toString(),
                sort_by: filters.sort_by,
                sort_order: filters.sort_order
            });

            if (filters.user_search) params.append("user_search", filters.user_search);
            if (filters.model !== 'all') params.append("model", filters.model);
            if (filters.asset_type !== 'all') params.append("asset_type", filters.asset_type);
            if (filters.status !== 'all') params.append("status", filters.status);
            if (filters.user_tier !== 'all') params.append("user_tier", filters.user_tier);
            if (filters.date_from) params.append("date_from", filters.date_from);
            if (filters.date_to) params.append("date_to", filters.date_to);

            const response = await fetch(`${ENV.API_URL}/api/admin/assets?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAssets(data.assets || []);
                setTotalPages(data.pagination.total_pages || 1);
            }
        } catch (error) {
            toast.error("Error loading assets");
        } finally {
            setIsLoading(false);
        }
    };

    const loadStats = async (force = false) => {
        // Simple 30s cache
        const now = Date.now();
        if (!force && stats && (now - (stats as any)._timestamp < 30000)) {
            return;
        }

        setIsStatsLoading(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/assets/stats?user_tier=${filters.user_tier}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                (data as any)._timestamp = Date.now();
                setStats(data);
            } else {
                const errorData = await response.json();
                toast.error(errorData.error || "Error loading statistics");
            }
        } catch (error) {
            toast.error("Error loading statistics");
        } finally {
            setIsStatsLoading(false);
        }
    };

    const handleAction = async (assetId: string, action: string) => {
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/assets/${assetId}/status`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });

            if (response.ok) {
                toast.success(`Asset ${action} successfully`);
                loadAssets();
                if (previewAsset?.id === assetId) setPreviewAsset(null);
            }
        } catch (error) {
            toast.error(`Failed to ${action} asset`);
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedAssets.length === 0) return;

        setIsBulkActionLoading(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/assets/bulk`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ asset_ids: selectedAssets, action })
            });

            if (response.ok) {
                toast.success(`Bulk action ${action} completed`);
                setSelectedAssets([]);
                loadAssets();
            }
        } catch (error) {
            toast.error("Bulk action failed");
        } finally {
            setIsBulkActionLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedAssets.length === assets.length) {
            setSelectedAssets([]);
        } else {
            setSelectedAssets(assets.map(a => a.id));
        }
    };

    const toggleSelectAsset = (id: string) => {
        setSelectedAssets(prev =>
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    // --- Render Components ---

    // --- Render Helpers ---

    const renderFilterPanel = () => (
        <Card className="bg-card/50 border-white/10 mb-6">
            <CardContent className="p-4 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                    <label className="text-xs text-zinc-400">Search User</label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Email or username..."
                            className="bg-zinc-900 border-white/10 pl-9"
                            value={filters.user_search}
                            onChange={(e) => setFilters(f => ({ ...f, user_search: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && loadAssets(true)}
                        />
                    </div>
                </div>

                <div className="w-[140px] space-y-1.5">
                    <label className="text-xs text-zinc-400">Type</label>
                    <Select value={filters.asset_type} onValueChange={(v) => setFilters(f => ({ ...f, asset_type: v }))}>
                        <SelectTrigger className="bg-zinc-900 border-white/10">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-[140px] space-y-1.5">
                    <label className="text-xs text-zinc-400">Status</label>
                    <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="bg-zinc-900 border-white/10">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="flagged">Flagged</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-[140px] space-y-1.5">
                    <label className="text-xs text-zinc-400">User Tier</label>
                    <Select value={filters.user_tier} onValueChange={(v) => setFilters(f => ({ ...f, user_tier: v }))}>
                        <SelectTrigger className="bg-zinc-900 border-white/10 border-indigo-500/30">
                            <SelectValue placeholder="User Tier" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="all">All Tiers</SelectItem>
                            <SelectItem value="creators">Creators Only</SelectItem>
                            <SelectItem value="business">Business Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-[140px] space-y-1.5">
                    <label className="text-xs text-zinc-400">From Date</label>
                    <Input
                        type="date"
                        className="bg-zinc-900 border-white/10"
                        value={filters.date_from}
                        onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
                    />
                </div>

                <div className="space-y-1.5 pb-0.5">
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-500"
                        onClick={() => loadAssets(true)}
                        disabled={isLoading}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Apply
                    </Button>
                </div>

                <div className="space-y-1.5 pb-0.5">
                    <Button
                        variant="ghost"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => {
                            setFilters({
                                user_search: "",
                                model: "all",
                                asset_type: "all",
                                status: "all",
                                user_tier: "creators",
                                date_from: "",
                                date_to: "",
                                sort_by: "created_at",
                                sort_order: "desc"
                            });
                            setCurrentPage(1);
                        }}
                    >
                        Reset
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const AssetCard = ({ asset }: { asset: Asset }) => {
        const isSelected = selectedAssets.includes(asset.id);

        return (
            <div
                className={`relative group aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 ring-1 ring-white/10 hover:ring-indigo-500/50 transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''
                    }`}
            >
                <div
                    className="absolute top-3 left-3 z-10"
                    onClick={(e) => { e.stopPropagation(); toggleSelectAsset(asset.id); }}
                >
                    <div className={`w-5 h-5 rounded border ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'bg-black/50 border-white/30'} flex items-center justify-center cursor-pointer`}>
                        {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                    </div>
                </div>

                {(asset.type === 'video' && !asset.thumbnail_url) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-500">
                        <Play className="w-8 h-8 mb-2 opacity-20" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">Video</span>
                    </div>
                ) : (
                    <img
                        src={asset.thumbnail_url || asset.url}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        alt=""
                        loading="lazy"
                    />
                )}

                {asset.type === 'video' && (
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-1.5 rounded-full pointer-events-none">
                        <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                )}

                {/* Overlay Details */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] uppercase">
                                {asset.username?.substring(0, 2) || '??'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-white truncate">{asset.username || 'Anonymous'}</p>
                                <p className="text-[10px] text-zinc-400 truncate">{asset.user_email}</p>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white">
                                <DropdownMenuItem onClick={() => setPreviewAsset(asset)}>
                                    <Eye className="w-4 h-4 mr-2" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                {asset.status === 'public' ? (
                                    <DropdownMenuItem onClick={() => handleAction(asset.id, 'unpublish')}>
                                        <EyeOff className="w-4 h-4 mr-2" /> Make Private
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => handleAction(asset.id, 'publish')}>
                                        <Eye className="w-4 h-4 mr-2" /> Make Public
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleAction(asset.id, asset.is_flagged ? 'unflag' : 'flag')}>
                                    <Flag className={`w-4 h-4 mr-2 ${asset.is_flagged ? 'text-red-400' : ''}`} />
                                    {asset.is_flagged ? 'Unflag Content' : 'Flag Content'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/5" />
                                <DropdownMenuItem
                                    onClick={() => handleAction(asset.id, 'delete')}
                                    className="text-red-400 focus:text-red-400"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Permanently
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[9px] h-4 bg-zinc-900/50 border-white/10 text-zinc-300">
                            {getModelLabel(asset.model)}
                        </Badge>
                        <Badge variant="outline" className={`text-[9px] h-4 border-0 ${asset.status === 'flagged' ? 'bg-red-500/20 text-red-400' :
                            asset.status === 'private' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-emerald-500/20 text-emerald-400'
                            }`}>
                            {asset.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] h-4 bg-zinc-900/50 border-white/5 text-zinc-400">
                            {asset.cost} tokens
                        </Badge>
                    </div>
                </div>
            </div>
        );
    };

    const StatsView = () => {
        if (isStatsLoading && !stats) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-indigo-500 w-10 h-10" /></div>;
        if (!stats) return <div className="py-20 text-center text-zinc-500">Failed to load statistics</div>;

        const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Total Assets', value: stats.summary.total, icon: LayoutGrid, color: 'text-blue-400' },
                        { label: 'Images', value: stats.summary.images, icon: ImageIcon, color: 'text-indigo-400' },
                        { label: 'Videos', value: stats.summary.videos, icon: Play, color: 'text-pink-400' },
                        { label: 'Public', value: stats.summary.public, icon: Eye, color: 'text-emerald-400' },
                        { label: 'Private', value: stats.summary.private, icon: EyeOff, color: 'text-amber-400' },
                        { label: 'Flagged', value: stats.summary.flagged, icon: AlertCircle, color: 'text-red-400' },
                    ].map((item, idx) => (
                        <Card key={idx} className="bg-card/50 border-white/10">
                            <CardContent className="p-4">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{item.label}</p>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-white">{(item.value || 0).toLocaleString()}</h3>
                                    <item.icon className={`w-4 h-4 ${item.color}`} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="bg-card/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Model Distribution (Last 30 Days)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.models_usage} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                                    <XAxis type="number" stroke="#71717a" fontSize={10} />
                                    <YAxis
                                        dataKey="model"
                                        type="category"
                                        stroke="#71717a"
                                        fontSize={10}
                                        width={100}
                                        tickFormatter={(m) => getModelDisplayName(m)}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                                        cursor={{ fill: '#27272a' }}
                                    />
                                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Daily Creations Trend</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.daily_stats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#71717a"
                                        fontSize={10}
                                        tickFormatter={(t) => t.substring(5)}
                                    />
                                    <YAxis stroke="#71717a" fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }} />
                                    <Legend iconType="circle" />
                                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Top Generators</CardTitle>
                            <CardDescription>Users with most creations in last 30 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {stats.top_users.map((user, idx) => (
                                    <div key={user.user_id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{user.username || 'Anonymous'}</p>
                                                <p className="text-xs text-zinc-500">{user.email}</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-indigo-500/10 text-indigo-400 border-0">{user.count} assets</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 p-1 bg-zinc-900 border border-white/10 rounded-lg w-fit">
                    {(['grid', 'list', 'stats'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setView(m)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === m ? 'bg-white text-black shadow-lg' : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            {m === 'grid' && <LayoutGrid className="w-4 h-4" />}
                            {m === 'list' && <List className="w-4 h-4" />}
                            {m === 'stats' && <BarChart3 className="w-4 h-4" />}
                            <span className="capitalize">{m}</span>
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {view === 'grid' && (
                        <div className="flex items-center gap-3 mr-4 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold">Columns</span>
                            <Slider
                                value={[columns]}
                                onValueChange={(v) => setColumns(v[0])}
                                min={2}
                                max={8}
                                step={1}
                                className="w-24"
                            />
                            <span className="text-xs font-mono text-zinc-400 w-4 text-center">{columns}</span>
                        </div>
                    )}
                    {selectedAssets.length > 0 && (
                        <div className="flex items-center gap-2 mr-4 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
                            <span className="text-xs font-medium text-indigo-400">{selectedAssets.length} selected</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-400 hover:bg-indigo-500/10">
                                        Actions
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white">
                                    <DropdownMenuItem onClick={() => handleBulkAction('unpublish')}>
                                        <EyeOff className="w-4 h-4 mr-2" /> Make Private
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkAction('flag')}>
                                        <Flag className="w-4 h-4 mr-2" /> Flag Content
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-white/5" />
                                    <DropdownMenuItem
                                        onClick={() => handleBulkAction('delete')}
                                        className="text-red-400 focus:text-red-400"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete All
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        className="bg-card/50 border-white/10"
                        onClick={() => view === 'stats' ? loadStats() : loadAssets()}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {view !== 'stats' && renderFilterPanel()}

            {isLoading && view !== 'stats' && assets.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                    <p>Loading assets...</p>
                </div>
            ) : view === 'grid' ? (
                <div className="space-y-6">
                    <div
                        className="grid gap-4"
                        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                    >
                        {assets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
                    </div>
                    {assets.length === 0 && !isLoading && (
                        <div className="py-20 text-center text-zinc-500 h-96 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl">
                            <Search className="w-10 h-10 mb-4 opacity-20" />
                            <p>No assets found matching your filters</p>
                        </div>
                    )}
                </div>
            ) : view === 'list' ? (
                <Card className="bg-card/30 border-white/10 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedAssets.length === assets.length && assets.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                        className="border-white/30"
                                    />
                                </TableHead>
                                <TableHead className="text-zinc-500">Preview</TableHead>
                                <TableHead className="text-zinc-500">User</TableHead>
                                <TableHead className="text-zinc-500">Model / Type</TableHead>
                                <TableHead className="text-zinc-500">Status</TableHead>
                                <TableHead className="text-zinc-500">Cost</TableHead>
                                <TableHead className="text-zinc-500">Created At</TableHead>
                                <TableHead className="text-right text-zinc-500">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assets.map((asset) => (
                                <TableRow key={asset.id} className="border-white/5 hover:bg-white/5">
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedAssets.includes(asset.id)}
                                            onCheckedChange={() => toggleSelectAsset(asset.id)}
                                            className="border-white/30"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="relative w-12 h-16 rounded overflow-hidden bg-black shrink-0 cursor-pointer" onClick={() => setPreviewAsset(asset)}>
                                            {(asset.type === 'video' && !asset.thumbnail_url) ? (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                    <Play className="w-4 h-4 text-zinc-600" />
                                                </div>
                                            ) : (
                                                <img src={asset.thumbnail_url || asset.url} className="w-full h-full object-cover" />
                                            )}
                                            {asset.type === 'video' && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <Play className="w-3 h-3 text-white fill-white" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="max-w-[150px]">
                                            <p className="text-sm font-medium text-white truncate">{asset.username || 'Anonymous'}</p>
                                            <p className="text-xs text-zinc-500 truncate">{asset.user_email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="text-sm text-zinc-300">{getModelLabel(asset.model)}</p>
                                            <Badge variant="outline" className="p-0 text-[10px] text-zinc-500 uppercase h-auto border-0 bg-transparent">
                                                {asset.type}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`text-[10px] border-0 ${asset.status === 'flagged' ? 'bg-red-500/20 text-red-400' :
                                            asset.status === 'private' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                            {asset.status.toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-xs text-zinc-300">
                                            <span>{asset.cost}</span>
                                            <span className="text-[10px] text-zinc-500">tokens</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-zinc-400">
                                        {format(new Date(asset.created_at), 'MMM d, yyyy HH:mm')}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
                                                <DropdownMenuItem onClick={() => setPreviewAsset(asset)}>
                                                    <Eye className="w-4 h-4 mr-2" /> View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleAction(asset.id, asset.status === 'public' ? 'unpublish' : 'publish')}>
                                                    <EyeOff className="w-4 h-4 mr-2" /> {asset.status === 'public' ? 'Make Private' : 'Make Public'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleAction(asset.id, 'flag')}>
                                                    <Flag className="w-4 h-4 mr-2" /> Flag
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleAction(asset.id, 'delete')} className="text-red-400">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            ) : (
                <StatsView />
            )}

            {/* Pagination Controls */}
            {view !== 'stats' && assets.length > 0 && (
                <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-zinc-500">
                        Page <span className="text-zinc-300">{currentPage}</span> of <span className="text-zinc-300">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-zinc-900 border-white/10"
                            disabled={currentPage === 1 || isLoading}
                            onClick={() => setCurrentPage(p => p - 1)}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-zinc-900 border-white/10"
                            disabled={currentPage === totalPages || isLoading}
                            onClick={() => setCurrentPage(p => p + 1)}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Preview Dialog */}
            <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
                <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-4xl p-0 overflow-hidden">
                    <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                        <div className="md:w-[55%] bg-black flex items-center justify-center p-4">
                            {previewAsset?.type === 'video' ? (
                                <video
                                    src={previewAsset.url}
                                    controls autoPlay loop muted
                                    className="max-w-full max-h-full rounded-lg shadow-2xl"
                                />
                            ) : (
                                <img
                                    src={previewAsset?.url}
                                    className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                                    alt=""
                                />
                            )}
                        </div>
                        <div className="md:w-[45%] p-6 flex flex-col h-full overflow-y-auto">
                            <div className="flex-1 space-y-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className={`border-0 ${previewAsset?.status === 'flagged' ? 'bg-red-500/20 text-red-400' :
                                            previewAsset?.status === 'private' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                            {previewAsset?.status.toUpperCase()}
                                        </Badge>
                                        <Badge variant="outline" className="border-white/10 text-zinc-400 uppercase text-[10px]">
                                            {previewAsset?.type}
                                        </Badge>
                                    </div>
                                    <h2 className="text-xl font-bold">{previewAsset?.username || 'Anonymous'}</h2>
                                    <p className="text-sm text-zinc-500">{previewAsset?.user_email}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-2">Prompt</p>
                                        <p className="text-sm text-zinc-300 leading-relaxed italic">
                                            "{previewAsset?.prompt || 'No prompt info'}"
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Model</p>
                                            <p className="text-sm font-medium">{getModelLabel(previewAsset?.model || "")}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Created At</p>
                                            <p className="text-sm font-medium">
                                                {previewAsset && format(new Date(previewAsset.created_at), 'MMM d, yyyy HH:mm')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-zinc-500" />
                                            <span className="text-sm">{previewAsset?.views || 0} views</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Heart className="w-4 h-4 text-zinc-500" />
                                            <span className="text-sm">{previewAsset?.likes || 0} likes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        className="border-white/10 hover:bg-white/5"
                                        onClick={() => handleAction(previewAsset!.id, previewAsset?.status === 'public' ? 'unpublish' : 'publish')}
                                    >
                                        {previewAsset?.status === 'public' ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                                        {previewAsset?.status === 'public' ? 'Make Private' : 'Make Public'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className={`${previewAsset?.is_flagged ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'border-white/10 hover:bg-white/5'}`}
                                        onClick={() => handleAction(previewAsset!.id, previewAsset?.is_flagged ? 'unflag' : 'flag')}
                                    >
                                        <Flag className="w-4 h-4 mr-2" />
                                        {previewAsset?.is_flagged ? 'Unflag' : 'Flag'}
                                    </Button>
                                </div>
                                <Button
                                    variant="destructive"
                                    className="w-full bg-red-600 hover:bg-red-500"
                                    onClick={() => handleAction(previewAsset!.id, 'delete')}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Permanently
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function RefreshCw(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
        </svg>
    )
}

function Heart(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
    )
}
