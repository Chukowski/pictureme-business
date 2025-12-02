import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import fetch, { Request, Response } from "node-fetch";
import { createRequire } from "module";
import jwt from "jsonwebtoken";

// Import bcrypt using CommonJS require (it's not ESM compatible)
const require = createRequire(import.meta.url);
const bcrypt = require("bcrypt");

// Make fetch global
global.fetch = fetch;
global.Request = Request;
global.Response = Response;

const { Pool } = pkg;

dotenv.config();

// Get database URL
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_POSTGRES_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL or VITE_POSTGRES_URL not found in environment");
  process.exit(1);
}

console.log("🔗 Connecting to database:", DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

// Create Kysely instance with explicit schema
const db = new Kysely({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: DATABASE_URL,
    }),
  }),
});

const auth = betterAuth({
  database: db,
  
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    
    // Use bcrypt for password hashing (compatible with existing hashes)
    password: {
      hash: async (password) => {
        console.log('🔐 Hashing password...');
        return bcrypt.hash(password, 10);
      },
      verify: async (password, hash) => {
        console.log('🔍 Verifying password...');
        console.log('  Password provided:', password ? 'Yes' : 'No');
        console.log('  Hash provided:', hash ? 'Yes' : 'No');
        console.log('  Hash value:', hash ? hash.substring(0, 20) + '...' : 'null');
        
        if (!password) {
          console.error('❌ No password provided!');
          return false;
        }
        
        if (!hash) {
          console.error('❌ No hash provided! Fetching manually...');
          
          // This shouldn't happen, but if it does, we need to investigate
          // For now, return false
          return false;
        }
        
        const result = await bcrypt.compare(password, hash);
        console.log('  Result:', result ? '✅ Match' : '❌ No match');
        return result;
      },
    },
  },

  user: {
    additionalFields: {
      slug: {
        type: "string",
        required: false,
        unique: true,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "individual",
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

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
  },

  advanced: {
    generateId: () => {
      return crypto.randomUUID();
    },
  },
});

const app = express();
const PORT = process.env.AUTH_PORT || 3002;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:5173",
    process.env.VITE_BASE_URL,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json());

// Better Auth handler - handles all /api/auth routes
app.use("/api/auth", async (req, res) => {
  try {
    // Build full URL
    const protocol = req.protocol || 'http';
    const host = req.get('host') || `localhost:${PORT}`;
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;
    
    console.log(`📨 ${req.method} ${fullUrl}`);
    
    // Convert Express request to Web API Request
    const headers = new Headers();
    Object.keys(req.headers).forEach(key => {
      const value = req.headers[key];
      if (value) {
        headers.set(key, Array.isArray(value) ? value[0] : value);
      }
    });
    
    // Prepare body
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body && Object.keys(req.body).length > 0) {
        body = JSON.stringify(req.body);
        headers.set('content-type', 'application/json');
        console.log(`📦 Request body:`, req.body);
      }
    }
    
    // Create Web API Request
    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers,
      body,
    });

    // Call Better Auth
    console.log(`🔄 Calling Better Auth handler...`);
    const webResponse = await auth.handler(webRequest);
    console.log(`✅ Better Auth responded with status: ${webResponse.status}`);
    
    // Convert Web API Response to Express response
    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    res.status(webResponse.status);
    
    // Send body
    const responseText = await webResponse.text();
    console.log(`📤 Response:`, responseText.substring(0, 200));
    
    if (responseText) {
      res.send(responseText);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("❌ Auth handler error:", error);
    console.error("❌ Stack:", error.stack);
    res.status(500).json({ 
      error: "Internal server error", 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "better-auth" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔐 Better Auth server running on http://localhost:${PORT}`);
  console.log(`📡 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
});

