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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Cpu, Edit2, Plus, Save, Image, Video, Loader2, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";

interface AIModel {
    model_id: string;
    default_cost: number;
    cost_rules?: Record<string, any>;
    description: string;
    model_type: string;
    is_active?: boolean;
    // For editing
    editedCost?: number;
    editedRules?: Record<string, any>;
    isEditing?: boolean;
}

export default function SuperAdminAIModels() {
    const [models, setModels] = useState<AIModel[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [savingModel, setSavingModel] = useState<string | null>(null);
    const [editingRulesModel, setEditingRulesModel] = useState<AIModel | null>(null);

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
                setModels(data.map((m: AIModel) => ({ 
                    ...m, 
                    editedCost: m.default_cost, 
                    editedRules: m.cost_rules || {},
                    isEditing: false 
                })));
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

    const handleRulesChange = (modelId: string, newRules: Record<string, any>) => {
        setModels(prev => prev.map(m => 
            m.model_id === modelId 
                ? { ...m, editedRules: newRules, isEditing: true }
                : m
        ));
        
        // Also update the dialog state if this is the model being edited
        if (editingRulesModel?.model_id === modelId) {
            setEditingRulesModel(prev => prev ? { ...prev, editedRules: newRules, isEditing: true } : null);
        }
    };

    const saveModel = async (model: AIModel) => {
        setSavingModel(model.model_id);
        console.log("💾 Saving model:", model.model_id, { cost: model.editedCost, rules: model.editedRules });
        
        try {
            const token = localStorage.getItem("auth_token");
            
            // 1. Save Cost (if changed)
            if (model.editedCost !== model.default_cost) {
                const costRes = await fetch(
                    `${ENV.API_URL}/api/admin/enterprise/models/${encodeURIComponent(model.model_id)}/cost?cost=${model.editedCost}`,
                    {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );
                if (!costRes.ok) {
                    const err = await costRes.json();
                    throw new Error(err.error || "Failed to update cost");
                }
            }

            // 2. Save Rules (always send current edited rules to be safe)
            const rulesRes = await fetch(
                `${ENV.API_URL}/api/admin/enterprise/models/${encodeURIComponent(model.model_id)}/rules`,
                {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}` 
                    },
                    body: JSON.stringify({ rules: model.editedRules })
                }
            );
            if (!rulesRes.ok) {
                const err = await rulesRes.json();
                throw new Error(err.error || "Failed to update rules");
            }

            toast.success(`Updated ${model.model_id} successfully`);
            
            // Update local state to reflect saved values
            setModels(prev => prev.map(m => 
                m.model_id === model.model_id 
                    ? { ...m, default_cost: model.editedCost!, cost_rules: model.editedRules, isEditing: false }
                    : m
            ));
        } catch (error: any) {
            console.error("❌ Error saving model:", error);
            toast.error(error.message || "Failed to update model");
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
                        <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-zinc-400">Model ID</TableHead>
                                        <TableHead className="text-zinc-400">Description</TableHead>
                                        <TableHead className="text-zinc-400">Base Cost</TableHead>
                                        <TableHead className="text-zinc-400">Parameter Rules</TableHead>
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
                                                        value={model.editedCost === 0 ? "" : model.editedCost}
                                                        placeholder="0"
                                                        onChange={(e) => handleCostChange(model.model_id, e.target.value === "" ? 0 : parseInt(e.target.value))}
                                                        className="w-20 h-8 bg-card border-white/10 text-center"
                                                    />
                                                    <span className="text-xs text-zinc-500">tokens</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 gap-2 border-white/10 bg-zinc-900/50 hover:bg-zinc-800"
                                                    onClick={() => setEditingRulesModel(model)}
                                                >
                                                    <Settings2 className="w-3.5 h-3.5" />
                                                    {Object.keys(model.editedRules || {}).length > 0 ? (
                                                        <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-indigo-500/20 text-indigo-400">
                                                            {Object.keys(model.editedRules || {}).length} rules
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs">No rules</span>
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {model.isEditing && (
                                                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 mr-2">
                                                            Modified
                                                        </Badge>
                                                    )}
                                                    {model.isEditing && (
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => saveModel(model)}
                                                            disabled={savingModel === model.model_id}
                                                            className="bg-emerald-600 hover:bg-emerald-700 h-8"
                                                        >
                                                            {savingModel === model.model_id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Save className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
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
                        <div className="rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-zinc-400">Model ID</TableHead>
                                        <TableHead className="text-zinc-400">Description</TableHead>
                                        <TableHead className="text-zinc-400">Base Cost</TableHead>
                                        <TableHead className="text-zinc-400">Parameter Rules</TableHead>
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
                                                        value={model.editedCost === 0 ? "" : model.editedCost}
                                                        placeholder="0"
                                                        onChange={(e) => handleCostChange(model.model_id, e.target.value === "" ? 0 : parseInt(e.target.value))}
                                                        className="w-20 h-8 bg-card border-white/10 text-center"
                                                    />
                                                    <span className="text-xs text-zinc-500">tokens</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 gap-2 border-white/10 bg-zinc-900/50 hover:bg-zinc-800"
                                                    onClick={() => setEditingRulesModel(model)}
                                                >
                                                    <Settings2 className="w-3.5 h-3.5" />
                                                    {Object.keys(model.editedRules || {}).length > 0 ? (
                                                        <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-indigo-500/20 text-indigo-400">
                                                            {Object.keys(model.editedRules || {}).length} rules
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs">No rules</span>
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {model.isEditing && (
                                                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 mr-2">
                                                            Modified
                                                        </Badge>
                                                    )}
                                                    {model.isEditing && (
                                                        <Button 
                                                            size="sm" 
                                                            onClick={() => saveModel(model)}
                                                            disabled={savingModel === model.model_id}
                                                            className="bg-emerald-600 hover:bg-emerald-700 h-8"
                                                        >
                                                            {savingModel === model.model_id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Save className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
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

            {/* Rules Editor Dialog */}
            <Dialog open={!!editingRulesModel} onOpenChange={(open) => !open && setEditingRulesModel(null)}>
                <DialogContent className="bg-card border-white/10 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {editingRulesModel?.model_type === 'video' ? <Video className="w-5 h-5 text-purple-400" /> : <Image className="w-5 h-5 text-emerald-400" />}
                            Parameter Rules: {editingRulesModel?.model_id}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Define additional token costs based on {editingRulesModel?.model_type === 'video' ? 'video duration, resolution and audio' : 'image resolution and other parameters'}.
                        </DialogDescription>
                    </DialogHeader>

                    {/* 0. Base Cost Edit (Added for convenience) */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 mb-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                            <Settings2 className="w-4 h-4 text-indigo-400" />
                            Global Base Cost
                        </div>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={editingRulesModel?.editedCost === 0 ? "" : editingRulesModel?.editedCost}
                                placeholder="0"
                                onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                                    if (editingRulesModel) {
                                        handleCostChange(editingRulesModel.model_id, val);
                                        setEditingRulesModel(prev => prev ? { ...prev, editedCost: val, isEditing: true } : null);
                                    }
                                }}
                                className="w-24 h-9 bg-zinc-900 border-white/10 text-center font-bold text-white"
                            />
                            <span className="text-xs text-zinc-500 font-medium">tokens</span>
                        </div>
                    </div>

                    {/* LIVE COST PREVIEW PANEL */}
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 mb-2 flex items-center justify-between shadow-inner">
                        <div className="space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold">Total Cost Preview</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-white">
                                    {editingRulesModel?.editedCost || 0}
                                </span>
                                <span className="text-sm text-zinc-400 font-medium">base tokens</span>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1.5">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-tight">Active Surcharges (Max)</div>
                            <div className="flex gap-2">
                                {Object.entries(editingRulesModel?.editedRules || {}).map(([key, values]) => {
                                    const maxVal = Math.max(...Object.values(values as Record<string, number>).map(v => Number(v) || 0), 0);
                                    if (maxVal === 0) return null;
                                    return (
                                        <Badge key={key} variant="secondary" className="h-5 px-1.5 text-[9px] bg-white/5 border-white/10 text-zinc-300">
                                            +{maxVal} {key}
                                        </Badge>
                                    );
                                })}
                            </div>
                            <div className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                                Max Potential: {(editingRulesModel?.editedCost || 0) + 
                                    Object.values(editingRulesModel?.editedRules || {}).reduce((acc, values) => {
                                        const maxVal = Math.max(...Object.values(values as Record<string, number>).map(v => Number(v) || 0), 0);
                                        return acc + maxVal;
                                    }, 0)
                                } tk
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        {/* 1. Resolution Rules (Type Aware) */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-zinc-300 flex items-center justify-between">
                                Resolution Costs
                                <Badge variant="outline" className="text-[10px] opacity-50">resolution</Badge>
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {editingRulesModel?.model_type === 'video' ? (
                                    <>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-zinc-500">720p (Fast)</Label>
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    type="number" 
                                                    className="bg-zinc-900 border-white/5 h-9"
                                                    value={editingRulesModel?.editedRules?.resolution?.["720p"] || 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newRules = { ...editingRulesModel?.editedRules };
                                                        if (!newRules.resolution) newRules.resolution = {};
                                                        newRules.resolution["720p"] = val;
                                                        handleRulesChange(editingRulesModel!.model_id, newRules);
                                                    }}
                                                />
                                                <span className="text-[10px] text-zinc-500">tokens</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-zinc-500">1080p (Standard)</Label>
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    type="number" 
                                                    className="bg-zinc-900 border-white/5 h-9"
                                                    value={editingRulesModel?.editedRules?.resolution?.["1080p"] || 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newRules = { ...editingRulesModel?.editedRules };
                                                        if (!newRules.resolution) newRules.resolution = {};
                                                        newRules.resolution["1080p"] = val;
                                                        handleRulesChange(editingRulesModel!.model_id, newRules);
                                                    }}
                                                />
                                                <span className="text-[10px] text-zinc-500">tokens</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-zinc-500">4K (Premium)</Label>
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    type="number" 
                                                    className="bg-zinc-900 border-white/5 h-9"
                                                    value={editingRulesModel?.editedRules?.resolution?.["4k"] || 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newRules = { ...editingRulesModel?.editedRules };
                                                        if (!newRules.resolution) newRules.resolution = {};
                                                        newRules.resolution["4k"] = val;
                                                        handleRulesChange(editingRulesModel!.model_id, newRules);
                                                    }}
                                                />
                                                <span className="text-[10px] text-zinc-500">tokens</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-zinc-500">Standard (SD)</Label>
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    type="number" 
                                                    className="bg-zinc-900 border-white/5 h-9"
                                                    value={editingRulesModel?.editedRules?.resolution?.["standard"] || 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newRules = { ...editingRulesModel?.editedRules };
                                                        if (!newRules.resolution) newRules.resolution = {};
                                                        newRules.resolution["standard"] = val;
                                                        handleRulesChange(editingRulesModel!.model_id, newRules);
                                                    }}
                                                />
                                                <span className="text-[10px] text-zinc-500">tokens</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-zinc-500">High Def (HD)</Label>
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    type="number" 
                                                    className="bg-zinc-900 border-white/5 h-9"
                                                    value={editingRulesModel?.editedRules?.resolution?.["hd"] || 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newRules = { ...editingRulesModel?.editedRules };
                                                        if (!newRules.resolution) newRules.resolution = {};
                                                        newRules.resolution["hd"] = val;
                                                        handleRulesChange(editingRulesModel!.model_id, newRules);
                                                    }}
                                                />
                                                <span className="text-[10px] text-zinc-500">tokens</span>
                                            </div>
                                        </div>
                                        {/* Common FAL Image Resolution Keys */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-zinc-500">Square HD</Label>
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    type="number" 
                                                    className="bg-zinc-900 border-white/5 h-9"
                                                    value={editingRulesModel?.editedRules?.resolution?.["square_hd"] || 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newRules = { ...editingRulesModel?.editedRules };
                                                        if (!newRules.resolution) newRules.resolution = {};
                                                        newRules.resolution["square_hd"] = val;
                                                        handleRulesChange(editingRulesModel!.model_id, newRules);
                                                    }}
                                                />
                                                <span className="text-[10px] text-zinc-500">tk</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs text-zinc-500">Portrait HD</Label>
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    type="number" 
                                                    className="bg-zinc-900 border-white/5 h-9"
                                                    value={editingRulesModel?.editedRules?.resolution?.["portrait_hd"] || 0}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 0;
                                                        const newRules = { ...editingRulesModel?.editedRules };
                                                        if (!newRules.resolution) newRules.resolution = {};
                                                        newRules.resolution["portrait_hd"] = val;
                                                        handleRulesChange(editingRulesModel!.model_id, newRules);
                                                    }}
                                                />
                                                <span className="text-[10px] text-zinc-500">tk</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 2. Type Specific Rules (Audio for Video, Aspect Ratio for Images?) */}
                        {editingRulesModel?.model_type === 'video' ? (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-zinc-300 flex items-center justify-between">
                                    Audio Surcharge
                                    <Badge variant="outline" className="text-[10px] opacity-50">audio</Badge>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-zinc-500">With Audio (True)</Label>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                className="bg-zinc-900 border-white/5 h-9"
                                                value={editingRulesModel?.editedRules?.audio?.["true"] || 0}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const newRules = { ...editingRulesModel?.editedRules };
                                                    if (!newRules.audio) newRules.audio = {};
                                                    newRules.audio["true"] = val;
                                                    handleRulesChange(editingRulesModel!.model_id, newRules);
                                                }}
                                            />
                                            <span className="text-[10px] text-zinc-500">tokens</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-zinc-500">No Audio (False)</Label>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                className="bg-zinc-900 border-white/5 h-9"
                                                value={editingRulesModel?.editedRules?.audio?.["false"] || 0}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const newRules = { ...editingRulesModel?.editedRules };
                                                    if (!newRules.audio) newRules.audio = {};
                                                    newRules.audio["false"] = val;
                                                    handleRulesChange(editingRulesModel!.model_id, newRules);
                                                }}
                                            />
                                            <span className="text-[10px] text-zinc-500">tokens</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* 2.5 Duration Surcharge (Video only) */}
                        {editingRulesModel?.model_type === 'video' ? (
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-zinc-300 flex items-center justify-between">
                                    Duration Surcharge
                                    <Badge variant="outline" className="text-[10px] opacity-50">duration</Badge>
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-zinc-500">5 Seconds</Label>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                className="bg-zinc-900 border-white/5 h-9"
                                                value={editingRulesModel?.editedRules?.duration?.["5"] || 0}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const newRules = { ...editingRulesModel?.editedRules };
                                                    if (!newRules.duration) newRules.duration = {};
                                                    newRules.duration["5"] = val;
                                                    handleRulesChange(editingRulesModel!.model_id, newRules);
                                                }}
                                            />
                                            <span className="text-[10px] text-zinc-500">tokens</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-zinc-500">10 Seconds</Label>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                className="bg-zinc-900 border-white/5 h-9"
                                                value={editingRulesModel?.editedRules?.duration?.["10"] || 0}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 0;
                                                    const newRules = { ...editingRulesModel?.editedRules };
                                                    if (!newRules.duration) newRules.duration = {};
                                                    newRules.duration["10"] = val;
                                                    handleRulesChange(editingRulesModel!.model_id, newRules);
                                                }}
                                            />
                                            <span className="text-[10px] text-zinc-500">tokens</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {/* 3. Custom/Raw Rules Section (For anything else) */}
                        <div className="space-y-3 pt-2 border-t border-white/5">
                            <h3 className="text-sm font-medium text-zinc-300 flex items-center justify-between">
                                Other Custom Rules
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 text-[10px] text-indigo-400"
                                    onClick={() => {
                                        const param = prompt("Enter parameter key (e.g. 'steps', 'duration', 'num_images'):");
                                        if (param) {
                                            const value = prompt(`Enter value key for '${param}' (e.g. 'high', '30s', '4'):`);
                                            if (value) {
                                                const newRules = { ...editingRulesModel?.editedRules };
                                                if (!newRules[param]) newRules[param] = {};
                                                newRules[param][value] = 0;
                                                handleRulesChange(editingRulesModel!.model_id, newRules);
                                            }
                                        }
                                    }}
                                >
                                    <Plus className="w-3 h-3 mr-1" /> Add Key
                                </Button>
                            </h3>
                            
                            <div className="space-y-4">
                                {Object.entries(editingRulesModel?.editedRules || {})
                                    .filter(([key]) => key !== 'resolution' && key !== 'audio')
                                    .map(([paramKey, values]) => (
                                        <div key={paramKey} className="p-3 rounded-lg bg-zinc-900/50 border border-white/5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-[10px] bg-indigo-500/5 text-indigo-300 border-indigo-500/20 uppercase tracking-wider">
                                                    {paramKey}
                                                </Badge>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-5 w-5 p-0 text-zinc-500 hover:text-red-400"
                                                    onClick={() => {
                                                        const newRules = { ...editingRulesModel?.editedRules };
                                                        delete newRules[paramKey];
                                                        handleRulesChange(editingRulesModel!.model_id, newRules);
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {Object.entries(values as Record<string, number>).map(([valKey, tokenCost]) => (
                                                    <div key={valKey} className="space-y-1">
                                                        <Label className="text-[10px] text-zinc-500">{valKey}</Label>
                                                        <div className="flex items-center gap-2">
                                                            <Input 
                                                                type="number" 
                                                                className="bg-zinc-900 border-white/5 h-8 text-xs"
                                                                value={tokenCost}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) || 0;
                                                                    const newRules = { ...editingRulesModel?.editedRules };
                                                                    newRules[paramKey][valKey] = val;
                                                                    handleRulesChange(editingRulesModel!.model_id, newRules);
                                                                }}
                                                            />
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="h-6 w-6 p-0 text-zinc-600 hover:text-red-400"
                                                                onClick={() => {
                                                                    const newRules = { ...editingRulesModel?.editedRules };
                                                                    delete newRules[paramKey][valKey];
                                                                    if (Object.keys(newRules[paramKey]).length === 0) delete newRules[paramKey];
                                                                    handleRulesChange(editingRulesModel!.model_id, newRules);
                                                                }}
                                                            >
                                                                <Trash2 className="w-2.5 h-2.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 border border-dashed border-white/5 text-[10px] text-zinc-500"
                                                    onClick={() => {
                                                        const val = prompt(`Enter new value key for '${paramKey}':`);
                                                        if (val) {
                                                            const newRules = { ...editingRulesModel?.editedRules };
                                                            newRules[paramKey][val] = 0;
                                                            handleRulesChange(editingRulesModel!.model_id, newRules);
                                                        }
                                                    }}
                                                >
                                                    <Plus className="w-3 h-3 mr-1" /> Add Value
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-zinc-400 leading-relaxed">
                            <p className="font-bold text-indigo-400 mb-1">How rules work:</p>
                            If rules are defined, they are <strong>summed up</strong>. For example, if resolution is 4K (20 tokens) and audio is True (5 tokens), the total cost will be 25 tokens extra. If no rules match, it falls back to the <strong>Base Cost</strong>.
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setEditingRulesModel(null)} className="text-zinc-400">
                            Close
                        </Button>
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700"
                            onClick={() => {
                                if (editingRulesModel) {
                                    saveModel(editingRulesModel);
                                    setEditingRulesModel(null);
                                }
                            }}
                        >
                            Save Rules
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
