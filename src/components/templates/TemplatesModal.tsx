import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserTemplate } from "@/hooks/useMyTemplates";

interface TemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (template: UserTemplate) => void;
  featured: UserTemplate[];
  predefined: UserTemplate[];
  userTemplates: UserTemplate[];
}

const TemplateGrid = ({
  items,
  emptyText,
  onSelect,
}: {
  items: UserTemplate[];
  emptyText: string;
  onSelect: (tpl: UserTemplate) => void;
}) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-sm text-zinc-500 text-center py-10">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((tpl) => (
        <div
          key={tpl.id}
          className="border border-white/10 rounded-lg p-3 bg-[#101112]/30 hover:border-white/30 transition cursor-pointer"
          onClick={() => onSelect(tpl)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-white font-semibold truncate">{tpl.name}</div>
            <Badge className="bg-white/10 text-white border-white/10 text-[10px]">
              {tpl.type === "video" ? "Video" : "Photo"}
            </Badge>
          </div>
          <div className="text-xs text-zinc-400 line-clamp-2 mb-2">
            {tpl.prompt}
          </div>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px] border-white/10">
              {tpl.model}
            </Badge>
            {tpl.aspectRatio && (
              <Badge variant="outline" className="text-[10px] border-white/10">
                {tpl.aspectRatio}
              </Badge>
            )}
            {tpl.duration && (
              <Badge variant="outline" className="text-[10px] border-white/10">
                {tpl.duration}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export const TemplatesModal = ({
  open,
  onClose,
  onSelect,
  featured,
  predefined,
  userTemplates,
}: TemplatesModalProps) => {
  const [tab, setTab] = useState("featured");

  const handleSelect = (tpl: UserTemplate) => {
    onSelect(tpl);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Templates & presets</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="featured">Destacados</TabsTrigger>
            <TabsTrigger value="predefined">Predefinidos</TabsTrigger>
            <TabsTrigger value="mine">Mis templates</TabsTrigger>
          </TabsList>

          <TabsContent value="featured">
            <TemplateGrid
              items={featured}
              emptyText="No featured templates yet."
              onSelect={handleSelect}
            />
          </TabsContent>
          <TabsContent value="predefined">
            <TemplateGrid
              items={predefined}
              emptyText="No predefined templates."
              onSelect={handleSelect}
            />
          </TabsContent>
          <TabsContent value="mine">
            <TemplateGrid
              items={userTemplates}
              emptyText="Aún no guardas templates. Guarda uno desde un resultado."
              onSelect={handleSelect}
            />
          </TabsContent>
        </Tabs>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose} className="text-zinc-300">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

