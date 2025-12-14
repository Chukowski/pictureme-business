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
    created_at?: string;
}

interface Transaction {
    id: number;
    user_email: string;
    amount: number;
    tokens: number;
    package_name: string;
    created_at: string;
    status: string;
}

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
        stripe_price_id: ""
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
                // If endpoint doesn't exist, use defaults
                setPackages([
                    { id: 1, name: "Starter Pack", tokens: 100, price_usd: 10, is_active: true },
                    { id: 2, name: "Basic Pack", tokens: 500, price_usd: 40, is_active: true },
                    { id: 3, name: "Pro Pack", tokens: 1000, price_usd: 70, is_active: true },
                    { id: 4, name: "Enterprise Pack", tokens: 5000, price_usd: 300, is_active: true },
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

            const response = await fetch(`${ENV.API_URL}/api/admin/token-transactions?limit=20`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setTransactions(data);
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
            stripe_price_id: ""
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
            stripe_price_id: pkg.stripe_price_id || ""
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Billing & Pricing</h1>
                <p className="text-zinc-400">Manage token packages and view transaction logs.</p>
            </div>

            <Tabs defaultValue="packages" className="space-y-4">
                <TabsList className="bg-zinc-900 border border-white/10">
                    <TabsTrigger value="packages">Token Packages</TabsTrigger>
                    <TabsTrigger value="transactions">Transaction Logs</TabsTrigger>
                    <TabsTrigger value="pricing">Pricing Calculator</TabsTrigger>
                </TabsList>

                {/* Token Packages Tab */}
                <TabsContent value="packages" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Token Packages ({packages.length})</h2>
                        <div className="flex items-center gap-2">
                            {packages.length > 4 && (
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

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-zinc-400">Package</TableHead>
                                        <TableHead className="text-zinc-400">Tokens</TableHead>
                                        <TableHead className="text-zinc-400">Price</TableHead>
                                        <TableHead className="text-zinc-400">$/Token</TableHead>
                                        <TableHead className="text-zinc-400">Status</TableHead>
                                        <TableHead className="text-right text-zinc-400">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {packages.map((pkg) => (
                                        <TableRow key={pkg.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-indigo-500/10">
                                                        <Package className="w-4 h-4 text-indigo-400" />
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
                                                    ${pricePerToken(pkg)}
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
                    )}

                    {/* Info Box */}
                    <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <h3 className="font-medium text-indigo-400 mb-2">💡 About Token Packages</h3>
                        <ul className="text-sm text-zinc-400 space-y-1">
                            <li>• These packages are available for all users to purchase</li>
                            <li>• Enterprise users can have custom packages with special pricing</li>
                            <li>• Deactivated packages won't appear in the store but existing purchases remain valid</li>
                            <li>• Stripe Price ID is optional - if empty, a one-time payment session will be created</li>
                        </ul>
                    </div>
                </TabsContent>

                {/* Transaction Logs Tab */}
                <TabsContent value="transactions" className="space-y-4">
                    <h2 className="text-xl font-semibold">Recent Transactions</h2>
                    <Card className="bg-zinc-900/50 border-white/10">
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
                    <h2 className="text-xl font-semibold">Pricing Calculator</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-zinc-900/50 border-white/10">
                            <CardHeader>
                                <CardTitle>Cost Analysis</CardTitle>
                                <CardDescription>Calculate token pricing based on FAL.ai costs</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>FAL.ai Cost per Image ($)</Label>
                                    <Input
                                        type="number"
                                        step="0.001"
                                        defaultValue="0.02"
                                        className="bg-zinc-950 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tokens per Generation</Label>
                                    <Input
                                        type="number"
                                        defaultValue="1"
                                        className="bg-zinc-950 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Desired Margin (%)</Label>
                                    <Input
                                        type="number"
                                        defaultValue="50"
                                        className="bg-zinc-950 border-white/10"
                                    />
                                </div>
                                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-sm text-zinc-400">Suggested Price per Token:</p>
                                    <p className="text-2xl font-bold text-emerald-400">$0.03</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900/50 border-white/10">
                            <CardHeader>
                                <CardTitle>Package Comparison</CardTitle>
                                <CardDescription>Compare value across packages</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {packages.filter(p => p.is_active).map(pkg => (
                                        <div key={pkg.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                            <div>
                                                <p className="font-medium text-white">{pkg.name}</p>
                                                <p className="text-xs text-zinc-500">{pkg.tokens.toLocaleString()} tokens</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-white">${pkg.price_usd}</p>
                                                <p className="text-xs text-emerald-400">${pricePerToken(pkg)}/token</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Create/Edit Package Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white">
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
                                className="bg-zinc-950 border-white/10"
                                placeholder="Pro Pack"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="bg-zinc-950 border-white/10"
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
                                    className="bg-zinc-950 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Price (USD) *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.price_usd}
                                    onChange={(e) => setFormData({ ...formData, price_usd: parseFloat(e.target.value) || 0 })}
                                    className="bg-zinc-950 border-white/10"
                                />
                            </div>
                        </div>

                        {formData.tokens > 0 && formData.price_usd > 0 && (
                            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                <p className="text-xs text-zinc-400">Price per token:</p>
                                <p className="text-lg font-bold text-indigo-400">
                                    ${(formData.price_usd / formData.tokens).toFixed(4)}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Stripe Price ID (Optional)</Label>
                            <Input
                                value={formData.stripe_price_id}
                                onChange={(e) => setFormData({ ...formData, stripe_price_id: e.target.value })}
                                className="bg-zinc-950 border-white/10"
                                placeholder="price_..."
                            />
                            <p className="text-xs text-zinc-500">
                                Leave empty to use one-time payment sessions
                            </p>
                        </div>

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
