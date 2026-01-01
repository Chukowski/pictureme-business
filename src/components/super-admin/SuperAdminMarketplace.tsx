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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Upload,
    Edit,
    Trash2,
    UserPlus,
    Link as LinkIcon,
    Eye,
    EyeOff,
    RefreshCw,
    Loader2,
    ShoppingBag,
    Download,
    Search,
    AlertCircle,
    Copy,
    Save,
    CheckCircle,
    XCircle,
    Clock,
    Image as ImageIcon,
    Star
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    adminGetTemplates,
    adminCreateTemplate,
    adminUpdateTemplate,
    adminDeleteTemplate,
    adminAssignTemplate,
    MarketplaceTemplate
} from "@/services/marketplaceApi";
import { addFeaturedTemplate } from "@/services/contentApi";
import { toast } from "sonner";
import { ENV } from "@/config/env";
import { AI_MODELS } from "@/services/aiProcessor";

export default function SuperAdminMarketplace() {
    const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Dialog states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    // Selected data for modals
    const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
    const [importJson, setImportJson] = useState("");
    const [targetUserId, setTargetUserId] = useState("");
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState("");

    // Form state for create/edit
    const [formData, setFormData] = useState<Partial<MarketplaceTemplate>>({
        name: "",
        description: "",
        template_type: "individual",
        media_type: "image",
        category: "portrait",
        price: 0,
        tokens_cost: 0,
        is_public: false,
        is_premium: false,
        is_exportable: true,
        ai_model: "seedream-v4",
        prompt: "",
        negative_prompt: "",
        preview_images: [],
        tags: [],
        status: "published"
    });

    useEffect(() => {
        fetchTemplates();
        fetchUsers();
    }, []);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const data = await adminGetTemplates();
            setTemplates(data);
        } catch (error) {
            console.error("Error fetching templates:", error);
            toast.error("Failed to load templates");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/users?limit=100`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAllUsers(data.users || []);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const handleCreate = async () => {
        if (!formData.name) {
            toast.error("Template name is required");
            return;
        }
        setIsSaving(true);
        try {
            await adminCreateTemplate(formData);
            toast.success("Template created successfully");
            setIsCreateOpen(false);
            fetchTemplates();
            resetForm();
        } catch (error) {
            toast.error("Failed to create template");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedTemplate) return;
        setIsSaving(true);
        try {
            await adminUpdateTemplate(selectedTemplate.id, formData);
            toast.success("Template updated successfully");
            setIsEditDialogOpen(false);
            fetchTemplates();
        } catch (error) {
            toast.error("Failed to update template");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this template?")) return;
        try {
            await adminDeleteTemplate(id);
            toast.success("Template deleted");
            fetchTemplates();
        } catch (error) {
            toast.error("Failed to delete template");
        }
    };

    const handleImportJson = async () => {
        try {
            const parsed = JSON.parse(importJson);
            if (Array.isArray(parsed)) {
                // Bulk import if array
                for (const t of parsed) {
                    await adminCreateTemplate(t);
                }
                toast.success(`Imported ${parsed.length} templates`);
            } else {
                await adminCreateTemplate(parsed);
                toast.success("Template imported successfully");
            }
            setIsImportOpen(false);
            setImportJson("");
            fetchTemplates();
        } catch (error: any) {
            toast.error("Invalid JSON or import failed: " + error.message);
        }
    };

    const handleAssign = async () => {
        if (!targetUserId || !selectedTemplate) return;
        setIsSaving(true);
        try {
            await adminAssignTemplate(targetUserId, selectedTemplate.id);
            toast.success("Template assigned to user library");
            setIsAssignOpen(false);
        } catch (error) {
            toast.error("Failed to assign template");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFeatureOnHome = async (template: MarketplaceTemplate) => {
        try {
            await addFeaturedTemplate({
                template_id: template.id,
                template_name: template.name,
                template_type: template.template_type,
                thumbnail_url: template.preview_url || template.backgrounds?.[0]
            });
            toast.success(`${template.name} added to home featured styles!`);
        } catch (error) {
            toast.error("Failed to feature template on home");
        }
    };

    const updateStatus = async (template: MarketplaceTemplate, newStatus: MarketplaceTemplate['status']) => {
        try {
            await adminUpdateTemplate(template.id, { status: newStatus });
            toast.success(`Template status updated to ${newStatus}`);
            fetchTemplates();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const togglePublic = async (template: MarketplaceTemplate) => {
        try {
            await adminUpdateTemplate(template.id, { is_public: !template.is_public });
            toast.success(template.is_public ? "Template unpublished" : "Template published");
            fetchTemplates();
        } catch (error) {
            toast.error("Failed to update visibility");
        }
    };

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            template_type: "individual",
            media_type: "image",
            category: "portrait",
            price: 0,
            tokens_cost: 0,
            is_public: false,
            is_premium: false,
            is_exportable: true,
            ai_model: "seedream-v4",
            prompt: "",
            negative_prompt: "",
            preview_images: [],
            tags: [],
            status: "published"
        });
    };

    const getModelLabel = (modelId: string) => {
        if (!modelId) return "—";
        const allModels = Object.values(AI_MODELS);
        const found = allModels.find(m => (m as any).id === modelId || (m as any).shortId === modelId);
        return found ? (found as any).name : modelId;
    };

    const getThumbnail = (item: MarketplaceTemplate) => {
        return item.preview_url || item.backgrounds?.[0] || item.preview_images?.[0];
    };

    const openEdit = (template: MarketplaceTemplate) => {
        setSelectedTemplate(template);
        // Legacy Healing: If template_type is image/video, it's a legacy type mismatch
        let tier = template.template_type;
        let media = template.media_type || 'image';

        if (tier === 'image' || tier === 'video' || tier === 'workflow') {
            media = tier as any;
            tier = 'individual';
        }

        setFormData({
            name: template.name,
            description: template.description,
            template_type: tier || "individual",
            media_type: media,
            category: template.category,
            price: template.price,
            tokens_cost: template.tokens_cost,
            is_public: template.is_public,
            is_premium: template.is_premium,
            is_exportable: template.is_exportable,
            ai_model: template.ai_model,
            prompt: template.prompt || "",
            negative_prompt: template.negative_prompt || "",
            preview_images: template.preview_images || [],
            tags: template.tags || [],
            status: template.status || "published",
            _rev: template._rev
        });
        setIsEditDialogOpen(true);
    };

    const copyJson = (template: MarketplaceTemplate) => {
        // Remove DB internal fields for export
        const exportData = { ...template };
        delete (exportData as any)._id;
        delete (exportData as any)._rev;
        delete (exportData as any).id;

        navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
        toast.success("JSON copied to clipboard");
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUsers = allUsers.filter(u =>
        u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.name || "").toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.id || "").toString().includes(userSearchTerm)
    ).slice(0, 10);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Marketplace Manager</h1>
                    <p className="text-zinc-400">Manage templates, prompt packs, and community contributions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsImportOpen(true)}
                        className="bg-card border-white/10 hover:bg-zinc-800"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Import JSON
                    </Button>
                    <Button
                        variant="default"
                        onClick={() => { resetForm(); setIsCreateOpen(true); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New
                    </Button>
                </div>
            </div>

            {/* Stats & Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search templates by name, ID or category..."
                        className="pl-10 bg-card border-white/10 text-white h-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    className="h-10 border-white/10 bg-card"
                    onClick={fetchTemplates}
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            <div className="rounded-xl border border-white/5 bg-card/50 backdrop-blur-sm overflow-hidden min-h-[400px]">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-zinc-400">Template</TableHead>
                            <TableHead className="text-zinc-400">Tier</TableHead>
                            <TableHead className="text-zinc-400">Media</TableHead>
                            <TableHead className="text-zinc-400">Category</TableHead>
                            <TableHead className="text-zinc-400">Model</TableHead>
                            <TableHead className="text-zinc-400">Price ($)</TableHead>
                            <TableHead className="text-zinc-400">Cost (Tokens)</TableHead>
                            <TableHead className="text-zinc-400">Stats</TableHead>
                            <TableHead className="text-zinc-400 text-center">Status</TableHead>
                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-20 text-zinc-500">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                                    Loading templates...
                                </TableCell>
                            </TableRow>
                        ) : filteredTemplates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-20 text-zinc-500">
                                    <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
                                    No templates found match your search.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTemplates.map((item) => (
                                <TableRow key={item.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                                                {getThumbnail(item) ? (
                                                    <img
                                                        src={getThumbnail(item)}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                        <ImageIcon className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-medium text-white">{item.name}</span>
                                                    {item.tags?.includes('featured') && (
                                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-mono text-zinc-500 uppercase">{item.id}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`text-[10px] uppercase ${item.template_type === 'business' ? 'border-purple-500/50 text-purple-400' : 'border-blue-500/50 text-blue-400'}`}>
                                            {(item.template_type === 'image' || item.template_type === 'video' || item.template_type === 'workflow') ? 'individual' : (item.template_type || 'individual')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="text-[10px] uppercase bg-zinc-800 text-zinc-300 border-0">
                                            {item.media_type || ((item.template_type === 'image' || item.template_type === 'video' || item.template_type === 'workflow') ? item.template_type : 'image')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 uppercase">
                                            {item.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-zinc-400 font-medium">{getModelLabel(item.ai_model || "")}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-emerald-400 font-mono font-bold">${item.price || 0}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-yellow-400 font-mono font-bold">{item.tokens_cost}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs text-zinc-500 gap-1">
                                            <div className="flex items-center gap-1">
                                                <Download className="w-3 h-3" />
                                                {item.downloads}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Badge variant="secondary" className="px-1 py-0 h-4 text-[9px]">v1.0</Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            {item.status === 'published' ? (
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] h-5">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Published
                                                </Badge>
                                            ) : item.status === 'pending' ? (
                                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] h-5">
                                                    <Clock className="w-3 h-3 mr-1" /> Pending
                                                </Badge>
                                            ) : item.status === 'rejected' ? (
                                                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] h-5">
                                                    <XCircle className="w-3 h-3 mr-1" /> Rejected
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[10px] h-5">
                                                    Draft
                                                </Badge>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => togglePublic(item)}
                                                className={`h-6 px-2 text-[9px] ${item.is_public ? 'text-emerald-400/70' : 'text-zinc-500'}`}
                                            >
                                                {item.is_public ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                                                {item.is_public ? 'Public' : 'Hidden'}
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {item.status === 'pending' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-500/10"
                                                        onClick={() => updateStatus(item, 'published')}
                                                        title="Approve"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                                                        onClick={() => updateStatus(item, 'rejected')}
                                                        title="Reject"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-zinc-400 hover:bg-white/10"
                                                onClick={() => copyJson(item)}
                                                title="Copy JSON"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-indigo-400 hover:bg-indigo-500/10"
                                                onClick={() => { setSelectedTemplate(item); setIsAssignOpen(true); }}
                                                title="Assign to User"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-amber-400 hover:bg-amber-500/10"
                                                onClick={() => handleFeatureOnHome(item)}
                                                title="Feature on Home"
                                            >
                                                <Star className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-zinc-400 hover:bg-white/10"
                                                onClick={() => openEdit(item)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                                                onClick={() => handleDelete(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit Template Dialog */}
            <Dialog open={isCreateOpen || isEditDialogOpen} onOpenChange={(open) => { if (!open) { setIsCreateOpen(false); setIsEditDialogOpen(false); } }}>
                <DialogContent className="max-w-2xl bg-card border-white/10 text-white max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{isEditDialogOpen ? 'Edit Template' : 'Create New Template'}</DialogTitle>
                        <DialogDescription>
                            Configure the template details and AI generation parameters.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Template Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-card border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger className="bg-card border-white/10">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white">
                                    <SelectItem value="portrait">Portrait</SelectItem>
                                    <SelectItem value="art">Digital Art</SelectItem>
                                    <SelectItem value="photorealistic">Photorealistic</SelectItem>
                                    <SelectItem value="cinematic">Cinematic</SelectItem>
                                    <SelectItem value="anime">Anime</SelectItem>
                                    <SelectItem value="interior">Interior</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label className="text-xs text-zinc-400">Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="bg-card border-white/10 h-20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Template Tier</Label>
                            <Select
                                value={formData.template_type}
                                onValueChange={(val) => setFormData({ ...formData, template_type: val })}
                            >
                                <SelectTrigger className="bg-card border-white/10 text-white">
                                    <SelectValue placeholder="Select Tier" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white">
                                    <SelectItem value="individual">Individual (Regular)</SelectItem>
                                    <SelectItem value="business">Business (Enterprise)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Content Format</Label>
                            <Select
                                value={formData.media_type}
                                onValueChange={(val) => setFormData({ ...formData, media_type: val as any })}
                            >
                                <SelectTrigger className="bg-card border-white/10 text-white">
                                    <SelectValue placeholder="Select Format" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white">
                                    <SelectItem value="image">Image Generation</SelectItem>
                                    <SelectItem value="video">Video Generation</SelectItem>
                                    <SelectItem value="workflow">Workflow (Complex)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">AI Model</Label>
                            <Select
                                value={formData.ai_model}
                                onValueChange={(val) => setFormData({ ...formData, ai_model: val })}
                            >
                                <SelectTrigger className="bg-card border-white/10">
                                    <SelectValue placeholder="Select AI Model" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white">
                                    {Object.values(AI_MODELS).filter(m => m.type === 'image').map(model => (
                                        <SelectItem key={model.id} value={model.id}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{model.name}</span>
                                                <span className="text-[10px] text-zinc-500">{model.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Token Cost</Label>
                            <Input
                                type="number"
                                value={formData.tokens_cost}
                                onChange={(e) => setFormData({ ...formData, tokens_cost: parseInt(e.target.value) || 0 })}
                                className="bg-card border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Price ($ USD)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                className="bg-card border-white/10"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label className="text-xs text-zinc-400">Main Prompt (Use [name] for user subject)</Label>
                            <Textarea
                                value={formData.prompt}
                                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                                className="bg-card border-white/10 h-32 font-mono text-xs"
                                placeholder="A professional portrait of [name] wearing..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-zinc-400">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger className="bg-card border-white/10">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white">
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="pending">Pending Review</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label className="text-xs text-zinc-400">Negative Prompt</Label>
                            <Textarea
                                value={formData.negative_prompt}
                                onChange={(e) => setFormData({ ...formData, negative_prompt: e.target.value })}
                                className="bg-card border-white/10 h-20 font-mono text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-6 col-span-2 bg-zinc-800/50 p-3 rounded">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_public"
                                    checked={formData.is_public}
                                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                                />
                                <Label htmlFor="is_public" className="cursor-pointer">Public Marketplace</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_premium"
                                    checked={formData.is_premium}
                                    onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })}
                                />
                                <Label htmlFor="is_premium" className="cursor-pointer">Premium Only</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_featured"
                                    className="accent-yellow-500"
                                    checked={formData.tags?.includes('featured')}
                                    onChange={(e) => {
                                        const currentTags = formData.tags || [];
                                        if (e.target.checked) {
                                            if (!currentTags.includes('featured')) {
                                                setFormData({ ...formData, tags: [...currentTags, 'featured'] });
                                            }
                                        } else {
                                            setFormData({ ...formData, tags: currentTags.filter(t => t !== 'featured') });
                                        }
                                    }}
                                />
                                <Label htmlFor="is_featured" className="cursor-pointer text-yellow-500 font-medium">Featured Style</Label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => { setIsCreateOpen(false); setIsEditDialogOpen(false); }}>Cancel</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={isSaving}
                            onClick={isEditDialogOpen ? handleUpdate : handleCreate}
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEditDialogOpen ? 'Save Changes' : 'Create Template'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import JSON Dialog */}
            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
                <DialogContent className="max-w-2xl bg-card border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Import Templates (JSON)</DialogTitle>
                        <DialogDescription>
                            Paste a Template JSON object or an array of Templates to import them in bulk.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder='{ "name": "New Template", ... }'
                            className="bg-card border-white/10 h-[400px] font-mono text-[11px]"
                            value={importJson}
                            onChange={(e) => setImportJson(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleImportJson}>
                            Start Import
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign to User Dialog */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent className="bg-card border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Assign Template to User</DialogTitle>
                        <DialogDescription>
                            This will add "{selectedTemplate?.name}" directly to the user's library for free.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                            <Input
                                placeholder="Search user by email or name..."
                                className="pl-10 bg-card border-white/10"
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            {filteredUsers.map(user => (
                                <div
                                    key={user.id}
                                    className={`p-2 rounded cursor-pointer transition-colors ${targetUserId === user.id ? 'bg-indigo-600/20 border border-indigo-500' : 'hover:bg-white/5 border border-transparent'}`}
                                    onClick={() => setTargetUserId(user.id)}
                                >
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-white font-medium">{user.name || user.email}</span>
                                        <span className="text-zinc-500 text-xs">{user.role}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500">{user.email}</div>
                                </div>
                            ))}
                            {filteredUsers.length === 0 && <p className="text-center py-4 text-zinc-600 text-sm">No users found</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={!targetUserId || isSaving}
                            onClick={handleAssign}
                        >
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Assign Now
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
