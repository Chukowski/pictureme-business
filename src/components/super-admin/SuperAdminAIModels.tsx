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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Cpu, Edit2, Plus, Save, Image, Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface AIModel {
    model_id: string;
    default_cost: number;
    description: string;
    model_type: string;
    is_active?: boolean;
    // For editing
    editedCost?: number;
    isEditing?: boolean;
}

export default function SuperAdminAIModels() {
    const [models, setModels] = useState<AIModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingModel, setSavingModel] = useState<string | null>(null);

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${ENV.API_URL}/api/admin/enterprise/models`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setModels(data.map((m: AIModel) => ({ ...m, editedCost: m.default_cost, isEditing: false })));
            } else {
                toast.error("Failed to load models");
            }
        } catch (error) {
            console.error("Error fetching models:", error);
            toast.error("Failed to load models");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCostChange = (modelId: string, newCost: number) => {
        setModels(prev => prev.map(m => 
            m.model_id === modelId 
                ? { ...m, editedCost: newCost, isEditing: true }
                : m
        ));
    };

    const saveCost = async (model: AIModel) => {
        if (model.editedCost === model.default_cost) {
            setModels(prev => prev.map(m => 
                m.model_id === model.model_id ? { ...m, isEditing: false } : m
            ));
            return;
        }

        setSavingModel(model.model_id);
        try {
            const token = localStorage.getItem("auth_token");
            const response = await fetch(
                `${ENV.API_URL}/api/admin/enterprise/models/${encodeURIComponent(model.model_id)}/cost?cost=${model.editedCost}`,
                {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.ok) {
                toast.success(`Updated ${model.model_id} cost to ${model.editedCost} tokens`);
                setModels(prev => prev.map(m => 
                    m.model_id === model.model_id 
                        ? { ...m, default_cost: model.editedCost!, isEditing: false }
                        : m
                ));
            } else {
                toast.error("Failed to update model cost");
            }
        } catch (error) {
            console.error("Error saving cost:", error);
            toast.error("Failed to update model cost");
        } finally {
            setSavingModel(null);
        }
    };

    const imageModels = models.filter(m => m.model_type === 'image');
    const videoModels = models.filter(m => m.model_type === 'video');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">AI Models Control</h1>
                    <p className="text-zinc-400">Manage default token costs for all AI models. These are the base prices for all users.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" /> Add Model
                </Button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Image Models */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-300">
                            <Image className="w-5 h-5 text-emerald-400" />
                            Image Models ({imageModels.length})
                        </h2>
                        <div className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-zinc-400">Model ID</TableHead>
                                        <TableHead className="text-zinc-400">Description</TableHead>
                                        <TableHead className="text-zinc-400">Token Cost</TableHead>
                                        <TableHead className="text-right text-zinc-400">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {imageModels.map((model) => (
                                        <TableRow key={model.model_id} className="border-white/10 hover:bg-white/5 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Cpu className="w-4 h-4 text-emerald-400" />
                                                    <code className="text-sm font-mono text-white">{model.model_id}</code>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-zinc-400">{model.description || 'No description'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        value={model.editedCost}
                                                        onChange={(e) => handleCostChange(model.model_id, parseInt(e.target.value) || 0)}
                                                        className="w-20 h-8 bg-zinc-950 border-white/10 text-center"
                                                    />
                                                    <span className="text-xs text-zinc-500">tokens</span>
                                                    {model.isEditing && (
                                                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                                                            Modified
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {model.isEditing && (
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => saveCost(model)}
                                                        disabled={savingModel === model.model_id}
                                                        className="bg-emerald-600 hover:bg-emerald-700"
                                                    >
                                                        {savingModel === model.model_id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Save className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Video Models */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-300">
                            <Video className="w-5 h-5 text-purple-400" />
                            Video Models ({videoModels.length})
                        </h2>
                        <div className="rounded-xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-zinc-400">Model ID</TableHead>
                                        <TableHead className="text-zinc-400">Description</TableHead>
                                        <TableHead className="text-zinc-400">Token Cost</TableHead>
                                        <TableHead className="text-right text-zinc-400">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {videoModels.map((model) => (
                                        <TableRow key={model.model_id} className="border-white/10 hover:bg-white/5 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Cpu className="w-4 h-4 text-purple-400" />
                                                    <code className="text-sm font-mono text-white">{model.model_id}</code>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-zinc-400">{model.description || 'No description'}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        value={model.editedCost}
                                                        onChange={(e) => handleCostChange(model.model_id, parseInt(e.target.value) || 0)}
                                                        className="w-20 h-8 bg-zinc-950 border-white/10 text-center"
                                                    />
                                                    <span className="text-xs text-zinc-500">tokens</span>
                                                    {model.isEditing && (
                                                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                                                            Modified
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {model.isEditing && (
                                                    <Button 
                                                        size="sm" 
                                                        onClick={() => saveCost(model)}
                                                        disabled={savingModel === model.model_id}
                                                        className="bg-emerald-600 hover:bg-emerald-700"
                                                    >
                                                        {savingModel === model.model_id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Save className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <h3 className="font-medium text-indigo-400 mb-2">💡 About Token Costs</h3>
                        <ul className="text-sm text-zinc-400 space-y-1">
                            <li>• These are the <strong>default</strong> token costs for all users</li>
                            <li>• Enterprise users can have <strong>custom pricing</strong> set in the Users section</li>
                            <li>• Custom pricing overrides these defaults for specific users</li>
                            <li>• Changes take effect immediately for new generations</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
