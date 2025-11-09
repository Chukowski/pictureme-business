# 🔧 fal Analytics API Key Configuration Fix

## Problem
The backend is getting a 401 error when calling fal Platform APIs:
```
❌ fal analytics API error: 401 - {"error":{"type":"authorization_error","message":"Invalid API key or malformed Authorization header"}}
```

## Root Cause
The **Platform APIs require an ADMIN scope API key**, not just a regular API key.

### API Key Scopes in fal:
- **API scope** → For running AI models (image generation)
- **ADMIN scope** → For Platform APIs (analytics, usage tracking, pricing)

Your current key likely has **API scope only**, which works for generating images but **not for analytics**.

## ✅ Solution: Generate an ADMIN API Key

### Step 1: Create New API Key with ADMIN Scope

1. Go to **https://fal.ai/dashboard/keys**
2. Click **"Create New Key"**
3. **Important:** Select **"ADMIN"** scope (not just "API")
4. Copy the new key

### Step 2: Update Your .env File

Replace your current key with the new ADMIN-scoped key:

```bash
# fal.ai API Configuration - ADMIN scope key
VITE_FAL_KEY=your-new-admin-key-here
FAL_KEY=your-new-admin-key-here
```

### Step 3: Restart Backend

```bash
# Restart your backend server to load the new key
```

## Verification

After restarting with the new ADMIN key, you should see:
```
✅ fal API Key loaded: your-key...
✅ Successfully fetched analytics data
```

**No more 401 errors!**

## What Changed

The `fal_analytics.py` service now provides better error messages:
```
❌ fal analytics API error: 401 - Unauthorized
💡 This usually means:
   1. Your API key needs ADMIN scope (not just API scope)
   2. Generate a new key at: https://fal.ai/dashboard/keys
   3. Make sure to select 'ADMIN' scope when creating the key
```

## Why Two Keys Might Be Needed

If you want to keep your existing API-scoped key for image generation and have a separate ADMIN key for analytics, you can:

1. Keep `VITE_FAL_KEY` for frontend/image generation (API scope is fine)
2. Use `FAL_KEY` specifically for backend analytics (ADMIN scope required)

```bash
# For image generation (API scope)
VITE_FAL_KEY=your-api-scope-key

# For analytics (ADMIN scope)
FAL_KEY=your-admin-scope-key
```

## Dashboard Behavior

**Good news:** Even if analytics fails, your dashboard won't break!

- ✅ Event analytics still work (photos, views, etc.)
- ✅ Dashboard loads normally
- ❌ AI Performance section won't show (until ADMIN key is added)

This is by design - analytics are complementary, not critical.

## Summary

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Generate new API key with **ADMIN scope** |
| Key loaded but still fails | Current key has API scope, needs ADMIN |
| Dashboard breaks | It won't! Analytics section just won't appear |

🔗 **Create ADMIN key here:** https://fal.ai/dashboard/keys

