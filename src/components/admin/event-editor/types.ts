import { EventConfig, WatermarkConfig } from "@/services/eventsApi";

// Pricing package for pay-per-album mode
export interface PricingPackage {
  id: string;
  name: string;           // "Digital Only", "Print Package", etc.
  description?: string;
  price: number;
  includesDigital: boolean;
  printQuantity?: number; // Number of prints included
  isDefault?: boolean;
}

// Photo pricing for pay-per-photo mode
export interface PhotoPricing {
  digitalPrice: number;   // Price per digital photo
  printPrice: number;     // Price per printed photo
}

// Album pricing configuration
export interface AlbumPricing {
  packages: PricingPackage[];
}

// Business info for invoices
export interface BusinessInfo {
  name: string;
  address?: string;
  taxId?: string;         // Tax ID / EIN / RUC
  phone?: string;
  email?: string;
}

// Full pricing configuration
export interface EventPricingConfig {
  albumPricing?: AlbumPricing;
  photoPricing?: PhotoPricing;
  taxRate?: number;       // e.g., 0.115 for 11.5%
  taxName?: string;       // e.g., "IVU", "VAT", "Sales Tax"
  currency: string;       // "USD", "EUR", etc.
  businessInfo?: BusinessInfo;
}

// Online payments configuration (Stripe preparation)
export interface OnlinePaymentsConfig {
  enabled: boolean;
  stripeConnectAccountId?: string;
  allowCardPayments: boolean;
}

// Extended Theme type with UI specific fields
export interface EventTheme extends NonNullable<EventConfig['theme']> {
  preset?: 'classic_dark' | 'clean_light' | 'neon_party' | 'corporate' | 'kids_fun' | 'holiday' | 'custom';
  accentColor?: string;
  cardRadius?: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
  buttonStyle?: "solid" | "outline" | "ghost";
  backgroundAnimation?: 'none' | 'grid' | 'particles' | 'pulse';
}

// Extended Watermark type
export interface ExtendedWatermarkConfig extends WatermarkConfig {
  pattern?: "step_repeat" | "strip_bottom" | "corner";
}

export interface EventFormData extends Omit<EventConfig, 'id' | '_id' | 'user_id' | 'theme' | 'branding'> {
  // Optional ID fields for existing events
  _id?: string;
  user_id?: string;

  // Override theme with extended version
  theme: EventTheme;
  branding: Omit<EventConfig['branding'], 'watermark'> & {
    watermark?: ExtendedWatermarkConfig;
    showLogoInBooth?: boolean;
    showLogoInFeed?: boolean;
    showSponsorStrip?: boolean;
    includeLogoOnPrints?: boolean;
    sponsorLogos?: string[];
  };

  eventMode: 'free' | 'lead_capture' | 'pay_per_photo' | 'pay_per_album';
  rules: {
    leadCaptureEnabled: boolean;
    requirePaymentBeforeDownload: boolean;
    allowFreePreview: boolean;
    staffOnlyMode: boolean;
    enableQRToPayment: boolean;
    useStripeCodeForPayment: boolean;
    feedEnabled: boolean;
    hardWatermarkOnPreviews: boolean;
    allowPrintStation: boolean;
    allowTimelineSplitView: boolean;
    enableBadgeCreator: boolean;
    blurOnUnpaidGallery: boolean; // Apply blur to photos in gallery/big screen when unpaid
    showPaymentCardOnSharedAlbum: boolean; // Show payment required card on shared album page
  };
  sharing: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    smsEnabled: boolean;
    emailTemplate: string;
    emailAfterBuy: boolean;
    groupPhotosIntoAlbums: boolean;
  };

  // Pricing configuration (for pay_per_photo and pay_per_album modes)
  pricing?: EventPricingConfig;

  // Online payments configuration (Stripe)
  onlinePayments?: OnlinePaymentsConfig;

  // Booth Monetization
  monetization?: {
    type: 'free' | 'tokens' | 'revenue_share';
    token_price?: number;
    fiat_price?: number;
    revenue_split?: number;
  };

  // Legacy fields kept for compatibility
  badgeCreator?: {
    enabled: boolean;
    mode: "simple" | "ai";
    templateId: string;
    layout: "portrait" | "landscape" | "square";
    includeQR: boolean;
    fields: {
      showName: boolean;
      showDate: boolean;
      showEventName: boolean;
      customField1: string;
      customField2: string;
    };
  };
}

export interface EditorSectionProps {
  formData: EventFormData;
  setFormData: (data: EventFormData) => void;
  currentUser?: any;
  isEdit?: boolean;
}
