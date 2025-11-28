/**
 * TemplatePurchaseModal Component
 * 
 * UI for purchasing premium templates from the marketplace.
 * Handles token-based purchases and Stripe checkout for paid templates.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Coins, 
  CreditCard, 
  ShoppingCart, 
  Check, 
  Loader2,
  Image as ImageIcon,
  Video,
  Sparkles,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { ENV } from '@/config/env';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  description?: string;
  preview_image?: string;
  price_tokens?: number;
  template_type?: string;
  pipeline_config?: {
    imageModel?: string;
    videoModel?: string;
    enableFaceswap?: boolean;
  };
  creator?: {
    name: string;
    avatar?: string;
  };
}

interface TemplatePurchaseModalProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userTokens?: number;
}

export function TemplatePurchaseModal({
  template,
  open,
  onOpenChange,
  onSuccess,
  userTokens = 0
}: TemplatePurchaseModalProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseComplete, setPurchaseComplete] = useState(false);

  if (!template) return null;

  const price = template.price_tokens || 0;
  const canAfford = userTokens >= price;
  const isFree = price === 0;

  const handlePurchase = async () => {
    setIsPurchasing(true);
    setError(null);

    const token = localStorage.getItem('auth_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const baseUrl = ENV.API_URL || '';
      
      // Add to library (handles token deduction on backend)
      const res = await fetch(`${baseUrl}/api/marketplace/library`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ template_id: template.id })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Purchase failed');
      }

      setPurchaseComplete(true);
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setPurchaseComplete(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleBuyTokens = () => {
    // Redirect to billing page to purchase tokens
    window.location.href = '/admin/billing?action=buy-tokens';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShoppingCart className="w-5 h-5" />
            {isFree ? 'Add to Library' : 'Purchase Template'}
          </DialogTitle>
          <DialogDescription>
            {isFree 
              ? 'Add this free template to your library'
              : 'Use tokens to unlock this template'}
          </DialogDescription>
        </DialogHeader>

        {purchaseComplete ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Added to Library!
            </h3>
            <p className="text-slate-400">
              You can now use this template in your events
            </p>
          </div>
        ) : (
          <>
            {/* Template Preview */}
            <Card className="bg-slate-700/30 border-slate-600">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Preview Image */}
                  <div className="w-24 h-24 rounded-lg bg-slate-700/50 overflow-hidden flex-shrink-0">
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
                  </div>

                  {/* Template Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white truncate">
                      {template.name}
                    </h4>
                    {template.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mt-1">
                        {template.description}
                      </p>
                    )}
                    
                    {/* Feature Badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.pipeline_config?.videoModel && (
                        <Badge variant="secondary" className="text-xs">
                          <Video className="w-3 h-3 mr-1" />
                          Video
                        </Badge>
                      )}
                      {template.pipeline_config?.enableFaceswap && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Faceswap
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator className="bg-slate-700" />

            {/* Price & Balance */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Template Price</span>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white">
                    {isFree ? 'FREE' : `${price} tokens`}
                  </span>
                </div>
              </div>

              {!isFree && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Your Balance</span>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-indigo-400" />
                    <span className={cn(
                      "font-bold",
                      canAfford ? "text-green-400" : "text-red-400"
                    )}>
                      {userTokens} tokens
                    </span>
                  </div>
                </div>
              )}

              {!isFree && !canAfford && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-400 font-medium">
                        Insufficient tokens
                      </p>
                      <p className="text-xs text-red-400/80 mt-1">
                        You need {price - userTokens} more tokens to purchase this template
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="border-slate-600"
              >
                Cancel
              </Button>
              
              {!isFree && !canAfford ? (
                <Button onClick={handleBuyTokens}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Buy Tokens
                </Button>
              ) : (
                <Button 
                  onClick={handlePurchase}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {isFree ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Add to Library
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 mr-2" />
                          Purchase for {price} tokens
                        </>
                      )}
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default TemplatePurchaseModal;

