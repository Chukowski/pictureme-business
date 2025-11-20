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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Pause, Play, Eye, MoreHorizontal, Calendar } from "lucide-react";
import { toast } from "sonner";

// Mock Data
const MOCK_EVENTS = [
    { id: 1, name: "TechCrunch Disrupt 2024", owner: "sarah@skynet.events", tier: "Masters", photos: 1240, tokens: 4500, status: "Active", dates: "Nov 15 - Nov 18" },
    { id: 2, name: "Summer Wedding", owner: "john@example.com", tier: "Spark", photos: 150, tokens: 600, status: "Active", dates: "Nov 20" },
    { id: 3, name: "Corporate Gala", owner: "mike@pearson.com", tier: "EventPro", photos: 890, tokens: 3200, status: "Paused", dates: "Nov 10 - Nov 12" },
];

export default function SuperAdminEvents() {
    const [searchTerm, setSearchTerm] = useState("");
    const [events, setEvents] = useState(MOCK_EVENTS);

    const toggleStatus = (id: number) => {
        setEvents(evts => evts.map(e => {
            if (e.id === id) {
                const newStatus = e.status === "Active" ? "Paused" : "Active";
                toast.success(`Event ${newStatus === "Active" ? "resumed" : "paused"}`);
                return { ...e, status: newStatus };
            }
            return e;
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Global Events</h1>
                    <p className="text-zinc-400">Monitor and control all {events.length} events across the platform.</p>
                </div>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search events..."
                        className="pl-8 bg-zinc-900/50 border-white/10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-zinc-400">Event Name</TableHead>
                            <TableHead className="text-zinc-400">Owner</TableHead>
                            <TableHead className="text-zinc-400">Stats</TableHead>
                            <TableHead className="text-zinc-400">Status</TableHead>
                            <TableHead className="text-zinc-400">Dates</TableHead>
                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.map((event) => (
                            <TableRow key={event.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                <TableCell>
                                    <span className="font-medium text-white">{event.name}</span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-zinc-300">{event.owner}</span>
                                        <Badge variant="outline" className="w-fit text-[10px] border-zinc-700 text-zinc-500">{event.tier}</Badge>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs text-zinc-400">
                                        <p>{event.photos.toLocaleString()} Photos</p>
                                        <p className="text-yellow-500">{event.tokens.toLocaleString()} Tokens</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className={`
                    ${event.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}
                  `}>
                                        {event.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                                        <Calendar className="w-3 h-3" />
                                        {event.dates}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(event.id)}>
                                            {event.status === 'Active' ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
                                        </Button>
                                        <Button size="sm" variant="ghost">
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
