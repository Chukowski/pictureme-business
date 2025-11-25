import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    Search,
    Filter,
    UserCog,
    Ban,
    Trash2,
    Coins,
    FileText,
    DollarSign,
    Image,
    Video,
    Save,
    Plus,
    X,
    Settings2,
    Building2
} from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface User {
    user_id: number;
    email: string;
    username: string;
    name: string;
    role: string;
    tokens_remaining: number;
    subscription_tier: string;
    is_active: boolean;
    created_at: string;
    uses_custom_pricing: boolean;
    default_price_per_token: number;
    credit_limit: number;
    current_credit_used: number;
    billing_cycle: string;
    contract_start_date: string;
    contract_end_date: string;
    custom_pricing_count: number;
    custom_packages_count: number;
}

interface ModelPricing {
    model_id: string;
    model_type: string;
    default_cost: number;
    description: string;
    custom_pricing_id: number | null;
    custom_cost: number | null;
    price_per_token: number | null;
    notes: string | null;
    custom_is_active: boolean | null;
    effective_cost: number;
    has_custom_pricing: boolean;
}

interface EnterpriseSettings {
    uses_custom_pricing: boolean;
    default_price_per_token: number;
    billing_cycle: string;
    credit_limit: number;
    current_credit_used: number;
    contract_start_date: string;
    contract_end_date: string;
    contract_notes: string;
    billing_email: string;
    billing_contact_name: string;
}

