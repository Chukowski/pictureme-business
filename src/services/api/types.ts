
import type { BadgeTemplateConfig } from "@/components/templates/BadgeTemplateEditor";

// Public Profile Types
export interface UserCreation {
    id: string;
    url: string;
    thumbnail_url?: string;
    likes: number;
    views: number;
    is_hero?: boolean;
}

export interface PublicProfileResponse {
    profile: User;
    creations: UserCreation[];
    events?: EventConfig[];
}

export interface User {
    id: number;
    username: string;
    email: string;
    full_name?: string;
    name?: string;
    slug: string;
    role?: 'individual' | 'basic' | 'spark' | 'vibe' | 'studio' | 'business_pending' | 'business_starter' | 'business_eventpro' | 'business_masters' | 'superadmin';
    birth_date?: string;
    avatar_url?: string;
    image?: string; // Better Auth field name
    cover_image_url?: string;
    cover_image?: string; // Better Auth field name
    bio?: string;
    social_links?: {
        x?: string;
        instagram?: string;
        youtube?: string;
        tiktok?: string;
    };
    is_public?: boolean;
    publish_to_explore?: boolean;
    tokens_remaining?: number;
    tokens_total?: number;
    subscription_tier?: string;
    // Business plan fields
    plan_id?: string;
    plan_name?: string;
    plan_started_at?: string;
    plan_renewal_date?: string;
    max_concurrent_events?: number;
    subscription_status?: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete' | 'incomplete_expired';
}

export interface WatermarkConfig {
    enabled: boolean;
    type: "image" | "text";
    imageUrl?: string;
    text?: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
    size: number; // Percentage of image width
    opacity: number; // 0-1
}

// Album Tracking Types
export interface AlbumStation {
    id: string;
    name: string;
    description: string;
    type: 'registration' | 'booth' | 'playground' | 'viewer';
    requiresScanner: boolean;  // true if this station must scan badge QR
    order: number;
}

export interface AlbumRules {
    maxPhotosPerAlbum: number;
    allowReEntry: boolean;
    requireStaffApproval: boolean;
    printReady: boolean;
}

export interface BadgeIntegration {
    autoGenerateBadge: boolean;
    badgeLayout: 'portrait' | 'landscape' | 'square';
    includeQR: boolean;
    includeName: boolean;
    includeDateTime: boolean;
    customFields?: string[];
    saveBadgePhotoToAlbum: boolean; // Save the AI-generated badge photo to the visitor's album
}

export interface AlbumTrackingConfig {
    enabled: boolean;
    albumType: 'individual' | 'group';
    stations: AlbumStation[];
    rules: AlbumRules;
    badgeIntegration: BadgeIntegration;
}

export interface SharingOverrides {
    enabled: boolean;
    defaultAspectRatio: 'auto' | '1:1' | '3:2' | '4:5' | '16:9' | '9:16';
    availableRatios: string[];
    shareTemplateId?: string; // ID of template/frame to apply on export
}

export interface EventConfig {
    _id: string;  // CouchDB document ID (was: id: number)
    _rev?: string;  // CouchDB revision
    user_id: string;  // Now a string (UUID from PostgreSQL, was: number)
    user_slug?: string;
    username?: string;
    user_full_name?: string;
    slug: string;
    title: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    is_active: boolean;
    postgres_event_id?: number;
    theme: {
        brandName?: string;
        primaryColor?: string;
        secondaryColor?: string;
        tagline?: string;
        mode?: 'light' | 'dark'; // Theme mode for the photo booth
        backgroundAnimation?: string;
    };
    templates: Template[];
    branding: {
        logoPath?: string;
        footerPath?: string;
        headerBackgroundColor?: string;
        footerBackgroundColor?: string;
        taglineText?: string;
        watermark?: WatermarkConfig;
        // Creator Branding (Studio Tier)
        showCreatorBrand?: boolean;
        creatorDisplayName?: string;
        creatorAvatar?: string;
        socialInstagram?: string;
        socialTikTok?: string;
        socialX?: string;
        socialWebsite?: string;
    };
    settings: {
        aiModel?: string;
        imageSize?: { width: number; height: number };
        feedEnabled?: boolean;
        feedPublic?: boolean;
        feedModeration?: boolean;
        moderationEnabled?: boolean;
        maxPhotosPerSession?: number;
        staffAccessCode?: string;
        saveToCreatorGallery?: boolean; // New: Booth Creator Economy
    };
    // Album Tracking (Business: Event Pro+)
    albumTracking?: AlbumTrackingConfig;
    // Sharing Overrides (Business: Event Pro+)
    sharingOverrides?: SharingOverrides;
    // Badge Template (for Registration stations)
    badgeTemplate?: BadgeTemplateConfig;
    // Event Mode
    eventMode?: 'free' | 'lead_capture' | 'pay_per_photo' | 'pay_per_album';
    // Pricing Configuration (for paid modes)
    pricing?: {
        albumPricing?: {
            packages: Array<{
                id: string;
                name: string;
                description?: string;
                price: number;
                includesDigital: boolean;
                printQuantity?: number;
                isDefault?: boolean;
            }>;
        };
        photoPricing?: {
            digitalPrice: number;
            printPrice: number;
        };
        taxRate?: number;
        taxName?: string;
        currency: string;
        businessInfo?: {
            name: string;
            address?: string;
            taxId?: string;
            phone?: string;
            email?: string;
        };
    };
    is_booth?: boolean;
    monetization?: {
        type: 'free' | 'tokens' | 'revenue_share'; // Deprecated: use sale_mode
        sale_mode?: 'free' | 'tokens' | 'money'; // New: free, tokens, money
        token_price?: number;
        fiat_price?: number;
        revenue_split?: number; // Business only
    };
    is_adult?: boolean; // Flag for adult content (18+)
}

