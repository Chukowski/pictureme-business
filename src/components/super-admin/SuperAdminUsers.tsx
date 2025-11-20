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
    FileText
} from "lucide-react";
import { toast } from "sonner";

// Mock Data
const MOCK_USERS = [
    { id: 1, name: "Pacheco Master", email: "pacheco@example.com", username: "pacheco", tier: "Masters", status: "Active", tokens: 15000, events: 12, created: "2023-10-15", lastLogin: "2 mins ago" },
    { id: 2, name: "John Doe", email: "john@example.com", username: "johndoe", tier: "Spark", status: "Active", tokens: 120, events: 1, created: "2023-11-01", lastLogin: "1 day ago" },
    { id: 3, name: "Alice Smith", email: "alice@studio.com", username: "alicesmith", tier: "Studio", status: "Trial", tokens: 500, events: 3, created: "2023-11-10", lastLogin: "5 hours ago" },
    { id: 4, name: "Banned User", email: "bad@actor.com", username: "badactor", tier: "Individual", status: "Suspended", tokens: 0, events: 0, created: "2023-09-20", lastLogin: "1 month ago" },
];

export default function SuperAdminUsers() {
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState(MOCK_USERS);

    const handleAction = (action: string, user: any) => {
        toast.info(`${action} for ${user.username}`);
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Users Management</h1>
                    <p className="text-zinc-400">Manage all {users.length} registered users.</p>
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
                            <TableHead className="text-zinc-400">Tier</TableHead>
                            <TableHead className="text-zinc-400">Status</TableHead>
                            <TableHead className="text-zinc-400">Tokens</TableHead>
                            <TableHead className="text-zinc-400">Stats</TableHead>
                            <TableHead className="text-zinc-400">Activity</TableHead>
                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.map((user) => (
                            <TableRow key={user.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-white">{user.name}</span>
                                        <span className="text-xs text-zinc-500">{user.email}</span>
                                        <span className="text-xs text-zinc-500">@{user.username}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`
                    ${user.tier === 'Masters' ? 'border-purple-500 text-purple-400 bg-purple-500/10' :
                                            user.tier === 'EventPro' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' :
                                                'border-zinc-700 text-zinc-400'}
                  `}>
                                        {user.tier}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className={`
                    ${user.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' :
                                            user.status === 'Suspended' ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' :
                                                'bg-zinc-800 text-zinc-400'}
                  `}>
                                        {user.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 font-mono text-yellow-400">
                                        <Coins className="w-3 h-3" />
                                        {user.tokens.toLocaleString()}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-xs text-zinc-400">
                                        <p>{user.events} Events</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-xs text-zinc-500">
                                        <span>Login: {user.lastLogin}</span>
                                        <span>Joined: {user.created}</span>
                                    </div>
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
                                            <DropdownMenuItem onClick={() => handleAction("View Details", user)} className="focus:bg-white/10 cursor-pointer">
                                                <UserCog className="mr-2 h-4 w-4" /> View Details
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleAction("Edit Plan", user)} className="focus:bg-white/10 cursor-pointer">
                                                <FileText className="mr-2 h-4 w-4" /> Edit Plan
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleAction("Adjust Tokens", user)} className="focus:bg-white/10 cursor-pointer">
                                                <Coins className="mr-2 h-4 w-4" /> Adjust Tokens
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator className="bg-white/10" />
                                            <DropdownMenuItem onClick={() => handleAction("Suspend User", user)} className="text-amber-500 focus:bg-amber-500/10 focus:text-amber-400 cursor-pointer">
                                                <Ban className="mr-2 h-4 w-4" /> Suspend Account
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleAction("Delete User", user)} className="text-red-500 focus:bg-red-500/10 focus:text-red-400 cursor-pointer">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
