import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  DollarSign, Plus, Trash2, Package, Image, Printer, 
  Building2, Receipt, CreditCard, Percent
} from "lucide-react";
import { EditorSectionProps, PricingPackage, EventPricingConfig } from "./types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENCIES = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
  { value: "MXN", label: "MXN ($)", symbol: "$" },
];

// Predefined pricing templates
const PRICING_TEMPLATES = [
  {
    id: 'digital-only',
    name: 'Digital Only',
    description: 'Customer gets digital downloads',
    packages: [
      { id: 'digital', name: 'Digital Download', description: 'All photos in digital format', price: 15, includesDigital: true, printQuantity: 0, isDefault: true },
    ]
  },
  {
    id: 'print-only',
    name: 'Print Only',
    description: 'Customer gets printed photos',
    packages: [
      { id: 'print-1', name: '1 Print', description: 'One printed photo', price: 10, includesDigital: false, printQuantity: 1, isDefault: true },
      { id: 'print-3', name: '3 Prints', description: 'Three printed photos', price: 25, includesDigital: false, printQuantity: 3, isDefault: false },
    ]
  },
  {
    id: 'digital-print',
    name: 'Digital + Print',
    description: 'Customer chooses digital, print, or both',
    packages: [
      { id: 'digital', name: 'Digital Only', description: 'All photos in digital format', price: 15, includesDigital: true, printQuantity: 0, isDefault: true },
      { id: 'print-1', name: '1 Print', description: 'One printed photo', price: 10, includesDigital: false, printQuantity: 1, isDefault: false },
      { id: 'bundle', name: 'Digital + 2 Prints', description: 'Digital download plus 2 prints', price: 30, includesDigital: true, printQuantity: 2, isDefault: false },
    ]
  },
];

const DEFAULT_PRICING: EventPricingConfig = {
  currency: "USD",
  taxRate: 0,
  taxName: "",
  albumPricing: {
    packages: PRICING_TEMPLATES[2].packages // Default to Digital + Print
  },
  photoPricing: {
    digitalPrice: 5,
    printPrice: 8,
  },
  businessInfo: {
    name: "",
    address: "",
    taxId: "",
    phone: "",
    email: "",
  }
};