export type AspectRatio = 'auto' | '1:1' | '4:5' | '3:2' | '16:9' | '9:16';

export interface Template {
    id: string;
    name: string;
    description: string;
    images: string[]; // Background images
    elementImages?: string[]; // Element/prop images for mixing (Seedream, Imagen)
    prompt: string;
    negativePrompt?: string; // What to avoid in the generated image
    groupPrompt?: string; // Alternative prompt for group photos
    active: boolean;
    // Individual branding controls per template
    includeHeader?: boolean;
    campaignText?: string;
    includeBranding?: boolean; // Master toggle for all overlays
    includeTagline?: boolean; // Show tagline
    includeWatermark?: boolean; // Show watermark
    isCustomPrompt?: boolean; // Special template that allows user to write custom prompts

    // Aspect Ratio for generated images
    aspectRatio?: AspectRatio;

    // Pipeline Configuration
    pipelineConfig?: {
        imageModel?: string; // e.g., 'nano-banana', 'seedream-v4', 'flux-realism'
        groupImageModel?: string; // Separate model for group photos (optional)
        forceInstructions?: boolean; // Add extra context to help AI understand images
        seed?: number; // Seed for reproducible results (same seed = similar output)
        strength?: number; // Control how much the AI changes the image (0-1)
        steps?: number; // Number of inference steps
        faceswapEnabled?: boolean;
        faceswapModel?: string;
        videoEnabled?: boolean;
        videoModel?: string; // e.g., 'wan-v2', 'kling-pro', 'veo-3.1'
    };

    // Access & Monetization Overrides
    overrideEventSettings?: boolean;
    accessOverrides?: {
        leadCaptureRequired?: boolean;
        requirePayment?: boolean;
        hardWatermark?: boolean;
        disableDownloads?: boolean;
        allowFreePreview?: boolean;
    };

    // Station Assignment (Business: Event Pro+)
    // "all" = available at all stations, or array of specific station IDs
    stationsAssigned?: 'all' | string[];
}

export interface PhotoFeed {
    id: string;
    processed_image_url: string;
    original_image_url?: string;
    background_name: string;
    share_code: string;
    created_at: number;
    meta: any;
}

// Business Types
export interface Organization {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    website?: string;
    created_at: string;
    role?: 'owner' | 'admin' | 'member';
}

export interface OrganizationMember {
    user_id: string;
    email: string;
    role: 'owner' | 'admin' | 'member';
    joined_at: string;
    status: 'active' | 'pending';
}

export interface EmailStatus {
    configured: boolean;
    message?: string;
    provider?: string;
}

export interface BoothPhoto {
    id: number;
    url: string;
    thumbnail_url?: string;
    created_at: string;
    is_public: boolean;
}

export interface TransactionSummary {
    total_amount: number;
    count: number;
    currency: string;
}

export interface AlbumTransaction {
    id: string;
    album_code: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    customer_email?: string;
}

export interface CreateTransactionRequest {
    amount: number;
    currency: string;
    description?: string;
    customer_email?: string;
    metadata?: any;
}

// ==================== Album Types ====================

export interface Album {
    id: string;
    event_id: number;
    organization_id?: string;
    code: string;
    status: 'in_progress' | 'completed' | 'paid' | 'archived';
    payment_status: 'unpaid' | 'processing' | 'paid';
    owner_name?: string;
    owner_email?: string;
    created_at: string;
    photo_count?: number;
}

export interface AlbumPhoto {
    id: string;
    album_id: string;
    photo_id: string;
    station_type: string;
    created_at: string;
}

export interface EventAlbumStats {
    totalAlbums: number;
    completedAlbums: number;
    inProgressAlbums: number;
    paidAlbums: number;
    totalPhotos: number;
    pendingApproval: number;
}

export interface PaymentRequest {
    id: string;
    code: string;
    owner_name?: string;
    owner_email?: string;
    status: string;
    payment_status: string;
    created_at: string;
    photo_count: number;
}
