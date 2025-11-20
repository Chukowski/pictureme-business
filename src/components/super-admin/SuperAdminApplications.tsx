import { useState } from "react";
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
import { Check, X, Eye, Building2, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

// Mock Data matching enterprise_applications schema + AI Score
const MOCK_APPLICATIONS = [
    {
        id: 1,
        full_name: "Sarah Connor",
        email: "sarah@skynet.events",
        company_name: "Skynet Events",
        location: "Los Angeles, CA",
        tier: "Masters",
        status: "pending",
        ai_score: 92,
        ai_reasoning: "High event volume (50+), owns hardware, professional domain.",
        created_at: "2023-11-19",
        event_types: ["Corporate", "Weddings"],
        monthly_events: "50-100",
        hardware: ["iPad Pro", "DSLR Booth"]
    },
    {
        id: 2,
        full_name: "Mike Ross",
        email: "mike@pearson.com",
        company_name: "Pearson Specter",
        location: "New York, NY",
        tier: "EventPro",
        status: "pending",
        ai_score: 75,
        ai_reasoning: "Moderate volume, valid domain, but location is saturated.",
        created_at: "2023-11-18",
        event_types: ["Legal", "Corporate"],
        monthly_events: "10-20",
        hardware: ["iPad Air"]
    },
    {
        id: 3,
        full_name: "Jimmy McGill",
        email: "jimmy@saulgoodman.com",
        company_name: "Saul Goodman Productions",
        location: "Albuquerque, NM",
        tier: "Masters",
        status: "rejected",
        ai_score: 45,
        ai_reasoning: "Low volume, suspicious email domain.",
        created_at: "2023-11-15",
        event_types: ["Parties"],
        monthly_events: "0-5",
        hardware: ["None"]
    },
];

export default function SuperAdminApplications() {
    const [applications, setApplications] = useState(MOCK_APPLICATIONS);
    const [selectedApp, setSelectedApp] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [internalNotes, setInternalNotes] = useState("");

    const handleApprove = (id: number) => {
        setApplications(apps => apps.map(app =>
            app.id === id ? { ...app, status: "approved" } : app
        ));
        toast.success("Application approved! User notified.");
        setIsDetailsOpen(false);
    };

    const handleReject = (id: number) => {
        setApplications(apps => apps.map(app =>
            app.id === id ? { ...app, status: "rejected" } : app
        ));
        toast.error("Application rejected.");
        setIsDetailsOpen(false);
    };

    const openDetails = (app: any) => {
        setSelectedApp(app);
        setIsDetailsOpen(true);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Business Applications</h1>
                <p className="text-zinc-400">Review and approve requests for EventPro and Masters tiers.</p>
            </div>

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
                                        {app.company_name}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`
                    ${app.tier === 'Masters' ? 'border-purple-500 text-purple-400 bg-purple-500/10' :
                                            'border-indigo-500 text-indigo-400 bg-indigo-500/10'}
                  `}>
                                        {app.tier}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${app.ai_score >= 80 ? 'bg-emerald-500/20 text-emerald-400' :
                                                app.ai_score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'}
                    `}>
                                            {app.ai_score}
                                        </div>
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
                                    <span className="text-xs text-zinc-500">{app.created_at}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => openDetails(app)}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        {app.status === 'pending' && (
                                            <>
                                                <Button size="sm" variant="ghost" className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" onClick={() => handleApprove(app.id)}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => handleReject(app.id)}>
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
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-1">Business Info</h4>
                                    <div className="flex items-center gap-2 text-sm text-white">
                                        <Building2 className="w-4 h-4 text-zinc-500" />
                                        {selectedApp.company_name}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-white mt-1">
                                        <MapPin className="w-4 h-4 text-zinc-500" />
                                        {selectedApp.location}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-1">Operations</h4>
                                    <p className="text-sm text-white">Events/Mo: {selectedApp.monthly_events}</p>
                                    <p className="text-sm text-white">Types: {selectedApp.event_types.join(", ")}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                    <h4 className="text-sm font-bold text-indigo-400 mb-2">AI Analysis</h4>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-2xl font-bold text-white">{selectedApp.ai_score}/100</span>
                                        <Badge variant="outline" className="border-indigo-500/50 text-indigo-300">
                                            {selectedApp.ai_score > 80 ? "High Potential" : "Medium Risk"}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-zinc-300 italic">"{selectedApp.ai_reasoning}"</p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-1">Hardware</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedApp.hardware.map((hw: string, i: number) => (
                                            <Badge key={i} variant="secondary" className="bg-zinc-800 text-zinc-300">{hw}</Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Internal Notes</h4>
                                    <Textarea
                                        placeholder="Add notes here..."
                                        className="bg-zinc-950 border-white/10 text-sm"
                                        value={internalNotes}
                                        onChange={(e) => setInternalNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="border-white/10 hover:bg-white/5">Close</Button>
                        {selectedApp?.status === 'pending' && (
                            <>
                                <Button variant="destructive" onClick={() => handleReject(selectedApp.id)}>Reject</Button>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(selectedApp.id)}>Approve & Activate</Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