export function EventPricing({ formData, setFormData }: EditorSectionProps) {
  const [newPackageName, setNewPackageName] = useState("");
  
  // Only show for paid modes
  if (formData.eventMode !== 'pay_per_photo' && formData.eventMode !== 'pay_per_album') {
    return null;
  }

  const pricing = formData.pricing || DEFAULT_PRICING;
  
  const updatePricing = (updates: Partial<EventPricingConfig>) => {
    setFormData({
      ...formData,
      pricing: { ...pricing, ...updates }
    });
  };

  const updateAlbumPackage = (packageId: string, updates: Partial<PricingPackage>) => {
    const packages = pricing.albumPricing?.packages || [];
    const updatedPackages = packages.map(pkg => 
      pkg.id === packageId ? { ...pkg, ...updates } : pkg
    );
    updatePricing({
      albumPricing: { packages: updatedPackages }
    });
  };

  const addPackage = () => {
    if (!newPackageName.trim()) return;
    
    const newPkg: PricingPackage = {
      id: `pkg-${Date.now()}`,
      name: newPackageName.trim(),
      price: 0,
      includesDigital: true,
      isDefault: false,
    };
    
    const packages = pricing.albumPricing?.packages || [];
    updatePricing({
      albumPricing: { packages: [...packages, newPkg] }
    });
    setNewPackageName("");
  };

  const removePackage = (packageId: string) => {
    const packages = pricing.albumPricing?.packages || [];
    if (packages.length <= 1) return; // Keep at least one package
    
    updatePricing({
      albumPricing: { packages: packages.filter(pkg => pkg.id !== packageId) }
    });
  };

  const setDefaultPackage = (packageId: string) => {
    const packages = pricing.albumPricing?.packages || [];
    const updatedPackages = packages.map(pkg => ({
      ...pkg,
      isDefault: pkg.id === packageId
    }));
    updatePricing({
      albumPricing: { packages: updatedPackages }
    });
  };

  const currencySymbol = CURRENCIES.find(c => c.value === pricing.currency)?.symbol || "$";

  const applyTemplate = (templateId: string) => {
    const template = PRICING_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      updatePricing({
        albumPricing: { packages: template.packages }
      });
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Pricing Configuration
          </h2>
          <p className="text-zinc-400">
            {formData.eventMode === 'pay_per_album' 
              ? "Set up pricing packages for album purchases."
              : "Set prices for individual photo purchases."}
          </p>
        </div>

        {/* Quick Templates */}
        {formData.eventMode === 'pay_per_album' && (
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                Quick Start Templates
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Choose a template or customize your own packages below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PRICING_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className="p-4 rounded-xl border border-white/10 bg-black/20 hover:bg-white/5 hover:border-purple-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {template.id === 'digital-only' && <Image className="w-5 h-5 text-blue-400" />}
                      {template.id === 'print-only' && <Printer className="w-5 h-5 text-orange-400" />}
                      {template.id === 'digital-print' && <Package className="w-5 h-5 text-purple-400" />}
                      <span className="font-medium text-white">{template.name}</span>
                    </div>
                    <p className="text-xs text-zinc-500">{template.description}</p>
                    <p className="text-xs text-zinc-600 mt-2">{template.packages.length} package(s)</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Currency & Tax Settings */}
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-zinc-400" />
              Currency & Taxes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Currency</Label>
                <Select 
                  value={pricing.currency} 
                  onValueChange={(value) => updatePricing({ currency: value })}
                >
                  <SelectTrigger className="bg-black/40 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {CURRENCIES.map(curr => (
                      <SelectItem key={curr.value} value={curr.value} className="text-white">
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-zinc-300">Tax Rate (%)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={(pricing.taxRate || 0) * 100}
                    onChange={(e) => updatePricing({ taxRate: parseFloat(e.target.value) / 100 || 0 })}
                    className="bg-black/40 border-white/10 text-white pr-8"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-zinc-300">Tax Name</Label>
                <Input
                  placeholder="e.g., IVU, VAT, Sales Tax"
                  value={pricing.taxName || ""}
                  onChange={(e) => updatePricing({ taxName: e.target.value })}
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pay Per Album - Packages */}
        {formData.eventMode === 'pay_per_album' && (
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-400" />
                Pricing Packages
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Create different packages for customers to choose from
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Package List */}
              <div className="space-y-3">
                {(pricing.albumPricing?.packages || []).map((pkg) => (
                  <div 
                    key={pkg.id} 
                    className={`p-4 rounded-xl border transition-all ${
                      pkg.isDefault 
                        ? 'border-purple-500/50 bg-purple-500/10' 
                        : 'border-white/10 bg-black/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Input
                            value={pkg.name}
                            onChange={(e) => updateAlbumPackage(pkg.id, { name: e.target.value })}
                            className="bg-black/40 border-white/10 text-white font-medium max-w-xs"
                            placeholder="Package name"
                          />
                          {pkg.isDefault && (
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        
                        <Input
                          value={pkg.description || ""}
                          onChange={(e) => updateAlbumPackage(pkg.id, { description: e.target.value })}
                          className="bg-black/40 border-white/10 text-white text-sm"
                          placeholder="Package description (optional)"
                        />
                        
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-zinc-400 text-sm">Price:</Label>
                            <div className="relative w-28">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                                {currencySymbol}
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={pkg.price}
                                onChange={(e) => updateAlbumPackage(pkg.id, { price: parseFloat(e.target.value) || 0 })}
                                className="bg-black/40 border-white/10 text-white pl-7"
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={pkg.includesDigital}
                              onCheckedChange={(checked) => updateAlbumPackage(pkg.id, { includesDigital: checked })}
                              className="data-[state=checked]:bg-emerald-600"
                            />
                            <Label className="text-zinc-400 text-sm flex items-center gap-1">
                              <Image className="w-3 h-3" />
                              Digital
                            </Label>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Label className="text-zinc-400 text-sm flex items-center gap-1">
                              <Printer className="w-3 h-3" />
                              Prints:
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={pkg.printQuantity || 0}
                              onChange={(e) => updateAlbumPackage(pkg.id, { printQuantity: parseInt(e.target.value) || 0 })}
                              className="bg-black/40 border-white/10 text-white w-16 text-center"
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {!pkg.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDefaultPackage(pkg.id)}
                            className="text-zinc-400 hover:text-purple-400 text-xs"
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePackage(pkg.id)}
                          disabled={(pricing.albumPricing?.packages?.length || 0) <= 1}
                          className="text-zinc-400 hover:text-red-400 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Add New Package */}
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="New package name..."
                  value={newPackageName}
                  onChange={(e) => setNewPackageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPackage()}
                  className="bg-black/40 border-white/10 text-white"
                />
                <Button 
                  onClick={addPackage}
                  disabled={!newPackageName.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pay Per Photo - Simple Pricing */}
        {formData.eventMode === 'pay_per_photo' && (
          <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Image className="w-4 h-4 text-amber-400" />
                Photo Pricing
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Set the price for each photo type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Image className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Digital Photo</h4>
                      <p className="text-xs text-zinc-500">High-res download</p>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricing.photoPricing?.digitalPrice || 0}
                      onChange={(e) => updatePricing({
                        photoPricing: {
                          ...pricing.photoPricing!,
                          digitalPrice: parseFloat(e.target.value) || 0
                        }
                      })}
                      className="bg-black/40 border-white/10 text-white text-lg pl-7"
                    />
                  </div>
                </div>
                
                <div className="p-4 rounded-xl border border-white/10 bg-black/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Printer className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">Printed Photo</h4>
                      <p className="text-xs text-zinc-500">Physical print</p>
                    </div>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      {currencySymbol}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pricing.photoPricing?.printPrice || 0}
                      onChange={(e) => updatePricing({
                        photoPricing: {
                          ...pricing.photoPricing!,
                          printPrice: parseFloat(e.target.value) || 0
                        }
                      })}
                      className="bg-black/40 border-white/10 text-white text-lg pl-7"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Business Info for Invoices */}
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-zinc-400" />
              Business Information
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Used for generating invoices (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Business Name</Label>
                <Input
                  placeholder="Your Business Name"
                  value={pricing.businessInfo?.name || ""}
                  onChange={(e) => updatePricing({
                    businessInfo: { ...pricing.businessInfo!, name: e.target.value }
                  })}
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-zinc-300">Tax ID / EIN</Label>
                <Input
                  placeholder="XX-XXXXXXX"
                  value={pricing.businessInfo?.taxId || ""}
                  onChange={(e) => updatePricing({
                    businessInfo: { ...pricing.businessInfo!, taxId: e.target.value }
                  })}
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label className="text-zinc-300">Business Address</Label>
                <Input
                  placeholder="123 Main St, City, State ZIP"
                  value={pricing.businessInfo?.address || ""}
                  onChange={(e) => updatePricing({
                    businessInfo: { ...pricing.businessInfo!, address: e.target.value }
                  })}
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-zinc-300">Phone</Label>
                <Input
                  placeholder="+1 (555) 123-4567"
                  value={pricing.businessInfo?.phone || ""}
                  onChange={(e) => updatePricing({
                    businessInfo: { ...pricing.businessInfo!, phone: e.target.value }
                  })}
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-zinc-300">Email</Label>
                <Input
                  type="email"
                  placeholder="billing@yourbusiness.com"
                  value={pricing.businessInfo?.email || ""}
                  onChange={(e) => updatePricing({
                    businessInfo: { ...pricing.businessInfo!, email: e.target.value }
                  })}
                  className="bg-black/40 border-white/10 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Online Payments (Stripe) - Future */}
        <Card className="bg-zinc-900/50 border-white/10 backdrop-blur-sm opacity-60">
          <CardHeader>
            <CardTitle className="text-white text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-zinc-400" />
              Online Payments
              <span className="text-xs bg-zinc-700 px-2 py-0.5 rounded ml-2">Coming Soon</span>
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Accept payments directly through Stripe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Enable online card payments</p>
                <p className="text-xs text-zinc-500">Customers can pay directly from their device</p>
              </div>
              <Switch disabled className="opacity-50" />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
