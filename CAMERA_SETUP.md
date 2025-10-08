# Camera Setup Guide

## Why Camera Isn't Working

Modern browsers require **HTTPS (secure connection)** to access camera/microphone for security reasons, except when accessing from `localhost` or `127.0.0.1`.

## Quick Diagnosis

1. Open the app in your browser
2. Look for the **Info (ℹ️)** button in the top-right corner when on the camera screen
3. Click it to see the Debug Info panel
4. Check:
   - **Secure Context**: Should be "✅ Yes"
   - **Protocol**: Should be `https:` (or `http:` only if on localhost)
   - **Permission**: Should be "granted"

## Solutions

### Option 1: Local Development (Easiest)

Access via localhost:
```bash
# If running Docker
docker run -p 80:80 ai-photo-booth-hub
# Then access via: http://localhost

# If running with npm/vite
npm run dev
# Access via: http://localhost:8080
```

### Option 2: HTTPS with Self-Signed Certificate (Development)

Create a self-signed certificate:

```bash
# Generate certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Update Dockerfile to use HTTPS
# Add nginx SSL configuration
```

Then modify the Dockerfile nginx config:
```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of config
}
```

**Note**: Browsers will show a security warning for self-signed certificates. You'll need to accept it.

### Option 3: Reverse Proxy with SSL (Recommended for Production)

Use a reverse proxy like **Traefik**, **Caddy**, or **nginx** with Let's Encrypt:

#### Using Caddy (Easiest):

Create `Caddyfile`:
```
your-domain.com {
    reverse_proxy localhost:80
}
```

Run Caddy:
```bash
docker run -d \
  -p 80:80 -p 443:443 \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  caddy
```

Caddy automatically handles SSL certificates with Let's Encrypt!

#### Using Traefik:

Create `docker-compose.yml`:
```yaml
version: '3'
services:
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.myresolver.acme.tlschallenge=true"
      - "--certificatesresolvers.myresolver.acme.email=your-email@example.com"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"

  photo-booth:
    image: ai-photo-booth-hub
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.photobooth.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.photobooth.entrypoints=websecure"
      - "traefik.http.routers.photobooth.tls.certresolver=myresolver"
```

### Option 4: Deploy to Cloud Platform

Deploy to platforms that provide automatic HTTPS:

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`
- **AWS CloudFront** + **S3**
- **Google Cloud Run**
- **Azure Static Web Apps**

## Testing Camera Access

1. Access the site via HTTPS (or localhost)
2. When prompted, **Allow camera access**
3. Check browser permissions:
   - Chrome: `chrome://settings/content/camera`
   - Firefox: Click the padlock icon → More Information → Permissions
   - Safari: Preferences → Websites → Camera

## Common Issues

### "Camera access denied"
- **Solution**: Check browser camera permissions and allow access

### "Camera requires HTTPS connection"
- **Solution**: Access via HTTPS or localhost (see options above)

### "No camera found on this device"
- **Solution**: Ensure you have a working camera connected

### Camera works on localhost but not on network IP
- **Solution**: Use HTTPS with a proper certificate (Options 2 or 3)

## Browser Console Logs

Open browser console (F12) to see detailed logs:
- `🔒 Secure Context:` - Shows if HTTPS is detected
- `🌐 Protocol:` - Shows http: or https:
- `📷 Available cameras:` - Lists detected cameras
- `✅ Camera ready!` - Camera successfully initialized

## Security Notes

⚠️ **Important**: Camera access requires HTTPS in production for security reasons. This prevents malicious websites from accessing user cameras without permission.

Exceptions:
- `localhost`
- `127.0.0.1`
- `*.localhost` subdomains

## Need Help?

If you see the debug panel and it shows:
- ❌ Secure Context: No
- Protocol: http:
- Host: (not localhost)

Then you MUST implement one of the HTTPS solutions above.

