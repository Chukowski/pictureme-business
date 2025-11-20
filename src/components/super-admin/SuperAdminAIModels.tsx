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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Cpu, Edit2, Plus } from "lucide-react";

// Mock Data
const MOCK_MODELS = [
    { id: 1, name: "Flux Realism", type: "photo", fal_id: "fal-ai/flux-realism", cost: 4, tiers: ["All"], status: true },
    { id: 2, name: "SDXL Turbo", type: "photo", fal_id: "fal-ai/fast-sdxl", cost: 1, tiers: ["All"], status: true },
    { id: 3, name: "FaceSwap v2", type: "faceswap", fal_id: "fal-ai/insightface-swap", cost: 8, tiers: ["Studio", "EventPro", "Masters"], status: true },
    { id: 4, name: "Video Gen Alpha", type: "video", fal_id: "fal-ai/video-generation", cost: 25, tiers: ["Masters"], status: false },
];

export default function SuperAdminAIModels() {
    const [models, setModels] = useState(MOCK_MODELS);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">AI Models Control</h1>
                    <p className="text-zinc-400">Manage available models, token costs, and tier availability.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" /> Add Model</Button>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-white/5">
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-zinc-400">Model Name</TableHead>
                            <TableHead className="text-zinc-400">Type</TableHead>
                            <TableHead className="text-zinc-400">FAL.ai ID</TableHead>
                            <TableHead className="text-zinc-400">Token Cost</TableHead>
                            <TableHead className="text-zinc-400">Availability</TableHead>
                            <TableHead className="text-zinc-400">Status</TableHead>
                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {models.map((model) => (
                            <TableRow key={model.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Cpu className="w-4 h-4 text-indigo-400" />
                                        <span className="font-medium text-white">{model.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">{model.type}</Badge>
                                </TableCell>
                                <TableCell>
                                    <code className="text-xs bg-black/30 px-2 py-1 rounded text-zinc-400">{model.fal_id}</code>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            defaultValue={model.cost}
                                            className="w-16 h-8 bg-zinc-950 border-white/10 text-center"
                                        />
                                        <span className="text-xs text-zinc-500">tokens</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {model.tiers.map(t => (
                                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300">{t}</span>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Switch checked={model.status} />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="ghost">
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
