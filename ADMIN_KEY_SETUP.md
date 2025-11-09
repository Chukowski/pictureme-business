# 🔑 How to Add Your ADMIN API Key

## Quick Answer

Add **one new line** to your `.env` file:

```bash
# Your existing API key (for image generation)
VITE_FAL_KEY=58614e6a-c41e-489e-bde5-a84379924a20:ded4d8b3ceab60a9ce0b5d96dcaff350

# Your NEW ADMIN key (for analytics) - ADD THIS LINE
FAL_KEY=your-new-admin-key-here

# Rest of your .env stays the same
VITE_FAL_MODEL=fal-ai/bytedance/seedream/v4/edit
VITE_BASE_URL=http://localhost:8080
# ... etc
```

## Why Both Keys?

| Key | Scope | Used For |
|-----|-------|----------|
| `VITE_FAL_KEY` | API | Frontend image generation (works fine as-is) |
| `FAL_KEY` | ADMIN | Backend analytics, usage tracking, pricing |

The backend service **automatically tries `FAL_KEY` first**, then falls back to `VITE_FAL_KEY`.

## Step-by-Step

### 1. Open your `.env` file
```bash
# In your project root
nano .env
# or
code .env
```

### 2. Add the new line
Find your existing `VITE_FAL_KEY` line and add `FAL_KEY` right after it:

```bash
# fal.ai API Configuration
VITE_FAL_KEY=58614e6a-c41e-489e-bde5-a84379924a20:ded4d8b3ceab60a9ce0b5d96dcaff350
FAL_KEY=paste-your-new-admin-key-here  # ← ADD THIS
```

### 3. Save the file

### 4. Restart your backend
```bash
# Stop your backend (Ctrl+C)
# Then start it again
python backend/main.py
# or however you're running it
```

## What You'll See

After restart, the logs should show:
```
✅ fal API Key loaded: your-new-key...
✅ Successfully fetching analytics  # No more 401!
```

## Alternative: Use Same Key for Both

If you prefer to use your new ADMIN key for everything:

```bash
# Use the same ADMIN key for both
VITE_FAL_KEY=your-new-admin-key
FAL_KEY=your-new-admin-key
```

**Why?** ADMIN scope includes everything API scope has, so it works for both image generation AND analytics.

## Test It

1. Restart backend
2. Open Admin Dashboard
3. Click "Analytics" tab
4. Scroll down - you should see "AI Performance (Last 7 Days)" section
5. It should show AI Requests, Success Rate, Latency, and Cost cards

🎉 Done!

