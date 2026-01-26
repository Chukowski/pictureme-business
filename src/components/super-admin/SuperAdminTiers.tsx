import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    MoreHorizontal,
    Search,
    Plus,
    Loader2,
    Layers,
    Trash2,
    Edit2,
    CheckCircle2,
    XCircle,
    Save
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ENV } from "@/config/env";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have this
import { Switch } from "@/components/ui/switch"; // Assuming you have this

interface Tier {
    id: string;
    name: string;
    code: string;
    price: number;
    currency: string;
    token_limit: number;
    features: string[];
    category: string;
    highlight: string;
    is_active: boolean;
    stripe_price_id?: string;
    stripe_product_id?: string;
    created_at: string;
    updated_at: string;
}

export default function SuperAdminTiers() {
    const [tiers, setTiers] = useState<Tier[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTier, setEditingTier] = useState<Tier | null>(null);

    const [form, setForm] = useState({
        name: "",
        code: "",
        price: 0,
        tokenLimit: 0,
        featuresText: "",
        category: "individual",
        highlight: "",
        isActive: true,
        stripePriceId: "",
        stripeProductId: ""
    });

    useEffect(() => {
        fetchTiers();
    }, []);

    const fetchTiers = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/tiers`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTiers(data || []);
            } else {
                toast.error("Failed to fetch tiers");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error fetching tiers");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (tier: Tier) => {
        setEditingTier(tier);
        setForm({
            name: tier.name,
            code: tier.code,
            price: tier.price,
            tokenLimit: tier.token_limit,
            featuresText: Array.isArray(tier.features) ? tier.features.join("\n") : "",
            category: tier.category || "individual",
            highlight: tier.highlight || "",
            isActive: tier.is_active,
            stripePriceId: tier.stripe_price_id || "",
            stripeProductId: tier.stripe_product_id || ""
        });
        setIsDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingTier(null);
        setForm({
            name: "",
            code: "",
            price: 0,
            tokenLimit: 0,
            featuresText: "",
            category: "individual",
            highlight: "",
            isActive: true,
            stripePriceId: "",
            stripeProductId: ""
        });
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem("auth_token");
            const url = editingTier
                ? `${ENV.API_URL}/api/admin/tiers/${editingTier.id}`
                : `${ENV.API_URL}/api/admin/tiers`;

            const method = editingTier ? 'PUT' : 'POST';

            // Parse features
            const features = form.featuresText.split('\n').map(f => f.trim()).filter(f => f !== "");

            const body = {
                name: form.name,
                code: form.code,
                price: Number(form.price),
                tokenLimit: Number(form.tokenLimit),
                features: features,
                category: form.category,
                highlight: form.highlight,
                isActive: form.isActive,
                stripePriceId: form.stripePriceId,
                stripeProductId: form.stripeProductId
            };

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error("Failed to save tier");

            toast.success(editingTier ? "Tier updated" : "Tier created");
            setIsDialogOpen(false);
            fetchTiers();
        } catch (error) {
            console.error(error);
            toast.error("Error saving tier");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This action cannot be undone.")) return;

        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/tiers/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                toast.success("Tier deleted");
                fetchTiers();
            } else {
                toast.error("Failed to delete tier");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error deleting tier");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Subscription Tiers</h1>
                    <p className="text-sm text-zinc-400">Manage pricing plans and feature sets.</p>
                </div>
                <Button
                    onClick={handleCreate}
                    className="bg-white text-black hover:bg-zinc-200 font-medium"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Tier
                </Button>
            </div>

            <Card className="bg-card border-white/5 shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 h-10">Name / Code</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 h-10">Price</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 h-10">Category</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 h-10">Tokens</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 h-10">Features</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 h-10">Status</TableHead>
                                <TableHead className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 h-10 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-500 mb-2" />
                                        <p className="text-zinc-500 text-xs">Loading tiers...</p>
                                    </TableCell>
                                </TableRow>
                            ) : tiers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <Layers className="w-10 h-10 mx-auto text-zinc-800 mb-3" />
                                        <p className="text-zinc-400 font-medium text-sm">No tiers found</p>
                                        <p className="text-zinc-600 text-xs mt-1">Create your first subscription tier to get started.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tiers.map((tier) => (
                                    <TableRow key={tier.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <TableCell className="py-3">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm text-zinc-200">{tier.name}</span>
                                                <span className="text-[10px] font-mono text-zinc-500">{tier.code}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-sm text-zinc-300">
                                                ${tier.price.toFixed(2)}
                                            </span>
                                            <span className="text-[10px] text-zinc-600 ml-1">/mo</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-zinc-800 text-zinc-400 capitalize text-[10px] font-normal px-2 py-0 h-5">
                                                {tier.category}
                                            </Badge>
                                            {tier.highlight && (
                                                <div className="text-[10px] text-indigo-400 mt-1">{tier.highlight}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-zinc-800 bg-card/50 text-zinc-400 text-[10px] font-mono px-2 py-0 h-5">
                                                {tier.token_limit.toLocaleString()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                                {Array.isArray(tier.features) && tier.features.slice(0, 3).map((f, i) => (
                                                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-card text-zinc-500 border border-zinc-800">
                                                        {f}
                                                    </span>
                                                ))}
                                                {Array.isArray(tier.features) && tier.features.length > 3 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 text-zinc-600">
                                                        +{tier.features.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {tier.is_active ? (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                                    <span className="text-xs text-zinc-400">Active</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                                    <span className="text-xs text-zinc-600">Inactive</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-7 w-7 p-0 hover:bg-white/5 text-zinc-400 hover:text-white">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-card border-white/10 text-zinc-300 w-32">
                                                    <DropdownMenuItem
                                                        onClick={() => handleEdit(tier)}
                                                        className="cursor-pointer text-xs focus:bg-white/5 focus:text-white my-0.5"
                                                    >
                                                        <Edit2 className="w-3 h-3 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-white/5" />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(tier.id)}
                                                        className="cursor-pointer text-red-400 text-xs focus:bg-red-500/10 focus:text-red-300 my-0.5"
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-card border-zinc-800 text-white sm:max-w-[450px] p-0 overflow-hidden gap-0">
                    <DialogHeader className="px-6 py-4 border-b border-white/5 bg-card/50">
                        <DialogTitle className="text-base font-semibold">{editingTier ? "Edit Tier" : "Create New Tier"}</DialogTitle>
                        <DialogDescription className="text-xs text-zinc-500 mt-1">
                            Configure the pricing, limits, and features for this subscription tier.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="name" className="text-xs text-zinc-400">Display Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. Gold Plan"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="bg-[#101112] border-zinc-800 h-9 text-sm focus-visible:ring-indigo-500/50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="code" className="text-xs text-zinc-400">System Code</Label>
                                <Input
                                    id="code"
                                    placeholder="e.g. gold_plan"
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                                    className="bg-[#101112] border-zinc-800 h-9 text-sm focus-visible:ring-indigo-500/50"
                                    disabled={!!editingTier} // Codes should be immutable usually
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="price" className="text-xs text-zinc-400">Monthly Price ($)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) })}
                                    className="bg-[#101112] border-zinc-800 h-9 text-sm focus-visible:ring-indigo-500/50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="tokens" className="text-xs text-zinc-400">Token Limit</Label>
                                <Input
                                    id="tokens"
                                    type="number"
                                    min="0"
                                    value={form.tokenLimit}
                                    onChange={(e) => setForm({ ...form, tokenLimit: parseInt(e.target.value) })}
                                    className="bg-[#101112] border-zinc-800 h-9 text-sm focus-visible:ring-indigo-500/50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-zinc-400">Category</Label>
                                <Select
                                    value={form.category}
                                    onValueChange={(val) => setForm({ ...form, category: val })}
                                >
                                    <SelectTrigger className="bg-[#101112] border-zinc-800 h-9 text-sm focus:ring-indigo-500/50">
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-zinc-800 text-zinc-300">
                                        <SelectItem value="individual">Individual</SelectItem>
                                        <SelectItem value="business">Business</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="highlight" className="text-xs text-zinc-400">Highlight Tag (Optional)</Label>
                                <Input
                                    id="highlight"
                                    placeholder="e.g. Most Popular"
                                    value={form.highlight}
                                    onChange={(e) => setForm({ ...form, highlight: e.target.value })}
                                    className="bg-[#101112] border-zinc-800 h-9 text-sm focus-visible:ring-indigo-500/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="features" className="text-xs text-zinc-400">Features (One per line)</Label>
                            <Textarea
                                id="features"
                                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                                value={form.featuresText}
                                onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
                                className="bg-[#101112] border-zinc-800 min-h-[100px] text-sm focus-visible:ring-indigo-500/50 resize-none p-3"
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-white/5">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-medium text-zinc-300">Active Status</Label>
                                <p className="text-[10px] text-zinc-500">
                                    Inactive tiers cannot be selected by new users.
                                </p>
                            </div>
                            <Switch
                                checked={form.isActive}
                                onCheckedChange={(c) => setForm({ ...form, isActive: c })}
                            />
                        </div>

                        {/* Stripe Info (Developer) */}
                        <div className="pt-4 border-t border-white/5 space-y-4">
                            <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Advanced (Stripe)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-500">Product ID</Label>
                                    <Input
                                        value={form.stripeProductId}
                                        onChange={(e) => setForm({ ...form, stripeProductId: e.target.value })}
                                        className="bg-[#101112] border-zinc-900 h-7 text-[10px] text-zinc-400 font-mono"
                                        placeholder="prod_..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-zinc-500">Price ID</Label>
                                    <Input
                                        value={form.stripePriceId}
                                        onChange={(e) => setForm({ ...form, stripePriceId: e.target.value })}
                                        className="bg-[#101112] border-zinc-900 h-7 text-[10px] text-zinc-400 font-mono"
                                        placeholder="price_..."
                                    />
                                </div>
                            </div>
                            <p className="text-[9px] text-zinc-600 italic">
                                Leave blank to auto-create on next save. Changing existing IDs will reconnect this tier to a different Stripe product.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 border-t border-white/5 bg-card/50 sm:justify-between items-center">
                        <Button
                            variant="ghost"
                            onClick={() => setIsDialogOpen(false)}
                            className="text-zinc-500 hover:text-white hover:bg-transparent px-0 h-auto text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-white text-black hover:bg-zinc-200 h-8 rounded-md px-4 text-xs font-semibold"
                        >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Save className="w-3 h-3 mr-2" />}
                            {editingTier ? "Save Changes" : "Create Tier"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
