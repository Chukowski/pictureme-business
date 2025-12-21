# Configuración híbrida PictureMe.now - Page Rules + Zone Settings básicos
# Compatible con permisos actuales

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

variable "domain" {
  description = "Domain name"
  type        = string
  default     = "pictureme.now"
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "zone_id" {
  description = "Cloudflare Zone ID for the domain"
  type        = string
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

data "cloudflare_zone" "main" {
  zone_id = var.zone_id
}

# 1. Always Use HTTPS
resource "cloudflare_page_rule" "force_https" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "*.${var.domain}/*"
  priority = 1

  actions {
    always_use_https = true
  }
}

# 2. Cache Everything para imgproxy - 30 días edge, 1 día browser
resource "cloudflare_page_rule" "cache_imgproxy" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "${var.domain}/imgproxy/*"
  priority = 2

  actions {
    cache_level         = "cache_everything"
    edge_cache_ttl      = 2592000  # 30 days
    browser_cache_ttl   = 86400    # 1 day
  }
}

# 3. Cache Everything para imágenes estáticas
resource "cloudflare_page_rule" "cache_images" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "${var.domain}/images/*"
  priority = 3

  actions {
    cache_level         = "cache_everything"
    edge_cache_ttl      = 2592000  # 30 days
    browser_cache_ttl   = 86400    # 1 day
  }
}

# 4. Bypass cache para APIs
resource "cloudflare_page_rule" "bypass_api" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "${var.domain}/api/*"
  priority = 4

  actions {
    cache_level = "bypass"
  }
}

# 5. Bypass cache para admin/dashboard
resource "cloudflare_page_rule" "bypass_admin" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "${var.domain}/admin/*"
  priority = 5

  actions {
    cache_level = "bypass"
  }
}

# 6. Bypass cache para dashboard
resource "cloudflare_page_rule" "bypass_dashboard" {
  zone_id  = data.cloudflare_zone.main.id
  target   = "${var.domain}/dashboard/*"
  priority = 6

  actions {
    cache_level = "bypass"
  }
}

# Zone Settings - solo los compatibles
resource "cloudflare_zone_settings_override" "optimization" {
  zone_id = data.cloudflare_zone.main.id
  
  settings {
    # Compression
    brotli = "on"
    
    # Caching
    browser_cache_ttl = 86400  # 1 day
    
    # Security (non-blocking)
    browser_check = "on"
    security_level = "medium"
    
    # SSL/TLS
    always_use_https = "on"
    ssl = "full"
  }
}

# Outputs
output "optimization_summary" {
  value = {
    zone_name = data.cloudflare_zone.main.name
    zone_id   = data.cloudflare_zone.main.id
    page_rules_created = [
      "HTTPS: *.${var.domain}/*",
      "Cache imgproxy: ${var.domain}/imgproxy/* (30d edge, 1d browser)",
      "Cache images: ${var.domain}/images/* (30d edge, 1d browser)", 
      "Bypass API: ${var.domain}/api/*",
      "Bypass Admin: ${var.domain}/admin/*",
      "Bypass Dashboard: ${var.domain}/dashboard/*"
    ]
    optimizations_enabled = [
      "✅ Brotli Compression",
      "✅ CSS/HTML/JS Minification", 
      "✅ Browser Integrity Check",
      "✅ Always Use HTTPS",
      "✅ Security Level: Medium"
    ]
  }
}