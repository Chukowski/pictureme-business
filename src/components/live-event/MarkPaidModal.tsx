import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CreditCard, Banknote, Package, Image, Printer, 
  Loader2, Check, DollarSign
} from "lucide-react";
import { 
  createTransaction, 
  CreateTransactionRequest,
  updateAlbumStatus,
} from "@/services/eventsApi";
import { toast } from "sonner";

interface MarkPaidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albumCode: string;
  albumOwnerName?: string;
  eventId: number;
  eventConfig?: any;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'external', label: 'Other', icon: DollarSign },
];

export function MarkPaidModal({ 
  open, 
  onOpenChange, 
  albumCode,
  albumOwnerName,
  eventId, 
  eventConfig,
  onSuccess 
}: MarkPaidModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saleType, setSaleType] = useState<'digital' | 'print' | 'package'>('digital');

  // Get pricing config - check both pricing field and top-level for backwards compat
  const pricing = eventConfig?.pricing || {
    currency: 'USD',
    taxRate: 0,
    albumPricing: { packages: [] },
    photoPricing: { digitalPrice: 0, printPrice: 0 },
  };
  
  const currency = pricing.currency || 'USD';
  const currencySymbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const taxRate = pricing.taxRate || 0;
  const taxName = pricing.taxName || 'Tax';
  
  const packages = pricing.albumPricing?.packages || [];
  const photoPricing = pricing.photoPricing || { digitalPrice: 0, printPrice: 0 };
  const isPayPerAlbum = eventConfig?.eventMode === 'pay_per_album';
  const isPayPerPhoto = eventConfig?.eventMode === 'pay_per_photo';
  const isPaidMode = isPayPerAlbum || isPayPerPhoto;
  const hasPackages = packages.length > 0;


  // Set default values based on event mode
  useEffect(() => {
    if (open) {
      if (hasPackages) {
        const defaultPkg = packages.find((p: any) => p.isDefault) || packages[0];
        setSelectedPackageId(defaultPkg.id);
        setSaleType('package');
        setCustomAmount('');
      } else if (photoPricing.digitalPrice > 0) {
        setSaleType('digital');
        setCustomAmount(photoPricing.digitalPrice.toString());
      } else {
        setSaleType('digital');
        setCustomAmount('');
      }
      setPaymentMethod('cash');
    }
  }, [open, hasPackages, packages, photoPricing.digitalPrice]);

  // Get selected package
  const selectedPackage = packages.find((p: any) => p.id === selectedPackageId);
  
  // Calculate amounts based on sale type
  let baseAmount = 0;
  let packageName = '';
  
  if (saleType === 'package' && selectedPackage) {
    baseAmount = selectedPackage.price || 0;
    packageName = selectedPackage.name || 'Album Package';
  } else if (saleType === 'digital') {
    baseAmount = parseFloat(customAmount) || 0;
    packageName = 'Digital Download';
  } else if (saleType === 'print') {
    baseAmount = parseFloat(customAmount) || 0;
    packageName = 'Print Order';
  }
  
  const taxAmount = baseAmount * taxRate;
  const totalAmount = baseAmount + taxAmount;

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      if (totalAmount > 0) {
        // Create transaction record
        const data: CreateTransactionRequest = {
          album_code: albumCode,
          package_id: saleType === 'package' ? selectedPackageId : undefined,
          package_name: packageName,
          item_count: 1,
          amount: baseAmount,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          currency,
          payment_method: paymentMethod,
          customer_name: albumOwnerName,
          generate_invoice: false,
        };

        await createTransaction(eventId, data);
        toast.success('Payment recorded!');
      } else {
        // Just mark as paid without transaction
        await updateAlbumStatus(albumCode, 'paid');
        toast.success('Album marked as paid!');
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to process payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-400" />
            Mark as Paid
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Album: <span className="font-mono text-white">{albumCode}</span>
            {albumOwnerName && <span className="ml-2">• {albumOwnerName}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          {/* If packages are configured, show them as main options */}
          {hasPackages ? (
            <div className="space-y-2">
              <Label className="text-zinc-300">Select what the customer paid for</Label>
              <div className="space-y-2">
                {packages.map((pkg: any) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => {
                      setSelectedPackageId(pkg.id);
                      setSaleType('package');
                    }}
                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                      selectedPackageId === pkg.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-white/10 bg-black/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        pkg.includesDigital && pkg.printQuantity > 0 
                          ? 'bg-purple-500/20' 
                          : pkg.printQuantity > 0 
                            ? 'bg-orange-500/20' 
                            : 'bg-blue-500/20'
                      }`}>
                        {pkg.includesDigital && pkg.printQuantity > 0 ? (
                          <Package className="w-5 h-5 text-purple-400" />
                        ) : pkg.printQuantity > 0 ? (
                          <Printer className="w-5 h-5 text-orange-400" />
                        ) : (
                          <Image className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-white">{pkg.name}</p>
                        {pkg.description && (
                          <p className="text-xs text-zinc-500">{pkg.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">
                        {currencySymbol}{pkg.price?.toFixed(2)}
                      </p>
                      {selectedPackageId === pkg.id && (
                        <Check className="w-4 h-4 text-emerald-400 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* No packages configured - show simple digital/print selection */
            <>
              <div className="space-y-2">
                <Label className="text-zinc-300">Sale Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSaleType('digital');
                      setCustomAmount(photoPricing.digitalPrice?.toString() || '');
                    }}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      saleType === 'digital'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/10 bg-black/20 hover:bg-white/5'
                    }`}
                  >
                    <Image className={`w-6 h-6 ${saleType === 'digital' ? 'text-blue-400' : 'text-zinc-400'}`} />
                    <span className="text-sm font-medium text-white">Digital</span>
                    {photoPricing.digitalPrice > 0 && (
                      <span className="text-xs text-zinc-400">{currencySymbol}{photoPricing.digitalPrice}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSaleType('print');
                      setCustomAmount(photoPricing.printPrice?.toString() || '');
                    }}
                    className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                      saleType === 'print'
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-white/10 bg-black/20 hover:bg-white/5'
                    }`}
                  >
                    <Printer className={`w-6 h-6 ${saleType === 'print' ? 'text-orange-400' : 'text-zinc-400'}`} />
                    <span className="text-sm font-medium text-white">Print</span>
                    {photoPricing.printPrice > 0 && (
                      <span className="text-xs text-zinc-400">{currencySymbol}{photoPricing.printPrice}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Amount input - only if no preset prices */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    {currencySymbol}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="bg-black/40 border-white/10 text-white pl-7 text-lg"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  Enter 0 if this is a free/complimentary transaction.
                </p>
              </div>
            </>
          )}

          {/* Payment Method - Only show if there's an amount */}
          {totalAmount > 0 && (
            <div className="space-y-2">
              <Label className="text-zinc-300">Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={`p-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === method.value
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-white/10 bg-black/20 hover:bg-white/5'
                    }`}
                  >
                    <method.icon className={`w-4 h-4 ${
                      paymentMethod === method.value ? 'text-emerald-400' : 'text-zinc-400'
                    }`} />
                    <span className="text-xs text-white">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Total Summary */}
          {totalAmount > 0 && (
            <div className="bg-black/30 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Subtotal</span>
                <span className="text-white">{currencySymbol}{baseAmount.toFixed(2)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">{taxName} ({(taxRate * 100).toFixed(1)}%)</span>
                  <span className="text-white">{currencySymbol}{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2">
                <span className="text-white">Total</span>
                <span className="text-emerald-400">{currencySymbol}{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : totalAmount > 0 ? (
              <>
                <Check className="w-5 h-5 mr-2" />
                Confirm {currencySymbol}{totalAmount.toFixed(2)} Payment
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Mark as Paid (No Charge)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
