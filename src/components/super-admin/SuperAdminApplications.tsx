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
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Eye, Building2, MapPin, Calendar, Loader2, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface Application {
    id: number;
    full_name: string;
    email: string;
    company_name: string;
    location?: string;
    tier: string;
    status: string;
    ai_score?: number;
    ai_reasoning?: string;
    created_at: string;
    event_types?: string[];
    monthly_events?: string;
    hardware?: string[];
    phone?: string;
    website?: string;
    notes?: string;
}

export default function SuperAdminApplications() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [internalNotes, setInternalNotes] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("auth_token");
            
            const response = await fetch(`${ENV.API_URL}/api/admin/applications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setApplications(data.applications || []);
            } else {
                toast.error("Failed to load applications");
            }
        } catch (error) {
            console.error("Error fetching applications:", error);
            toast.error("Failed to load applications");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (id: number) => {
        setIsUpdating(true);
        try {
            const token = localStorage.getItem("auth_token");
            
            const response = await fetch(`${ENV.API_URL}/api/admin/applications/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'approved' })
            });

            if (response.ok) {
                setApplications(apps => apps.map(app =>
                    app.id === id ? { ...app, status: "approved" } : app
                ));
                toast.success("Application approved! User notified.");
                setIsDetailsOpen(false);
            } else {
                toast.error("Failed to approve application");
            }
        } catch (error) {
            console.error("Error approving application:", error);
            toast.error("Failed to approve application");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleReject = async (id: number) => {
        setIsUpdating(true);
        try {
            const token = localStorage.getItem("auth_token");
            
            const response = await fetch(`${ENV.API_URL}/api/admin/applications/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'rejected' })
            });

            if (response.ok) {
                setApplications(apps => apps.map(app =>
                    app.id === id ? { ...app, status: "rejected" } : app
                ));
                toast.error("Application rejected.");
                setIsDetailsOpen(false);
            } else {
                toast.error("Failed to reject application");
            }
        } catch (error) {
            console.error("Error rejecting application:", error);
            toast.error("Failed to reject application");
        } finally {
            setIsUpdating(false);
        }
    };

    const openDetails = (app: Application) => {
        setSelectedApp(app);
        setInternalNotes(app.notes || "");
        setIsDetailsOpen(true);
    };

    const pendingCount = applications.filter(a => a.status === 'pending').length;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Business Applications</h1>
                    <p className="text-zinc-400">
                        Review and approve requests for EventPro and Masters tiers.
                        {pendingCount > 0 && (
                            <span className="ml-2 text-amber-400">{pendingCount} pending</span>
                        )}
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={fetchApplications}
                    disabled={isLoading}
                    className="border-white/10"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : applications.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                    <h3 className="text-lg font-medium text-white mb-2">No Applications Yet</h3>
                    <p className="text-zinc-500">Business tier applications will appear here when submitted.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-zinc-400">Applicant</TableHead>
                                <TableHead className="text-zinc-400">Company</TableHead>
                                <TableHead className="text-zinc-400">Tier Requested</TableHead>
                                <TableHead className="text-zinc-400">AI Score</TableHead>
                                <TableHead className="text-zinc-400">Status</TableHead>
                                <TableHead className="text-zinc-400">Date</TableHead>
                                <TableHead className="text-right text-zinc-400">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {applications.map((app) => (
                                <TableRow key={app.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-white">{app.full_name}</span>
                                            <span className="text-xs text-zinc-500">{app.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-zinc-300">
                                            <Building2 className="w-3 h-3 text-zinc-500" />
                                            {app.company_name || 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`
                                            ${app.tier === 'Masters' || app.tier === 'business_masters' 
                                                ? 'border-purple-500 text-purple-400 bg-purple-500/10' 
                                                : 'border-indigo-500 text-indigo-400 bg-indigo-500/10'}
                                        `}>
                                            {app.tier || 'EventPro'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {app.ai_score ? (
                                                <div className={`
                                                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                                                    ${app.ai_score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                                                        app.ai_score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-red-500/20 text-red-400'}
                                                `}>
                                                    {app.ai_score}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-zinc-500">N/A</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={`
                                            ${app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                                                app.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                                                    'bg-blue-500/10 text-blue-400'}
                                        `}>
                                            {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs text-zinc-500">
                                            {app.created_at 
                                                ? new Date(app.created_at).toLocaleDateString() 
                                                : 'N/A'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button size="sm" variant="ghost" onClick={() => openDetails(app)}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            {app.status === 'pending' && (
                                                <>
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" 
                                                        onClick={() => handleApprove(app.id)}
                                                        disabled={isUpdating}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10" 
                                                        onClick={() => handleReject(app.id)}
                                                        disabled={isUpdating}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Application Details Modal */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Application Details</DialogTitle>
                        <DialogDescription>Review full application data.</DialogDescription>
                    </DialogHeader>

                    {selectedApp && (
                        <div className="grid grid-cols-2 gap-6 py-4">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-1">Applicant</h4>
                                    <p className="text-white font-medium">{selectedApp.full_name}</p>
                                    <p className="text-sm text-zinc-500">{selectedApp.email}</p>
                                    {selectedApp.phone && (
                                        <p className="text-sm text-zinc-500">{selectedApp.phone}</p>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-1">Business Info</h4>
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <Building2 className="w-4 h-4 text-zinc-500" />
                                        {selectedApp.company_name || 'N/A'}
                                    </div>
                                    {selectedApp.location && (
                                        <div className="flex items-center gap-2 text-sm text-white mt-1">
                                            <MapPin className="w-4 h-4 text-zinc-500" />
                                            {selectedApp.location}
                                        </div>
                                    )}
                                    {selectedApp.website && (
                                        <a 
                                            href={selectedApp.website} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-sm text-indigo-400 hover:underline mt-1 block"
                                        >
                                            {selectedApp.website}
                                        </a>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-1">Operations</h4>
                                    <p className="text-sm text-white">
                                        Events/Mo: {selectedApp.monthly_events || 'Not specified'}
                                    </p>
                                    {selectedApp.event_types && selectedApp.event_types.length > 0 && (
                                        <p className="text-sm text-white">
                                            Types: {selectedApp.event_types.join(", ")}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {selectedApp.ai_score && (
                                    <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                        <h4 className="text-sm font-bold text-indigo-400 mb-2">AI Analysis</h4>
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="text-2xl font-bold text-white">{selectedApp.ai_score}/100</span>
                                            <Badge variant="outline" className="border-indigo-500/50 text-indigo-300">
                                                {selectedApp.ai_score > 80 ? "High Potential" : 
                                                 selectedApp.ai_score > 50 ? "Medium Risk" : "Low Score"}
                                            </Badge>
                                        </div>
                                        {selectedApp.ai_reasoning && (
                                            <p className="text-xs text-zinc-300 italic">"{selectedApp.ai_reasoning}"</p>
                                        )}
                                    </div>
                                )}

                                {selectedApp.hardware && selectedApp.hardware.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-zinc-400 mb-1">Hardware</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedApp.hardware.map((hw, i) => (
                                                <Badge key={i} variant="secondary" className="bg-zinc-800 text-zinc-300">
                                                    {hw}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Internal Notes</h4>
                                    <Textarea
                                        placeholder="Add notes here..."
                                        className="bg-zinc-950 border-white/10 text-sm"
                                        value={internalNotes}
                                        onChange={(e) => setInternalNotes(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Calendar className="w-3 h-3" />
                                    Applied: {selectedApp.created_at 
                                        ? new Date(selectedApp.created_at).toLocaleDateString() 
                                        : 'Unknown'}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setIsDetailsOpen(false)} 
                            className="border-white/10 hover:bg-white/5"
                        >
                            Close
                        </Button>
                        {selectedApp?.status === 'pending' && (
                            <>
                                <Button 
                                    variant="destructive" 
                                    onClick={() => handleReject(selectedApp.id)}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Reject
                                </Button>
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                                    onClick={() => handleApprove(selectedApp.id)}
                                    disabled={isUpdating}
                                >
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Approve & Activate
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
