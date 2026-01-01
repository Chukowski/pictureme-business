/**
 * Plan-based feature gating
 * Defines what features are available for each plan tier
 */

export type UserRole = 'individual' | 'basic' | 'spark' | 'vibe' | 'studio' | 'business_pending' | 'business_starter' | 'business_eventpro' | 'business_masters' | 'superadmin';

export interface PlanFeatures {
  maxActiveEvents: number;
  tokensMonthly: number;
  // Generation features
  videoGeneration: boolean;
  faceswap: boolean;
  badgeCreatorAI: boolean;
  premiumModels: boolean; // Veo 3.1, Kling Pro, etc.
  // Event features
  timelineSplitView: boolean;
  printStation: boolean;
  hardWatermark: boolean;
  customThemes: boolean;
  // Monetization
  payPerPhoto: boolean;
  payPerAlbum: boolean;
  leadCapture: boolean;
  stripeIntegration: boolean;
  // Advanced
  staffOnlyMode: boolean;
  marketplacePublishing: boolean;
  customPipelines: boolean;
  revenueShare: boolean;
  // Album & Station Features (Business Only)
  albumTracking: boolean;      // Multi-station album workflow (Event Pro+)
  stationFlow: boolean;        // Station-based event flow (Event Pro+)
  multiStationFlow: boolean;   // Multi-station event flow with badge scanning (Event Pro+)
  badgeQRTracking: boolean;    // Badge QR tracking for albums (Event Pro+)
  sharingOverride: boolean;    // Custom aspect ratios & frames for sharing (Event Pro+)
  teamAccess: boolean;         // Business team members access
  maxTeamMembers: number;      // Max team members (Starter=1, Pro=3, Masters=custom)
  hardwareSupport: boolean;    // Hardware integration options (Masters only)
  // New Booth Monetization Features
  boothTokenMonetization: boolean;
  boothRevenueShare: boolean;
  boothCustomSplit: boolean;
  boothAdvancedAnalytics: boolean;
}

