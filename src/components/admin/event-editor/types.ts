import { EventConfig, WatermarkConfig } from "@/services/eventsApi";

// Extended Theme type with UI specific fields
export interface EventTheme extends NonNullable<EventConfig['theme']> {
  preset?: 'classic_dark' | 'clean_light' | 'neon_party' | 'corporate' | 'kids_fun' | 'holiday' | 'custom';
  accentColor?: string;
  cardRadius?: "none" | "sm" | "md" | "lg" | "xl" | "2xl";
  buttonStyle?: "solid" | "outline" | "ghost";
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
  };
  sharing: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    smsEnabled: boolean;
    emailTemplate: string;
    emailAfterBuy: boolean;
    groupPhotosIntoAlbums: boolean;
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
