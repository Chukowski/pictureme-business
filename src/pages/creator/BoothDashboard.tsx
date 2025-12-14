import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getUserBooths, createBooth, EventConfig, User } from "@/services/eventsApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Camera, Settings, ArrowRight, Play } from "lucide-react";
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

    useEffect(() => {
        loadData();
    }, []);

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
            const booth = await createBooth({
                title: newBoothTitle,
                slug: newBoothSlug,
                description: "My custom AI photo booth",
                theme: {
                    brandName: newBoothTitle,
                    mode: 'dark'
                },
                settings: {
                    aiModel: 'nano-banana'
                }
            });

            toast.success("Booth created successfully!");
            setBooths([booth, ...booths]);
            setIsDialogOpen(false);
            setNewBoothTitle("");
            setNewBoothSlug("");

            // Navigate to the booth studio or settings?
            // navigate(\`/creator/booth/\${booth._id}\`);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to create booth");
        } finally {
            setIsCreating(false);
        }
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
                    <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create New Booth</DialogTitle>
                            <DialogDescription className="text-zinc-400">
                                Give your booth a name and unique URL slug.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right text-zinc-300">
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
                                    className="col-span-3 bg-zinc-800 border-white/10 text-white focus:border-indigo-500"
                                    placeholder="e.g. Summer Party"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="slug" className="text-right text-zinc-300">
                                    URL Slug
                                </Label>
                                <Input
                                    id="slug"
                                    value={newBoothSlug}
                                    onChange={(e) => setNewBoothSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'))}
                                    className="col-span-3 bg-zinc-800 border-white/10 text-white focus:border-indigo-500"
                                    placeholder="summer-party"
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
                        <Card key={booth._id} className="bg-zinc-900 border-white/10 hover:border-indigo-500/30 transition-all group overflow-hidden">
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
                                <div className="aspect-video bg-zinc-800/50 rounded-lg mb-4 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors relative overflow-hidden">
                                    {booth.branding?.logoPath ? (
                                        <img src={booth.branding.logoPath} alt={booth.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-10 h-10 text-zinc-700" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button className="bg-white text-black hover:bg-zinc-200" onClick={() => navigate(`/${user?.slug || user?.username || 'user'}/${booth.slug}`)}>
                                            <Play className="w-4 h-4 mr-2" /> Launch
                                        </Button>
                                        <Button variant="secondary" className="bg-zinc-800 text-white hover:bg-zinc-700" onClick={() => navigate(`/creator/booth/${booth._id}/edit`)}>
                                            Editor
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm text-zinc-400">
                                    <span>{booth.is_active ? 'Active' : 'Inactive'}</span>
                                    <span>{new Date(booth.start_date || Date.now()).toLocaleDateString()}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-16 text-center bg-zinc-900/30 rounded-2xl border border-white/5 border-dashed">
                        <Camera className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No booths yet</h3>
                        <p className="text-zinc-500 max-w-sm mx-auto mb-6">Create your first AI photo booth to start creating magic.</p>
                        <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10">
                            Create First Booth
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
