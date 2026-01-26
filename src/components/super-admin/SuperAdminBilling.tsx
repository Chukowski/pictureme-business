import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, CreditCard, Package, DollarSign, Edit2, Trash2, Save, Loader2, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface TokenPackage {
    id: number;
    name: string;
    description?: string;
    tokens: number;
    price_usd: number;
    is_active: boolean;
    stripe_price_id?: string;
    stripe_product_id?: string;
    created_at?: string;
    plan_type?: 'individual' | 'business';
    validity_days?: number;
    is_enterprise?: boolean;
}

const INFRA_MULTIPLIER = 1.15;
const RISK_MULTIPLIER_BY_TYPE: Record<string, number> = {
    text_to_image: 1.1,
    image_to_image: 1.1,
    lora_inference: 1.3, // premium_image
    video: 1.4,         // video_async
    video_extend: 1.4,
    video_to_video: 1.5,
    realtime_video: 1.6,
    lora_training: 2.0,
    upscaler: 1.1,
    background_remove: 1.0
};
const MIN_TOKEN_PRICE_USD = 0.07;
const REC_TOKEN_PRICE_MIN = 0.08;
const REC_TOKEN_PRICE_MAX = 0.10;

const VIDEO_PRICING_CONFIG: Record<string, any> = {
    "fal": {
        "veo_3_1": {
            "name": "Veo 3.1",
            "1080p": { off: 0.20, on: 0.40 },
            "4k": { off: 0.40, on: 0.60 }
        },
        "veo_3_1_fast": {
            "name": "Veo 3.1 Fast",
            "1080p": { off: 0.10, on: 0.15 },
            "4k": { off: 0.30, on: 0.35 }
        },
        "kling_2_6": {
            "name": "Kling 2.6",
            "1080p": { off: 0.07, on: 0.14 },
            "4k": { off: 0.07, on: 0.14 } // Kling pricing listed doesn't differentiate res currently
        },
        "wan": {
            "name": "Wan",
            "1080p": { off: 0.05, on: 0.10 },
            "4k": { off: 0.05, on: 0.10 }
        }
    }
};