export default function SuperAdminUsers() {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
    const [isTokensDialogOpen, setIsTokensDialogOpen] = useState(false);
    const [modelPricing, setModelPricing] = useState<ModelPricing[]>([]);
    const [enterpriseSettings, setEnterpriseSettings] = useState<EnterpriseSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [tokensToAdd, setTokensToAdd] = useState(0);
    const [tokenReason, setTokenReason] = useState("");

    // Fetch all users
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("auth_token");
            
            // Fetch enterprise users
            const enterpriseRes = await fetch(`${ENV.API_URL}/api/admin/enterprise/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (enterpriseRes.ok) {
                const enterpriseUsers = await enterpriseRes.json();
                setUsers(enterpriseUsers);
            }

            // Also fetch all users for the "All Users" tab
            const allUsersRes = await fetch(`${ENV.API_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (allUsersRes.ok) {
                const allUsersData = await allUsersRes.json();
                setAllUsers(allUsersData);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        } finally {
            setIsLoading(false);
        }
    };

    const openPricingDialog = async (user: User) => {
        setSelectedUser(user);
        setIsPricingDialogOpen(true);
        
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/enterprise/users/${user.user_id}/pricing`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setModelPricing(data.pricing || []);
                setEnterpriseSettings(data.settings || {
                    uses_custom_pricing: false,
                    default_price_per_token: 0.10,
                    billing_cycle: 'monthly',
                    credit_limit: 0,
                    current_credit_used: 0,
                    contract_start_date: '',
                    contract_end_date: '',
                    contract_notes: '',
                    billing_email: '',
                    billing_contact_name: ''
                });
            }
        } catch (error) {
            console.error("Error fetching pricing:", error);
            toast.error("Failed to load pricing data");
        }
    };

    const openTokensDialog = (user: User) => {
        setSelectedUser(user);
        setTokensToAdd(0);
        setTokenReason("");
        setIsTokensDialogOpen(true);
    };

    const handlePricingChange = (modelId: string, field: string, value: number | string) => {
        setModelPricing(prev => prev.map(p => {
            if (p.model_id === modelId) {
                return {
                    ...p,
                    [field]: value,
                    has_custom_pricing: true
                };
            }
            return p;
        }));
    };

    const savePricing = async () => {
        if (!selectedUser) return;
        
        setIsSaving(true);
        try {
            const token = localStorage.getItem("auth_token");
            
            // Save custom pricing for models that have been modified
            const customPricing = modelPricing
                .filter(p => p.has_custom_pricing && p.custom_cost !== null)
                .map(p => ({
                    user_id: selectedUser.user_id,
                    model_id: p.model_id,
                    model_type: p.model_type,
                    token_cost: p.custom_cost || p.effective_cost,
                    price_per_token: p.price_per_token,
                    notes: p.notes
                }));

            if (customPricing.length > 0) {
                const response = await fetch(
                    `${ENV.API_URL}/api/admin/enterprise/users/${selectedUser.user_id}/pricing/bulk`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(customPricing)
                    }
                );

                if (!response.ok) {
                    throw new Error('Failed to save pricing');
                }
            }

            // Save enterprise settings
            if (enterpriseSettings) {
                const settingsResponse = await fetch(
                    `${ENV.API_URL}/api/admin/enterprise/users/${selectedUser.user_id}/settings`,
                    {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(enterpriseSettings)
                    }
                );

                if (!settingsResponse.ok) {
                    throw new Error('Failed to save settings');
                }
            }

            toast.success("Pricing saved successfully");
            setIsPricingDialogOpen(false);
            fetchUsers(); // Refresh the list
        } catch (error) {
            console.error("Error saving pricing:", error);
            toast.error("Failed to save pricing");
        } finally {
            setIsSaving(false);
        }
    };

    const addTokens = async () => {
        if (!selectedUser || tokensToAdd === 0) return;
        
        setIsSaving(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(
                `${ENV.API_URL}/api/admin/enterprise/users/${selectedUser.user_id}/tokens?tokens=${tokensToAdd}&reason=${encodeURIComponent(tokenReason || 'Admin adjustment')}`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to add tokens');
            }

            const data = await response.json();
            toast.success(`Added ${tokensToAdd} tokens. New balance: ${data.new_balance}`);
            setIsTokensDialogOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Error adding tokens:", error);
            toast.error("Failed to add tokens");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const imageModels = modelPricing.filter(p => p.model_type === 'image');
    const videoModels = modelPricing.filter(p => p.model_type === 'video');

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Enterprise Users</h1>
                    <p className="text-zinc-400">Manage enterprise/business users and their custom pricing.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search users..."
                            className="pl-8 bg-zinc-900/50 border-white/10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="border-white/10 bg-zinc-900/50">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-zinc-400">User Info</TableHead>
                            <TableHead className="text-zinc-400">Role/Tier</TableHead>
                            <TableHead className="text-zinc-400">Tokens</TableHead>
                            <TableHead className="text-zinc-400">Custom Pricing</TableHead>
                            <TableHead className="text-zinc-400">Contract</TableHead>
                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                    Loading users...
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                    No enterprise users found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.user_id} className="border-white/10 hover:bg-white/5 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-white">{user.name || 'No name'}</span>
                                            <span className="text-xs text-zinc-500">{user.email}</span>
                                            <span className="text-xs text-zinc-500">@{user.username}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="outline" className={`w-fit
                                                ${user.role === 'enterprise' ? 'border-purple-500 text-purple-400 bg-purple-500/10' :
                                                user.role === 'business' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' :
                                                user.role === 'admin' ? 'border-red-500 text-red-400 bg-red-500/10' :
                                                'border-zinc-700 text-zinc-400'}
                                            `}>
                                                {user.role}
                                            </Badge>
                                            <span className="text-xs text-zinc-500">{user.subscription_tier || 'Free'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 font-mono text-yellow-400">
                                            <Coins className="w-3 h-3" />
                                            {(user.tokens_remaining || 0).toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.uses_custom_pricing ? (
                                            <div className="flex flex-col gap-1">
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 w-fit">
                                                    Custom Pricing
                                                </Badge>
                                                <span className="text-xs text-zinc-500">
                                                    {user.custom_pricing_count} model(s)
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-zinc-500">Standard pricing</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {user.contract_end_date ? (
                                            <div className="text-xs text-zinc-500">
                                                <p>Ends: {new Date(user.contract_end_date).toLocaleDateString()}</p>
                                                <p className="text-zinc-600">{user.billing_cycle}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-zinc-600">No contract</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem 
                                                    onClick={() => openPricingDialog(user)} 
                                                    className="focus:bg-white/10 cursor-pointer"
                                                >
                                                    <DollarSign className="mr-2 h-4 w-4" /> Set Custom Pricing
                                                </DropdownMenuItem>
                                                <DropdownMenuItem 
                                                    onClick={() => openTokensDialog(user)} 
                                                    className="focus:bg-white/10 cursor-pointer"
                                                >
                                                    <Coins className="mr-2 h-4 w-4" /> Add Tokens
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-white/10" />
                                                <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
                                                    <UserCog className="mr-2 h-4 w-4" /> View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="focus:bg-white/10 cursor-pointer">
                                                    <FileText className="mr-2 h-4 w-4" /> View Transactions
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Custom Pricing Dialog */}
            <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-400" />
                            Custom Pricing for {selectedUser?.name || selectedUser?.username}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Set custom token costs per model for this enterprise user.
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="pricing" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-zinc-800/50">
                            <TabsTrigger value="pricing">Model Pricing</TabsTrigger>
                            <TabsTrigger value="packages">Token Packages</TabsTrigger>
                            <TabsTrigger value="settings">Settings</TabsTrigger>
                        </TabsList>

                        {/* Model Pricing Tab */}
                        <TabsContent value="pricing" className="space-y-6 mt-4">
                            {/* Image Models */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Image className="w-4 h-4 text-emerald-400" />
                                    Image Models
                                </h3>
                                <div className="grid gap-3">
                                    {imageModels.map((model) => (
                                        <div 
                                            key={model.model_id} 
                                            className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-white/5"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-white">{model.model_id}</p>
                                                <p className="text-xs text-zinc-500">{model.description}</p>
                                                <p className="text-xs text-zinc-600">Default: {model.default_cost} tokens</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-zinc-500">Tokens:</Label>
                                                        <Input
                                                            type="number"
                                                            value={model.custom_cost ?? model.default_cost}
                                                            onChange={(e) => handlePricingChange(model.model_id, 'custom_cost', parseInt(e.target.value) || 0)}
                                                            className="w-20 h-8 bg-zinc-950 border-white/10 text-center"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-zinc-500">$/token:</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={model.price_per_token ?? ''}
                                                            placeholder="0.20"
                                                            onChange={(e) => handlePricingChange(model.model_id, 'price_per_token', parseFloat(e.target.value) || 0)}
                                                            className="w-20 h-8 bg-zinc-950 border-white/10 text-center"
                                                        />
                                                    </div>
                                                </div>
                                                {model.has_custom_pricing && (
                                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                                        Custom
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Video Models */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                                    <Video className="w-4 h-4 text-purple-400" />
                                    Video Models
                                </h3>
                                <div className="grid gap-3">
                                    {videoModels.map((model) => (
                                        <div 
                                            key={model.model_id} 
                                            className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-white/5"
                                        >
                                            <div className="flex-1">
                                                <p className="font-medium text-white">{model.model_id}</p>
                                                <p className="text-xs text-zinc-500">{model.description}</p>
                                                <p className="text-xs text-zinc-600">Default: {model.default_cost} tokens</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-zinc-500">Tokens:</Label>
                                                        <Input
                                                            type="number"
                                                            value={model.custom_cost ?? model.default_cost}
                                                            onChange={(e) => handlePricingChange(model.model_id, 'custom_cost', parseInt(e.target.value) || 0)}
                                                            className="w-20 h-8 bg-zinc-950 border-white/10 text-center"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs text-zinc-500">$/token:</Label>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={model.price_per_token ?? ''}
                                                            placeholder="0.20"
                                                            onChange={(e) => handlePricingChange(model.model_id, 'price_per_token', parseFloat(e.target.value) || 0)}
                                                            className="w-20 h-8 bg-zinc-950 border-white/10 text-center"
                                                        />
                                                    </div>
                                                </div>
                                                {model.has_custom_pricing && (
                                                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                                        Custom
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        {/* Token Packages Tab */}
                        <TabsContent value="packages" className="space-y-4 mt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-zinc-400">Custom token packages for this user</p>
                                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                                    <Plus className="w-4 h-4 mr-1" /> Add Package
                                </Button>
                            </div>
                            <div className="p-8 text-center text-zinc-500 border border-dashed border-white/10 rounded-lg">
                                <Coins className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                                <p>No custom packages yet</p>
                                <p className="text-xs">Create custom token packages with special pricing</p>
                            </div>
                        </TabsContent>

                        {/* Settings Tab */}
                        <TabsContent value="settings" className="space-y-4 mt-4">
                            {enterpriseSettings && (
                                <div className="grid gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-zinc-400">Default $/Token</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={enterpriseSettings.default_price_per_token}
                                                onChange={(e) => setEnterpriseSettings({
                                                    ...enterpriseSettings,
                                                    default_price_per_token: parseFloat(e.target.value) || 0
                                                })}
                                                className="bg-zinc-950 border-white/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-400">Credit Limit</Label>
                                            <Input
                                                type="number"
                                                value={enterpriseSettings.credit_limit}
                                                onChange={(e) => setEnterpriseSettings({
                                                    ...enterpriseSettings,
                                                    credit_limit: parseInt(e.target.value) || 0
                                                })}
                                                className="bg-zinc-950 border-white/10"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-zinc-400">Contract Start</Label>
                                            <Input
                                                type="date"
                                                value={enterpriseSettings.contract_start_date || ''}
                                                onChange={(e) => setEnterpriseSettings({
                                                    ...enterpriseSettings,
                                                    contract_start_date: e.target.value
                                                })}
                                                className="bg-zinc-950 border-white/10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-zinc-400">Contract End</Label>
                                            <Input
                                                type="date"
                                                value={enterpriseSettings.contract_end_date || ''}
                                                onChange={(e) => setEnterpriseSettings({
                                                    ...enterpriseSettings,
                                                    contract_end_date: e.target.value
                                                })}
                                                className="bg-zinc-950 border-white/10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400">Billing Email</Label>
                                        <Input
                                            type="email"
                                            value={enterpriseSettings.billing_email || ''}
                                            onChange={(e) => setEnterpriseSettings({
                                                ...enterpriseSettings,
                                                billing_email: e.target.value
                                            })}
                                            className="bg-zinc-950 border-white/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400">Contract Notes</Label>
                                        <textarea
                                            value={enterpriseSettings.contract_notes || ''}
                                            onChange={(e) => setEnterpriseSettings({
                                                ...enterpriseSettings,
                                                contract_notes: e.target.value
                                            })}
                                            className="w-full h-24 px-3 py-2 bg-zinc-950 border border-white/10 rounded-md text-white resize-none"
                                            placeholder="Notes about this contract..."
                                        />
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6">
                        <Button 
                            variant="outline" 
                            onClick={() => setIsPricingDialogOpen(false)}
                            className="border-white/10"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={savePricing}
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSaving ? (
                                <>Saving...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Save Pricing</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Tokens Dialog */}
            <Dialog open={isTokensDialogOpen} onOpenChange={setIsTokensDialogOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Coins className="w-5 h-5 text-yellow-400" />
                            Add Tokens to {selectedUser?.name || selectedUser?.username}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Current balance: {selectedUser?.tokens_remaining?.toLocaleString() || 0} tokens
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Tokens to Add</Label>
                            <Input
                                type="number"
                                value={tokensToAdd}
                                onChange={(e) => setTokensToAdd(parseInt(e.target.value) || 0)}
                                className="bg-zinc-950 border-white/10"
                                placeholder="10000"
                            />
                            <p className="text-xs text-zinc-500">
                                Use negative numbers to subtract tokens
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Reason</Label>
                            <Input
                                value={tokenReason}
                                onChange={(e) => setTokenReason(e.target.value)}
                                className="bg-zinc-950 border-white/10"
                                placeholder="Enterprise package purchase"
                            />
                        </div>
                        
                        {/* Quick add buttons */}
                        <div className="flex flex-wrap gap-2">
                            {[1000, 5000, 10000, 50000].map((amount) => (
                                <Button
                                    key={amount}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setTokensToAdd(amount)}
                                    className="border-white/10 hover:bg-white/5"
                                >
                                    +{amount.toLocaleString()}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsTokensDialogOpen(false)}
                            className="border-white/10"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={addTokens}
                            disabled={isSaving || tokensToAdd === 0}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isSaving ? 'Adding...' : `Add ${tokensToAdd.toLocaleString()} Tokens`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
