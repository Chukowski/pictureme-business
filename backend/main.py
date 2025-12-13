from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Load .env files - check both locations
# First try backend/.env (local development)
backend_env = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(backend_env):
    load_dotenv(backend_env)
    print(f"📁 Loaded .env from: {backend_env}")

# Then load from project root (may override or add missing vars)
root_env = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(root_env):
    load_dotenv(root_env, override=False)  # Don't override backend/.env values
    print(f"📁 Loaded .env from: {root_env}")

app = FastAPI(title="AI Photo Booth - AI Microservice", version="2.0.0")

# CORS - Allow all pictureme.now subdomains and localhost
# Read additional origins from environment variable for flexibility in deployment
ADDITIONAL_CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
CORS_ORIGINS = [
    "https://pictureme.now",
    "https://www.pictureme.now",
    "https://api.pictureme.now",
    "https://auth.pictureme.now",
    "https://photo.akitapr.com",
    "https://photoapi.akitapr.com",
    "http://localhost:8080",
    "http://localhost:3000",
    "http://localhost:5173",
] + [origin.strip() for origin in ADDITIONAL_CORS_ORIGINS if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include AI routers
try:
    from routers import generate
    app.include_router(generate.router)
    print("✅ Generate router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include generate router: {e}")

try:
    from routers import prompt_helper
    app.include_router(prompt_helper.router)
    print("✅ Prompt helper router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include prompt helper router: {e}")

# Akito AI Assistant Router
try:
    from routers import akito
    app.include_router(akito.router)
    print("✅ Akito assistant router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include Akito router: {e}")

# CopilotKit Integration
try:
    from routers.copilotkit_endpoint import sdk
    from copilotkit.integrations.fastapi import add_fastapi_endpoint
    add_fastapi_endpoint(app, sdk, "/copilotkit")
    print("✅ CopilotKit endpoint added at /copilotkit")
except Exception as e:
    print(f"⚠️  Warning: Could not add CopilotKit endpoint: {e}")

@app.get("/")
async def root():
    return {
        "service": "AI Photo Booth Microservice",
        "version": "2.0.0",
        "status": "online"
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
