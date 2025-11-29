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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    Building2,
    RefreshCw,
    Loader2,
    Shield,
    User,
    Crown
} from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface User {
    id: string | number;
    user_id?: number;
    email: string;
    username?: string;
    name?: string;
    full_name?: string;
    role: string;
    tokens_remaining?: number;
    subscription_tier?: string;
    is_active?: boolean;
    created_at?: string;
    uses_custom_pricing?: boolean;
    default_price_per_token?: number;
    credit_limit?: number;
    current_credit_used?: number;
    billing_cycle?: string;
    contract_start_date?: string;
    contract_end_date?: string;
    custom_pricing_count?: number;
    custom_packages_count?: number;
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

const ROLE_OPTIONS = [
    { value: 'user', label: 'User', color: 'border-zinc-500 text-zinc-400' },
    { value: 'business', label: 'Business', color: 'border-blue-500 text-blue-400 bg-blue-500/10' },
    { value: 'business_masters', label: 'Business Masters', color: 'border-indigo-500 text-indigo-400 bg-indigo-500/10' },
    { value: 'enterprise', label: 'Enterprise', color: 'border-purple-500 text-purple-400 bg-purple-500/10' },
    { value: 'admin', label: 'Admin', color: 'border-orange-500 text-orange-400 bg-orange-500/10' },
    { value: 'superadmin', label: 'Super Admin', color: 'border-red-500 text-red-400 bg-red-500/10' },
];

export default function SuperAdminUsers() {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [enterpriseUsers, setEnterpriseUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isPricingDialogOpen, setIsPricingDialogOpen] = useState(false);
    const [isTokensDialogOpen, setIsTokensDialogOpen] = useState(false);
    const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
    const [modelPricing, setModelPricing] = useState<ModelPricing[]>([]);
    const [enterpriseSettings, setEnterpriseSettings] = useState<EnterpriseSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [tokensToAdd, setTokensToAdd] = useState(0);
    const [tokenReason, setTokenReason] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    // Edit user form
    const [editForm, setEditForm] = useState({
        role: "",
        is_active: true,
        tokens_remaining: 0
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("auth_token");
            
            // Fetch all users
            const allUsersRes = await fetch(`${ENV.API_URL}/api/admin/users?limit=100`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (allUsersRes.ok) {
                const data = await allUsersRes.json();
                setUsers(data.users || []);
            }

            // Fetch enterprise users
            const enterpriseRes = await fetch(`${ENV.API_URL}/api/admin/enterprise/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (enterpriseRes.ok) {
                const enterpriseData = await enterpriseRes.json();
                setEnterpriseUsers(enterpriseData);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Failed to load users");
        } finally {
            setIsLoading(false);
        }
    };

    const openPricingDialog = async (user: User) => {
        const userId = user.user_id || user.id;
        setSelectedUser(user);
        setIsPricingDialogOpen(true);
        
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/enterprise/users/${userId}/pricing`, {
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

    const openEditUserDialog = (user: User) => {
        setSelectedUser(user);
        setEditForm({
            role: user.role || 'user',
            is_active: user.is_active !== false,
            tokens_remaining: user.tokens_remaining || 0
        });
        setIsEditUserDialogOpen(true);
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
        const userId = (selectedUser as any).user_id || selectedUser.id;
        
        setIsSaving(true);
        try {
            const token = localStorage.getItem("auth_token");
            
            // Save custom pricing for models that have been modified
            const customPricing = modelPricing
                .filter(p => p.has_custom_pricing && p.custom_cost !== null)
                .map(p => ({
                    user_id: userId,
                    ai_model_id: p.model_id,
                    ai_model_type: p.model_type,
                    token_cost: p.custom_cost || p.effective_cost,
                    price_per_token: p.price_per_token,
                    notes: p.notes
                }));

            if (customPricing.length > 0) {
                const response = await fetch(
                    `${ENV.API_URL}/api/admin/enterprise/users/${userId}/pricing/bulk`,
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
                    `${ENV.API_URL}/api/admin/enterprise/users/${userId}/settings`,
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
            fetchUsers();
        } catch (error) {
            console.error("Error saving pricing:", error);
            toast.error("Failed to save pricing");
        } finally {
            setIsSaving(false);
        }
    };

    const addTokens = async () => {
        if (!selectedUser || tokensToAdd === 0) return;
        const userId = (selectedUser as any).user_id || selectedUser.id;
        
        setIsSaving(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(
                `${ENV.API_URL}/api/admin/enterprise/users/${userId}/tokens?tokens=${tokensToAdd}&reason=${encodeURIComponent(tokenReason || 'Admin adjustment')}`,
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

    const saveUserEdit = async () => {
        if (!selectedUser) return;
        const userId = (selectedUser as any).user_id || selectedUser.id;
        
        setIsSaving(true);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(
                `${ENV.API_URL}/api/admin/users/${userId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify(editForm)
                }
            );

            if (!response.ok) {
                throw new Error('Failed to update user');
            }

            toast.success("User updated successfully");
            setIsEditUserDialogOpen(false);
            fetchUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error("Failed to update user");
        } finally {
            setIsSaving(false);
        }
    };

    const getRoleBadge = (role: string) => {
        const roleConfig = ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[0];
        return (
            <Badge variant="outline" className={roleConfig.color}>
                {roleConfig.label}
            </Badge>
        );
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'superadmin': return <Crown className="w-4 h-4 text-red-400" />;
            case 'admin': return <Shield className="w-4 h-4 text-orange-400" />;
            case 'enterprise': return <Building2 className="w-4 h-4 text-purple-400" />;
            case 'business_masters':
            case 'business': return <UserCog className="w-4 h-4 text-indigo-400" />;
            default: return <User className="w-4 h-4 text-zinc-400" />;
        }
    };

    const filteredUsers = users.filter(user =>
        (user.name || user.full_name || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.username || '')?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredEnterpriseUsers = enterpriseUsers.filter(user =>
        (user.name || '')?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.username || '')?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const imageModels = modelPricing.filter(p => p.model_type === 'image');
    const videoModels = modelPricing.filter(p => p.model_type === 'video');

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">User Management</h1>
                    <p className="text-zinc-400">Manage all users, tokens, and enterprise pricing.</p>
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
                    <Button 
                        variant="outline" 
                        className="border-white/10 bg-zinc-900/50"
                        onClick={fetchUsers}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-zinc-900 border border-white/10">
                    <TabsTrigger value="all">All Users ({users.length})</TabsTrigger>
                    <TabsTrigger value="enterprise">Enterprise ({enterpriseUsers.length})</TabsTrigger>
                </TabsList>

                {/* All Users Tab */}
                <TabsContent value="all" className="space-y-4">
                    <div className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="border-white/10 hover:bg-transparent">
                                    <TableHead className="text-zinc-400">User</TableHead>
                                    <TableHead className="text-zinc-400">Role</TableHead>
                                    <TableHead className="text-zinc-400">Tokens</TableHead>
                                    <TableHead className="text-zinc-400">Status</TableHead>
                                    <TableHead className="text-zinc-400">Joined</TableHead>
                                    <TableHead className="text-right text-zinc-400">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                            No users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <TableRow key={user.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                                        {getRoleIcon(user.role)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-white">
                                                            {user.name || user.full_name || 'No name'}
                                                        </span>
                                                        <span className="text-xs text-zinc-500">{user.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 font-mono text-yellow-400">
                                                    <Coins className="w-3 h-3" />
                                                    {(user.tokens_remaining || 0).toLocaleString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant="outline" 
                                                    className={user.is_active !== false 
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : "bg-red-500/10 text-red-400 border-red-500/20"
                                                    }
                                                >
                                                    {user.is_active !== false ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs text-zinc-500">
                                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem 
                                                            onClick={() => openTokensDialog(user)} 
                                                            className="focus:bg-white/10 cursor-pointer"
                                                        >
                                                            <Coins className="mr-2 h-4 w-4 text-yellow-400" /> Add/Remove Tokens
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            onClick={() => openEditUserDialog(user)} 
                                                            className="focus:bg-white/10 cursor-pointer"
                                                        >
                                                            <UserCog className="mr-2 h-4 w-4" /> Edit User
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-white/10" />
                                                        <DropdownMenuItem 
                                                            onClick={() => openPricingDialog(user)} 
                                                            className="focus:bg-white/10 cursor-pointer"
                                                        >
                                                            <DollarSign className="mr-2 h-4 w-4 text-emerald-400" /> Custom Pricing
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
                </TabsContent>

                {/* Enterprise Users Tab */}
                <TabsContent value="enterprise" className="space-y-4">
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
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredEnterpriseUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                                            No enterprise users found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredEnterpriseUsers.map((user) => (
                                        <TableRow key={user.user_id || user.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white">{user.name || 'No name'}</span>
                                                    <span className="text-xs text-zinc-500">{user.email}</span>
                                                    <span className="text-xs text-zinc-600">@{user.username}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {getRoleBadge(user.role)}
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
                </TabsContent>
            </Tabs>

            {/* Edit User Dialog */}
            <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="w-5 h-5 text-indigo-400" />
                            Edit User: {selectedUser?.name || selectedUser?.email}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Update user role, status, and token balance.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Role</Label>
                            <Select 
                                value={editForm.role} 
                                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                            >
                                <SelectTrigger className="bg-zinc-950 border-white/10">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10">
                                    {ROLE_OPTIONS.map(role => (
                                        <SelectItem key={role.value} value={role.value}>
                                            {role.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-400">Token Balance</Label>
                            <Input
                                type="number"
                                value={editForm.tokens_remaining}
                                onChange={(e) => setEditForm({ ...editForm, tokens_remaining: parseInt(e.target.value) || 0 })}
                                className="bg-zinc-950 border-white/10"
                            />
                            <p className="text-xs text-zinc-500">
                                Set the exact token balance for this user
                            </p>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div>
                                <Label className="text-white">Account Active</Label>
                                <p className="text-xs text-zinc-500">Inactive users cannot log in</p>
                            </div>
                            <Button
                                variant={editForm.is_active ? "default" : "outline"}
                                size="sm"
                                onClick={() => setEditForm({ ...editForm, is_active: !editForm.is_active })}
                                className={editForm.is_active 
                                    ? "bg-emerald-600 hover:bg-emerald-700" 
                                    : "border-red-500/50 text-red-400"
                                }
                            >
                                {editForm.is_active ? 'Active' : 'Inactive'}
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsEditUserDialogOpen(false)}
                            className="border-white/10"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={saveUserEdit}
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Custom Pricing Dialog */}
            <Dialog open={isPricingDialogOpen} onOpenChange={setIsPricingDialogOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-400" />
                            Custom Pricing for {selectedUser?.name || selectedUser?.email}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Set custom token costs per model for this user.
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
                            Add Tokens to {selectedUser?.name || selectedUser?.email}
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
                            {[100, 500, 1000, 5000, 10000, 50000].map((amount) => (
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

                        {tokensToAdd !== 0 && (
                            <div className={`p-3 rounded-lg ${tokensToAdd > 0 ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                                <p className="text-sm">
                                    New balance will be: <strong className={tokensToAdd > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                        {((selectedUser?.tokens_remaining || 0) + tokensToAdd).toLocaleString()} tokens
                                    </strong>
                                </p>
                            </div>
                        )}
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
                            className={tokensToAdd >= 0 ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                        >
                            {isSaving ? 'Processing...' : tokensToAdd >= 0 ? `Add ${tokensToAdd.toLocaleString()} Tokens` : `Remove ${Math.abs(tokensToAdd).toLocaleString()} Tokens`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
