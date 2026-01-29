import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Plus,
    Trash2,
    MoveUp,
    MoveDown,
    Image as ImageIcon,
    Video,
    Wand2,
    ArrowRight,
    Sparkles,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCAL_IMAGE_MODELS, LOCAL_VIDEO_MODELS } from "@/services/aiProcessor";
import type { WorkflowStep, WorkflowStepType, WorkflowPipeline } from "@/services/marketplaceApi";

interface WorkflowBuilderProps {
    workflow: WorkflowPipeline | undefined;
    onChange: (workflow: WorkflowPipeline) => void;
}

const STEP_TYPES: { value: WorkflowStepType; label: string; icon: any; description: string }[] = [
    { value: 'text-to-image', label: 'Text → Image', icon: Wand2, description: 'Generate image from prompt' },
    { value: 'image-to-image', label: 'Image → Image', icon: ImageIcon, description: 'Edit/transform image' },
    { value: 'faceswap', label: 'Face Swap', icon: Users, description: 'Apply face swap' },
    { value: 'image-to-video', label: 'Image → Video', icon: Video, description: 'Animate image' },
    { value: 'video-to-video', label: 'Video → Video', icon: Video, description: 'Motion control' },
    { value: 'text-to-video', label: 'Text → Video', icon: Sparkles, description: 'Generate video' },
];

// Get models from aiProcessor constants (include ALL models, even variants)
const IMAGE_MODELS = LOCAL_IMAGE_MODELS.map(m => ({
    value: m.shortId,
    label: m.name,
    cost: m.cost
}));

const VIDEO_MODELS = LOCAL_VIDEO_MODELS.map(m => ({
    value: m.shortId,
    label: m.name,
    cost: m.cost
}));

