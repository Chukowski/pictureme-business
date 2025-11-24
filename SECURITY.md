# 🔒 Security Guide - PictureMe.now

## Overview

This document outlines the security measures implemented in PictureMe.now and best practices for deployment.

---

## ✅ What's Safe to Expose (Frontend)

These variables are **safe** to include in `window.ENV` because they are public by design:

### Public API Endpoints
```bash
VITE_API_URL=https://api.pictureme.now
VITE_AUTH_URL=https://auth.pictureme.now
VITE_BASE_URL=https://pictureme.now
```
- **Why Safe**: These are public URLs that anyone can access
- **Risk**: None - they're meant to be public

### S3/MinIO Configuration
```bash
VITE_MINIO_ENDPOINT=s3.amazonaws.com
VITE_MINIO_BUCKET=pictureme.now
VITE_MINIO_SERVER_URL=https://s3.amazonaws.com
```
- **Why Safe**: The bucket is public (read-only for images)
- **Risk**: None - bucket policy restricts writes
- **Note**: Access keys are NOT exposed (only in backend)

### Stripe Publishable Key
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```
- **Why Safe**: This is Stripe's PUBLIC key, meant to be exposed
- **Risk**: None - it only allows creating payment intents, not processing payments
- **Note**: Secret key (`sk_live_...`) is ONLY in backend

### Fal.ai API Key
```bash
VITE_FAL_KEY=your-api-key
```
- **Why Safe**: This key is scoped for client-side usage
- **Risk**: Low - rate limited and scoped to specific models
- **Note**: Use a client-scoped key, not admin key

### CouchDB URL
```bash
VITE_COUCHDB_URL=http://your-couchdb:5984
```
- **Why Safe**: Only the URL is exposed, not credentials
- **Risk**: None - authentication happens on backend

---

## ❌ What Should NEVER Be Exposed

These variables must **ONLY** be in backend/auth server, never in frontend:

### Database Credentials
```bash
❌ DATABASE_URL=postgresql://user:password@host:5432/db
```
- **Risk**: HIGH - Full database access
- **Location**: Backend & Auth Server only

### Authentication Secrets
```bash
❌ BETTER_AUTH_SECRET=...
❌ SECRET_KEY=...
```
- **Risk**: CRITICAL - Can forge authentication tokens
- **Location**: Backend & Auth Server only

### Stripe Secret Key
```bash
❌ STRIPE_SECRET_KEY=sk_live_...
```
- **Risk**: CRITICAL - Can charge cards and access customer data
- **Location**: Backend only

### AWS/S3 Secret Keys
```bash
❌ VITE_MINIO_SECRET_KEY=...
❌ AWS_SECRET_ACCESS_KEY=...
```
- **Risk**: HIGH - Can write/delete from S3
- **Location**: Backend only

### Webhook Secrets
```bash
❌ STRIPE_WEBHOOK_SECRET=whsec_...
```
- **Risk**: HIGH - Can forge webhook events
- **Location**: Backend only

---

## 🛡️ Security Measures Implemented

### 1. **CORS Protection**
```python
# backend/main.py
CORS(app, allow_origins=[
    "https://pictureme.now",
    "https://api.pictureme.now",
])
```
- Blocks requests from unauthorized domains
- Prevents CSRF attacks

### 2. **JWT Authentication**
```python
# backend/main.py
async def get_current_user(request: Request):
    # Validates JWT token from cookie or header
    # Verifies signature with BETTER_AUTH_SECRET
```
- All protected endpoints require valid JWT
- Tokens expire after 7 days
- Signed with secret key (not exposed)

### 3. **S3 Bucket Policy**
```json
{
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::pictureme.now/*"
}
```
- Public read access (for images)
- Write access only via backend with AWS credentials
- CORS configured for specific origins

### 4. **Password Hashing**
```python
# backend/main.py
import bcrypt

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
```
- Passwords never stored in plain text
- Uses bcrypt with salt

### 5. **HTTPS Only**
- All production traffic uses HTTPS
- Cookies set with `secure` flag in production
- Prevents man-in-the-middle attacks

---

## 🔐 Best Practices for Deployment

### 1. **Environment Variables**

**In Dokploy (Frontend):**
```bash
# ✅ Safe to expose
VITE_API_URL=https://api.pictureme.now
VITE_AUTH_URL=https://auth.pictureme.now
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**In Dokploy (Backend):**
```bash
# ❌ Keep secret
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
BETTER_AUTH_SECRET=...
```

### 2. **API Key Scoping**

**Fal.ai Keys:**
- Frontend: Use **API** scope key (limited permissions)
- Backend: Use **ADMIN** scope key (full access)

**Stripe Keys:**
- Frontend: Use **Publishable** key (`pk_live_...`)
- Backend: Use **Secret** key (`sk_live_...`)

### 3. **Rate Limiting**

Implement rate limiting on sensitive endpoints:

```python
# TODO: Add to backend/main.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def login(...):
    # Login logic
```

### 4. **Input Validation**

All user inputs are validated:
```python
# backend/main.py
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None  # Validates email format
    birth_date: Optional[str] = None  # Validates date format
```

### 5. **SQL Injection Prevention**

Using parameterized queries:
```python
# ✅ Safe - parameterized
await conn.execute("SELECT * FROM users WHERE id = $1", user_id)

# ❌ Unsafe - string interpolation
await conn.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

---

## 🚨 Security Checklist

Before deploying to production:

- [ ] All secret keys are in backend environment variables only
- [ ] Frontend only has public keys (pk_*, API scope keys)
- [ ] HTTPS is enabled on all domains
- [ ] CORS is configured with specific origins (no wildcards in production)
- [ ] Database credentials are not exposed
- [ ] S3 bucket has correct permissions (public read, private write)
- [ ] JWT tokens expire after reasonable time
- [ ] Passwords are hashed with bcrypt
- [ ] Rate limiting is enabled on auth endpoints
- [ ] Input validation is implemented
- [ ] SQL queries use parameterized statements

---

## 🔍 How to Verify Security

### 1. **Check Frontend Exposure**
```javascript
// In browser console
console.log(window.ENV);
// Should only show public variables
```

### 2. **Check Network Requests**
- Open DevTools > Network
- Look for any requests exposing secrets
- Verify HTTPS is used for all requests

### 3. **Test CORS**
```bash
# Should be blocked
curl -X POST https://api.pictureme.now/api/auth/login \
  -H "Origin: https://malicious-site.com"
```

### 4. **Test Authentication**
```bash
# Should return 401
curl https://api.pictureme.now/api/users/me
```

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Stripe Security Best Practices](https://stripe.com/docs/security)
- [AWS S3 Security](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

## 🆘 Security Incident Response

If you suspect a security breach:

1. **Immediately rotate all secrets:**
   - Database password
   - BETTER_AUTH_SECRET
   - Stripe secret key
   - AWS access keys

2. **Check logs for suspicious activity:**
   ```bash
   docker-compose logs backend | grep "401\|403\|500"
   ```

3. **Revoke compromised JWT tokens:**
   - Clear sessions table in database
   - Force all users to re-login

4. **Update and redeploy:**
   - Update all environment variables
   - Redeploy all services

---

## 📞 Contact

For security concerns, contact: [your-security-email]