// Feature definitions per plan
const PLAN_FEATURES: Record<UserRole, PlanFeatures> = {
  individual: {
    maxActiveEvents: 0,
    tokensMonthly: 0,
    videoGeneration: false,
    faceswap: false,
    badgeCreatorAI: false,
    premiumModels: false,
    timelineSplitView: false,
    printStation: false,
    hardWatermark: false,
    customThemes: false,
    payPerPhoto: false,
    payPerAlbum: false,
    leadCapture: false,
    stripeIntegration: false,
    staffOnlyMode: false,
    marketplacePublishing: false,
    customPipelines: false,
    revenueShare: false,
    albumTracking: false,
    stationFlow: false,
    multiStationFlow: false,
    badgeQRTracking: false,
    sharingOverride: false,
    teamAccess: false,
    maxTeamMembers: 0,
    hardwareSupport: false,
    boothTokenMonetization: false,
    boothRevenueShare: false,
    boothCustomSplit: false,
    boothAdvancedAnalytics: false,
  },
  basic: {
    maxActiveEvents: 1,
    tokensMonthly: 0,
    videoGeneration: false,
    faceswap: false,
    badgeCreatorAI: false,
    premiumModels: false,
    timelineSplitView: false,
    printStation: false,
    hardWatermark: false,
    customThemes: false,
    payPerPhoto: false,
    payPerAlbum: false,
    leadCapture: false,
    stripeIntegration: false,
    staffOnlyMode: false,
    marketplacePublishing: false,
    customPipelines: false,
    revenueShare: false,
    albumTracking: false,
    stationFlow: false,
    multiStationFlow: false,
    badgeQRTracking: false,
    sharingOverride: false,
    teamAccess: false,
    maxTeamMembers: 0,
    hardwareSupport: false,
    boothTokenMonetization: false,
    boothRevenueShare: false,
    boothCustomSplit: false,
    boothAdvancedAnalytics: false,
  },
  spark: {
    maxActiveEvents: 3,
    tokensMonthly: 0,
    videoGeneration: false,
    faceswap: true,
    badgeCreatorAI: false,
    premiumModels: false,
    timelineSplitView: false,
    printStation: false,
    hardWatermark: false,
    customThemes: false,
    payPerPhoto: false,
    payPerAlbum: false,
    leadCapture: false,
    stripeIntegration: false,
    staffOnlyMode: false,
    marketplacePublishing: false,
    customPipelines: false,
    revenueShare: false,
    albumTracking: false,
    stationFlow: false,
    multiStationFlow: false,
    badgeQRTracking: false,
    sharingOverride: false,
    teamAccess: false,
    maxTeamMembers: 0,
    hardwareSupport: false,
    boothTokenMonetization: true,
    boothRevenueShare: false,
    boothCustomSplit: false,
    boothAdvancedAnalytics: false,
  },
  vibe: {
    maxActiveEvents: 10,
    tokensMonthly: 0,
    videoGeneration: true,
    faceswap: true,
    badgeCreatorAI: false,
    premiumModels: false,
    timelineSplitView: false,
    printStation: false,
    hardWatermark: false,
    customThemes: true,
    payPerPhoto: true,
    payPerAlbum: false,
    leadCapture: true,
    stripeIntegration: true,
    staffOnlyMode: false,
    marketplacePublishing: true,
    customPipelines: false,
    revenueShare: true,
    albumTracking: false,
    stationFlow: false,
    multiStationFlow: false,
    badgeQRTracking: false,
    sharingOverride: false,
    teamAccess: false,
    maxTeamMembers: 0,
    hardwareSupport: false,
    boothTokenMonetization: true,
    boothRevenueShare: true,
    boothCustomSplit: false,
    boothAdvancedAnalytics: false,
  },
  studio: {
    maxActiveEvents: 25,
    tokensMonthly: 0,
    videoGeneration: true,
    faceswap: true,
    badgeCreatorAI: true,
    premiumModels: true,
    timelineSplitView: false,
    printStation: false,
    hardWatermark: false,
    customThemes: true,
    payPerPhoto: true,
    payPerAlbum: true,
    leadCapture: true,
    stripeIntegration: true,
    staffOnlyMode: false,
    marketplacePublishing: true,
    customPipelines: true,
    revenueShare: true,
    albumTracking: false,
    stationFlow: false,
    multiStationFlow: false,
    badgeQRTracking: false,
    sharingOverride: false,
    teamAccess: false,
    maxTeamMembers: 0,
    hardwareSupport: false,
    boothTokenMonetization: true,
    boothRevenueShare: true,
    boothCustomSplit: true,
    boothAdvancedAnalytics: true,
  },
  business_pending: {
    maxActiveEvents: 0,
    tokensMonthly: 0,
    videoGeneration: false,
    faceswap: false,
    badgeCreatorAI: false,
    premiumModels: false,
    timelineSplitView: false,
    printStation: false,
    hardWatermark: false,
    customThemes: false,
    payPerPhoto: false,
    payPerAlbum: false,
    leadCapture: false,
    stripeIntegration: false,
    staffOnlyMode: false,
    marketplacePublishing: false,
    customPipelines: false,
    revenueShare: false,
    albumTracking: false,
    stationFlow: false,
    multiStationFlow: false,
    badgeQRTracking: false,
    sharingOverride: false,
    teamAccess: false,
    maxTeamMembers: 0,
    hardwareSupport: false,
    boothTokenMonetization: false,
    boothRevenueShare: false,
    boothCustomSplit: false,
    boothAdvancedAnalytics: false,
  },
  business_starter: {
    maxActiveEvents: 1,
    tokensMonthly: 1000,
    videoGeneration: false,
    faceswap: false,
    badgeCreatorAI: false,
    premiumModels: false,
    timelineSplitView: false,
    printStation: true,
    hardWatermark: true,
    customThemes: false,
    payPerPhoto: true,
    payPerAlbum: false,
    leadCapture: true,
    stripeIntegration: true,
    staffOnlyMode: false,
    marketplacePublishing: false,
    customPipelines: false,
    revenueShare: false,
    albumTracking: false,
    stationFlow: false,
    multiStationFlow: false,
    badgeQRTracking: false,
    sharingOverride: false,
    teamAccess: true,
    maxTeamMembers: 1,
    hardwareSupport: false,
    boothTokenMonetization: true,
    boothRevenueShare: false,
    boothCustomSplit: false,
    boothAdvancedAnalytics: false,
  },
  business_eventpro: {
    maxActiveEvents: 2,
    tokensMonthly: 5000,
    videoGeneration: true,
    faceswap: true,
    badgeCreatorAI: false,
    premiumModels: false,
    timelineSplitView: true,
    printStation: true,
    hardWatermark: true,
    customThemes: true,
    payPerPhoto: true,
    payPerAlbum: true,
    leadCapture: true,
    stripeIntegration: true,
    staffOnlyMode: true,
    marketplacePublishing: false,
    customPipelines: false,
    revenueShare: false,
    albumTracking: true,
    stationFlow: true,
    multiStationFlow: true,
    badgeQRTracking: true,
    sharingOverride: true,
    teamAccess: true,
    maxTeamMembers: 3,
    hardwareSupport: false,
    boothTokenMonetization: true,
    boothRevenueShare: true,
    boothCustomSplit: true,
    boothAdvancedAnalytics: true,
  },
  business_masters: {
    maxActiveEvents: 3,
    tokensMonthly: 8000,
    videoGeneration: true,
    faceswap: true,
    badgeCreatorAI: true,
    premiumModels: true,
    timelineSplitView: true,
    printStation: true,
    hardWatermark: true,
    customThemes: true,
    payPerPhoto: true,
    payPerAlbum: true,
    leadCapture: true,
    stripeIntegration: true,
    staffOnlyMode: true,
    marketplacePublishing: true,
    customPipelines: true,
    revenueShare: true,
    albumTracking: true,
    stationFlow: true,
    multiStationFlow: true,
    badgeQRTracking: true,
    sharingOverride: true,
    teamAccess: true,
    maxTeamMembers: 10, // Custom, can be increased
    hardwareSupport: true,
    boothTokenMonetization: true,
    boothRevenueShare: true,
    boothCustomSplit: true,
    boothAdvancedAnalytics: true,
  },
  superadmin: {
    maxActiveEvents: 999,
    tokensMonthly: 999999,
    videoGeneration: true,
    faceswap: true,
    badgeCreatorAI: true,
    premiumModels: true,
    timelineSplitView: true,
    printStation: true,
    hardWatermark: true,
    customThemes: true,
    payPerPhoto: true,
    payPerAlbum: true,
    leadCapture: true,
    stripeIntegration: true,
    staffOnlyMode: true,
    marketplacePublishing: true,
    customPipelines: true,
    revenueShare: true,
    albumTracking: true,
    stationFlow: true,
    multiStationFlow: true,
    badgeQRTracking: true,
    sharingOverride: true,
    teamAccess: true,
    maxTeamMembers: 999,
    hardwareSupport: true,
    boothTokenMonetization: true,
    boothRevenueShare: true,
    boothCustomSplit: true,
    boothAdvancedAnalytics: true,
  },
};

