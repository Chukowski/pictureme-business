/**
 * TemplateLibrary Component
 * 
 * Gallery view for selecting/importing templates from the marketplace.
 * Used in AdminEventForm to add templates from user's library.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Loader2, 
  Image as ImageIcon, 
  Video, 
  Sparkles,
  Check,
  Library,
  Globe,
  Lock,
  Coins
} from 'lucide-react';
import { ENV } from '@/config/env';
import { cn } from '@/lib/utils';

interface MarketplaceTemplate {
  id: string;
  name: string;
  description?: string;
  preview_image?: string;
  template_type?: string;
  is_public?: boolean;
  price_tokens?: number;
  creator_id?: string;
  pipeline_config?: {
    imageModel?: string;
    videoModel?: string;
    enableFaceswap?: boolean;
  };
}

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: MarketplaceTemplate) => void;
  selectedIds?: string[];
  multiSelect?: boolean;
}

export function TemplateLibrary({
  open,
  onOpenChange,
  onSelect,
  selectedIds = [],
  multiSelect = false
}: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [libraryItems, setLibraryItems] = useState<MarketplaceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('library');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(selectedIds);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const baseUrl = ENV.API_URL || '';
      
      const [libraryRes, publicRes] = await Promise.all([
        fetch(`${baseUrl}/api/marketplace/my-library`, { headers }),
        fetch(`${baseUrl}/api/marketplace/templates?is_public=true`, { headers })
      ]);

      if (libraryRes.ok) {
        const libraryData = await libraryRes.json();
        setLibraryItems(libraryData);
      }

      if (publicRes.ok) {
        const publicData = await publicRes.json();
        setTemplates(publicData);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (template: MarketplaceTemplate) => {
    if (multiSelect) {
      setSelectedTemplates(prev => 
        prev.includes(template.id) 
          ? prev.filter(id => id !== template.id)
          : [...prev, template.id]
      );
    } else {
      onSelect(template);
      onOpenChange(false);
    }
  };

  const handleConfirmMultiSelect = () => {
    const selected = [...libraryItems, ...templates].filter(t => 
      selectedTemplates.includes(t.id)
    );
    selected.forEach(t => onSelect(t));
    onOpenChange(false);
  };

  const filteredTemplates = (items: MarketplaceTemplate[]) => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.description?.toLowerCase().includes(query)
    );
  };

  const renderTemplateCard = (template: MarketplaceTemplate, isLibraryItem = false) => {
    const isSelected = selectedTemplates.includes(template.id);
    const hasVideo = template.pipeline_config?.videoModel;
    const hasFaceswap = template.pipeline_config?.enableFaceswap;

    return (
      <Card 
        key={template.id}
        className={cn(
          "cursor-pointer transition-all duration-200 hover:border-indigo-500/50",
          "bg-slate-800/50 border-slate-700",
          isSelected && "border-indigo-500 ring-2 ring-indigo-500/20"
        )}
        onClick={() => handleSelect(template)}
      >
        <CardContent className="p-3">
          {/* Preview Image */}
          <div className="aspect-video rounded-lg bg-slate-700/50 mb-3 overflow-hidden relative">
            {template.preview_image ? (
              <img 
                src={template.preview_image} 
                alt={template.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-slate-500" />
              </div>
            )}
            
            {/* Selection Indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Price Badge */}
            {!isLibraryItem && template.price_tokens && template.price_tokens > 0 && (
              <div className="absolute bottom-2 right-2">
                <Badge className="bg-amber-500/90 text-white">
                  <Coins className="w-3 h-3 mr-1" />
                  {template.price_tokens}
                </Badge>
              </div>
            )}
          </div>

          {/* Template Info */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <h4 className="font-medium text-white text-sm truncate flex-1">
                {template.name}
              </h4>
              {template.is_public ? (
                <Globe className="w-4 h-4 text-green-400 flex-shrink-0 ml-2" />
              ) : (
                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
              )}
            </div>

            {/* Feature Badges */}
            <div className="flex flex-wrap gap-1">
              {hasVideo && (
                <Badge variant="secondary" className="text-xs">
                  <Video className="w-3 h-3 mr-1" />
                  Video
                </Badge>
              )}
              {hasFaceswap && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Faceswap
                </Badge>
              )}
              {isLibraryItem && (
                <Badge variant="outline" className="text-xs text-green-400 border-green-400/50">
                  <Library className="w-3 h-3 mr-1" />
                  In Library
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Library className="w-5 h-5" />
            Template Library
          </DialogTitle>
          <DialogDescription>
            Select templates to add to your event
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-700/50 border-slate-600"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="bg-slate-700/50">
            <TabsTrigger value="library">
              My Library ({libraryItems.length})
            </TabsTrigger>
            <TabsTrigger value="marketplace">
              Marketplace ({templates.length})
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
          ) : (
            <>
              <TabsContent value="library" className="flex-1 overflow-auto mt-4">
                {filteredTemplates(libraryItems).length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Library className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No templates in your library</p>
                    <p className="text-sm mt-2">Browse the marketplace to add templates</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredTemplates(libraryItems).map(t => renderTemplateCard(t, true))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="marketplace" className="flex-1 overflow-auto mt-4">
                {filteredTemplates(templates).length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No public templates available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredTemplates(templates).map(t => renderTemplateCard(t, false))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>

        {/* Multi-select Footer */}
        {multiSelect && selectedTemplates.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              {selectedTemplates.length} template(s) selected
            </p>
            <Button onClick={handleConfirmMultiSelect}>
              Add Selected Templates
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TemplateLibrary;