export function WorkflowBuilder({ workflow, onChange }: WorkflowBuilderProps) {
    const [expandedStep, setExpandedStep] = useState<string | null>(null);

    const steps = workflow?.steps || [];

    const addStep = (type: WorkflowStepType) => {
        // Get default model based on step type
        const defaultImageModel = IMAGE_MODELS[0]?.value || 'seedream-v4.5';
        const defaultVideoModel = VIDEO_MODELS.find(m => m.value.includes('fast'))?.value || VIDEO_MODELS[0]?.value || 'veo-3.1-fast';
        
        const newStep: WorkflowStep = {
            id: `step-${Date.now()}`,
            type,
            name: STEP_TYPES.find(t => t.value === type)?.label || 'New Step',
            model: type.includes('video') ? defaultVideoModel : defaultImageModel,
            prompt: '',
            negative_prompt: '',
            reference_images: [],
            reference_elements: [],
            settings: {
                aspectRatio: '9:16',
                strength: 0.8,
                faceswapEnabled: false,
            }
        };

        onChange({
            steps: [...steps, newStep],
            final_output: workflow?.final_output || {
                type: 'image',
                preview_url: '',
                preview_images: []
            }
        });
        setExpandedStep(newStep.id);
    };

    const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
        onChange({
            ...workflow!,
            steps: steps.map(s => s.id === id ? { ...s, ...updates } : s)
        });
    };

    const deleteStep = (id: string) => {
        onChange({
            ...workflow!,
            steps: steps.filter(s => s.id !== id)
        });
        if (expandedStep === id) setExpandedStep(null);
    };

    const moveStep = (id: string, direction: 'up' | 'down') => {
        const index = steps.findIndex(s => s.id === id);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === steps.length - 1) return;

        const newSteps = [...steps];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];

        onChange({
            ...workflow!,
            steps: newSteps
        });
    };

    const getStepIcon = (type: WorkflowStepType) => {
        const stepType = STEP_TYPES.find(t => t.value === type);
        return stepType?.icon || Wand2;
    };

    const getModelOptions = (type: WorkflowStepType) => {
        return type.includes('video') ? VIDEO_MODELS : IMAGE_MODELS;
    };

    return (
        <div className="space-y-4">
            <Card className="border-border/40 shadow-sm bg-card/30 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        Workflow Pipeline
                    </CardTitle>
                    <CardDescription>
                        Build complex AI workflows by chaining multiple steps together
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Workflow Steps */}
                    {steps.length > 0 && (
                        <div className="space-y-3">
                            {steps.map((step, index) => {
                                const StepIcon = getStepIcon(step.type);
                                const isExpanded = expandedStep === step.id;

                                return (
                                    <div key={step.id} className="relative">
                                        {/* Step Header */}
                                        <div
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                                isExpanded
                                                    ? "border-purple-500/50 bg-purple-500/10"
                                                    : "border-white/10 bg-white/5 hover:border-white/20"
                                            )}
                                            onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                                        >
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-400">
                                                <span className="text-xs font-bold">{index + 1}</span>
                                            </div>
                                            <StepIcon className="w-4 h-4 text-purple-400" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{step.name}</p>
                                                <p className="text-xs text-zinc-500">{step.model}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveStep(step.id, 'up');
                                                    }}
                                                    disabled={index === 0}
                                                >
                                                    <MoveUp className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        moveStep(step.id, 'down');
                                                    }}
                                                    disabled={index === steps.length - 1}
                                                >
                                                    <MoveDown className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-red-400 hover:text-red-300"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteStep(step.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Step Details (Expanded) */}
                                        {isExpanded && (
                                            <div className="mt-2 p-4 rounded-lg border border-purple-500/30 bg-purple-500/5 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Step Name</Label>
                                                        <Input
                                                            value={step.name}
                                                            onChange={(e) => updateStep(step.id, { name: e.target.value })}
                                                            className="h-9 text-sm"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">AI Model</Label>
                                                        <select
                                                            value={step.model}
                                                            onChange={(e) => updateStep(step.id, { model: e.target.value })}
                                                            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
                                                        >
                                                            {getModelOptions(step.type).map(model => (
                                                                <option key={model.value} value={model.value}>
                                                                    {model.label} ({model.cost} tokens)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs">Prompt</Label>
                                                    <Textarea
                                                        value={step.prompt || ''}
                                                        onChange={(e) => updateStep(step.id, { prompt: e.target.value })}
                                                        placeholder="Describe what you want to generate..."
                                                        className="h-20 text-sm font-mono"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs">Negative Prompt (Optional)</Label>
                                                    <Textarea
                                                        value={step.negative_prompt || ''}
                                                        onChange={(e) => updateStep(step.id, { negative_prompt: e.target.value })}
                                                        placeholder="What to avoid..."
                                                        className="h-16 text-sm font-mono opacity-70"
                                                    />
                                                </div>

                                                {/* Settings */}
                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                    {(step.type === 'image-to-image' || step.type === 'image-to-video') && (
                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Strength</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                max={1}
                                                                step={0.1}
                                                                value={step.settings?.strength || 0.8}
                                                                onChange={(e) => updateStep(step.id, {
                                                                    settings: { ...step.settings, strength: parseFloat(e.target.value) }
                                                                })}
                                                                className="h-9 text-sm"
                                                            />
                                                        </div>
                                                    )}
                                                    {step.type.includes('video') && (
                                                        <>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Duration (seconds)</Label>
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    max={10}
                                                                    value={step.settings?.duration || 5}
                                                                    onChange={(e) => updateStep(step.id, {
                                                                        settings: { ...step.settings, duration: parseInt(e.target.value) }
                                                                    })}
                                                                    className="h-9 text-sm"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">FPS</Label>
                                                                <select
                                                                    value={step.settings?.fps || 24}
                                                                    onChange={(e) => updateStep(step.id, {
                                                                        settings: { ...step.settings, fps: parseInt(e.target.value) }
                                                                    })}
                                                                    className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm"
                                                                >
                                                                    <option value={24}>24 FPS</option>
                                                                    <option value={30}>30 FPS</option>
                                                                    <option value={60}>60 FPS</option>
                                                                </select>
                                                            </div>
                                                        </>
                                                    )}
                                                    <div className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-white/5 col-span-2">
                                                        <Label className="text-xs">Enable Face-Swap</Label>
                                                        <Switch
                                                            checked={step.settings?.faceswapEnabled || false}
                                                            onCheckedChange={(checked) => updateStep(step.id, {
                                                                settings: { ...step.settings, faceswapEnabled: checked }
                                                            })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Arrow between steps */}
                                        {index < steps.length - 1 && (
                                            <div className="flex justify-center py-2">
                                                <ArrowRight className="w-4 h-4 text-purple-400" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add Step Buttons */}
                    <div className="pt-4 border-t border-white/5">
                        <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">
                            Add Workflow Step
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {STEP_TYPES.map(stepType => {
                                const Icon = stepType.icon;
                                return (
                                    <Button
                                        key={stepType.value}
                                        variant="outline"
                                        size="sm"
                                        className="h-auto py-3 flex-col gap-1 hover:border-purple-500/50 hover:bg-purple-500/10"
                                        onClick={() => addStep(stepType.value)}
                                    >
                                        <Icon className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs font-medium">{stepType.label}</span>
                                        <span className="text-[10px] text-zinc-500">{stepType.description}</span>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Empty State */}
                    {steps.length === 0 && (
                        <div className="text-center py-8 text-zinc-500">
                            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium">No workflow steps yet</p>
                            <p className="text-xs">Add steps above to build your AI pipeline</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
