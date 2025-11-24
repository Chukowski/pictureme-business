import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_URL || "http://localhost:3002",
  
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

