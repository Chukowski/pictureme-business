/**
 * User Tier Hook and Utilities
 * 
 * Provides the current user's subscription tier and maps it to imgproxy quality levels.
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getCurrentUser, User } from './eventsApi';
import { QualityTier } from './imgproxy';

// ============== TIER MAPPING ==============

/**
 * Maps subscription tiers to imgproxy quality tiers
 * 
 * Free/Trial users: Compressed images
 * Spark/Vibe: Pro quality
 * Studio/Masters: Full quality
 */
export function getQualityTierFromSubscription(subscriptionTier?: string): QualityTier {
    if (!subscriptionTier) return 'free';

    const tier = subscriptionTier.toLowerCase();

    // Premium tiers get original quality
    if (tier.includes('studio') || tier.includes('masters') || tier.includes('enterprise')) {
        return 'studio';
    }

    // Mid-tier plans get pro quality
    if (tier.includes('spark') || tier.includes('vibe') || tier.includes('pro')) {
        return 'pro';
    }

    // Free/trial get compressed
    return 'free';
}

// ============== USER TIER CONTEXT ==============

interface UserTierContextType {
    tier: QualityTier;
    subscriptionTier: string | undefined;
    user: User | null;
    isLoading: boolean;
    refresh: () => Promise<void>;
}

const UserTierContext = createContext<UserTierContextType>({
    tier: 'free',
    subscriptionTier: undefined,
    user: null,
    isLoading: true,
    refresh: async () => { },
});

export function UserTierProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = async () => {
        try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
        } catch (error) {
            console.error('Failed to fetch user for tier:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUser();
    }, []);

    const tier = getQualityTierFromSubscription(user?.subscription_tier);
    const subscriptionTier = user?.subscription_tier;

    return (
        <UserTierContext.Provider value= {{ tier, subscriptionTier, user, isLoading, refresh: fetchUser }
}>
    { children }
    </UserTierContext.Provider>
    );
}

// ============== HOOK ==============

/**
 * Hook to get the current user's quality tier
 * 
 * @example
 * const { tier, subscriptionTier } = useUserTier();
 * const downloadUrl = getDownloadUrl(imageUrl, tier);
 */
export function useUserTier() {
    return useContext(UserTierContext);
}

// ============== STANDALONE FUNCTION ==============

/**
 * Get quality tier from cached user data (for non-hook contexts)
 * Falls back to 'free' if no user is logged in
 */
export function getCachedUserTier(): QualityTier {
    try {
        // Check for cached user data in localStorage
        const cachedUser = localStorage.getItem('user_profile');
        if (cachedUser) {
            const user = JSON.parse(cachedUser);
            return getQualityTierFromSubscription(user.subscription_tier);
        }
    } catch (e) {
        // Ignore parsing errors
    }
    return 'free';
}

/**
 * Cache user tier to localStorage for fast access
 */
export function cacheUserTier(user: User | null) {
    if (user) {
        try {
            localStorage.setItem('user_profile', JSON.stringify({
                id: user.id,
                subscription_tier: user.subscription_tier,
                role: user.role,
            }));
        } catch (e) {
            // Ignore storage errors
        }
    }
}
