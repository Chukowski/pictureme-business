import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/services/eventsApi";
import { getMyTemplates, MarketplaceTemplate } from "@/services/marketplaceApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, 
    Search, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Edit, 
    LayoutTemplate,
    Loader2,
    ShoppingBag,
    Copy
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function CreatorTemplatesPage() {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            const data = await getMyTemplates();
            setTemplates(data || []);
        } catch (error) {
            console.error("Failed to fetch templates", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDuplicateTemplate = (template: MarketplaceTemplate) => {
        // Navigate to editor with template data as state to create a duplicate
        navigate('/creator/templates/new', { 
            state: { 
                duplicateFrom: template,
                action: 'duplicate_template'
            } 
        });
    };

    const isTemplateEditable = (status?: string) => {
        // Templates can only be edited if they're draft, rejected, or no status
        // Once approved or published, they must be duplicated instead
        return !status || status === 'draft' || status === 'rejected';
    };

    const filteredTemplates = templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'published':
                return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Published</Badge>;
            case 'pending':
                return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Reviewing</Badge>;
            case 'rejected':
                return <Badge className="bg-red-500/10 text-red-400 border-red-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
            default:
                return <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 border-white/5">Draft</Badge>;
        }
    };

    if (!currentUser) return null;

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 md:py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <LayoutTemplate className="w-8 h-8 text-indigo-500" />
                        My Styles
                    </h1>
                    <p className="text-zinc-400 text-sm">Manage your custom AI templates and marketplace submissions.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => navigate('/creator/marketplace')}
                        className="bg-card border-white/5 hover:bg-white/5 text-zinc-300"
                    >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Marketplace
                    </Button>
                    <Button 
                        onClick={() => navigate('/creator/templates/new')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Style
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    placeholder="Search your styles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 bg-white/[0.03] border border-white/5 rounded-2xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-zinc-500 text-sm animate-pulse">Fetching your creative styles...</p>
                </div>
            ) : filteredTemplates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredTemplates.map((template) => (
                        <Card key={template.id} className="group overflow-hidden bg-card border-white/5 hover:border-indigo-500/30 transition-all duration-300 shadow-xl">
                            <div className="relative aspect-[4/5] overflow-hidden">
                                <img 
                                    src={template.preview_url || (template.backgrounds && template.backgrounds[0]) || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400'} 
                                    alt={template.name}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                
                                <div className="absolute top-3 left-3">
                                    {getStatusBadge(template.status)}
                                </div>

                                <div className="absolute bottom-4 left-4 right-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                                    <h3 className="font-bold text-white text-lg mb-1 truncate">{template.name}</h3>
                                    <p className="text-[10px] text-zinc-400 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {template.description || "No description provided."}
                                    </p>
                                </div>
                            </div>
                            <CardContent className="p-4 flex gap-2">
                                {isTemplateEditable(template.status) ? (
                                    <Button 
                                        variant="secondary" 
                                        className="flex-1 h-9 text-xs bg-white/5 hover:bg-white/10 text-white"
                                        onClick={() => navigate(`/creator/templates/${template.id}/edit`)}
                                    >
                                        <Edit className="w-3.5 h-3.5 mr-2" />
                                        Edit
                                    </Button>
                                ) : (
                                    <Button 
                                        variant="secondary" 
                                        className="flex-1 h-9 text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20"
                                        onClick={() => handleDuplicateTemplate(template)}
                                    >
                                        <Copy className="w-3.5 h-3.5 mr-2" />
                                        Duplicate
                                    </Button>
                                )}
                                <Button 
                                    variant="ghost" 
                                    className="flex-1 h-9 text-xs text-zinc-400 hover:text-white"
                                    onClick={() => navigate('/creator/marketplace')}
                                >
                                    View Market
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-6">
                        <LayoutTemplate className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No styles found</h3>
                    <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-8">
                        {searchTerm ? "No styles match your search query." : "You haven't created any custom styles yet. Start building your first AI template!"}
                    </p>
                    {!searchTerm && (
                        <Button 
                            onClick={() => navigate('/creator/templates/new')}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 h-12 rounded-2xl"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Style
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
