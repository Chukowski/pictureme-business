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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DollarSign, CreditCard, Banknote, Receipt, 
  User, Mail, Phone, Loader2, Package 
} from "lucide-react";
import { 
  createTransaction, 
  CreateTransactionRequest,
  getEventAlbums,
  Album,
} from "@/services/eventsApi";
import { toast } from "sonner";

interface ChargePOSModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  eventConfig?: any;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'card', label: 'Card (Manual)', icon: CreditCard },
  { value: 'external', label: 'External', icon: DollarSign },
];

export function ChargePOSModal({ 
  open, 
  onOpenChange, 
  eventId, 
  eventConfig,
  onSuccess 
}: ChargePOSModalProps) {
  const [loading, setLoading] = useState(false);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  
  // Form state
  const [selectedAlbumCode, setSelectedAlbumCode] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Get pricing config
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
  const isPayPerAlbum = eventConfig?.eventMode === 'pay_per_album';
  const isPayPerPhoto = eventConfig?.eventMode === 'pay_per_photo';

  // Get selected package
  const selectedPackage = packages.find((p: any) => p.id === selectedPackageId);
  
  // Calculate amounts
  const baseAmount = selectedPackage?.price || parseFloat(customAmount) || 0;
  const taxAmount = baseAmount * taxRate;
  const totalAmount = baseAmount + taxAmount;

  // Load albums when modal opens
  useEffect(() => {
    if (open && eventId) {
      loadAlbums();
    }
  }, [open, eventId]);

  // Set default package
  useEffect(() => {
    if (packages.length > 0 && !selectedPackageId) {
      const defaultPkg = packages.find((p: any) => p.isDefault) || packages[0];
      setSelectedPackageId(defaultPkg.id);
    }
  }, [packages, selectedPackageId]);

  const loadAlbums = async () => {
    setLoadingAlbums(true);
    try {
      const result = await getEventAlbums(eventId);
      // Filter to show only completed albums that haven't been paid
      const unpaidAlbums = result.filter(
        (a: Album) => a.status === 'completed' || a.status === 'in_progress'
      );
      setAlbums(unpaidAlbums);
    } catch (error) {
      console.error('Failed to load albums:', error);
    } finally {
      setLoadingAlbums(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAlbumCode) {
      toast.error('Please select an album');
      return;
    }
    if (totalAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const data: CreateTransactionRequest = {
        album_code: selectedAlbumCode,
        package_id: selectedPackageId,
        package_name: selectedPackage?.name || 'Custom Charge',
        item_count: 1,
        amount: baseAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency,
        payment_method: paymentMethod,
        customer_name: customerName || undefined,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        generate_invoice: generateInvoice,
        notes: notes || undefined,
      };

      await createTransaction(eventId, data);
      toast.success('Payment recorded successfully!');
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedAlbumCode("");
    setCustomAmount("");
    setPaymentMethod("cash");
    setGenerateInvoice(false);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setNotes("");
  };

  // Get album label
  const getAlbumLabel = (album: Album) => {
    const parts = [album.code];
    if (album.owner_name) parts.push(`- ${album.owner_name}`);
    if (album.photo_count) parts.push(`(${album.photo_count} photos)`);
    return parts.join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            Charge POS
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Record a manual payment for an album
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Album Selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Select Album</Label>
            <Select value={selectedAlbumCode} onValueChange={setSelectedAlbumCode}>
              <SelectTrigger className="bg-[#101112]/40 border-white/10 text-white">
                <SelectValue placeholder={loadingAlbums ? "Loading..." : "Select an album"} />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {albums.map((album) => (
                  <SelectItem 
                    key={album.id} 
                    value={album.code}
                    className="text-white"
                  >
                    {getAlbumLabel(album)}
                  </SelectItem>
                ))}
                {albums.length === 0 && !loadingAlbums && (
                  <SelectItem value="_none" disabled className="text-zinc-500">
                    No unpaid albums available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Package Selection (for pay per album) */}
          {isPayPerAlbum && packages.length > 0 && (
            <div className="space-y-2">
              <Label className="text-zinc-300">Pricing Package</Label>
              <div className="grid grid-cols-2 gap-2">
                {packages.map((pkg: any) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setSelectedPackageId(pkg.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedPackageId === pkg.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-white/10 bg-[#101112]/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-medium text-white">{pkg.name}</span>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {currencySymbol}{pkg.price?.toFixed(2)}
                    </p>
                    {pkg.description && (
                      <p className="text-xs text-zinc-500 mt-1">{pkg.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Amount (for pay per photo or no packages) */}
          {(!isPayPerAlbum || packages.length === 0) && (
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
                  className="bg-[#101112]/40 border-white/10 text-white pl-7 text-lg"
                />
              </div>
            </div>
          )}

          {/* Amount Summary */}
          {totalAmount > 0 && (
            <div className="bg-[#101112]/30 rounded-xl p-4 space-y-2">
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

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                    paymentMethod === method.value
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-white/10 bg-[#101112]/20 hover:bg-white/5'
                  }`}
                >
                  <method.icon className={`w-5 h-5 ${
                    paymentMethod === method.value ? 'text-emerald-400' : 'text-zinc-400'
                  }`} />
                  <span className="text-xs text-white">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Customer Info (Optional) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Customer Information</Label>
              <span className="text-xs text-zinc-500">Optional</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-[#101112]/40 border-white/10 text-white pl-10"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="bg-[#101112]/40 border-white/10 text-white pl-10"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="bg-[#101112]/40 border-white/10 text-white pl-10"
                />
              </div>
            </div>
          </div>

          {/* Generate Invoice Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#101112]/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Receipt className="w-5 h-5 text-zinc-400" />
              <div>
                <p className="text-sm font-medium text-white">Generate Invoice</p>
                <p className="text-xs text-zinc-500">Create a printable invoice</p>
              </div>
            </div>
            <Switch
              checked={generateInvoice}
              onCheckedChange={setGenerateInvoice}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Notes (Optional)</Label>
            <Textarea
              placeholder="Add any notes about this transaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-[#101112]/40 border-white/10 text-white resize-none h-20"
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedAlbumCode || totalAmount <= 0}
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Charge {currencySymbol}{totalAmount.toFixed(2)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
