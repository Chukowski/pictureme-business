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
import { Badge } from "@/components/ui/badge";
import { Search, Pause, Play, Eye, Calendar, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface Event {
    id: string;
    postgres_id?: number;
    name: string;
    slug: string;
    user_slug: string;
    owner: string;
    owner_name: string;
    tier: string;
    photos: number;
    albums: number;
    tokens: number;
    status: string;
    dates: string;
    event_mode: string;
    created_at: string;
}

export default function SuperAdminEvents() {
    const [searchTerm, setSearchTerm] = useState("");
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async (search?: string) => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("auth_token");
            let url = `${ENV.API_URL}/api/admin/events?limit=100`;
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }
            
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setEvents(data.events);
                setTotal(data.total);
            } else {
                toast.error("Failed to load events");
            }
        } catch (error) {
            console.error("Error fetching events:", error);
            toast.error("Failed to load events");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStatus = async (id: string) => {
        setTogglingId(id);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/events/${id}/status`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setEvents(evts => evts.map(e => {
                    if (e.id === id) {
                        const newStatus = data.is_active ? "Active" : "Paused";
                        toast.success(`Event "${data.title}" ${newStatus === "Active" ? "activated" : "paused"}`);
                        return { ...e, status: newStatus };
                    }
                    return e;
                }));
            } else {
                toast.error("Failed to update event status");
            }
        } catch (error) {
            console.error("Error toggling status:", error);
            toast.error("Failed to update event status");
        } finally {
            setTogglingId(null);
        }
    };

    const handleSearch = (value: string) => {
        setSearchTerm(value);
        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchEvents(value);
        }, 500);
        return () => clearTimeout(timeoutId);
    };

    const getTierColor = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'masters':
            case 'business_masters':
            case 'superadmin':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'eventpro':
            case 'event_pro':
            case 'business_pro':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'spark':
            case 'business_spark':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'individual':
            case 'free':
                return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
            default:
                return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    };

    const formatTier = (tier: string) => {
        if (!tier) return 'Free';
        // Convert snake_case to Title Case
        return tier
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const getModeColor = (mode: string) => {
        switch (mode?.toLowerCase()) {
            case 'album tracking':
                return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
            case 'lead capture':
                return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'pay per photo':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
            case 'pay per album':
                return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
            case 'free':
            default:
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        }
    };

    const filteredEvents = events.filter(e => 
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.event_mode || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Global Events</h1>
                    <p className="text-zinc-400">
                        Monitor and control all <span className="text-white font-medium">{total}</span> events across the platform.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fetchEvents(searchTerm)}
                        disabled={isLoading}
                        className="border-white/10"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            placeholder="Search events..."
                            className="pl-8 bg-zinc-900/50 border-white/10"
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : (
                <div className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-zinc-400">Event Name</TableHead>
                                <TableHead className="text-zinc-400">Owner</TableHead>
                                <TableHead className="text-zinc-400">Mode</TableHead>
                                <TableHead className="text-zinc-400">Stats</TableHead>
                                <TableHead className="text-zinc-400">Status</TableHead>
                                <TableHead className="text-zinc-400">Dates</TableHead>
                                <TableHead className="text-right text-zinc-400">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEvents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-zinc-500">
                                        {searchTerm ? "No events found matching your search" : "No events yet"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEvents.map((event) => (
                                    <TableRow key={event.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white">{event.name}</span>
                                                <span className="text-xs text-zinc-500 font-mono">
                                                    /{event.user_slug}/{event.slug}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm text-zinc-300">{event.owner}</span>
                                                <Badge variant="outline" className={`w-fit text-[10px] ${getTierColor(event.tier)}`}>
                                                    {formatTier(event.tier)}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={`text-[10px] ${getModeColor(event.event_mode)}`}>
                                                {event.event_mode || 'Free'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs space-y-0.5">
                                                <p className="text-zinc-400">
                                                    <span className="text-white font-medium">{event.photos.toLocaleString()}</span> Photos
                                                </p>
                                                <p className="text-zinc-400">
                                                    <span className="text-white font-medium">{event.albums.toLocaleString()}</span> Albums
                                                </p>
                                                <p className="text-yellow-500">
                                                    <span className="font-medium">{event.tokens.toLocaleString()}</span> Tokens
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={`
                                                ${event.status === 'Active' 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}
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
                                            <div className="flex items-center justify-end gap-1">
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    onClick={() => toggleStatus(event.id)}
                                                    disabled={togglingId === event.id}
                                                    title={event.status === 'Active' ? 'Pause event' : 'Activate event'}
                                                >
                                                    {togglingId === event.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : event.status === 'Active' ? (
                                                        <Pause className="w-4 h-4 text-amber-400" />
                                                    ) : (
                                                        <Play className="w-4 h-4 text-emerald-400" />
                                                    )}
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost"
                                                    onClick={() => window.open(`/${event.user_slug}/${event.slug}`, '_blank')}
                                                    title="View event"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost"
                                                    onClick={() => window.open(`/${event.user_slug}/${event.slug}/booth`, '_blank')}
                                                    title="Open booth"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/10">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Events</p>
                    <p className="text-2xl font-bold text-white">{total}</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/10">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Active Events</p>
                    <p className="text-2xl font-bold text-emerald-400">
                        {events.filter(e => e.status === 'Active').length}
                    </p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/10">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Photos</p>
                    <p className="text-2xl font-bold text-blue-400">
                        {events.reduce((sum, e) => sum + e.photos, 0).toLocaleString()}
                    </p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-900/50 border border-white/10">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Tokens Used</p>
                    <p className="text-2xl font-bold text-yellow-400">
                        {events.reduce((sum, e) => sum + e.tokens, 0).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
