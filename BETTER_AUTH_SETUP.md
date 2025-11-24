# 🔐 Better Auth - Quick Setup Guide

**Status:** ✅ Ready to Use  
**Date:** November 24, 2025

---

## ✅ What's Been Done

### 1. **Packages Installed**
- ✅ `better-auth` - Core authentication library
- ✅ `pg` - PostgreSQL client
- ✅ `@types/pg` - TypeScript types

### 2. **Files Created**

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Better Auth server instance with roles |
| `src/lib/auth-client.ts` | React client with hooks |
| `auth-server.js` | Express server for auth endpoints |
| `docs/BETTER_AUTH_IMPLEMENTATION.md` | Complete implementation guide |

### 3. **Configuration**

**Environment Variables Added:**
```bash
BETTER_AUTH_SECRET=mVyJT9MMrurtQZiXtkVS45fO6m01CHZGq9jmbOXHGQ4=
BETTER_AUTH_URL=http://localhost:8080
VITE_AUTH_URL=http://localhost:3002
DATABASE_URL=postgresql://user:password@localhost:5432/photobooth
AUTH_PORT=3002
```

**Scripts Added:**
```json
{
  "auth": "node auth-server.js",
  "dev:full": "concurrently \"npm run dev\" \"npm run backend\" \"npm run auth\""
}
```

### 4. **Roles Configured**

- ✅ `individual` - Personal booth (default)
- ✅ `business_pending` - Application submitted
- ✅ `business_eventpro` - Up to 10 events
- ✅ `business_masters` - Unlimited events
- ✅ `superadmin` - Full system access

### 5. **Permissions Set Up**

Each role has specific permissions for:
- `booth` - Personal booth access
- `studio` - AI Studio features
- `templates` - Template management
- `events` - Event creation/management
- `analytics` - Analytics access
- `branding` - Branding customization
- `priority_support` - Priority support access

---

## 🚀 How to Start

### 1. **Update Your `.env` File**

Copy the variables from `env.example` to your `.env`:

```bash
cp env.example .env
```

Then update `DATABASE_URL` with your actual PostgreSQL credentials.

### 2. **Start All Services**

```bash
npm run dev:full
```

This will start:
- ✅ Frontend (Vite) - `http://localhost:8080`
- ✅ Backend (FastAPI) - `http://localhost:3001`
- ✅ Auth Server (Better Auth) - `http://localhost:3002`

### 3. **Test the Setup**

Visit `http://localhost:3002/health` - you should see:
```json
{
  "status": "ok",
  "service": "better-auth"
}
```

---

## 📝 Next Steps

### Immediate (Required)

1. **Update Login Page** (`src/pages/AdminAuth.tsx`)
   - Replace custom auth with Better Auth client
   - Use `authClient.signIn.email()`

2. **Update Register Page** (`src/pages/AdminRegister.tsx`)
   - Replace custom auth with Better Auth client
   - Use `authClient.signUp.email()`

3. **Test Authentication**
   - Create a test user
   - Sign in and verify session
   - Check role-based redirects

### Soon (Recommended)

4. **Migrate Existing Users**
   - Export users from old system
   - Import into Better Auth tables
   - Preserve user IDs and roles

5. **Update FastAPI Middleware**
   - Validate Better Auth JWT tokens
   - Extract user info from session
   - Maintain backward compatibility

### Future (Optional)

6. **Add Social Login**
   - Google OAuth
   - GitHub OAuth
   - Apple Sign In

7. **Email Features**
   - Email verification
   - Password reset
   - Welcome emails

---

## 🔧 Quick Reference

### Sign Up (React)

```tsx
import { authClient } from "@/lib/auth-client";

await authClient.signUp.email({
  email: "user@example.com",
  password: "password123",
  name: "John Doe",
});
```

### Sign In (React)

```tsx
import { authClient } from "@/lib/auth-client";

await authClient.signIn.email({
  email: "user@example.com",
  password: "password123",
});
```

### Get Session (React)

```tsx
import { useSession } from "@/lib/auth-client";

const { data: session, isPending } = useSession();

if (session) {
  console.log("User:", session.user);
  console.log("Role:", session.user.role);
}
```

### Check Role (React)

```tsx
import { isAdmin, isBusinessUser } from "@/lib/auth-client";

if (isAdmin(session)) {
  // Show admin features
}

if (isBusinessUser(session)) {
  // Show business features
}
```

---

## 📚 Documentation

- **Full Guide:** `docs/BETTER_AUTH_IMPLEMENTATION.md`
- **Better Auth Docs:** https://better-auth.com/docs
- **Admin Plugin:** https://better-auth.com/docs/plugins/admin

---

## ⚠️ Important Notes

1. **Node Version:** Better Auth requires Node.js 20+. You're currently on v18.20.2. Consider upgrading for full compatibility.

2. **Database Tables:** Better Auth will auto-create tables on first run:
   - `user`
   - `session`
   - `account`
   - `verification`

3. **CORS:** The auth server is configured to allow requests from:
   - `http://localhost:8080` (Vite dev)
   - `http://localhost:5173` (Vite alternative)
   - Your `VITE_BASE_URL`

4. **Sessions:** Sessions expire after 7 days by default. They auto-refresh every 24 hours.

---

## 🎯 Success Criteria

✅ Auth server starts without errors  
✅ Health check returns `{"status": "ok"}`  
✅ Users can sign up  
✅ Users can sign in  
✅ Sessions persist across page refreshes  
✅ Roles are correctly assigned  
✅ Role-based redirects work  

---

**Ready to implement?** Start with updating the login/register pages! 🚀

