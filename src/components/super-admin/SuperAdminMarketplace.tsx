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
import { Check, X, ShoppingBag, Download } from "lucide-react";

// Mock Data
const MOCK_ITEMS = [
    { id: 1, name: "Neon Cyberpunk Pack", creator: "pacheco", type: "Prompt Pack", price: 500, status: "Pending", downloads: 0 },
    { id: 2, name: "Wedding Elegant", creator: "sarah_events", type: "Template", price: 1000, status: "Approved", downloads: 45 },
    { id: 3, name: "Spooky Halloween", creator: "johndoe", type: "Template", price: 200, status: "Rejected", downloads: 0 },
];

export default function SuperAdminMarketplace() {
    const [items, setItems] = useState(MOCK_ITEMS);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Marketplace Manager</h1>
                <p className="text-zinc-400">Review and approve community templates and prompt packs.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-zinc-400">Item Name</TableHead>
                            <TableHead className="text-zinc-400">Creator</TableHead>
                            <TableHead className="text-zinc-400">Type</TableHead>
                            <TableHead className="text-zinc-400">Price (Tokens)</TableHead>
                            <TableHead className="text-zinc-400">Status</TableHead>
                            <TableHead className="text-zinc-400">Downloads</TableHead>
                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                            <TableRow key={item.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag className="w-4 h-4 text-pink-400" />
                                        <span className="font-medium text-white">{item.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="text-sm text-zinc-400">@{item.creator}</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">{item.type}</Badge>
                                </TableCell>
                                <TableCell>
                                    <span className="text-yellow-400 font-mono">{item.price}</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className={`
                    ${item.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                                            item.status === 'Rejected' ? 'bg-red-500/10 text-red-400' :
                                                'bg-blue-500/10 text-blue-400'}
                  `}>
                                        {item.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 text-zinc-400">
                                        <Download className="w-3 h-3" />
                                        {item.downloads}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    {item.status === 'Pending' && (
                                        <div className="flex items-center justify-end gap-2">
                                            <Button size="sm" variant="ghost" className="text-emerald-400 hover:bg-emerald-500/10">
                                                <Check className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10">
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
