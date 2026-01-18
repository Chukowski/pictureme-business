import { useState, useEffect } from "react";
import { ENV } from "@/config/env";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getUserBooths, createBooth, updateEvent, deleteEvent, EventConfig, User } from "@/services/eventsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Camera, Settings, ArrowRight, Play, Trash2, Image as ImageIcon, Link as LinkIcon, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BoothDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [booths, setBooths] = useState<EventConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // New Booth Form State
    const [newBoothTitle, setNewBoothTitle] = useState("");
    const [newBoothSlug, setNewBoothSlug] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        // Load config to check for default template
        fetch(`${ENV.API_URL}/api/config`)
            .then(res => res.json())
            .then(data => {
                if (data.default_booth_template_id) {
                    setDefaultTemplateId(data.default_booth_template_id);
                }
            })
            .catch(err => console.error("Failed to load config", err));
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (booths.length > 0) {
            const interval = setInterval(() => {
                setActiveImageIndex(prev => prev + 1);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [booths]);

    const loadData = async () => {
        try {
            const currentUser = getCurrentUser();
            if (!currentUser) {
                navigate('/admin/auth');
                return;
            }
            setUser(currentUser);

            const userBooths = await getUserBooths();
            setBooths(userBooths);
        } catch (error) {
            console.error("Failed to load booths", error);
            toast.error("Failed to load your booths");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateBooth = async () => {
        if (!newBoothTitle || !newBoothSlug) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsCreating(true);
        try {
            // Prepare defaults
            let templates: any[] = [];
            let theme = {
                brandName: newBoothTitle,
                mode: 'dark'
            };
            let settings = {
                aiModel: 'nano-banana'
            };

            // If a default template ID is set, fetch it and use it
            if (defaultTemplateId) {
                try {
                    const token = localStorage.getItem('auth_token');
                    const tplRes = await fetch(`${ENV.API_URL}/api/marketplace/templates/${defaultTemplateId}/use`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (tplRes.ok) {
                        const eventTemplate = await tplRes.json();
                        templates = [eventTemplate];
                    }
                } catch (e) {
                    console.warn("Error using default template, using defaults", e);
                }
            }

            const booth = await createBooth({
                title: newBoothTitle,
                slug: newBoothSlug,
                description: "My custom AI photo booth",
                theme: theme,
                settings: settings,
                templates: templates.length > 0 ? templates : undefined
            });

            toast.success("Booth created successfully!");
            setBooths([booth, ...booths]);
            setIsDialogOpen(false);
            setNewBoothTitle("");
            setNewBoothSlug("");

            // Navigate to the booth studio or settings?
            // navigate(`/creator/booth/${booth._id}`);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create booth");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteEvent(deleteId);
            setBooths(booths.filter(b => b._id !== deleteId));
            toast.success("Booth deleted");
        } catch (error) {
            console.error("Failed to delete booth", error);
            toast.error("Failed to delete booth");
        } finally {
            setDeleteId(null);
        }
    };

    const handleToggleActive = async (booth: EventConfig, isActive: boolean) => {
        // Optimistic update
        const updatedBooths = booths.map(b =>
            b._id === booth._id ? { ...b, is_active: isActive } : b
        );
        setBooths(updatedBooths);

        try {
            await updateEvent(booth._id, { is_active: isActive });
            toast.success(`Booth ${isActive ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Failed to update status");
            // Revert on error
            setBooths(booths);
        }
    };

    const copyLink = (slug: string, subPath: string = "") => {
        const url = `${window.location.origin}/${user?.slug || user?.username || 'u'}/${slug}${subPath}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 p-6 md:p-8 max-w-7xl mx-auto">

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white">My Booths</h1>
                    <p className="text-zinc-400 mt-1">Manage your personal AI photo booths</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 shadow-lg shadow-indigo-900/20">
                            <Plus className="w-4 h-4 mr-2" />
                            New Booth
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-white/10 text-white sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create New Booth</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                Give your booth a name and unique URL slug.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                <Label htmlFor="name" className="text-left sm:text-right text-zinc-300">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    value={newBoothTitle}
                                    onChange={(e) => {
                                        setNewBoothTitle(e.target.value);
                                        if (!newBoothSlug) {
                                            setNewBoothSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                        }
                                    }}
                                    className="sm:col-span-3 bg-zinc-800 border-white/10 text-white focus:border-indigo-500"
                                    placeholder="e.g. Summer Party"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                <Label htmlFor="slug" className="text-left sm:text-right text-zinc-300">
                                    URL Slug
                                </Label>
                                <Input
                                    id="slug"
                                    value={newBoothSlug}
                                    onChange={(e) => setNewBoothSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))}
                                    className="sm:col-span-3 bg-zinc-800 border-white/10 text-white focus:border-indigo-500"
                                    placeholder="summer-party"
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Cancel</Button>
                            <Button onClick={handleCreateBooth} disabled={isCreating} className="bg-indigo-600 hover:bg-indigo-700">
                                {isCreating ? 'Creating...' : 'Create Booth'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {booths.length > 0 ? (
                    booths.map(booth => (
                        <Card key={booth._id} className="bg-card border-white/10 hover:border-indigo-500/30 transition-all group overflow-hidden">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <CardTitle className="text-xl font-semibold text-white truncate pr-4">
                                        {booth.title}
                                    </CardTitle>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => navigate(`/creator/booth/${booth._id}/edit`)}>
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-zinc-500 font-mono">/{booth.slug}</p>
                            </CardHeader>
                            <CardContent>
                                <div className="aspect-video bg-zinc-800/50 rounded-lg mb-4 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-all duration-500 relative overflow-hidden">
                                    {(() => {
                                        const templates = booth.templates || [];
                                        const currentTpl = templates[activeImageIndex % templates.length];
                                        const backgroundImage = currentTpl?.images?.[0] || booth.branding?.logoPath;

                                        if (backgroundImage) {
                                            return (
                                                <img
                                                    key={backgroundImage}
                                                    src={backgroundImage}
                                                    alt={booth.title}
                                                    className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-700"
                                                />
                                            );
                                        }
                                        return <Camera className="w-10 h-10 text-zinc-700" />;
                                    })()}
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="absolute inset-0 bg-[#101112]/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
                                        <Button className="bg-white text-black hover:bg-zinc-200" onClick={() => navigate(`/${user?.slug || user?.username || 'user'}/${booth.slug}`)}>
                                            <Play className="w-4 h-4 mr-2" /> Launch
                                        </Button>
                                        <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700" onClick={() => navigate(`/creator/booth/${booth._id}/edit`)}>
                                            Editor
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-white/5 mt-2">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={booth.is_active}
                                            onCheckedChange={(c) => handleToggleActive(booth, c)}
                                            className="data-[state=checked]:bg-emerald-500"
                                        />
                                        <span className={`text-xs ${booth.is_active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                            {booth.is_active ? 'Active' : 'Disabled'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5"
                                                    title="Copy Links"
                                                >
                                                    <LinkIcon className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
                                                <DropdownMenuItem onClick={() => copyLink(booth.slug)} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                                    Booth Link
                                                </DropdownMenuItem>
                                                {booth.settings?.feedEnabled && (
                                                    <DropdownMenuItem onClick={() => copyLink(booth.slug, "/feed")} className="hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                                        Live Feed Link
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5"
                                            onClick={() => navigate(`/${user?.slug || user?.username || 'user'}/${booth.slug}`)} // Assuming this loads the booth/gallery
                                            title="View Gallery"
                                        >
                                            <ImageIcon className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                                            onClick={() => setDeleteId(booth._id)}
                                            title="Delete Booth"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-16 text-center bg-card/30 rounded-2xl border border-white/5 border-dashed">
                        <Camera className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No booths yet</h3>
                        <p className="text-zinc-500 max-w-sm mx-auto mb-6">Create your first AI photo booth to start creating magic.</p>
                        <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10">
                            Create First Booth
                        </Button>
                    </div>
                )}
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            This action cannot be undone. This will permanently delete your booth and all associated photos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">
                            Delete Booth
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
