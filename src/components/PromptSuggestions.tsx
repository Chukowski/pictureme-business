import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || '';

interface PromptSuggestion {
  id: string;
  category: string;
  name: string;
  prompt: string;
  tags: string[];
}

interface PromptSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
  currentPrompt?: string;
}

export function PromptSuggestions({ onSelectPrompt, currentPrompt }: PromptSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/prompts/suggestions`);

      if (!response.ok) {
        throw new Error("Failed to load prompt suggestions");
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Error loading prompt suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to load prompt suggestions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(suggestions.map((s) => s.category)));

  const filteredSuggestions = selectedCategory
    ? suggestions.filter((s) => s.category === selectedCategory)
    : suggestions;

  const handleCopy = (suggestion: PromptSuggestion) => {
    onSelectPrompt(suggestion.prompt);
    setCopiedId(suggestion.id);
    toast({
      title: "Prompt copied",
      description: `"${suggestion.name}" prompt has been applied`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Prompt Suggestions
        </CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            type="button"
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              type="button"
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No suggestions available</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {filteredSuggestions.map((suggestion) => (
              <Card
                key={suggestion.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  currentPrompt === suggestion.prompt
                    ? "border-primary ring-2 ring-primary"
                    : ""
                }`}
                onClick={() => handleCopy(suggestion)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-sm">{suggestion.name}</h4>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {suggestion.category}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(suggestion);
                      }}
                    >
                      {copiedId === suggestion.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {suggestion.prompt}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {suggestion.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

