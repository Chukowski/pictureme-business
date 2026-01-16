import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import { createRequire } from "module";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import crypto from "crypto";

// Import bcrypt using CommonJS require
const require = createRequire(import.meta.url);
const bcrypt = require("bcrypt");

const { Pool } = pkg;

// Try to load .env file (for local development), but don't fail if it doesn't exist
try {
  dotenv.config();
} catch (e) {
  console.log("ℹ️  No .env file found, using environment variables from container");
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_POSTGRES_URL;
const BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || "mVyJT9MMrurtQZiXtkVS45fO6m01CHZGq9jmbOXHGQ4=";
const PORT = process.env.AUTH_PORT || 3002;

console.log("🔍 Environment check:");
console.log("  DATABASE_URL:", DATABASE_URL ? "✅ Set" : "❌ Missing");
console.log("  BETTER_AUTH_SECRET:", BETTER_AUTH_SECRET ? "✅ Set" : "❌ Missing");
console.log("  AUTH_PORT:", PORT);

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  console.error("   Please set DATABASE_URL in Dokploy environment variables");
  process.exit(1);
}

console.log("🔗 Connecting to database:", DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const app = express();

app.use(cors({
  origin: [
    "http://localhost:8080",
    "http://localhost:5173",
    "https://pictureme.now",
    "https://api.pictureme.now",
    process.env.VITE_BASE_URL,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "better-auth-simple" });
});

// Sign in endpoint
app.post("/api/auth/sign-in/email", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`📨 Sign-in attempt for: ${email}`);

    if (!email || !password) {
      return res.status(400).json({
        code: "INVALID_REQUEST",
        message: "Email and password are required"
      });
    }

    const client = await pool.connect();

    try {
      // Get user
      const userResult = await client.query(
        'SELECT * FROM "user" WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        console.log(`❌ User not found: ${email}`);
        return res.status(401).json({
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password"
        });
      }

      const user = userResult.rows[0];
      console.log(`✅ User found: ${user.email} (ID: ${user.id})`);

      // Get account with password
      const accountResult = await client.query(
        'SELECT * FROM account WHERE "userId" = $1 AND "providerId" = $2',
        [String(user.id), 'credential']
      );

      if (accountResult.rows.length === 0) {
        console.log(`❌ No account found for user ${user.id}`);
        return res.status(401).json({
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password"
        });
      }

      const account = accountResult.rows[0];
      console.log(`✅ Account found, verifying password...`);

      // Verify password
      if (!account.password) {
        console.log(`❌ No password in account`);
        return res.status(401).json({
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password"
        });
      }

      const isValid = await bcrypt.compare(password, account.password);

      if (!isValid) {
        console.log(`❌ Invalid password`);
        return res.status(401).json({
          code: "INVALID_EMAIL_OR_PASSWORD",
          message: "Invalid email or password"
        });
      }

      console.log(`✅ Password valid! Creating session...`);

      // Create session
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await client.query(
        `INSERT INTO session (id, "userId", "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [sessionId, String(user.id), expiresAt, req.ip, req.get('user-agent')]
      );

      console.log(`✅ Session created: ${sessionId}`);

      // Create JWT token
      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          sessionId,
        },
        BETTER_AUTH_SECRET,
        { expiresIn: '30d' }
      );

      // Set cookie
      res.cookie('better-auth.session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      });

      // Return user data and token
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          slug: user.slug,
          tokens_remaining: user.tokens_remaining,
          is_active: user.is_active,
        },
        token: token, // Include token for frontend to use in API calls
        session: {
          id: sessionId,
          expiresAt: expiresAt.toISOString(),
        },
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error("❌ Sign-in error:", error);
    res.status(500).json({
      code: "INTERNAL_ERROR",
      message: "An error occurred during sign-in"
    });
  }
});

// Get session endpoint
app.get("/api/auth/get-session", async (req, res) => {
  try {
    const token = req.cookies?.['better-auth.session_token'] || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.json({ user: null, session: null });
    }

    const decoded = jwt.verify(token, BETTER_AUTH_SECRET);

    const client = await pool.connect();
    try {
      const userResult = await client.query(
        'SELECT * FROM "user" WHERE id = $1',
        [String(decoded.sub)]
      );

      if (userResult.rows.length === 0) {
        return res.json({ user: null, session: null });
      }

      const user = userResult.rows[0];

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          slug: user.slug,
          tokens_remaining: user.tokens_remaining,
          is_active: user.is_active,
        },
        session: {
          id: decoded.sessionId,
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
        },
      });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("❌ Get session error:", error);
    res.json({ user: null, session: null });
  }
});

// Sign out endpoint
app.post("/api/auth/sign-out", async (req, res) => {
  try {
    const token = req.cookies?.['better-auth.session_token'];

    if (token) {
      const decoded = jwt.verify(token, BETTER_AUTH_SECRET);

      const client = await pool.connect();
      try {
        await client.query(
          'DELETE FROM session WHERE id = $1',
          [decoded.sessionId]
        );
      } finally {
        client.release();
      }
    }

    res.clearCookie('better-auth.session_token');
    res.json({ success: true });

  } catch (error) {
    console.error("❌ Sign-out error:", error);
    res.status(500).json({ error: "Sign-out failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🔐 Better Auth server running on http://localhost:${PORT}`);
  console.log(`📡 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
});

