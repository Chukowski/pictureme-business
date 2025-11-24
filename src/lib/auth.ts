import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { admin } from "better-auth/plugins";

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: import.meta.env.DATABASE_URL || process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: pool,
  
  emailAndPassword: {
    enabled: true,
    autoSignIn: true, // Auto sign in after registration
    minPasswordLength: 8,
  },

  // Enable admin plugin for roles and permissions
  plugins: [
    admin({
      defaultRole: "individual",
      roles: {
        individual: {
          name: "Individual",
          description: "Personal booth access",
        },
        business_pending: {
          name: "Business Pending",
          description: "Application submitted, awaiting approval",
        },
        business_eventpro: {
          name: "Business EventPro",
          description: "Up to 10 events, standard features",
        },
        business_masters: {
          name: "Business Masters",
          description: "Unlimited events, priority support",
        },
        superadmin: {
          name: "Super Admin",
          description: "Full system access",
        },
      },
      // Access control for permissions
      ac: {
        // Individual permissions
        individual: {
          booth: ["read", "update"],
          studio: ["create", "read"],
          templates: ["create", "read", "update", "delete"],
        },
        // Business EventPro permissions
        business_eventpro: {
          booth: ["read", "update"],
          studio: ["create", "read"],
          templates: ["create", "read", "update", "delete"],
          events: ["create", "read", "update", "delete"], // Max 10
          analytics: ["read"],
          branding: ["create", "read", "update"],
        },
        // Business Masters permissions
        business_masters: {
          booth: ["read", "update"],
          studio: ["create", "read"],
          templates: ["create", "read", "update", "delete"],
          events: ["create", "read", "update", "delete"], // Unlimited
          analytics: ["read"],
          branding: ["create", "read", "update"],
          priority_support: ["read"],
        },
        // Super Admin permissions
        superadmin: {
          $: ["*"], // All permissions
        },
      },
    }),
  ],

  // Additional user fields
  user: {
    additionalFields: {
      slug: {
        type: "string",
        required: false,
        unique: true,
      },
      tokens_remaining: {
        type: "number",
        required: false,
        defaultValue: 100,
      },
      is_active: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },

  // Advanced options
  advanced: {
    generateId: () => {
      // Generate UUID for user IDs
      return crypto.randomUUID();
    },
  },
});

export type Session = typeof auth.$Infer.Session;

