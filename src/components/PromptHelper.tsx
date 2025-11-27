import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, Loader2, Wand2, ChevronDown, ChevronUp, 
  Lightbulb, Zap, Palette, Camera, Film, Copy, Check,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { ENV } from "@/config/env";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PromptHelperProps {
  onSelectPrompt: (prompt: string) => void;
  currentPrompt?: string;
  section?: "template" | "description" | "badge" | "video";
  eventType?: string;
  styleHints?: string;
  placeholder?: string;
}

interface PromptSuggestion {
  enhanced_prompt: string;
  explanation: string;
  tips: string[];
  alternative_prompts: string[];
}

// Quick enhancement chips
const QUICK_ENHANCEMENTS = [
  { id: "more_detail", label: "Add Detail", icon: Zap },
  { id: "more_dramatic", label: "More Dramatic", icon: Sparkles },
  { id: "more_professional", label: "Professional", icon: Camera },
  { id: "more_creative", label: "Creative", icon: Palette },
  { id: "simplify", label: "Simplify", icon: ArrowRight },
];

// Style chips for quick additions
const STYLE_CHIPS = {
  template: [
    { label: "Cinematic", hint: "cinematic lighting, dramatic shadows" },
    { label: "Neon", hint: "neon lights, cyberpunk, vibrant colors" },
    { label: "Vintage", hint: "vintage film, retro, nostalgic" },
    { label: "Professional", hint: "professional studio, clean backdrop" },
    { label: "Fantasy", hint: "magical, ethereal, fantasy world" },
    { label: "Minimalist", hint: "clean, simple, modern" },
  ],
  video: [
    { label: "Zoom In", hint: "slow zoom in towards subject" },
    { label: "Pan", hint: "gentle horizontal pan" },
    { label: "Parallax", hint: "parallax depth effect" },
    { label: "Breathing", hint: "subtle breathing motion" },
  ],
  badge: [
    { label: "Corporate", hint: "professional, clean, corporate style" },
    { label: "Creative", hint: "artistic, unique, creative design" },
    { label: "Themed", hint: "event themed, branded look" },
  ],
  description: [
    { label: "Exciting", hint: "exciting, engaging, fun" },
    { label: "Professional", hint: "professional, corporate" },
    { label: "Casual", hint: "casual, friendly, approachable" },
  ],
};

export function PromptHelper({ 
  onSelectPrompt, 
  currentPrompt = "",
  section = "template",
  eventType,
  styleHints,
  placeholder = "Describe what you want to create..."
}: PromptHelperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userRequest, setUserRequest] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<PromptSuggestion | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGeneratePrompt = async (request?: string) => {
    const requestText = request || userRequest;
    if (!requestText.trim() && !currentPrompt) {
      toast.error("Please enter what you want to create");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${ENV.API_URL}/api/prompt-helper/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_request: requestText || "Improve this prompt",
          section,
          current_prompt: currentPrompt || undefined,
          event_type: eventType,
          style_hints: styleHints,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate prompt");
      }

      const data: PromptSuggestion = await response.json();
      setSuggestion(data);
      setIsOpen(true);
    } catch (error) {
      console.error("Error generating prompt:", error);
      toast.error("Failed to generate prompt. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickEnhance = async (enhancementType: string) => {
    if (!currentPrompt) {
      toast.error("Please write a prompt first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${ENV.API_URL}/api/prompt-helper/quick-enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: currentPrompt,
          enhancement_type: enhancementType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to enhance prompt");
      }

      const data: PromptSuggestion = await response.json();
      setSuggestion(data);
      setIsOpen(true);
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      toast.error("Failed to enhance prompt. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPrompt = (prompt: string, index?: number) => {
    onSelectPrompt(prompt);
    if (index !== undefined) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
    toast.success("Prompt applied!");
  };

  const handleAddStyleChip = (hint: string) => {
    const newPrompt = currentPrompt 
      ? `${currentPrompt}, ${hint}`
      : hint;
    onSelectPrompt(newPrompt);
    toast.success("Style added to prompt");
  };

  const styleChips = STYLE_CHIPS[section] || STYLE_CHIPS.template;

  return (
    <div className="space-y-3">
      {/* Header with AI Helper branding */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30">
            <Wand2 className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm font-medium text-white">Prompt Helper</span>
          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-300 border-purple-500/20">
            AI
          </Badge>
        </div>
      </div>

      {/* Quick Style Chips */}
      <div className="flex flex-wrap gap-1.5">
        {styleChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => handleAddStyleChip(chip.hint)}
            className="px-2 py-1 text-xs rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/5 transition-colors"
          >
            + {chip.label}
          </button>
        ))}
      </div>

      {/* Quick Enhancement Buttons */}
      {currentPrompt && (
        <div className="flex flex-wrap gap-2">
          {QUICK_ENHANCEMENTS.map((enhancement) => (
            <Button
              key={enhancement.id}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickEnhance(enhancement.id)}
              disabled={isLoading}
              className="h-7 text-xs border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
            >
              <enhancement.icon className="w-3 h-3 mr-1" />
              {enhancement.label}
            </Button>
          ))}
        </div>
      )}

      {/* AI Request Input */}
      <div className="flex gap-2">
        <Input
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          placeholder={placeholder}
          className="bg-black/40 border-white/10 text-white text-sm placeholder:text-zinc-500"
          onKeyDown={(e) => e.key === "Enter" && handleGeneratePrompt()}
        />
        <Button
          type="button"
          onClick={() => handleGeneratePrompt()}
          disabled={isLoading}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              Generate
            </>
          )}
        </Button>
      </div>

      {/* AI Suggestion Results */}
      {suggestion && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between p-3 h-auto bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 text-white"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium">AI Suggestions</span>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-3">
            {/* Main Enhanced Prompt */}
            <div className="p-3 rounded-lg bg-black/40 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-purple-300">Enhanced Prompt</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleApplyPrompt(suggestion.enhanced_prompt, -1)}
                  className="h-7 text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
                >
                  {copiedIndex === -1 ? (
                    <Check className="w-3 h-3 mr-1 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}
                  Apply
                </Button>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{suggestion.enhanced_prompt}</p>
              <p className="text-xs text-zinc-500 mt-2 italic">{suggestion.explanation}</p>
            </div>

            {/* Tips */}
            {suggestion.tips.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-xs font-medium text-amber-300 block mb-2">💡 Tips</span>
                <ul className="space-y-1">
                  {suggestion.tips.map((tip, i) => (
                    <li key={i} className="text-xs text-amber-200/80">• {tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Alternative Prompts */}
            {suggestion.alternative_prompts.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-zinc-400">Alternatives</span>
                {suggestion.alternative_prompts.map((alt, i) => (
                  <div
                    key={i}
                    className="p-2 rounded-lg bg-black/30 border border-white/5 flex items-start justify-between gap-2 group hover:border-white/10 transition-colors"
                  >
                    <p className="text-xs text-zinc-400 flex-1">{alt}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApplyPrompt(alt, i)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedIndex === i ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-400" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

