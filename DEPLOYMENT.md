# 🚀 Deployment Guide - PictureMe.now

## Prerequisites

- Docker & Docker Compose installed
- Domain configured with DNS records:
  - `pictureme.now` → Your server IP
  - `api.pictureme.now` → Your server IP
  - `auth.pictureme.now` → Your server IP
- SSL certificates (Let's Encrypt recommended)

## Environment Variables

Create a `.env` file in production with:

```bash
# API URLs
VITE_API_URL=https://api.pictureme.now
VITE_AUTH_URL=https://auth.pictureme.now
BETTER_AUTH_URL=https://auth.pictureme.now

# Database
DATABASE_URL=postgresql://photouser:PASSWORD@5.161.255.18:5432/photodb

# Better Auth
BETTER_AUTH_SECRET=mVyJT9MMrurtQZiXtkVS45fO6m01CHZGq9jmbOXHGQ4=
AUTH_PORT=3002

# S3/MinIO
VITE_MINIO_ENDPOINT=s3.amazonaws.com
VITE_MINIO_PORT=443
VITE_MINIO_USE_SSL=true
VITE_MINIO_ACCESS_KEY=YOUR_ACCESS_KEY
VITE_MINIO_SECRET_KEY=YOUR_SECRET_KEY
VITE_MINIO_BUCKET=pictureme.now
VITE_MINIO_SERVER_URL=https://s3.amazonaws.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Fal.ai
FAL_KEY=your-fal-admin-key
VITE_FAL_KEY=your-fal-api-key

# CouchDB
VITE_COUCHDB_URL=http://your-couchdb:5984
VITE_COUCHDB_USER=admin
VITE_COUCHDB_PASSWORD=password
```

## Deployment Steps

### 1. DNS Configuration

Add A records in your DNS provider:

```
pictureme.now       A    YOUR_SERVER_IP
api.pictureme.now   A    YOUR_SERVER_IP
auth.pictureme.now  A    YOUR_SERVER_IP
```

### 2. SSL Certificates (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d pictureme.now -d www.pictureme.now
sudo certbot --nginx -d api.pictureme.now
sudo certbot --nginx -d auth.pictureme.now
```

### 3. Build and Deploy with Docker

```bash
# Pull latest code
git pull origin saas

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Setup Nginx

```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/pictureme.now
sudo ln -s /etc/nginx/sites-available/pictureme.now /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Run Database Migrations

```bash
# Enter backend container
docker exec -it <backend-container-id> bash

# Run migrations
cd /app
python -c "
import asyncio
import asyncpg
import os

async def run_migrations():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Run migration 003
    with open('migrations/003_add_billing_and_tokens.sql', 'r') as f:
        await conn.execute(f.read())
    
    # Run migration 004
    with open('migrations/004_add_profile_fields.sql', 'r') as f:
        await conn.execute(f.read())
    
    await conn.close()
    print('✅ Migrations completed')

asyncio.run(run_migrations())
"
```

## Verification

### Check Services

```bash
# Check if services are running
docker-compose -f docker-compose.prod.yml ps

# Test endpoints
curl https://api.pictureme.now/health
curl https://auth.pictureme.now/health
curl https://pictureme.now
```

### Test Login

1. Go to `https://pictureme.now/admin/auth`
2. Login with your credentials
3. Check browser console for errors

## Troubleshooting

### CORS Errors

If you see CORS errors, check:
- Nginx CORS headers are configured
- `auth-server-simple.js` has correct origins
- Cookies are being sent with `credentials: 'include'`

### Auth Server Not Responding

```bash
# Check auth server logs
docker-compose -f docker-compose.prod.yml logs auth

# Restart auth server
docker-compose -f docker-compose.prod.yml restart auth
```

### Database Connection Issues

```bash
# Test database connection
docker exec -it <backend-container-id> bash
python -c "import asyncpg; import asyncio; asyncio.run(asyncpg.connect('$DATABASE_URL'))"
```

## Monitoring

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f auth
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## Updating

```bash
# Pull latest changes
git pull origin saas

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Remove old images
docker image prune -f
```

## Rollback

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Checkout previous commit
git checkout <previous-commit-hash>

# Rebuild
docker-compose -f docker-compose.prod.yml up -d --build
```
