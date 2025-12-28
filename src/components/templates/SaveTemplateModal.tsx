import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserTemplateType } from "@/hooks/useMyTemplates";

export interface SaveTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    prompt: string;
    model: string;
    aspectRatio?: string;
    duration?: string;
    tags: string[];
    type: UserTemplateType;
  }) => void;
  defaults: {
    prompt: string;
    model: string;
    aspectRatio?: string;
    duration?: string;
    type: UserTemplateType;
  };
}

export const SaveTemplateModal = ({
  open,
  onClose,
  onSave,
  defaults,
}: SaveTemplateModalProps) => {
  const [name, setName] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({
      name: name.trim(),
      prompt: defaults.prompt,
      model: defaults.model,
      aspectRatio: defaults.aspectRatio,
      duration: defaults.duration,
      tags,
      type: defaults.type,
    });
    setName("");
    setTagsInput("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Save as template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">Template name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My cinematic portrait"
              className="bg-[#101112]/40 border-white/10 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-zinc-400">Tags (comma separated)</Label>
            <Textarea
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="portrait, warm, filmic"
              className="bg-[#101112]/40 border-white/10 text-white"
              rows={2}
            />
          </div>
          <div className="text-xs text-zinc-500 bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="font-semibold text-zinc-300 mb-1">What will be saved:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Prompt</li>
              <li>Selected model</li>
              <li>Aspect ratio {defaults.type === "video" ? "and duration" : ""}</li>
            </ul>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="text-zinc-300">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-white text-black hover:bg-zinc-200">
            Save template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

