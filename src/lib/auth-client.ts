import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ENV } from "@/config/env";

/**
 * Get auth URL - uses ENV which auto-derives production URLs
 * Falls back to localhost only in development
 */
function getAuthUrl(): string {
  const url = ENV.AUTH_URL;
  if (url) return url;
  
  // Only use localhost fallback in development
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'http://localhost:3002';
    }
  }
  
  // In production without URL, return empty (auth will fail gracefully)
  return '';
}

export const authClient = createAuthClient({
  baseURL: getAuthUrl(),
  
  plugins: [
    adminClient(), // Enable admin plugin for roles
  ],
  
  fetchOptions: {
    timeout: 30000, // 30 seconds timeout
    credentials: 'include', // Include cookies
  },
});

// Export hooks for easy use in components
export const {
  useSession,
  useSignIn,
  useSignUp,
  useSignOut,
} = authClient;

// Helper to check if user has a specific role
export const hasRole = (session: any, role: string): boolean => {
  return session?.user?.role === role;
};

// Helper to check if user has any of the specified roles
export const hasAnyRole = (session: any, roles: string[]): boolean => {
  return roles.includes(session?.user?.role);
};

// Role constants
export const ROLES = {
  INDIVIDUAL: "individual",
  BUSINESS_PENDING: "business_pending",
  BUSINESS_EVENTPRO: "business_eventpro",
  BUSINESS_MASTERS: "business_masters",
  SUPERADMIN: "superadmin",
} as const;

// Helper to check if user is business tier
export const isBusinessUser = (session: any): boolean => {
  return hasAnyRole(session, [
    ROLES.BUSINESS_EVENTPRO,
    ROLES.BUSINESS_MASTERS,
  ]);
};

// Helper to check if user is admin
export const isAdmin = (session: any): boolean => {
  return hasRole(session, ROLES.SUPERADMIN);
};