/**
 * Get features available for a user role
 */
export function getPlanFeatures(role: string | undefined): PlanFeatures {
  const normalizedRole = (role || 'individual').toLowerCase() as UserRole;
  return PLAN_FEATURES[normalizedRole] || PLAN_FEATURES.individual;
}

/**
 * Check if a specific feature is available for a user role
 */
export function hasFeature(role: string | undefined, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(role);
  return !!features[feature];
}

/**
 * Get the minimum plan required for a feature
 */
export function getMinPlanForFeature(feature: keyof PlanFeatures): UserRole {
  const plans: UserRole[] = ['spark', 'vibe', 'studio', 'business_starter', 'business_eventpro', 'business_masters'];

  for (const plan of plans) {
    if (PLAN_FEATURES[plan] && PLAN_FEATURES[plan][feature]) {
      return plan;
    }
  }

  return 'business_masters';
}

/**
 * Get human-readable plan name
 */
export function getPlanDisplayName(role: string | undefined): string {
  const names: Record<string, string> = {
    // Individual plans
    'individual': 'Spark',
    'spark': 'Spark',
    'vibe': 'Vibe',
    'studio': 'Studio',
    // Business plans
    'business_pending': 'Business (Pending)',
    'business_starter': 'Event Starter',
    'business_eventpro': 'Event Pro',
    'business_masters': 'Masters',
    'superadmin': 'Super Admin',
  };

  const normalizedRole = (role || 'individual').toLowerCase();
  return names[normalizedRole] || 'Spark';
}

/**
 * Get upgrade CTA for a feature
 */
export function getUpgradeMessage(feature: keyof PlanFeatures): string {
  const minPlan = getMinPlanForFeature(feature);
  const planName = getPlanDisplayName(minPlan);
  return `Upgrade to ${planName} to unlock this feature`;
}