export default function SuperAdminBilling() {
    const [packages, setPackages] = useState<TokenPackage[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingPackage, setEditingPackage] = useState<TokenPackage | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        tokens: 100,
        price_usd: 10,
        is_active: true,
        stripe_price_id: "",
        stripe_product_id: "",
        plan_type: "individual" as 'individual' | 'business',
        validity_days: 30
    });

    // Calculator state
    const [calcData, setCalcData] = useState({
        operation_category: "image" as "image" | "video",
        provider: "fal",
        // Image fields
        operation_type: "text_to_image",
        real_cost_usd_image: 0.02,
        resolution_multiplier: 1,
        // Video fields
        video_model: "veo_3_1",
        duration_seconds: 5,
        video_resolution: "1080p",
        audio: "off" as "on" | "off",
        is_manual_video: false,
        real_cost_usd_video: 0.20,
        // Shared
        extra_costs_usd: 0,
        show_advanced: false, // For Extra Costs visibility
        infra_multiplier: 1.15,
        risk_multiplier_video: 1.4,
        selling_price_token: 0.08
    });

    useEffect(() => {
        fetchPackages();
        fetchTransactions();
    }, []);

    const fetchPackages = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("auth_token");

            const response = await fetch(`${ENV.API_URL}/api/admin/token-packages`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setPackages(data);
            } else {
                // If endpoint doesn't exist, use correct defaults from database
                setPackages([
                    // Individual/Creator Packs
                    { id: 955, name: "Starter Pack", description: "Perfect for trying out new styles and quick experiments.", tokens: 100, price_usd: 4.99, is_active: true, plan_type: 'individual', validity_days: 30 },
                    { id: 953, name: "Creative Pack", description: "Best value for regular creators. Includes bonus tokens.", tokens: 500, price_usd: 19.99, is_active: true, plan_type: 'individual', validity_days: 30 },
                    { id: 954, name: "Pro Pack", description: "Maximum power for heavy usage and extensive projects.", tokens: 1000, price_usd: 34.99, is_active: true, plan_type: 'individual', validity_days: 30 },
                    // Business/Event Packs
                    { id: 937, name: "Business Starter Pack", description: "1,000 tokens - Valid for 60 days", tokens: 1000, price_usd: 400, is_active: true, plan_type: 'business', validity_days: 60 },
                    { id: 938, name: "Business Pro Pack", description: "5,000 tokens - Valid for 60 days", tokens: 5000, price_usd: 1500, is_active: true, plan_type: 'business', validity_days: 60 },
                    { id: 939, name: "Business Plus Pack", description: "8,000 tokens - Valid for 60 days", tokens: 8000, price_usd: 2000, is_active: true, plan_type: 'business', validity_days: 60 },
                    { id: 940, name: "Business Enterprise Pack", description: "Custom pricing for large-volume operators", tokens: 0, price_usd: 0, is_active: true, plan_type: 'business', validity_days: 60, is_enterprise: true },
                ]);
            }
        } catch (error) {
            console.error("Error fetching packages:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTransactions = async () => {
        try {
            const token = localStorage.getItem("auth_token");

            const response = await fetch(`${ENV.API_URL}/api/admin/devtools/transactions?limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTransactions(data.transactions || []);
            }
        } catch (error) {
            console.error("Error fetching transactions:", error);
        }
    };

    const openCreateDialog = () => {
        setEditingPackage(null);
        setFormData({
            name: "",
            description: "",
            tokens: 100,
            price_usd: 10,
            is_active: true,
            stripe_price_id: "",
            stripe_product_id: "",
            plan_type: "individual",
            validity_days: 30
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (pkg: TokenPackage) => {
        setEditingPackage(pkg);
        setFormData({
            name: pkg.name,
            description: pkg.description || "",
            tokens: pkg.tokens,
            price_usd: pkg.price_usd,
            is_active: pkg.is_active,
            stripe_price_id: pkg.stripe_price_id || "",
            stripe_product_id: pkg.stripe_product_id || "",
            plan_type: pkg.plan_type || "individual",
            validity_days: pkg.validity_days || 30
        });
        setIsDialogOpen(true);
    };

    const savePackage = async () => {
        if (!formData.name || formData.tokens <= 0 || formData.price_usd <= 0) {
            toast.error("Please fill all required fields");
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem("auth_token");
            const url = editingPackage
                ? `${ENV.API_URL}/api/admin/token-packages/${editingPackage.id}`
                : `${ENV.API_URL}/api/admin/token-packages`;

            const response = await fetch(url, {
                method: editingPackage ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                toast.success(editingPackage ? "Package updated" : "Package created");
                setIsDialogOpen(false);
                fetchPackages();
            } else {
                const error = await response.json();
                toast.error(error.detail || "Failed to save package");
            }
        } catch (error) {
            console.error("Error saving package:", error);
            toast.error("Failed to save package");
        } finally {
            setIsSaving(false);
        }
    };

    const deletePackage = async (id: number) => {
        if (!confirm("Are you sure you want to deactivate this package?")) return;

        try {
            const token = localStorage.getItem("auth_token");

            const response = await fetch(`${ENV.API_URL}/api/admin/token-packages/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("Package deactivated");
                fetchPackages();
            } else {
                toast.error("Failed to delete package");
            }
        } catch (error) {
            console.error("Error deleting package:", error);
            toast.error("Failed to delete package");
        }
    };

    const togglePackageStatus = async (pkg: TokenPackage) => {
        try {
            const token = localStorage.getItem("auth_token");

            const response = await fetch(`${ENV.API_URL}/api/admin/token-packages/${pkg.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ...pkg, is_active: !pkg.is_active })
            });

            if (response.ok) {
                toast.success(`Package ${!pkg.is_active ? 'activated' : 'deactivated'}`);
                fetchPackages();
            }
        } catch (error) {
            console.error("Error toggling package:", error);
        }
    };

    const pricePerToken = (pkg: TokenPackage) => {
        return (pkg.price_usd / pkg.tokens).toFixed(3);
    };

    const cleanupDuplicates = async () => {
        if (!confirm("This will remove duplicate packages, keeping only one of each. Continue?")) return;

        try {
            const token = localStorage.getItem("auth_token");

            const response = await fetch(`${ENV.API_URL}/api/admin/token-packages/cleanup`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                toast.success(`Cleaned up duplicates. Removed: ${data.deleted}`);
                fetchPackages();
            } else {
                toast.error("Failed to cleanup duplicates");
            }
        } catch (error) {
            console.error("Error cleaning duplicates:", error);
            toast.error("Failed to cleanup duplicates");
        }
    };

    // Helper function to render package table
    const renderPackageTable = (pkgList: TokenPackage[]) => {
        if (pkgList.length === 0) {
            return (
                <div className="text-center py-8 text-zinc-500">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No packages found</p>
                </div>
            );
        }
        return (
            <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-zinc-400">Package</TableHead>
                            <TableHead className="text-zinc-400">Type</TableHead>
                            <TableHead className="text-zinc-400">Tokens</TableHead>
                            <TableHead className="text-zinc-400">Price</TableHead>
                            <TableHead className="text-zinc-400">$/Token</TableHead>
                            <TableHead className="text-zinc-400">Status</TableHead>
                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {pkgList.map((pkg) => (
                            <TableRow key={pkg.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${pkg.plan_type === 'business' ? 'bg-purple-500/10' : 'bg-indigo-500/10'}`}>
                                            <Package className={`w-4 h-4 ${pkg.plan_type === 'business' ? 'text-purple-400' : 'text-indigo-400'}`} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{pkg.name}</p>
                                            {pkg.description && (
                                                <p className="text-xs text-zinc-500">{pkg.description}</p>
                                            )}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={pkg.plan_type === 'business' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}>
                                        {pkg.plan_type || 'individual'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="font-mono text-yellow-400">
                                        {pkg.tokens.toLocaleString()}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="font-bold text-white">
                                        ${pkg.price_usd.toFixed(2)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-zinc-400">
                                        ${pkg.tokens > 0 ? pricePerToken(pkg) : 'N/A'}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={pkg.is_active}
                                            onCheckedChange={() => togglePackageStatus(pkg)}
                                        />
                                        <Badge
                                            variant="outline"
                                            className={pkg.is_active
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                                            }
                                        >
                                            {pkg.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(pkg)}
                                            className="hover:bg-white/10"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deletePackage(pkg.id)}
                                            className="hover:bg-red-500/10 text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Billing & Pricing</h1>
                <p className="text-zinc-400">Manage token packages and view transaction logs.</p>
            </div>

            <Tabs defaultValue="packages" className="space-y-4">
                <TabsList className="bg-card border border-white/10">
                    <TabsTrigger value="packages">Token Packages</TabsTrigger>
                    <TabsTrigger value="transactions">Transaction Logs</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing Calculator</TabsTrigger>
                </TabsList>

                {/* Token Packages Tab */}
                <TabsContent value="packages" className="space-y-4">
                    {/* Plan Type Sub-Tabs */}
                    <Tabs defaultValue="individual" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <TabsList className="bg-zinc-800 border border-white/10">
                                <TabsTrigger value="individual" className="data-[state=active]:bg-indigo-600">
                                    👤 Individual / Creator
                                </TabsTrigger>
                                <TabsTrigger value="business" className="data-[state=active]:bg-purple-600">
                                    🏢 Business / Event
                                </TabsTrigger>
                                <TabsTrigger value="all" className="data-[state=active]:bg-zinc-600">
                                    All
                                </TabsTrigger>
                            </TabsList>
                            <div className="flex items-center gap-2">
                                {packages.length > 10 && (
                                    <Button
                                        variant="outline"
                                        onClick={cleanupDuplicates}
                                        className="border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" /> Clean Duplicates
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={fetchPackages}
                                    className="border-white/10"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                                <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700">
                                    <Plus className="w-4 h-4 mr-2" /> Add Package
                                </Button>
                            </div>
                        </div>

                        {/* Individual Packages */}
                        <TabsContent value="individual" className="space-y-4">
                            <h3 className="text-lg font-medium text-indigo-400">Creator / Individual Packages</h3>
                            {renderPackageTable(packages.filter(p => p.plan_type === 'individual' || (!p.plan_type && !p.name?.toLowerCase().includes('business'))))}
                        </TabsContent>

                        {/* Business Packages */}
                        <TabsContent value="business" className="space-y-4">
                            <h3 className="text-lg font-medium text-purple-400">Business / Event Packages</h3>
                            {renderPackageTable(packages.filter(p => p.plan_type === 'business' || p.name?.toLowerCase().includes('business')))}
                        </TabsContent>

                        {/* All Packages */}
                        <TabsContent value="all" className="space-y-4">
                            <h3 className="text-lg font-medium text-zinc-400">All Packages ({packages.length})</h3>
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                </div>
                            ) : renderPackageTable(packages)}
                        </TabsContent>
                    </Tabs>

                    {/* Info Box */}
                    <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <h3 className="font-medium text-indigo-400 mb-2">💡 About Token Packages</h3>
                        <ul className="text-sm text-zinc-400 space-y-1">
                            <li>• <strong>Individual/Creator</strong> packs are for personal use (Spark, Vibe, Studio tiers)</li>
                            <li>• <strong>Business/Event</strong> packs are for event operators (Event Starter, Pro, Plus tiers)</li>
                            <li>• Deactivated packages won't appear in the store but existing purchases remain valid</li>
                            <li>• Stripe Price ID links directly to a Stripe product for recurring billing</li>
                        </ul>
                    </div>
                </TabsContent>

                {/* Transaction Logs Tab */}
                <TabsContent value="transactions" className="space-y-4">
                    <h2 className="text-xl font-semibold">Recent Transactions</h2>
                    <Card className="bg-card/50 border-white/10">
                        <CardContent className="p-0">
                            {transactions.length === 0 ? (
                                <div className="p-8 text-center text-zinc-500">
                                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                                    <p>No transactions yet</p>
                                </div>
                            ) : (
                                transactions.map((tx, i) => (
                                    <div key={tx.id || i} className="p-4 flex items-center justify-between border-b border-white/5 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400">
                                                <DollarSign className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {tx.package_name || `${tx.tokens} tokens`}
                                                </p>
                                                <p className="text-xs text-zinc-500">{tx.user_email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-400">+${tx.amount?.toFixed(2)}</p>
                                            <p className="text-xs text-zinc-500">
                                                {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'Just now'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Pricing Calculator Tab */}
                <TabsContent value="pricing" className="space-y-4">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Advanced Pricing Calculator</h2>
                        <p className="text-sm text-zinc-500">Determine token consumption based on real infrastructure and risk costs.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Inputs */}
                        <Card className="bg-card/50 border-white/10 md:col-span-2">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-indigo-400">Operation Parameters</CardTitle>
                                <Tabs value={calcData.operation_category} onValueChange={(v) => setCalcData({ ...calcData, operation_category: v as any })} className="w-auto">
                                    <TabsList className="bg-zinc-900 border border-white/5 h-8 p-1">
                                        <TabsTrigger value="image" className="text-[10px] px-3 h-6">Image</TabsTrigger>
                                        <TabsTrigger value="video" className="text-[10px] px-3 h-6">Video</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {calcData.operation_category === 'image' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label>Provider</Label>
                                                <Select value={calcData.provider} onValueChange={(v) => setCalcData({ ...calcData, provider: v })}>
                                                    <SelectTrigger className="bg-zinc-900 border-white/10 h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        <SelectItem value="fal">FAL.ai</SelectItem>
                                                        <SelectItem value="wavespeed">WaveSpeed</SelectItem>
                                                        <SelectItem value="replicate">Replicate</SelectItem>
                                                        <SelectItem value="self-host">Self-Host</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Operation Type</Label>
                                                <Select value={calcData.operation_type} onValueChange={(v) => setCalcData({ ...calcData, operation_type: v })}>
                                                    <SelectTrigger className="bg-zinc-900 border-white/10 h-10 text-zinc-200">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        <SelectItem value="text_to_image">Text to Image</SelectItem>
                                                        <SelectItem value="image_to_image">Image to Image</SelectItem>
                                                        <SelectItem value="lora_inference">LoRA Inference</SelectItem>
                                                        <SelectItem value="upscaler">Upscaler</SelectItem>
                                                        <SelectItem value="background_remove">BG Remove</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label>Real Cost per Unit ($)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.0001"
                                                    value={calcData.real_cost_usd_image}
                                                    onChange={(e) => setCalcData({ ...calcData, real_cost_usd_image: parseFloat(e.target.value) || 0 })}
                                                    className="bg-zinc-900 border-white/10 h-10"
                                                />
                                                <p className="text-[10px] text-zinc-500">The actual price billed by the AI provider.</p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label>Resolution Multiplier</Label>
                                                <Select
                                                    value={calcData.resolution_multiplier.toString()}
                                                    onValueChange={(v) => setCalcData({ ...calcData, resolution_multiplier: parseInt(v) })}
                                                >
                                                    <SelectTrigger className="bg-zinc-900 border-white/10 h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        <SelectItem value="1">1x (Standard)</SelectItem>
                                                        <SelectItem value="2">2x (Pro/4K)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5 opacity-50 grayscale pointer-events-none">
                                                <Label>Provider</Label>
                                                <Select value={calcData.provider} onValueChange={(v) => setCalcData({ ...calcData, provider: v })}>
                                                    <SelectTrigger className="bg-zinc-900 border-white/10 h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        <SelectItem value="fal">FAL.ai</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label>{calcData.is_manual_video ? "Manual Cost ($/s)" : "Video Model"}</Label>
                                                    <div className="flex items-center gap-1.5 pb-1">
                                                        <Label className="text-[9px] text-zinc-500">Manual</Label>
                                                        <Switch
                                                            className="scale-75 h-4 w-7"
                                                            checked={calcData.is_manual_video}
                                                            onCheckedChange={(c) => setCalcData({ ...calcData, is_manual_video: c })}
                                                        />
                                                    </div>
                                                </div>
                                                {!calcData.is_manual_video ? (
                                                    <Select value={calcData.video_model} onValueChange={(v) => setCalcData({ ...calcData, video_model: v })}>
                                                        <SelectTrigger className="bg-zinc-900 border-white/10 h-10 text-zinc-200">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                            {Object.entries(VIDEO_PRICING_CONFIG[calcData.provider] || {}).map(([id, cfg]: [string, any]) => (
                                                                <SelectItem key={id} value={id}>{cfg.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <div className="relative">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={calcData.real_cost_usd_video}
                                                            onChange={(e) => setCalcData({ ...calcData, real_cost_usd_video: parseFloat(e.target.value) || 0 })}
                                                            className="bg-zinc-900 border-indigo-500/50 h-10 pr-12"
                                                        />
                                                        <span className="absolute right-3 top-2.5 text-[10px] text-zinc-500">$/sec</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label>Duration (Seconds)</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        value={calcData.duration_seconds}
                                                        onChange={(e) => setCalcData({ ...calcData, duration_seconds: parseInt(e.target.value) || 1 })}
                                                        className="bg-zinc-900 border-white/10 h-10 flex-1"
                                                    />
                                                    <Button variant="outline" className="h-10 px-3 border-white/5 bg-zinc-900 text-[10px]" onClick={() => setCalcData({ ...calcData, duration_seconds: 5 })}>5s</Button>
                                                    <Button variant="outline" className="h-10 px-3 border-white/5 bg-zinc-900 text-[10px]" onClick={() => setCalcData({ ...calcData, duration_seconds: 10 })}>10s</Button>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label>Resolution</Label>
                                                <Select
                                                    value={calcData.video_resolution}
                                                    onValueChange={(v) => setCalcData({ ...calcData, video_resolution: v })}
                                                >
                                                    <SelectTrigger className="bg-zinc-900 border-white/10 h-10">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        <SelectItem value="1080p">1080p</SelectItem>
                                                        <SelectItem value="4k">4K / Ultra</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-white/5">
                                                <div className="space-y-0.5">
                                                    <Label className="text-xs font-medium text-zinc-300">Audio Overlay</Label>
                                                    <p className="text-[10px] text-zinc-500">Enable sound generation</p>
                                                </div>
                                                <Switch
                                                    checked={calcData.audio === 'on'}
                                                    onCheckedChange={(c) => setCalcData({ ...calcData, audio: c ? 'on' : 'off' })}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>Infrastructure Multiplier (%)</Label>
                                                <Input
                                                    type="number"
                                                    value={(calcData.infra_multiplier - 1) * 100}
                                                    onChange={(e) => setCalcData({ ...calcData, infra_multiplier: (parseFloat(e.target.value) / 100) + 1 })}
                                                    className="bg-zinc-900 border-white/10 h-10"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Advanced Configuration</h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 text-[10px]"
                                            onClick={() => setCalcData({ ...calcData, show_advanced: !calcData.show_advanced })}
                                        >
                                            {calcData.show_advanced ? "Hide" : "Show"}
                                        </Button>
                                    </div>

                                    {calcData.show_advanced && (
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5">
                                                    <Label>Exceptional Costs ($)</Label>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <AlertCircle className="w-3 h-3 text-zinc-500 cursor-help" />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="bg-zinc-900 border-white/10 text-[10px] max-w-[200px]">
                                                                Only use for non-standard costs like search, retries, or high-fidelity audio overlays.
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={calcData.extra_costs_usd}
                                                    onChange={(e) => setCalcData({ ...calcData, extra_costs_usd: parseFloat(e.target.value) || 0 })}
                                                    className="bg-zinc-900 border-white/10 h-10"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label>
                                                    {calcData.operation_category === 'video' ? "Risk Multiplier (Override)" : "Risk Multiplier"}
                                                </Label>
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    value={calcData.operation_category === 'video' ? calcData.risk_multiplier_video : RISK_MULTIPLIER_BY_TYPE[calcData.operation_type]}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 1;
                                                        if (calcData.operation_category === 'video') {
                                                            setCalcData({ ...calcData, risk_multiplier_video: val });
                                                        }
                                                    }}
                                                    className="bg-zinc-900 border-white/10 h-10"
                                                    disabled={calcData.operation_category === 'image'}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <Label>Selling Token Price ($)</Label>
                                        <Input
                                            type="number"
                                            step="0.001"
                                            value={calcData.selling_price_token}
                                            onChange={(e) => setCalcData({ ...calcData, selling_price_token: parseFloat(e.target.value) || 0.08 })}
                                            className="bg-zinc-900 border-white/10 h-10"
                                        />
                                        <p className="text-[10px] text-zinc-500">Current market price per token in packages.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Analysis Output */}
                        <div className="space-y-4">
                            {(() => {
                                // CALCULATION LOGIC
                                let realCost = 0;
                                let riskMult = 1.0;

                                if (calcData.operation_category === 'image') {
                                    realCost = calcData.real_cost_usd_image * calcData.resolution_multiplier;
                                    riskMult = RISK_MULTIPLIER_BY_TYPE[calcData.operation_type] || 1.15;
                                } else {
                                    // Video Logic
                                    let costPerSec = 0;
                                    if (calcData.is_manual_video) {
                                        costPerSec = calcData.real_cost_usd_video;
                                    } else {
                                        const modelCfg = VIDEO_PRICING_CONFIG[calcData.provider]?.[calcData.video_model];
                                        costPerSec = modelCfg?.[calcData.video_resolution]?.[calcData.audio] || 0.20;
                                    }
                                    realCost = calcData.duration_seconds * costPerSec;
                                    riskMult = calcData.risk_multiplier_video;
                                }

                                realCost += calcData.extra_costs_usd;

                                const infraAdjusted = realCost * calcData.infra_multiplier;
                                const riskAdjusted = infraAdjusted * riskMult;

                                const minTokens = calcData.operation_category === 'video' ? 5 : 1;
                                const tokensRequired = Math.max(minTokens, Math.ceil(
                                    riskAdjusted / calcData.selling_price_token
                                ));

                                const revenue = tokensRequired * calcData.selling_price_token;
                                // TRUE MARGIN Calculation (using riskAdjusted as true cost)
                                const trueCost = riskAdjusted;
                                const margin = revenue > 0 ? (1 - (trueCost / revenue)) * 100 : 0;
                                const effectiveCostPerToken = realCost / tokensRequired;

                                const warnings = [];
                                if (margin < 40) warnings.push("LOW_TRUE_MARGIN_RISKY");
                                if (tokensRequired < 5 && realCost > 0.50) warnings.push("HIGH_RISK_MODEL_UNDERVALUED");
                                if (calcData.selling_price_token < MIN_TOKEN_PRICE_USD) warnings.push("TOKEN_PRICE_UNPROFITABLE");

                                return (
                                    <>
                                        <Card className="bg-indigo-600 border-none shadow-lg shadow-indigo-900/20 overflow-hidden relative">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <Sparkles className="w-16 h-16" />
                                            </div>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-white text-[10px] uppercase tracking-widest font-bold">Defensive Token Requirement</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-5xl font-black text-white">
                                                    {tokensRequired} <span className="text-sm font-normal opacity-60">tokens</span>
                                                </div>
                                                <p className="text-white/60 text-[9px] mt-2 italic">
                                                    Price Protection: {minTokens === 5 ? "Video Floor Active (5 tkn)" : "Standard Floor Active (1 tkn)"}
                                                </p>
                                            </CardContent>
                                        </Card>

                                        <Card className="bg-card border-white/10">
                                            <CardHeader className="pb-0 pt-4">
                                                <h4 className="text-[10px] text-zinc-500 font-bold uppercase">Balance Sheet</h4>
                                            </CardHeader>
                                            <CardContent className="p-4 space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-zinc-400">Provider Cost (Real):</span>
                                                    <span className="text-white font-mono font-bold">${realCost.toFixed(3)}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-zinc-400">Operational Cost (True):</span>
                                                    <span className="text-zinc-300 font-mono">${trueCost.toFixed(3)}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                                                    <span className="text-sm text-zinc-400">Net Business Margin:</span>
                                                    <span className={`text-lg font-black ${margin < 40 ? 'text-red-400' : margin < 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {margin.toFixed(1)}%
                                                    </span>
                                                </div>

                                                {warnings.length > 0 && (
                                                    <div className="pt-3 border-t border-white/5 space-y-2">
                                                        <p className="text-[10px] uppercase font-bold text-zinc-500">Stability Warnings</p>
                                                        {warnings.map(w => (
                                                            <div key={w} className={`flex items-center gap-2 text-[10px] font-bold py-1.5 px-2 rounded-md ${w.includes('RISKY') || w.includes('UNPROFITABLE') ? 'bg-red-500/10 text-red-400 border border-red-500/10' : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'}`}>
                                                                <AlertCircle className="w-3 h-3" />
                                                                {w.replaceAll('_', ' ')}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        <div className="p-3 rounded-lg bg-zinc-900 border border-white/5 text-[10px] text-zinc-500 leading-relaxed shadow-inner">
                                            <h4 className="font-bold text-zinc-400 mb-1.5 flex items-center gap-2">
                                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                                Business Recommendation
                                            </h4>
                                            {margin < 40 ?
                                                "⚠️ High Risk: The margin doesn't adequately cover operational overhead. Consider increasing tokens or risk-tiering." :
                                                "✅ Sustainable: This model handles infra cost and platform risk while maintaining target profitability."
                                            }
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create/Edit Package Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-card border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPackage ? 'Edit Package' : 'Create Token Package'}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            {editingPackage
                                ? 'Update the package details below.'
                                : 'Create a new token package for users to purchase.'
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Package Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-card border-white/10"
                                placeholder="Pro Pack"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="bg-card border-white/10"
                                placeholder="Best value for professionals"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tokens *</Label>
                                <Input
                                    type="number"
                                    value={formData.tokens}
                                    onChange={(e) => setFormData({ ...formData, tokens: parseInt(e.target.value) || 0 })}
                                    className="bg-card border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Price (USD) *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.price_usd}
                                    onChange={(e) => setFormData({ ...formData, price_usd: parseFloat(e.target.value) || 0 })}
                                    className="bg-card border-white/10"
                                />
                            </div>
                        </div>

                        {/* Plan Type Selector */}
                        <div className="space-y-2">
                            <Label>Plan Type *</Label>
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border ${formData.plan_type === 'individual' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-zinc-800 border-white/10'}`}>
                                    <input
                                        type="radio"
                                        name="plan_type"
                                        value="individual"
                                        checked={formData.plan_type === 'individual'}
                                        onChange={() => setFormData({ ...formData, plan_type: 'individual' })}
                                        className="sr-only"
                                    />
                                    <span className="text-sm">👤 Individual / Creator</span>
                                </label>
                                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border ${formData.plan_type === 'business' ? 'bg-purple-600/20 border-purple-500' : 'bg-zinc-800 border-white/10'}`}>
                                    <input
                                        type="radio"
                                        name="plan_type"
                                        value="business"
                                        checked={formData.plan_type === 'business'}
                                        onChange={() => setFormData({ ...formData, plan_type: 'business' })}
                                        className="sr-only"
                                    />
                                    <span className="text-sm">🏢 Business / Event</span>
                                </label>
                            </div>
                        </div>

                        {/* Validity Days */}
                        <div className="space-y-2">
                            <Label>Validity (Days)</Label>
                            <Input
                                type="number"
                                value={formData.validity_days}
                                onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 30 })}
                                className="bg-card border-white/10 w-32"
                                placeholder="30"
                            />
                            <p className="text-xs text-zinc-500">
                                How long purchased tokens remain valid (0 = never expire)
                            </p>
                        </div>

                        {formData.tokens > 0 && formData.price_usd > 0 && (
                            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                <p className="text-xs text-zinc-400">Price per token:</p>
                                <p className="text-lg font-bold text-indigo-400">
                                    ${(formData.price_usd / formData.tokens).toFixed(4)}
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Stripe Product ID (Optional)</Label>
                                <Input
                                    value={formData.stripe_product_id}
                                    onChange={(e) => setFormData({ ...formData, stripe_product_id: e.target.value })}
                                    className="bg-card border-white/10"
                                    placeholder="prod_..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Stripe Price ID (Optional)</Label>
                                <Input
                                    value={formData.stripe_price_id}
                                    onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                                    className="bg-card border-white/10"
                                    placeholder="price_..."
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 italic">
                            Leave blank to auto-create on next save.
                        </p>

                        <div className="flex items-center justify-between">
                            <Label>Active</Label>
                            <Switch
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            className="border-white/10"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={savePackage}
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            {editingPackage ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
