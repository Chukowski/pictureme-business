"""
FastAPI Backend for AI Photo Booth
Multiuser, multi-event platform with live feeds
Uses CouchDB for events/photos, PostgreSQL for users, MinIO for images
"""

from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
import asyncpg
import boto3
from jose import JWTError, jwt
import bcrypt
import os
import json
from dotenv import load_dotenv
import base64
import uuid
import io
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Import CouchDB service
from couchdb_service import get_couch_service

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

# ===== Configuration =====
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("VITE_POSTGRES_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
BETTER_AUTH_SECRET = os.getenv("BETTER_AUTH_SECRET", "mVyJT9MMrurtQZiXtkVS45fO6m01CHZGq9jmbOXHGQ4=")
print(f"🔑 BETTER_AUTH_SECRET loaded: {BETTER_AUTH_SECRET[:20]}...")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

MINIO_ENDPOINT = os.getenv("VITE_MINIO_ENDPOINT", "storage.akitapr.com")
MINIO_ACCESS_KEY = os.getenv("VITE_MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("VITE_MINIO_SECRET_KEY")
MINIO_BUCKET = os.getenv("VITE_MINIO_BUCKET", "photobooth")
MINIO_SERVER_URL = os.getenv("VITE_MINIO_SERVER_URL", "https://storage.akitapr.com")

FAL_KEY = os.getenv("VITE_FAL_KEY")
FAL_MODEL = os.getenv("VITE_FAL_MODEL", "fal-ai/bytedance/seedream/v4/edit")

# Password hashing (using bcrypt directly instead of passlib for compatibility)

# Security
security = HTTPBearer(auto_error=False)  # auto_error=False makes it optional

# FastAPI app
app = FastAPI(title="AI Photo Booth API", version="2.0.0")

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

# Log CORS origins for debugging
print(f"🔒 CORS allowed origins: {CORS_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Import and include routers
try:
    from routers import generate
    app.include_router(generate.router)
    print("✅ Generate router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include generate router: {e}")
    print("   Image generation endpoints will not be available")

try:
    from routers import enterprise_pricing
    app.include_router(enterprise_pricing.router)
    print("✅ Enterprise pricing router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include enterprise pricing router: {e}")

try:
    from routers import tokens
    app.include_router(tokens.router)
    print("✅ Tokens router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include tokens router: {e}")

try:
    from routers import billing
    app.include_router(billing.router)
    print("✅ Billing router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include billing router: {e}")

try:
    from routers import marketplace
    app.include_router(marketplace.router)
    print("✅ Marketplace router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include marketplace router: {e}")

try:
    from routers import prompt_helper
    app.include_router(prompt_helper.router)
    print("✅ Prompt helper router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include prompt helper router: {e}")
    import traceback
    traceback.print_exc()

# Akito AI Assistant Router
try:
    from routers import akito
    app.include_router(akito.router)
    print("✅ Akito assistant router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include Akito router: {e}")
    import traceback
    traceback.print_exc()

# Organizations Router
try:
    from routers import organizations
    app.include_router(organizations.router)
    print("✅ Organizations router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include organizations router: {e}")

# Albums Router
try:
    from routers import albums
    app.include_router(albums.router)
    print("✅ Albums router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include albums router: {e}")

# Analytics Router
try:
    from routers import analytics
    app.include_router(analytics.router)
    print("✅ Analytics router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include analytics router: {e}")

# Email Router (AWS SES)
try:
    from routers import email
    app.include_router(email.router)
    print("✅ Email router included successfully")
except Exception as e:
    print(f"⚠️  Warning: Could not include email router: {e}")

# CopilotKit Integration
try:
    from routers.copilotkit_endpoint import sdk
    from copilotkit.integrations.fastapi import add_fastapi_endpoint
    add_fastapi_endpoint(app, sdk, "/copilotkit")
    print("✅ CopilotKit endpoint added at /copilotkit")
except Exception as e:
    print(f"⚠️  Warning: Could not add CopilotKit endpoint: {e}")
    import traceback
    traceback.print_exc()

# ===== Database Connection =====
db_pool: Optional[asyncpg.Pool] = None

@app.on_event("startup")
async def startup():
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    print("✅ Database pool created")
    
    # Connect routers to db_pool
    try:
        from routers import tokens, billing, marketplace, organizations, albums, analytics, email
        tokens.set_db_pool(db_pool)
        billing.set_db_pool(db_pool)
        marketplace.set_db_pool(db_pool)
        organizations.set_db_pool(db_pool)
        albums.set_db_pool(db_pool)
        analytics.set_db_pool(db_pool)
        email.set_db_pool(db_pool)
        print("✅ Routers connected to database pool")
    except Exception as e:
        print(f"⚠️  Warning: Could not connect routers to db_pool: {e}")

@app.on_event("shutdown")
async def shutdown():
    if db_pool:
        await db_pool.close()
        print("✅ Database pool closed")

# ===== MinIO Client =====
def get_minio_client():
    return boto3.client(
        's3',
        endpoint_url=f"https://{MINIO_ENDPOINT}",
        aws_access_key_id=MINIO_ACCESS_KEY,
        aws_secret_access_key=MINIO_SECRET_KEY,
        config=boto3.session.Config(signature_version='s3v4')
    )

# ===== Models =====
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role: Optional[str] = "individual"

class EnterpriseApplicationCreate(BaseModel):
    full_name: str
    company_name: Optional[str] = None
    email: EmailStr
    location: Optional[str] = None
    event_types: List[str] = []
    monthly_events: Optional[str] = None
    hardware: List[str] = []
    tier: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class EventCreate(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    theme: Optional[Dict[str, Any]] = None
    templates: Optional[List[Dict[str, Any]]] = None
    branding: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None

class PhotoUpload(BaseModel):
    event_id: int
    original_image_base64: str
    processed_image_base64: str
    background_id: Optional[str] = None
    background_name: Optional[str] = None
    prompt: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


def parse_iso_datetime(value: Optional[Any]) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(value / 1000 if value > 10**12 else value)
        except Exception:
            return None
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except Exception:
                return None
    return None

# ===== Auth Helpers =====
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash"""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    user_id = None
    
    # Debug: Print all cookies
    print(f"🍪 Cookies received: {list(request.cookies.keys())}")
    
    # Try Better Auth cookie first (try different cookie names)
    cookie_names = ['better_auth_token', 'better-auth.session_token', 'session_token']
    better_auth_cookie = None
    
    for cookie_name in cookie_names:
        better_auth_cookie = request.cookies.get(cookie_name)
        if better_auth_cookie:
            print(f"✅ Found auth cookie: {cookie_name}")
            break
    
    if better_auth_cookie:
        try:
            # Decode Better Auth JWT using BETTER_AUTH_SECRET
            payload = jwt.decode(better_auth_cookie, BETTER_AUTH_SECRET, algorithms=["HS256"])
            user_id = payload.get("userId") or payload.get("sub")  # Try both keys
            print(f"✅ Better Auth session validated for user: {user_id}")
            print(f"🔑 JWT payload: {payload}")
        except JWTError as e:
            print(f"⚠️  Better Auth JWT Error: {e}")
            print(f"🔑 Secret used: {BETTER_AUTH_SECRET[:10]}...")
    
    # Fallback to Authorization header
    if not user_id and credentials:
        token = credentials.credentials
        
        # Try Better Auth JWT first (tokens from auth-server)
        try:
            payload = jwt.decode(token, BETTER_AUTH_SECRET, algorithms=["HS256"])
            user_id = payload.get("sub") or payload.get("userId")
            print(f"✅ Better Auth token validated for user: {user_id}")
        except JWTError as e:
            print(f"⚠️  Better Auth JWT Error: {e}")
            
            # Try legacy SECRET_KEY
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                user_id = payload.get("sub")
                print(f"✅ Legacy auth validated for user: {user_id}")
            except JWTError as e2:
                print(f"⚠️  Legacy JWT Error: {e2}")
    
    if not user_id:
        print(f"❌ No valid authentication found")
        raise credentials_exception
    
    async with db_pool.acquire() as conn:
        # First try Better Auth "user" table (new auth system)
        user = await conn.fetchrow(
            """
            SELECT 
                id, email, name as full_name, slug, role, 
                tokens_remaining, is_active,
                NULL as username, NULL as birth_date, image as avatar_url,
                NULL as plan_id, NULL as plan_started_at, NULL as plan_renewal_date,
                NULL as plan_name, NULL as tokens_total, NULL as max_concurrent_events
            FROM "user"
            WHERE id = $1 AND (is_active IS NULL OR is_active = TRUE)
            """,
            str(user_id)
        )
        
        # If not found in Better Auth, try legacy "users" table
        if user is None:
            user = await conn.fetchrow(
                """
                SELECT 
                    u.id, u.username, u.email, u.full_name, u.slug, u.role, 
                    u.birth_date, u.avatar_url, u.tokens_remaining, u.plan_id,
                    u.plan_started_at, u.plan_renewal_date,
                    bp.name as plan_name,
                    bp.included_tokens as tokens_total,
                    bp.max_concurrent_events
                FROM users u
                LEFT JOIN business_plans bp ON u.plan_id = bp.slug
                WHERE u.id::text = $1 AND u.is_active = TRUE
                """,
                str(user_id)
            )
    
    if user is None:
        print(f"❌ User not found in database: {user_id}")
        raise credentials_exception
    
    print(f"✅ User found: {user['email']} (role: {user.get('role', 'unknown')})")
    return dict(user)

async def require_superadmin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )
    return current_user

# ===== Admin Models =====
class UserUpdateAdmin(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    full_name: Optional[str] = None
    # Add token adjustment fields if needed later

class ApplicationUpdateAdmin(BaseModel):
    status: str # approved, rejected, pending
    notes: Optional[str] = None

# ===== Exception Handlers =====
# Ensure CORS headers are sent even on errors

from starlette.responses import JSONResponse as StarletteJSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler that ensures CORS headers are present"""
    logging.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # Get the origin from the request
    origin = request.headers.get("origin", "")
    
    # Create response with CORS headers
    response = StarletteJSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
    
    # Add CORS headers if origin is allowed
    if origin in CORS_ORIGINS or not origin:
        response.headers["Access-Control-Allow-Origin"] = origin or "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response

# ===== Routes =====

@app.get("/")
async def root():
    return {
        "name": "AI Photo Booth API",
        "version": "2.0.0",
        "status": "online"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/cors-test")
async def cors_test(request: Request):
    """Debug endpoint to verify CORS is working"""
    return {
        "message": "CORS test successful",
        "origin": request.headers.get("origin", "none"),
        "allowed_origins": CORS_ORIGINS[:5],  # Show first 5 for debugging
        "total_allowed": len(CORS_ORIGINS)
    }

@app.get("/api/config")
async def get_config():
    """Public config endpoint for frontend"""
    return {
        "falKey": FAL_KEY,
        "falModel": FAL_MODEL,
        "minioServerUrl": MINIO_SERVER_URL,
        "minioBucket": MINIO_BUCKET,
    }

# ===== Auth Endpoints =====

@app.post("/api/auth/register", response_model=Token)
async def register(user: UserCreate):
    async with db_pool.acquire() as conn:
        # Check if user exists
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1 OR email = $2",
            user.username, user.email
        )
        if existing:
            raise HTTPException(status_code=400, detail="Username or email already exists")
        
        # Create slug from username
        slug = user.username.lower().replace(" ", "-")
        
        # Insert user
        hashed_pw = hash_password(user.password)
        new_user = await conn.fetchrow(
            """
            INSERT INTO users (username, email, password_hash, full_name, slug, role)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, username, email, full_name, slug, role
            """,
            user.username, user.email, hashed_pw, user.full_name, slug, user.role or 'individual'
        )
    
    # Create token
    access_token = create_access_token(
        data={"sub": str(new_user["id"])},  # Convert UUID to string
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": dict(new_user)
    }

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, email, full_name, slug, role, password_hash, birth_date, avatar_url FROM users WHERE username = $1 AND is_active = TRUE",
            credentials.username
        )
    
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(
        data={"sub": str(user["id"])},  # Convert UUID to string
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    user_dict = dict(user)
    del user_dict["password_hash"]
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict
    }

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    birth_date: Optional[str] = None  # Accept string, will convert to date
    avatar_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    bio: Optional[str] = None
    social_links: Optional[Dict[str, Optional[str]]] = None  # Allow None values in dict
    publish_to_explore: Optional[bool] = None
    is_public: Optional[bool] = None
    
    class Config:
        extra = 'ignore'  # Ignore extra fields not in the model

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.put("/api/users/me")
async def update_me(user_update: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update current user profile"""
    print(f"📝 Update request for user {current_user['email']}: {user_update.model_dump()}")
    async with db_pool.acquire() as conn:
        # Check email uniqueness if changing email
        if user_update.email and user_update.email != current_user["email"]:
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1 AND id != $2",
                user_update.email,
                current_user["id"]
            )
            if existing:
                raise HTTPException(status_code=400, detail="Email already registered")

        # Build update query
        update_fields = []
        values = []
        idx = 1
        
        if user_update.full_name is not None and user_update.full_name.strip():
            update_fields.append(f"full_name = ${idx}")
            values.append(user_update.full_name)
            idx += 1
            
        if user_update.email is not None and user_update.email.strip():
            update_fields.append(f"email = ${idx}")
            values.append(user_update.email)
            idx += 1

        if user_update.birth_date is not None:
            # Convert string to date if needed
            birth_date_value = user_update.birth_date
            if isinstance(birth_date_value, str) and birth_date_value.strip():
                from datetime import datetime as dt
                birth_date_value = dt.strptime(birth_date_value, "%Y-%m-%d").date()
                update_fields.append(f"birth_date = ${idx}")
                values.append(birth_date_value)
                idx += 1
            elif birth_date_value is None or (isinstance(birth_date_value, str) and not birth_date_value.strip()):
                 # Handle clearing birth_date if needed, or just ignore empty string
                 pass

        if user_update.avatar_url is not None:
            update_fields.append(f"avatar_url = ${idx}")
            values.append(user_update.avatar_url)
            idx += 1

        if user_update.cover_image_url is not None:
            update_fields.append(f"cover_image_url = ${idx}")
            values.append(user_update.cover_image_url)
            idx += 1

        if user_update.bio is not None:
            update_fields.append(f"bio = ${idx}")
            values.append(user_update.bio)
            idx += 1

        if user_update.social_links is not None:
            import json
            update_fields.append(f"social_links = ${idx}")
            values.append(json.dumps(user_update.social_links))
            idx += 1

        if user_update.publish_to_explore is not None:
            update_fields.append(f"publish_to_explore = ${idx}")
            values.append(user_update.publish_to_explore)
            idx += 1

        if user_update.is_public is not None:
            update_fields.append(f"is_public = ${idx}")
            values.append(user_update.is_public)
            idx += 1

        if user_update.password is not None and user_update.password.strip():
            # Hash the new password
            hashed_password = hash_password(user_update.password)
            update_fields.append(f"password_hash = ${idx}")
            values.append(hashed_password)
            idx += 1
            
        if not update_fields:
            return current_user

        values.append(current_user["id"])
        query = f"""
            UPDATE users 
            SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${idx}
            RETURNING id, username, email, full_name, slug, role, birth_date, avatar_url, cover_image_url, bio, social_links, publish_to_explore, is_public
        """
        
        updated_user = await conn.fetchrow(query, *values)
        
        # --- Sync with Better Auth Tables ---
        try:
            # Update "user" table
            ba_update_fields = []
            ba_values = []
            ba_idx = 1
            
            if user_update.full_name is not None and user_update.full_name.strip():
                ba_update_fields.append(f"name = ${ba_idx}")
                ba_values.append(user_update.full_name)
                ba_idx += 1
                
            if user_update.email is not None and user_update.email.strip():
                ba_update_fields.append(f"email = ${ba_idx}")
                ba_values.append(user_update.email)
                ba_idx += 1

            if user_update.avatar_url is not None:
                ba_update_fields.append(f"image = ${ba_idx}")
                ba_values.append(user_update.avatar_url)
                ba_idx += 1

            if user_update.cover_image_url is not None:
                ba_update_fields.append(f'"coverImage" = ${ba_idx}')
                ba_values.append(user_update.cover_image_url)
                ba_idx += 1
            
            if user_update.bio is not None:
                ba_update_fields.append(f"bio = ${ba_idx}")
                ba_values.append(user_update.bio)
                ba_idx += 1

            if user_update.social_links is not None:
                import json
                ba_update_fields.append(f'"socialLinks" = ${ba_idx}')
                ba_values.append(json.dumps(user_update.social_links))
                ba_idx += 1
                
            if ba_update_fields:
                ba_update_fields.append(f'"updatedAt" = NOW()')
                ba_values.append(str(current_user["id"])) # ID is last arg
                
                await conn.execute(
                    f"""
                    UPDATE "user" 
                    SET {', '.join(ba_update_fields)} 
                    WHERE id = ${ba_idx}
                    """,
                    *ba_values
                )

            # Update "account" table (password)
            if user_update.password is not None and user_update.password.strip():
                # We already hashed it above
                await conn.execute(
                    """
                    UPDATE account 
                    SET password = $1, "updatedAt" = NOW()
                    WHERE "userId" = $2 AND "providerId" = 'credential'
                    """,
                    hashed_password,
                    str(current_user["id"])
                )
                
        except Exception as e:
            print(f"Warning: Failed to sync with Better Auth tables: {e}")
            # Don't fail the request, just log the error
            
        return dict(updated_user)

@app.post("/api/users/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload user avatar"""
    try:
        import io
        import uuid
        
        # Get MinIO client
        minio_client = get_minio_client()
        
        # Read file content
        file_content = await file.read()
        
        # Validate file size (max 5MB)
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed")
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"avatar_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:7]}.{file_ext}"
        object_name = f"users/{current_user['slug']}/avatar/{unique_filename}"
        
        # Upload to MinIO
        minio_client.put_object(
            Bucket=MINIO_BUCKET,
            Key=object_name,
            Body=io.BytesIO(file_content),
            ContentType=file.content_type
        )
        
        avatar_url = f"{MINIO_SERVER_URL}/{MINIO_BUCKET}/{object_name}"
        
        # Update user's avatar_url in database
        async with db_pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                avatar_url,
                current_user["id"]
            )
        
        print(f"✅ Avatar uploaded for user {current_user['email']}: {avatar_url}")
        
        return {
            "avatar_url": avatar_url,
            "message": "Avatar uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error uploading avatar: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload avatar: {str(e)}")


@app.post("/api/users/me/cover")
async def upload_cover(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload user cover image"""
    try:
        import io
        import uuid
        
        # Get MinIO client
        minio_client = get_minio_client()
        
        # Read file content
        file_content = await file.read()
        
        # Validate file size (max 10MB for cover)
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed")
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"cover_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:7]}.{file_ext}"
        object_name = f"users/{current_user['slug']}/cover/{unique_filename}"
        
        # Upload to MinIO/S3
        minio_client.put_object(
            Bucket=MINIO_BUCKET,
            Key=object_name,
            Body=io.BytesIO(file_content),
            ContentType=file.content_type
        )
        
        cover_url = f"{MINIO_SERVER_URL}/{MINIO_BUCKET}/{object_name}"
        
        # Update user's cover_image_url in database
        async with db_pool.acquire() as conn:
            await conn.execute(
                "UPDATE users SET cover_image_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                cover_url,
                current_user["id"]
            )
        
        print(f"✅ Cover uploaded for user {current_user['email']}: {cover_url}")
        
        return {
            "cover_url": cover_url,
            "message": "Cover image uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error uploading cover: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload cover: {str(e)}")


@app.get("/api/users/email-by-username/{username}")
async def get_email_by_username(username: str):
    """Get user email by username - for Better Auth login compatibility (case-insensitive)"""
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT email FROM users WHERE LOWER(username) = LOWER($1) AND is_active = TRUE",
            username
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {"email": user["email"]}


@app.get("/api/users/profile/{username}")
async def get_public_profile(username: str):
    """Get public profile by username or slug (case-insensitive)"""
    async with db_pool.acquire() as conn:
        # Try to find user by username or slug (case-insensitive)
        user = await conn.fetchrow(
            """
            SELECT 
                id, username, slug, full_name, email, avatar_url, 
                cover_image_url, bio, social_links, is_public, created_at
            FROM users 
            WHERE (LOWER(username) = LOWER($1) OR LOWER(slug) = LOWER($1)) AND is_active = TRUE
            """,
            username
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="Profile not found")
        
        # Check if profile is public
        if not user.get("is_public", True):
            raise HTTPException(status_code=404, detail="This profile is private")
        
        # Get user stats
        stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(*) FILTER (WHERE is_published = TRUE) as posts,
                COALESCE(SUM(likes) FILTER (WHERE is_published = TRUE), 0) as likes,
                COALESCE(SUM(views) FILTER (WHERE is_published = TRUE), 0) as views
            FROM user_creations 
            WHERE user_id = $1
            """,
            user["id"]
        )
        
        # Get published creations
        creations = await conn.fetch(
            """
            SELECT 
                id, url, thumbnail_url, type, prompt, model, 
                likes, views, is_published, created_at
            FROM user_creations 
            WHERE user_id = $1 AND is_published = TRUE
            ORDER BY created_at DESC
            LIMIT 50
            """,
            user["id"]
        )
        
        # Build response
        profile = {
            "id": user["id"],
            "username": user["username"],
            "slug": user["slug"],
            "name": user["full_name"],
            "full_name": user["full_name"],
            "avatar_url": user["avatar_url"],
            "cover_image_url": user["cover_image_url"],
            "bio": user["bio"],
            "social_links": user["social_links"] or {},
            "is_public": user["is_public"],
            "created_at": user["created_at"].isoformat() if user["created_at"] else None,
            "stats": {
                "likes": int(stats["likes"]) if stats else 0,
                "posts": int(stats["posts"]) if stats else 0,
                "views": int(stats["views"]) if stats else 0
            }
        }
        
        return {
            "profile": profile,
            "creations": [dict(c) for c in creations]
        }


@app.post("/api/users/me/creations")
async def publish_creation(
    url: str,
    type: str,  # 'image' or 'video'
    prompt: Optional[str] = None,
    model: Optional[str] = None,
    thumbnail_url: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Publish a creation to user's public profile"""
    async with db_pool.acquire() as conn:
        # Check if user has publish_to_explore enabled
        user = await conn.fetchrow(
            "SELECT publish_to_explore FROM users WHERE id = $1",
            current_user["id"]
        )
        
        is_published = user.get("publish_to_explore", True) if user else True
        
        creation = await conn.fetchrow(
            """
            INSERT INTO user_creations (user_id, url, thumbnail_url, type, prompt, model, is_published)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, url, type, is_published, created_at
            """,
            current_user["id"], url, thumbnail_url, type, prompt, model, is_published
        )
        
        return dict(creation)


@app.get("/api/users/me/creations")
async def get_my_creations(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get current user's creations"""
    async with db_pool.acquire() as conn:
        creations = await conn.fetch(
            """
            SELECT id, url, thumbnail_url, type, prompt, model, likes, views, is_published, created_at
            FROM user_creations 
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            """,
            current_user["id"], limit, offset
        )
        
        return [dict(c) for c in creations]


@app.put("/api/users/me/creations/{creation_id}/publish")
async def toggle_creation_publish(
    creation_id: int,
    is_published: bool,
    current_user: dict = Depends(get_current_user)
):
    """Toggle publish status of a creation"""
    async with db_pool.acquire() as conn:
        result = await conn.fetchrow(
            """
            UPDATE user_creations 
            SET is_published = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3
            RETURNING id, is_published
            """,
            is_published, creation_id, current_user["id"]
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Creation not found")
        
        return dict(result)


@app.delete("/api/users/me/creations/{creation_id}")
async def delete_creation(
    creation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete a creation"""
    async with db_pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM user_creations WHERE id = $1 AND user_id = $2",
            creation_id, current_user["id"]
        )
        
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Creation not found")
        
        return {"success": True}


@app.delete("/api/users/me")
async def delete_account(current_user: dict = Depends(get_current_user)):
    """Delete current user's account"""
    async with db_pool.acquire() as conn:
        # Soft delete - mark as inactive
        await conn.execute(
            "UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            current_user["id"]
        )
        
        return {"success": True, "message": "Account deleted"}


@app.post("/api/enterprise/applications")
async def submit_application(application: EnterpriseApplicationCreate):
    async with db_pool.acquire() as conn:
        # Check if email already has an application
        existing = await conn.fetchrow(
            "SELECT id FROM enterprise_applications WHERE email = $1 AND status = 'pending'",
            application.email
        )
        if existing:
            raise HTTPException(status_code=400, detail="An application with this email is already pending")
        
        # Insert application
        new_app = await conn.fetchrow(
            """
            INSERT INTO enterprise_applications 
            (full_name, company_name, email, location, event_types, monthly_events, hardware, tier)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8)
            RETURNING id
            """,
            application.full_name,
            application.company_name,
            application.email,
            application.location,
            json.dumps(application.event_types),
            application.monthly_events,
            json.dumps(application.hardware),
            application.tier
        )
        
        # If user exists with this email, update their role to business_pending? 
        # Or just leave it as is until admin approves.
        # For now, we just store the application.
        
    return {"message": "Application submitted successfully", "id": new_app["id"]}

# ===== Media Library Endpoints =====

@app.get("/api/media/library")
async def get_user_media_library(current_user: dict = Depends(get_current_user)):
    """Get all uploaded media for the current user"""
    try:
        # Get MinIO client
        minio_client = get_minio_client()
        
        # List all objects in MinIO with user's prefix
        user_prefix = f"users/{current_user['slug']}/media/"
        
        # Use boto3 list_objects_v2 instead of list_objects
        response = minio_client.list_objects_v2(
            Bucket=MINIO_BUCKET,
            Prefix=user_prefix
        )
        
        media_items = []
        if 'Contents' in response:
            for obj in response['Contents']:
                # Generate public URL
                object_key = obj['Key']
                url = f"{MINIO_SERVER_URL}/{MINIO_BUCKET}/{object_key}"
                media_items.append({
                    "name": object_key.split('/')[-1],
                    "url": url,
                    "size": obj['Size'],
                    "uploaded_at": obj['LastModified'].isoformat() if 'LastModified' in obj else None,
                    "type": "image"  # Could be enhanced to detect type
                })
        
        return {"media": media_items}
    except Exception as e:
        print(f"❌ Error fetching media library: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch media library: {str(e)}")

@app.post("/api/media/upload")
async def upload_to_media_library(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file to user's media library"""
    try:
        # Get MinIO client
        minio_client = get_minio_client()
        
        # Read file content
        file_content = await file.read()
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"media_{int(datetime.now().timestamp() * 1000)}_{uuid.uuid4().hex[:7]}.{file_ext}"
        object_name = f"users/{current_user['slug']}/media/{unique_filename}"
        
        # Upload to MinIO using boto3
        minio_client.put_object(
            Bucket=MINIO_BUCKET,
            Key=object_name,
            Body=io.BytesIO(file_content),
            ContentType=file.content_type or "image/jpeg"
        )
        
        url = f"{MINIO_SERVER_URL}/{MINIO_BUCKET}/{object_name}"
        print(f"✅ Media uploaded to library: {url}")
        
        return {
            "url": url,
            "name": unique_filename,
            "size": len(file_content)
        }
    except Exception as e:
        print(f"❌ Error uploading to media library: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload: {str(e)}")

@app.delete("/api/media/{filename}")
async def delete_from_media_library(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a file from user's media library"""
    try:
        # Get MinIO client
        minio_client = get_minio_client()
        
        object_name = f"users/{current_user['slug']}/media/{filename}"
        minio_client.delete_object(Bucket=MINIO_BUCKET, Key=object_name)
        print(f"🗑️ Media deleted from library: {object_name}")
        return {"message": "Media deleted successfully"}
    except Exception as e:
        print(f"❌ Error deleting media: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")

# ===== Prompt Suggestions Endpoint =====

PROMPT_SUGGESTIONS = [
    {
        "id": "corporate_professional",
        "category": "Corporate",
        "name": "Professional Corporate",
        "prompt": "Create a professional corporate photo by seamlessly compositing these images: Preserve the exact person from the first image (face, body, pose) without any modifications. Place them in a modern office environment with glass walls, natural lighting, and contemporary furniture. Dress them in professional business attire (suit or business casual). Blend all elements naturally with proper lighting, shadows, and depth of field for a cohesive, high-quality corporate portrait.",
        "tags": ["business", "professional", "office"]
    },
    {
        "id": "tech_innovator",
        "category": "Technology",
        "name": "Tech Innovator",
        "prompt": "Create a modern tech workspace photo by compositing: Preserve the exact person from the first image unchanged. Place them in a sleek technology lab with holographic displays, LED lighting, and futuristic equipment. Dress them in smart casual tech attire. Add subtle blue/cyan ambient lighting. Blend naturally with realistic shadows and reflections.",
        "tags": ["technology", "innovation", "modern"]
    },
    {
        "id": "outdoor_adventure",
        "category": "Outdoor",
        "name": "Outdoor Adventure",
        "prompt": "Create an outdoor adventure photo by compositing: Preserve the exact person from the first image (face and body unchanged). Place them in a scenic mountain landscape with hiking trails and natural beauty. Dress them in appropriate outdoor gear and hiking attire. Use natural daylight with warm golden hour tones. Blend all elements with realistic outdoor lighting and atmospheric perspective.",
        "tags": ["outdoor", "nature", "adventure"]
    },
    {
        "id": "creative_studio",
        "category": "Creative",
        "name": "Creative Studio",
        "prompt": "Create an artistic studio photo by compositing: Preserve the exact person from the first image without changes. Place them in a creative studio space with art supplies, canvases, and colorful decor. Dress them in casual creative attire. Use dramatic studio lighting with colored gels. Blend naturally with artistic atmosphere and vibrant colors.",
        "tags": ["creative", "art", "studio"]
    },
    {
        "id": "healthcare_professional",
        "category": "Healthcare",
        "name": "Healthcare Professional",
        "prompt": "Create a healthcare professional photo by compositing: Preserve the exact person from the first image unchanged. Place them in a modern medical facility with clean, bright environment and medical equipment in the background. Dress them in appropriate medical attire (lab coat or scrubs). Use bright, clinical lighting. Blend naturally with professional healthcare atmosphere.",
        "tags": ["healthcare", "medical", "professional"]
    },
    {
        "id": "urban_lifestyle",
        "category": "Lifestyle",
        "name": "Urban Lifestyle",
        "prompt": "Create an urban lifestyle photo by compositing: Preserve the exact person from the first image (face and body unchanged). Place them in a vibrant city street with modern architecture, cafes, and urban energy. Dress them in trendy casual fashion. Use natural city lighting with urban atmosphere. Blend all elements with realistic depth and street photography aesthetics.",
        "tags": ["urban", "lifestyle", "city"]
    },
    {
        "id": "beach_vacation",
        "category": "Travel",
        "name": "Beach Vacation",
        "prompt": "Create a beach vacation photo by compositing: Preserve the exact person from the first image without modifications. Place them on a beautiful tropical beach with white sand, clear blue water, and palm trees. Dress them in casual beach attire. Use bright natural sunlight with warm tones. Blend naturally with vacation atmosphere and coastal lighting.",
        "tags": ["beach", "vacation", "tropical"]
    },
    {
        "id": "conference_speaker",
        "category": "Events",
        "name": "Conference Speaker",
        "prompt": "Create a conference speaker photo by compositing: Preserve the exact person from the first image unchanged. Place them on a professional conference stage with presentation screens, audience seating, and stage lighting. Dress them in professional speaking attire. Use dramatic stage lighting with spotlights. Blend naturally with conference atmosphere.",
        "tags": ["conference", "speaking", "professional"]
    }
]

@app.get("/api/prompts/suggestions")
async def get_prompt_suggestions():
    """Get AI prompt suggestions for templates"""
    return {"suggestions": PROMPT_SUGGESTIONS}

@app.get("/api/prompts/suggestions/{category}")
async def get_prompt_suggestions_by_category(category: str):
    """Get AI prompt suggestions filtered by category"""
    filtered = [p for p in PROMPT_SUGGESTIONS if p["category"].lower() == category.lower()]
    return {"suggestions": filtered, "category": category}

# ===== Event Endpoints =====

@app.get("/api/events")
@app.get("/api/events/")
async def get_user_events(current_user: dict = Depends(get_current_user)):
    """Get all events for the current user (from CouchDB)"""
    try:
        couch = get_couch_service()
        user_id = str(current_user["id"])
        
        # Get user events
        events = couch.get_events_by_user(user_id)
        
        # Get organization events if any
        try:
            async with db_pool.acquire() as conn:
                # user_id can be UUID string from Better Auth
                org_ids = await conn.fetch("""
                    SELECT organization_id FROM organization_members 
                    WHERE user_id::text = $1 AND status = 'active'
                    UNION
                    SELECT id FROM organizations WHERE owner_user_id::text = $1
                """, str(user_id))
                
            for row in org_ids:
                # In UNION, the column name is from first query 'organization_id' or 'id' aliased?
                # Wait, UNION column names are from the first query.
                # First query: SELECT organization_id ...
                # Second query: SELECT id ...
                # So column name is organization_id.
                org_id_val = row[0] # access by index or key
                if org_id_val:
                    org_events = couch.get_events_by_organization(str(org_id_val))
                    # Merge events, avoiding duplicates
                    existing_ids = {e.get("_id") for e in events}
                    for evt in org_events:
                        if evt.get("_id") not in existing_ids:
                            events.append(evt)
                            existing_ids.add(evt.get("_id"))
        except Exception as db_err:
            print(f"⚠️ Error fetching orgs for events: {db_err}")
        
        # Sort merged list
        events.sort(key=lambda doc: doc.get("created_at", ""), reverse=True)
        
        # Ensure we always return a list, even if empty
        return events if events is not None else []
    except Exception as e:
        print(f"⚠️ Error fetching events from CouchDB: {e}")
        # Return empty list instead of 500 error
        return []

@app.post("/api/events")
@app.post("/api/events/")
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    """Create a new event (stored in CouchDB)"""
    couch = get_couch_service()
    
    # Check for organization ownership
    org_id = None
    try:
        async with db_pool.acquire() as conn:
            org_id = await conn.fetchval("SELECT id FROM organizations WHERE owner_user_id = $1", current_user["id"])
    except Exception as e:
        print(f"⚠️ Error checking organization: {e}")
    
    # Check if slug already exists for this user
    existing = couch.get_event_by_slug(str(current_user["id"]), event.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Event slug already exists")
    
    # Prepare event data
    event_data = {
        "user_id": str(current_user["id"]),
        "organization_id": str(org_id) if org_id else None,
        "user_slug": current_user.get("slug"),
        "username": current_user.get("username"),
        "user_full_name": current_user.get("full_name"),
        "slug": event.slug,
        "title": event.title,
        "description": event.description,
        "start_date": event.start_date.isoformat() if event.start_date else None,
        "end_date": event.end_date.isoformat() if event.end_date else None,
        "is_active": event.is_active if hasattr(event, 'is_active') else True,
        "theme": event.theme or {},
        "templates": event.templates or [],
        "branding": event.branding or {},
        "settings": event.settings or {}
    }
    
    # Save to CouchDB
    new_event = couch.create_event(event_data)

    # Sync with PostgreSQL events table for feed compatibility
    try:
        async with db_pool.acquire() as conn:
            postgres_event = await conn.fetchrow(
                """
                INSERT INTO events (user_id, slug, title, description, start_date, end_date, is_active, theme, templates, branding, settings, organization_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12)
                ON CONFLICT (user_id, slug)
                DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    start_date = EXCLUDED.start_date,
                    end_date = EXCLUDED.end_date,
                    is_active = EXCLUDED.is_active,
                    theme = EXCLUDED.theme,
                    templates = EXCLUDED.templates,
                    branding = EXCLUDED.branding,
                    settings = EXCLUDED.settings,
                    organization_id = EXCLUDED.organization_id,
                    updated_at = NOW()
                RETURNING id
                """,
                current_user["id"],
                event.slug,
                event.title,
                event.description,
                event.start_date,
                event.end_date,
                event.is_active if hasattr(event, 'is_active') else True,
                json.dumps(event.theme or {}),
                json.dumps(event.templates or []),
                json.dumps(event.branding or {}),
                json.dumps(event.settings or {}),
                org_id
            )

            if postgres_event:
                new_event["postgres_event_id"] = postgres_event["id"]
                new_event = couch.update_event(new_event["_id"], new_event)

    except Exception as sync_error:
        print(f"⚠️ Warning syncing event with PostgreSQL: {sync_error}")

    return new_event

@app.put("/api/events/{event_id}")
async def update_event(event_id: str, event_data: dict, current_user: dict = Depends(get_current_user)):
    """Update an event (only owner can update, CouchDB)"""
    couch = get_couch_service()
    
    # Verify ownership
    existing = couch.get_event_by_id(event_id)
    
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if existing["user_id"] != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to update this event")
    
    postgres_event_id = existing.get("postgres_event_id")

    if not postgres_event_id:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM events WHERE user_id = $1 AND slug = $2",
                current_user["id"], existing.get("slug")
            )
            if row:
                postgres_event_id = row["id"]
                existing["postgres_event_id"] = postgres_event_id

    # Merge updates with existing data
    updated_data = {**existing, **event_data}
    
    # Ensure user_id is preserved
    updated_data["user_id"] = existing["user_id"]
    if postgres_event_id:
        updated_data["postgres_event_id"] = postgres_event_id
    
    # Update in CouchDB
    updated_event = couch.update_event(event_id, updated_data)

    # Sync with PostgreSQL events table for feed compatibility
    try:
        async with db_pool.acquire() as conn:
            start_date_dt = parse_iso_datetime(updated_event.get("start_date"))
            end_date_dt = parse_iso_datetime(updated_event.get("end_date"))

            if postgres_event_id:
                await conn.execute(
                    """
                    UPDATE events
                    SET title = $1,
                        description = $2,
                        start_date = $3,
                        end_date = $4,
                        is_active = $5,
                        theme = $6::jsonb,
                        templates = $7::jsonb,
                        branding = $8::jsonb,
                        settings = $9::jsonb,
                        updated_at = NOW()
                    WHERE id = $10
                    """,
                    updated_event.get("title"),
                    updated_event.get("description"),
                    start_date_dt,
                    end_date_dt,
                    updated_event.get("is_active", True),
                    json.dumps(updated_event.get("theme") or {}),
                    json.dumps(updated_event.get("templates") or []),
                    json.dumps(updated_event.get("branding") or {}),
                    json.dumps(updated_event.get("settings") or {}),
                    postgres_event_id
                )
            else:
                row = await conn.fetchrow(
                    """
                    INSERT INTO events (user_id, slug, title, description, start_date, end_date, is_active, theme, templates, branding, settings)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb)
                    RETURNING id
                    """,
                    current_user["id"],
                    updated_event.get("slug"),
                    updated_event.get("title"),
                    updated_event.get("description"),
                    start_date_dt,
                    end_date_dt,
                    updated_event.get("is_active", True),
                    json.dumps(updated_event.get("theme") or {}),
                    json.dumps(updated_event.get("templates") or []),
                    json.dumps(updated_event.get("branding") or {}),
                    json.dumps(updated_event.get("settings") or {})
                )
                if row:
                    updated_event["postgres_event_id"] = row["id"]
                    updated_event = couch.update_event(event_id, updated_event)

    except Exception as sync_error:
        print(f"⚠️ Warning syncing event update with PostgreSQL: {sync_error}")
    
    return updated_event

@app.delete("/api/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an event (only owner can delete, CouchDB)"""
    couch = get_couch_service()
    
    # Verify ownership
    existing = couch.get_event_by_id(event_id)
    
    if not existing:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if existing["user_id"] != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")
    
    # Delete the event
    success = couch.delete_event(event_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete event")

    postgres_event_id = existing.get("postgres_event_id")
    if not postgres_event_id:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM events WHERE user_id = $1 AND slug = $2",
                current_user["id"], existing.get("slug")
            )
            if row:
                postgres_event_id = row["id"]

    if postgres_event_id:
        async with db_pool.acquire() as conn:
            await conn.execute("DELETE FROM events WHERE id = $1", postgres_event_id)
    
    return {"message": "Event deleted successfully"}

@app.get("/api/events/{user_slug}/{event_slug}")
async def get_event(user_slug: str, event_slug: str):
    """Public endpoint to get event config by user slug and event slug (CouchDB)"""
    couch = get_couch_service()

    # Resolve user by slug - check both legacy users table and Better Auth user table
    user = None
    user_id_for_event = None
    async with db_pool.acquire() as conn:
        # First try legacy users table
        user = await conn.fetchrow(
            "SELECT id::text as id, username, full_name, slug FROM users WHERE slug = $1 AND is_active = TRUE",
            user_slug
        )
        
        # If not found, try Better Auth user table
        if not user:
            user = await conn.fetchrow(
                '''SELECT id, NULL as username, name as full_name, slug FROM "user" WHERE slug = $1 AND (is_active IS NULL OR is_active = TRUE)''',
                user_slug
            )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Try to find event with this user's ID
    event_doc = couch.get_event_by_slug(str(user["id"]), event_slug)
    
    # If not found with this ID, also try searching by user_slug directly in CouchDB
    if not event_doc:
        # Search by user_slug field in CouchDB
        all_events = couch.get_events_by_user(str(user["id"]))
        for evt in all_events:
            if evt.get("slug") == event_slug:
                event_doc = evt
                break
        
        # Still not found? Try searching all events with matching slug and user_slug
        if not event_doc:
            try:
                # Query CouchDB directly for events with matching user_slug using the service method
                docs = couch._find_documents(
                    couch.events_db_name,
                    {
                        "user_slug": user_slug,
                        "slug": event_slug
                    },
                    limit=1
                )
                if docs:
                    event_doc = docs[0]
            except Exception as e:
                print(f"⚠️ CouchDB query error: {e}")

    if not event_doc or not event_doc.get("is_active", True):
        raise HTTPException(status_code=404, detail="Event not found")

    # Enrich document with user info (ensures legacy fields are present)
    event_doc.setdefault("user_id", str(user["id"]))
    event_doc["username"] = user.get("username")
    event_doc["user_full_name"] = user["full_name"]
    event_doc["user_slug"] = user["slug"]

    # Ensure postgres_event_id is stored for compatibility
    if "postgres_event_id" not in event_doc:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM events WHERE user_id = $1 AND slug = $2",
                str(user["id"]), event_slug
            )
            if row:
                event_doc["postgres_event_id"] = row["id"]
                # Update event_doc in-place, don't call update_event to avoid recursion
                try:
                    couch.events_db.save(event_doc)
                except Exception as e:
                    print(f"⚠️ Could not update postgres_event_id: {e}")

    return event_doc


@app.get("/api/events/{user_slug}/{event_slug}/photos")
async def get_event_photos_by_slug(user_slug: str, event_slug: str, limit: int = 20, offset: int = 0):
    """Public endpoint to fetch photos for an event"""
    couch = get_couch_service()

    # Resolve user - check both legacy users table and Better Auth user table
    user = None
    async with db_pool.acquire() as conn:
        # First try legacy users table
        user = await conn.fetchrow(
            "SELECT id::text as id, username, full_name, slug FROM users WHERE slug = $1 AND is_active = TRUE",
            user_slug
        )
        
        # If not found, try Better Auth user table
        if not user:
            user = await conn.fetchrow(
                '''SELECT id, NULL as username, name as full_name, slug FROM "user" WHERE slug = $1 AND (is_active IS NULL OR is_active = TRUE)''',
                user_slug
            )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Try to find event with this user's ID
    event_doc = couch.get_event_by_slug(str(user["id"]), event_slug)
    
    # If not found, try searching by user_slug in CouchDB
    if not event_doc:
        try:
            docs = couch._find_documents(
                couch.events_db_name,
                {
                    "user_slug": user_slug,
                    "slug": event_slug
                },
                limit=1
            )
            if docs:
                event_doc = docs[0]
        except Exception as e:
            print(f"⚠️ CouchDB query error: {e}")

    if not event_doc or not event_doc.get("is_active", True):
        raise HTTPException(status_code=404, detail="Event not found")

    couch_photos = couch.get_photos_by_event(event_doc.get("_id"), limit=limit, offset=offset)

    # Start with CouchDB photos
    photo_map: Dict[str, Dict[str, Any]] = {}
    for photo in couch_photos:
        share_code = photo.get("share_code") or photo.get("shareCode")
        if not share_code:
            continue
        photo_map[share_code] = {
            "id": photo.get("_id"),
            "share_code": share_code,
            "processed_image_url": photo.get("processed_image_url") or photo.get("processedImageUrl"),
            "original_image_url": photo.get("original_image_url") or photo.get("originalImageUrl"),
            "background_name": photo.get("background_name"),
            "created_at": photo.get("created_at"),
            "meta": photo.get("meta") or {},
        }

    # Include photos stored in PostgreSQL for compatibility
    postgres_event_id = event_doc.get("postgres_event_id")
    if postgres_event_id:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, processed_image_url, original_image_url, background_name, share_code, created_at, meta
                FROM processed_photos
                WHERE event_id = $1 AND is_visible = TRUE AND is_approved = TRUE
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                """,
                postgres_event_id,
                limit,
                offset
            )

        for row in rows:
            share_code = row["share_code"]
            if share_code not in photo_map:
                photo_map[share_code] = {
                    "id": row["id"],
                    "share_code": share_code,
                    "processed_image_url": row["processed_image_url"],
                    "original_image_url": row["original_image_url"],
                    "background_name": row["background_name"],
                    "created_at": row["created_at"],
                    "meta": row["meta"] or {},
                }

    photos_list = list(photo_map.values())
    photos_list.sort(key=lambda photo: photo.get("created_at") or 0, reverse=True)

    return photos_list[:limit]


@app.get("/api/photos/{share_code}")
async def get_photo_by_share_code_api(share_code: str):
    couch = get_couch_service()

    photo_doc = couch.get_photo_by_share_code(share_code)
    if photo_doc:
        return {
            "id": photo_doc.get("_id"),
            "originalImageUrl": photo_doc.get("original_image_url"),
            "processedImageUrl": photo_doc.get("processed_image_url"),
            "shareCode": photo_doc.get("share_code"),
            "createdAt": photo_doc.get("created_at"),
            "backgroundName": photo_doc.get("background_name"),
            "meta": photo_doc.get("meta") or {},
            "userSlug": photo_doc.get("user_slug"),
            "eventSlug": photo_doc.get("event_slug"),
        }

    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, original_image_url, processed_image_url, background_name, share_code, created_at, meta
            FROM processed_photos
            WHERE share_code = $1
            """,
            share_code
        )

    if row:
        return {
            "id": row["id"],
            "originalImageUrl": row["original_image_url"],
            "processedImageUrl": row["processed_image_url"],
            "shareCode": row["share_code"],
            "createdAt": row["created_at"],
            "backgroundName": row["background_name"],
            "meta": row["meta"] or {},
        }

    raise HTTPException(status_code=404, detail="Photo not found")

@app.get("/api/events/{event_id}/photos")
async def get_event_photos(event_id: int, limit: int = 20, offset: int = 0):
    """Get photos for an event (for feed)"""
    async with db_pool.acquire() as conn:
        photos = await conn.fetch(
            """
            SELECT id, processed_image_url, background_name, share_code, created_at, meta
            FROM processed_photos
            WHERE event_id = $1 AND is_visible = TRUE AND is_approved = TRUE
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            """,
            event_id, limit, offset
        )
    
    return [dict(photo) for photo in photos]

# ===== Photo Upload Endpoint =====

@app.post("/api/photos/upload")
async def upload_photo(photo: PhotoUpload, current_user: dict = Depends(get_current_user)):
    """Upload processed photo to MinIO and save metadata (requires authentication)"""
    
    # Verify user owns the event
    async with db_pool.acquire() as conn:
        event = await conn.fetchrow(
            "SELECT id, user_id, slug FROM events WHERE id = $1",
            photo.event_id
        )
    
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    if event["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized for this event")
    
    # Generate IDs
    photo_id = f"photo_{int(datetime.utcnow().timestamp() * 1000)}_{uuid.uuid4().hex[:7]}"
    share_code = uuid.uuid4().hex[:6].upper()
    created_at = int(datetime.utcnow().timestamp() * 1000)
    
    # Convert base64 to bytes
    original_buffer = base64.b64decode(photo.original_image_base64.split(',')[1] if ',' in photo.original_image_base64 else photo.original_image_base64)
    processed_buffer = base64.b64decode(photo.processed_image_base64.split(',')[1] if ',' in photo.processed_image_base64 else photo.processed_image_base64)
    
    # Upload to MinIO
    minio_client = get_minio_client()
    original_filename = f"{photo_id}_original.jpg"
    processed_filename = f"{photo_id}_processed.jpg"
    
    try:
        minio_client.put_object(
            Bucket=MINIO_BUCKET,
            Key=original_filename,
            Body=original_buffer,
            ContentType='image/jpeg',
            CacheControl='public, max-age=31536000'
        )
        
        minio_client.put_object(
            Bucket=MINIO_BUCKET,
            Key=processed_filename,
            Body=processed_buffer,
            ContentType='image/jpeg',
            CacheControl='public, max-age=31536000'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"MinIO upload failed: {str(e)}")
    
    # Generate URLs
    original_image_url = f"{MINIO_SERVER_URL}/{MINIO_BUCKET}/{original_filename}"
    processed_image_url = f"{MINIO_SERVER_URL}/{MINIO_BUCKET}/{processed_filename}"
    
    # Save to database
    async with db_pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO processed_photos (
                id, user_id, event_id, original_image_url, processed_image_url,
                background_id, background_name, share_code, created_at, prompt, meta
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
            """,
            photo_id, current_user["id"], photo.event_id, original_image_url, processed_image_url,
            photo.background_id, photo.background_name, share_code, created_at, photo.prompt, json.dumps(photo.meta or {})
        )
    
    # Store metadata in CouchDB for unified feeds
    couch = get_couch_service()
    event_doc = couch.get_event_by_postgres_id(event["id"]) or couch.get_event_by_slug(str(event["user_id"]), event.get("slug"))
    couch_photo_payload = {
        "_id": photo_id,
        "share_code": share_code,
        "user_id": str(current_user["id"]),
        "user_slug": current_user.get("slug"),
        "username": current_user.get("username"),
        "user_full_name": current_user.get("full_name"),
        "event_id": event_doc.get("_id") if event_doc else None,
        "event_slug": event_doc.get("slug") if event_doc else event.get("slug"),
        "postgres_event_id": event_doc.get("postgres_event_id") if event_doc else event["id"],
        "original_image_url": original_image_url,
        "processed_image_url": processed_image_url,
        "background_id": photo.background_id,
        "background_name": photo.background_name,
        "created_at": created_at,
        "prompt": photo.prompt,
        "meta": photo.meta or {},
    }
    couch.create_photo(couch_photo_payload)

    return {
        "id": photo_id,
        "originalImageUrl": original_image_url,
        "processedImageUrl": processed_image_url,
        "shareCode": share_code,
        "createdAt": created_at,
        "backgroundName": payload.backgroundName,
        "userSlug": payload.userSlug,
        "eventSlug": payload.eventSlug
    }

class PublicPhotoUpload(BaseModel):
    originalImageBase64: str
    processedImageBase64: str
    backgroundId: Optional[str] = None
    backgroundName: Optional[str] = None
    prompt: Optional[str] = None
    userSlug: Optional[str] = None
    eventSlug: Optional[str] = None

@app.post("/api/photos/upload/public")
@app.post("/api/photos/upload/public/")
async def upload_photo_public(payload: PublicPhotoUpload):
    """Upload processed photo without authentication (for legacy Index.tsx flow)"""
    
    # Generate IDs
    photo_id = f"photo_{int(datetime.utcnow().timestamp() * 1000)}_{uuid.uuid4().hex[:7]}"
    share_code = uuid.uuid4().hex[:6].upper()
    created_at = int(datetime.utcnow().timestamp() * 1000)
    
    # Convert base64 to bytes
    try:
        original_buffer = base64.b64decode(payload.originalImageBase64.split(',')[1] if ',' in payload.originalImageBase64 else payload.originalImageBase64)
        processed_buffer = base64.b64decode(payload.processedImageBase64.split(',')[1] if ',' in payload.processedImageBase64 else payload.processedImageBase64)
    except Exception as e:
        print(f"Base64 decode error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid base64 data: {str(e)}")
    
    # Upload to MinIO
    minio_client = get_minio_client()
    original_filename = f"{photo_id}_original.jpg"
    processed_filename = f"{photo_id}_processed.jpg"
    
    try:
        print(f"Uploading to MinIO: {original_filename}")
        minio_client.put_object(
            Bucket=MINIO_BUCKET,
            Key=original_filename,
            Body=original_buffer,
            ContentType='image/jpeg',
            CacheControl='public, max-age=31536000'
        )
        
        print(f"Uploading to MinIO: {processed_filename}")
        minio_client.put_object(
            Bucket=MINIO_BUCKET,
            Key=processed_filename,
            Body=processed_buffer,
            ContentType='image/jpeg',
            CacheControl='public, max-age=31536000'
        )
        print(f"MinIO upload successful")
    except Exception as e:
        print(f"MinIO upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"MinIO upload failed: {str(e)}")
    
    # Generate URLs
    original_image_url = f"{MINIO_SERVER_URL}/{MINIO_BUCKET}/{original_filename}"
    processed_image_url = f"{MINIO_SERVER_URL}/{MINIO_BUCKET}/{processed_filename}"
    
    print(f"Generated URLs: {processed_image_url}")

    couch = get_couch_service()

    user = None
    event_doc = None
    postgres_event_id = None
    user_id = None

    if payload.userSlug and payload.eventSlug:
        async with db_pool.acquire() as conn:
            # Try legacy users table first
            user = await conn.fetchrow(
                "SELECT id, username, full_name, slug FROM users WHERE slug = $1 AND is_active = TRUE",
                payload.userSlug
            )
            
            # If not found, try Better Auth user table
            if not user:
                user = await conn.fetchrow(
                    """SELECT id, name as full_name, 
                       LOWER(REPLACE(name, ' ', '-')) as slug,
                       email as username
                       FROM "user" WHERE LOWER(REPLACE(name, ' ', '-')) = $1""",
                    payload.userSlug
                )

        if not user:
            raise HTTPException(status_code=404, detail="User not found for provided slug")

        user_id = user["id"]
        event_doc = couch.get_event_by_slug(str(user_id), payload.eventSlug)
        
        # If not found by user_id, try searching by user_slug in CouchDB
        if not event_doc:
            try:
                docs = couch._find_documents(
                    couch.events_db_name,
                    {
                        "user_slug": payload.userSlug,
                        "slug": payload.eventSlug
                    },
                    limit=1
                )
                if docs:
                    event_doc = docs[0]
            except Exception as e:
                print(f"⚠️ CouchDB query error in upload_photo_public: {e}")
        
        if not event_doc or not event_doc.get("is_active", True):
            raise HTTPException(status_code=404, detail="Event not found for provided slug")

        postgres_event_id = event_doc.get("postgres_event_id")
        if not postgres_event_id:
            async with db_pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT id FROM events WHERE user_id = $1 AND slug = $2",
                    user_id,
                    payload.eventSlug
                )
            if row:
                postgres_event_id = row["id"]
                event_doc["postgres_event_id"] = postgres_event_id
                couch.update_event(event_doc["_id"], event_doc)

        # Persist in PostgreSQL for compatibility if event exists
        if postgres_event_id:
            async with db_pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO processed_photos (
                        id, user_id, event_id, original_image_url, processed_image_url,
                        background_id, background_name, share_code, created_at, prompt, meta
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    photo_id,
                    user_id,
                    postgres_event_id,
                    original_image_url,
                    processed_image_url,
                    payload.backgroundId,
                    payload.backgroundName,
                    share_code,
                    created_at,
                    payload.prompt,
                    json.dumps({})
                )

    # Store in CouchDB
    couch_photo_payload = {
        "_id": photo_id,
        "share_code": share_code,
        "user_id": str(user_id) if user_id is not None else None,
        "user_slug": payload.userSlug,
        "username": user["username"] if user else None,
        "user_full_name": user["full_name"] if user else None,
        "event_id": event_doc.get("_id") if event_doc else None,
        "event_slug": payload.eventSlug,
        "postgres_event_id": postgres_event_id,
        "original_image_url": original_image_url,
        "processed_image_url": processed_image_url,
        "background_id": payload.backgroundId,
        "background_name": payload.backgroundName,
        "created_at": created_at,
        "prompt": payload.prompt,
        "meta": {"prompt": payload.prompt} if payload.prompt else {},
    }
    couch.create_photo(couch_photo_payload)
    
    return {
        "id": photo_id,
        "originalImageUrl": original_image_url,
        "processedImageUrl": processed_image_url,
        "shareCode": share_code,
        "createdAt": created_at,
        "backgroundName": payload.backgroundName,
        "userSlug": payload.userSlug,
        "eventSlug": payload.eventSlug
    }

# ===== Get Event Photos for Admin Endpoint =====

@app.get("/api/admin/fal/analytics")
async def get_fal_analytics(
    days: int = 7,
    model_id: str = "fal-ai/bytedance/seedream/v4/edit",
    current_user: dict = Depends(get_current_user)
):
    """
    Get fal AI model analytics (admin endpoint with authentication)
    Returns aggregated metrics for AI processing performance and costs
    """
    
    print(f"📊 Fetching fal analytics for last {days} days")
    print(f"👤 User: {current_user['id']}")
    print(f"🤖 Model: {model_id}")
    
    try:
        from services.fal_analytics import fal_analytics
        
        stats = await fal_analytics.get_aggregated_stats(
            model_id=model_id,
            days=days
        )
        
        return stats
        
    except Exception as e:
        print(f"❌ Error fetching fal analytics: {e}")
        import traceback
        traceback.print_exc()
        # Return empty stats instead of error to not break the dashboard
        return {
            "total_requests": 0,
            "total_success": 0,
            "total_errors": 0,
            "success_rate": 0,
            "avg_duration_ms": 0,
            "avg_prepare_duration_ms": 0,
            "total_cost_usd": 0.0,
            "cost_per_request": 0.0,
            "error": str(e)
        }

@app.get("/api/admin/events/{event_id}/analytics")
async def get_event_analytics(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get analytics for a specific event (admin endpoint with authentication)"""
    
    print(f"📊 Fetching analytics for event: {event_id}")
    print(f"👤 User: {current_user['id']}")
    
    try:
        couch = get_couch_service()
    except Exception as e:
        print(f"⚠️ Error connecting to CouchDB: {e}")
        # Return empty analytics instead of 500 error
        return {
            "total_photos": 0,
            "total_views": 0,
            "photos_last_24h": 0,
            "most_used_template": None,
            "avg_processing_time": None,
            "error": "Unable to connect to CouchDB"
        }
    
    try:
        # Get event from CouchDB to verify ownership
        event_doc = couch.events_db.get(event_id)
        if not event_doc:
            print(f"❌ Event not found: {event_id}")
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Verify user owns the event
        event_user_id = str(event_doc.get("user_id", ""))
        current_user_id = str(current_user["id"])
        
        if event_user_id != current_user_id:
            print(f"❌ User not authorized")
            raise HTTPException(status_code=403, detail="Not authorized for this event")
        
        # Get all photos for this event
        all_photos = couch.get_photos_by_event(event_id, limit=10000)
        
        # Calculate analytics
        total_photos = len(all_photos)
        
        # Photos in last 24 hours
        from datetime import datetime, timedelta
        now = datetime.now()
        yesterday = now - timedelta(days=1)
        yesterday_timestamp = int(yesterday.timestamp() * 1000)
        
        photos_last_24h = sum(
            1 for photo in all_photos
            if photo.get("created_at", 0) >= yesterday_timestamp
        )
        
        # Most used template
        template_counts = {}
        for photo in all_photos:
            template_name = photo.get("meta", {}).get("template_name") or photo.get("background_name", "Unknown")
            template_counts[template_name] = template_counts.get(template_name, 0) + 1
        
        most_used_template = max(template_counts.items(), key=lambda x: x[1])[0] if template_counts else None
        
        # Calculate average processing time (if available)
        processing_times = [
            photo.get("meta", {}).get("processing_time")
            for photo in all_photos
            if photo.get("meta", {}).get("processing_time")
        ]
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else None
        
        # For views, we'll use a placeholder (you can implement actual view tracking later)
        total_views = total_photos * 3  # Rough estimate: 3 views per photo average
        
        return {
            "total_photos": total_photos,
            "total_views": total_views,
            "photos_last_24h": photos_last_24h,
            "most_used_template": most_used_template,
            "avg_processing_time": avg_processing_time,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching analytics: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {str(e)}")

@app.get("/api/admin/events/{event_id}/photos")
async def get_admin_event_photos(
    event_id: str, 
    limit: int = 100, 
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get photos for an event (admin endpoint with authentication)"""
    
    print(f"📸 Fetching photos for event: {event_id}")
    print(f"👤 User: {current_user['id']}")
    
    try:
        couch = get_couch_service()
    except Exception as e:
        print(f"⚠️ Error connecting to CouchDB: {e}")
        # Return empty photos list instead of 500 error
        return []
    
    # Get event from CouchDB to verify ownership
    try:
        event_doc = couch.events_db.get(event_id)
        if not event_doc:
            print(f"❌ Event not found: {event_id}")
            raise HTTPException(status_code=404, detail="Event not found")
        
        print(f"✅ Event found: {event_doc.get('title', 'N/A')}")
        
        # Verify user owns the event
        event_user_id = str(event_doc.get("user_id", ""))
        current_user_id = str(current_user["id"])
        print(f"🔍 Event user_id: {event_user_id}, Current user_id: {current_user_id}")
        
        if event_user_id != current_user_id:
            print(f"❌ User not authorized")
            raise HTTPException(status_code=403, detail="Not authorized for this event")
        
        # Use the same method as the feed endpoint
        print(f"🔍 Getting photos using get_photos_by_event...")
        couch_photos = couch.get_photos_by_event(event_id, limit=limit, offset=offset)
        print(f"📊 Photos from CouchDB: {len(couch_photos)}")
        
        # Build photo response
        photo_map: Dict[str, Dict[str, Any]] = {}
        for photo in couch_photos:
            share_code = photo.get("share_code") or photo.get("shareCode")
            if not share_code:
                continue
            photo_map[share_code] = {
                "id": photo.get("_id"),
                "_id": photo.get("_id"),
                "share_code": share_code,
                "processed_image_url": photo.get("processed_image_url") or photo.get("processedImageUrl"),
                "original_image_url": photo.get("original_image_url") or photo.get("originalImageUrl"),
                "background_name": photo.get("background_name"),
                "created_at": photo.get("created_at"),
            }
        
        # Also check PostgreSQL for compatibility
        postgres_event_id = event_doc.get("postgres_event_id")
        if postgres_event_id:
            print(f"🔍 Checking PostgreSQL for event_id: {postgres_event_id}")
            async with db_pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT id, processed_image_url, original_image_url, background_name, share_code, created_at
                    FROM processed_photos
                    WHERE event_id = $1 AND is_visible = TRUE AND is_approved = TRUE
                    ORDER BY created_at DESC
                    LIMIT $2 OFFSET $3
                    """,
                    postgres_event_id, limit, offset
                )
                print(f"📊 Photos from PostgreSQL: {len(rows)}")
                for row in rows:
                    share_code = row["share_code"]
                    if share_code not in photo_map:
                        photo_map[share_code] = {
                            "id": row["id"],
                            "_id": row["id"],
                            "share_code": share_code,
                            "processed_image_url": row["processed_image_url"],
                            "original_image_url": row["original_image_url"],
                            "background_name": row["background_name"],
                            "created_at": row["created_at"],
                        }
        
        photos = list(photo_map.values())
        print(f"✅ Returning {len(photos)} photos")
        
        return {"photos": photos, "total": len(photos)}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching photos: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch photos: {str(e)}")

# ===== Delete Photo Endpoint =====

@app.delete("/api/photos/{photo_id}")
async def delete_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a photo from CouchDB, PostgreSQL, and MinIO (requires authentication)"""
    
    print(f"🗑️  Deleting photo: {photo_id}")
    print(f"👤 User: {current_user['id']}")
    
    couch = get_couch_service()
    
    # Get photo from CouchDB
    try:
        photo = couch.photos_db.get(photo_id)
        if not photo:
            print(f"❌ Photo not found: {photo_id}")
            raise HTTPException(status_code=404, detail="Photo not found")
        
        print(f"✅ Photo found: {photo.get('share_code', 'N/A')}")
        
        # Verify user owns the photo or event
        photo_user_id = str(photo.get("user_id", ""))
        current_user_id = str(current_user["id"])
        print(f"🔍 Photo user_id: {photo_user_id}, Current user_id: {current_user_id}")
        
        if photo_user_id != current_user_id:
            # Check if user owns the event
            event_id = photo.get("event_id")
            if event_id:
                event_doc = couch.events_db.get(event_id)
                if not event_doc or str(event_doc.get("user_id")) != str(current_user_id):
                    print(f"❌ User not authorized to delete this photo")
                    raise HTTPException(status_code=403, detail="Not authorized to delete this photo")
            else:
                print(f"❌ No event_id found for photo")
                raise HTTPException(status_code=403, detail="Not authorized to delete this photo")
        
        print(f"🔍 Deleting from CouchDB...")
        # Delete from CouchDB - requires document ID and revision
        try:
            doc_id = photo.get("_id")
            doc_rev = photo.get("_rev")
            if not doc_id or not doc_rev:
                raise ValueError(f"Missing _id or _rev: _id={doc_id}, _rev={doc_rev}")
            
            couch.photos_db.delete(doc_id, doc_rev)
            print(f"✅ Deleted from CouchDB (id={doc_id}, rev={doc_rev})")
        except Exception as couch_error:
            print(f"❌ CouchDB delete error: {couch_error}")
            raise
        
        # Delete from PostgreSQL if it exists
        postgres_event_id = photo.get("postgres_event_id")
        if postgres_event_id:
            print(f"🔍 Deleting from PostgreSQL...")
            try:
                async with db_pool.acquire() as conn:
                    await conn.execute(
                        "DELETE FROM processed_photos WHERE id = $1",
                        photo_id
                    )
                print(f"✅ Deleted from PostgreSQL")
            except Exception as pg_error:
                print(f"⚠️  PostgreSQL delete warning: {pg_error}")
        
        print(f"✅ Photo deleted successfully")
        return {"message": "Photo deleted successfully", "id": photo_id}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting photo: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete photo: {str(e)}")

# ===== Template Image Upload Endpoint =====

@app.post("/api/templates/upload-image")
async def upload_template_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a template background image to MinIO (user-specific folder)"""
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"template_{int(datetime.utcnow().timestamp() * 1000)}_{uuid.uuid4().hex[:7]}.{file_ext}"
    
    try:
        # Get MinIO client
        minio_client = get_minio_client()
        
        # Read file content
        content = await file.read()
        
        # Upload to MinIO in user's templates folder
        object_name = f"users/{current_user['slug']}/templates/{filename}"
        minio_client.put_object(
            Bucket=MINIO_BUCKET,
            Key=object_name,
            Body=io.BytesIO(content),
            ContentType=file.content_type or "image/jpeg"
        )
        
        # Generate public URL
        url = f"{MINIO_SERVER_URL}/{MINIO_BUCKET}/{object_name}"
        
        print(f"✅ Template image uploaded: {url}")
        
        return {"url": url, "filename": filename}
        
    except Exception as e:
        print(f"❌ Template image upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# ===== Image Proxy Endpoint (for CORS bypass) =====

@app.get("/api/proxy/image")
async def proxy_image(url: str):
    """Proxy an image to bypass CORS restrictions"""
    import httpx
    
    # Validate URL - only allow our S3 bucket
    allowed_domains = [
        "s3.amazonaws.com/pictureme.now",
        "pictureme.now.s3.amazonaws.com",
        MINIO_SERVER_URL.replace("https://", "").replace("http://", "") if MINIO_SERVER_URL else ""
    ]
    
    url_domain = url.replace("https://", "").replace("http://", "").split("/")[0]
    url_path = "/".join(url.replace("https://", "").replace("http://", "").split("/")[1:])
    
    is_allowed = any(
        url.replace("https://", "").replace("http://", "").startswith(domain)
        for domain in allowed_domains if domain
    )
    
    if not is_allowed:
        raise HTTPException(status_code=403, detail="URL not allowed for proxying")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch image")
            
            content_type = response.headers.get("content-type", "image/jpeg")
            
            from fastapi.responses import Response
            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=86400",
                    "Access-Control-Allow-Origin": "*"
                }
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Image fetch timeout")
    except Exception as e:
        print(f"❌ Image proxy error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to proxy image: {str(e)}")

# ===== Admin API Endpoints =====

@app.get("/api/admin/stats")
async def get_admin_stats(current_user: dict = Depends(require_superadmin)):
    """Get global system statistics"""
    async with db_pool.acquire() as conn:
        # User stats
        total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
        active_users = await conn.fetchval("SELECT COUNT(*) FROM users WHERE is_active = TRUE")
        
        # Also count Better Auth users
        try:
            ba_users = await conn.fetchval('SELECT COUNT(*) FROM "user"')
            total_users = total_users + (ba_users or 0)
        except:
            pass
        
        # Application stats
        try:
            pending_apps = await conn.fetchval("SELECT COUNT(*) FROM enterprise_applications WHERE status = 'pending'")
        except:
            pending_apps = 0
        
        # Photo stats (PostgreSQL)
        try:
            total_photos = await conn.fetchval("SELECT COUNT(*) FROM processed_photos")
            photos_today = await conn.fetchval(
                "SELECT COUNT(*) FROM processed_photos WHERE created_at >= $1", 
                int((datetime.now() - timedelta(days=1)).timestamp() * 1000)
            )
        except:
            total_photos = 0
            photos_today = 0
        
        # Album photos count (alternative)
        try:
            album_photos = await conn.fetchval("SELECT COUNT(*) FROM album_photos")
            total_photos = max(total_photos, album_photos or 0)
        except:
            pass

        # Event stats
        total_events = await conn.fetchval("SELECT COUNT(*) FROM events")
        active_events = await conn.fetchval("SELECT COUNT(*) FROM events WHERE is_active = TRUE")
        
        # Token stats
        try:
            tokens_used_total = await conn.fetchval(
                "SELECT COALESCE(SUM(ABS(amount)), 0) FROM token_transactions WHERE amount < 0"
            )
            tokens_used_today = await conn.fetchval(
                """SELECT COALESCE(SUM(ABS(amount)), 0) FROM token_transactions 
                   WHERE amount < 0 AND created_at >= $1""",
                datetime.now() - timedelta(days=1)
            )
            avg_tokens_per_day = await conn.fetchval(
                """SELECT COALESCE(SUM(ABS(amount)), 0) / 30.0 FROM token_transactions 
                   WHERE amount < 0 AND created_at >= $1""",
                datetime.now() - timedelta(days=30)
            )
        except:
            tokens_used_total = 0
            tokens_used_today = 0
            avg_tokens_per_day = 0
        
        # Album stats
        try:
            total_albums = await conn.fetchval("SELECT COUNT(*) FROM albums")
            completed_albums = await conn.fetchval("SELECT COUNT(*) FROM albums WHERE status = 'completed'")
            pending_payment = await conn.fetchval("SELECT COUNT(*) FROM albums WHERE payment_status = 'pending'")
        except:
            total_albums = 0
            completed_albums = 0
            pending_payment = 0
        
        try:
            events_summary_rows = await conn.fetch("""
                WITH album_counts AS (
                    SELECT event_id, COUNT(*) AS album_count
                    FROM albums
                    GROUP BY event_id
                ), photo_counts AS (
                    SELECT alb.event_id, COUNT(*) AS photo_count
                    FROM album_photos ap
                    JOIN albums alb ON ap.album_id = alb.id
                    GROUP BY alb.event_id
                ), token_usage AS (
                    SELECT event_id, SUM(ABS(amount)) AS tokens_used
                    FROM token_transactions
                    WHERE amount < 0 AND event_id IS NOT NULL
                    GROUP BY event_id
                )
                SELECT 
                    e.id::text AS event_id,
                    e.title,
                    e.slug,
                    e.user_slug,
                    e.created_at,
                    COALESCE(u.email, ba.email) AS owner_email,
                    COALESCE(u.username, ba.name) AS owner_name,
                    COALESCE(ac.album_count, 0) AS album_count,
                    COALESCE(pc.photo_count, 0) AS photo_count,
                    COALESCE(tu.tokens_used, 0) AS tokens_used
                FROM events e
                LEFT JOIN users u ON e.user_id::text = u.id::text
                LEFT JOIN "user" ba ON e.user_id::text = ba.id::text
                LEFT JOIN album_counts ac ON ac.event_id = e.id
                LEFT JOIN photo_counts pc ON pc.event_id = e.id
                LEFT JOIN token_usage tu ON tu.event_id = e.id
                ORDER BY tu.tokens_used DESC NULLS LAST, ac.album_count DESC NULLS LAST, e.created_at DESC
                LIMIT 25
            """)
        except Exception as e:
            print(f"Error building events summary: {e}")
            events_summary_rows = []

    return {
        "users": {
            "total": total_users or 0,
            "active": active_users or 0,
            "new_today": 0
        },
        "events": {
            "total": total_events or 0,
            "active": active_events or 0
        },
        "photos": {
            "total": total_photos or 0,
            "today": photos_today or 0
        },
        "tokens": {
            "total_used": int(tokens_used_total or 0),
            "used_today": int(tokens_used_today or 0),
            "avg_per_day": round(float(avg_tokens_per_day or 0), 1)
        },
        "albums": {
            "total": total_albums or 0,
            "completed": completed_albums or 0,
            "pending_payment": pending_payment or 0
        },
        "revenue": {
            "total": 0,
            "today": 0,
            "month": 0
        },
        "pending_applications": pending_apps or 0,
        "eventsSummary": [
            {
                "event_id": row["event_id"],
                "title": row["title"],
                "slug": row["slug"],
                "user_slug": row["user_slug"],
                "owner_email": row["owner_email"],
                "owner_name": row["owner_name"],
                "album_count": row["album_count"],
                "photo_count": row["photo_count"],
                "tokens_used": row["tokens_used"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None
            }
            for row in events_summary_rows
        ]
    }

@app.get("/api/admin/users")
async def get_admin_users(
    limit: int = 50, 
    offset: int = 0, 
    search: Optional[str] = None,
    current_user: dict = Depends(require_superadmin)
):
    """List all users with pagination and search - combines legacy users and Better Auth users"""
    async with db_pool.acquire() as conn:
        search_filter = f"%{search}%" if search else None
        
        legacy_params = []
        legacy_query = """
            SELECT id::text, username, email, full_name AS name, role, 
                   tokens_remaining, subscription_tier, is_active, created_at
            FROM users
        """
        if search_filter:
            legacy_query += " WHERE username ILIKE $1 OR email ILIKE $1 OR full_name ILIKE $1"
            legacy_params.append(search_filter)
        legacy_query += " ORDER BY created_at DESC LIMIT 500"
        legacy_rows = await conn.fetch(legacy_query, *legacy_params)
        
        ba_params = []
        ba_query = """
            SELECT id::text, name, email, role, \"createdAt\" AS created_at
            FROM \"user\"
        """
        if search_filter:
            ba_query += " WHERE name ILIKE $1 OR email ILIKE $1"
            ba_params.append(search_filter)
        ba_query += " ORDER BY \"createdAt\" DESC LIMIT 500"
        ba_rows = await conn.fetch(ba_query, *ba_params)
        
        user_map = {}
        for row in legacy_rows:
            email_key = (row["email"] or f"legacy-{row['id']}").lower()
            user_map[email_key] = {
                "id": row["id"],
                "username": row["username"],
                "email": row["email"],
                "name": row["name"],
                "role": row["role"] or "user",
                "tokens_remaining": row["tokens_remaining"] or 0,
                "subscription_tier": row["subscription_tier"],
                "is_active": row["is_active"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                "source": "legacy"
            }
        
        for row in ba_rows:
            email = (row["email"] or f"auth-{row['id']}").lower()
            entry = user_map.get(email)
            created_at = row["created_at"].isoformat() if row["created_at"] else None
            if entry:
                entry["source"] = "hybrid"
                entry["role"] = row["role"] or entry["role"]
                entry["name"] = row["name"] or entry.get("name")
                if not entry.get("created_at"):
                    entry["created_at"] = created_at
            else:
                user_map[email] = {
                    "id": row["id"],
                    "username": (row["email"] or "").split("@")[0],
                    "email": row["email"],
                    "name": row["name"],
                    "role": row["role"] or "user",
                    "tokens_remaining": 0,
                    "subscription_tier": None,
                    "is_active": True,
                    "created_at": created_at,
                    "source": "better_auth"
                }
        
        merged_users = list(user_map.values())
        
        if search:
            lowered = search.lower()
            merged_users = [
                u for u in merged_users
                if (u.get("name") or "").lower().find(lowered) != -1
                or (u.get("email") or "").lower().find(lowered) != -1
                or (u.get("username") or "").lower().find(lowered) != -1
            ]
        
        merged_users.sort(key=lambda u: u.get("created_at") or "", reverse=True)
        total = len(merged_users)
        start = max(0, offset)
        end = start + limit
        paged = merged_users[start:end]
            
    return {
        "users": paged,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@app.get("/api/admin/users/{user_id}")
async def get_admin_user_details(user_id: str, current_user: dict = Depends(require_superadmin)):
    """Get detailed user info"""
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, email, full_name, role, is_active, created_at, last_login FROM users WHERE id::text = $1",
            user_id
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Get user's events count
        events_count = await conn.fetchval("SELECT COUNT(*) FROM events WHERE user_id = $1", user["id"])
        
        # Get user's photos count
        photos_count = await conn.fetchval("SELECT COUNT(*) FROM processed_photos WHERE user_id = $1", user["id"])
        
    return {
        **dict(user),
        "stats": {
            "events": events_count,
            "photos": photos_count,
            "tokens": 150 # Mock
        }
    }

@app.put("/api/admin/users/{user_id}")
async def update_admin_user(
    user_id: str, 
    update: UserUpdateAdmin, 
    current_user: dict = Depends(require_superadmin)
):
    """Update user role or status"""
    async with db_pool.acquire() as conn:
        # Build update query dynamically
        fields = []
        values = []
        idx = 1
        
        if update.role is not None:
            fields.append(f"role = ${idx}")
            values.append(update.role)
            idx += 1
            
        if update.is_active is not None:
            fields.append(f"is_active = ${idx}")
            values.append(update.is_active)
            idx += 1
            
        if update.full_name is not None:
            fields.append(f"full_name = ${idx}")
            values.append(update.full_name)
            idx += 1
            
        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        values.append(user_id)
        query = f"UPDATE users SET {', '.join(fields)} WHERE id::text = ${idx} RETURNING id, username, role, is_active"
        
        updated_user = await conn.fetchrow(query, *values)
        
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
            
    return dict(updated_user)

@app.get("/api/admin/applications")
async def get_admin_applications(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(require_superadmin)
):
    """List enterprise applications"""
    async with db_pool.acquire() as conn:
        if status:
            query = """
                SELECT * FROM enterprise_applications
                WHERE status = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            """
            apps = await conn.fetch(query, status, limit, offset)
            total = await conn.fetchval("SELECT COUNT(*) FROM enterprise_applications WHERE status = $1", status)
        else:
            query = """
                SELECT * FROM enterprise_applications
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
            """
            apps = await conn.fetch(query, limit, offset)
            total = await conn.fetchval("SELECT COUNT(*) FROM enterprise_applications")
            
    return {
        "applications": [dict(a) for a in apps],
        "total": total
    }

@app.put("/api/admin/applications/{app_id}")
async def update_application_status(
    app_id: int,
    update: ApplicationUpdateAdmin,
    current_user: dict = Depends(require_superadmin)
):
    """Approve or reject an application"""
    async with db_pool.acquire() as conn:
        app = await conn.fetchrow("SELECT * FROM enterprise_applications WHERE id = $1", app_id)
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
            
        updated_app = await conn.fetchrow(
            "UPDATE enterprise_applications SET status = $1, updated_at = NOW() RETURNING *",
            update.status
        )
        
        # If approved, we might want to auto-create a user or upgrade their role
        # For now, we just update the status
        
    return dict(updated_app)

@app.get("/api/admin/events")
async def get_admin_events(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(require_superadmin)
):
    """List all global events (from Postgres sync)"""
    async with db_pool.acquire() as conn:
        events = await conn.fetch("""
            SELECT e.*, u.username as owner_username 
            FROM events e
            JOIN users u ON e.user_id = u.id
            ORDER BY e.created_at DESC
            LIMIT $1 OFFSET $2
        """, limit, offset)
        
        total = await conn.fetchval("SELECT COUNT(*) FROM events")
        
    return {
        "events": [dict(e) for e in events],
        "total": total
    }

@app.get("/api/admin/models")
async def get_admin_models(current_user: dict = Depends(require_superadmin)):
    """Get available AI models configuration"""
    # Mock data for now, eventually this could come from DB or Config
    return {
        "models": [
            {"id": "fal-ai/flux-realism", "name": "Flux Realism", "provider": "FAL.ai", "cost_per_gen": 4, "is_active": True},
            {"id": "google/veo-2", "name": "Google Veo 2", "provider": "Google", "cost_per_gen": 15, "is_active": True},
            {"id": "midjourney-v6", "name": "Midjourney v6", "provider": "Midjourney", "cost_per_gen": 8, "is_active": True},
            {"id": "runway-gen3", "name": "Runway Gen-3", "provider": "Runway", "cost_per_gen": 12, "is_active": True},
        ]
    }


# ============================================================================
# SUPER ADMIN - TOKEN PACKAGES MANAGEMENT
# ============================================================================

class TokenPackageCreate(BaseModel):
    name: str
    description: Optional[str] = None
    tokens: int
    price_usd: float
    is_active: bool = True
    stripe_price_id: Optional[str] = None


class TokenPackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tokens: Optional[int] = None
    price_usd: Optional[float] = None
    is_active: Optional[bool] = None
    stripe_price_id: Optional[str] = None


@app.get("/api/admin/token-packages")
async def get_token_packages(current_user: dict = Depends(require_superadmin)):
    """Get all token packages (admin view - includes inactive)"""
    async with db_pool.acquire() as conn:
        try:
            packages = await conn.fetch("""
                SELECT id, name, description, tokens, price_usd, is_active, stripe_price_id, created_at
                FROM token_packages
                ORDER BY tokens ASC
            """)
            # Return actual data from DB (even if empty)
            return [dict(p) for p in packages]
        except Exception as e:
            print(f"Error fetching token packages: {e}")
            # Table doesn't exist - return empty array
            return []


@app.delete("/api/admin/token-packages/cleanup")
async def cleanup_duplicate_packages(current_user: dict = Depends(require_superadmin)):
    """Remove duplicate token packages, keeping only one of each name"""
    async with db_pool.acquire() as conn:
        # Find and delete duplicates, keeping the one with lowest ID
        result = await conn.execute("""
            DELETE FROM token_packages 
            WHERE id NOT IN (
                SELECT MIN(id) 
                FROM token_packages 
                GROUP BY name, tokens
            )
        """)
        deleted_count = result.split()[-1] if result else "0"
        return {"success": True, "deleted": deleted_count}


@app.post("/api/admin/token-packages")
async def create_token_package(package: TokenPackageCreate, current_user: dict = Depends(require_superadmin)):
    """Create a new token package"""
    async with db_pool.acquire() as conn:
        try:
            row = await conn.fetchrow("""
                INSERT INTO token_packages (name, description, tokens, price_usd, is_active, stripe_price_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            """, package.name, package.description, package.tokens, package.price_usd, 
                package.is_active, package.stripe_price_id)
            return {"success": True, "package": dict(row)}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))


@app.put("/api/admin/token-packages/{package_id}")
async def update_token_package(package_id: int, update: TokenPackageUpdate, current_user: dict = Depends(require_superadmin)):
    """Update a token package"""
    async with db_pool.acquire() as conn:
        # Build dynamic update
        updates = []
        params = []
        param_idx = 1
        
        if update.name is not None:
            updates.append(f"name = ${param_idx}")
            params.append(update.name)
            param_idx += 1
        
        if update.description is not None:
            updates.append(f"description = ${param_idx}")
            params.append(update.description)
            param_idx += 1
        
        if update.tokens is not None:
            updates.append(f"tokens = ${param_idx}")
            params.append(update.tokens)
            param_idx += 1
        
        if update.price_usd is not None:
            updates.append(f"price_usd = ${param_idx}")
            params.append(update.price_usd)
            param_idx += 1
        
        if update.is_active is not None:
            updates.append(f"is_active = ${param_idx}")
            params.append(update.is_active)
            param_idx += 1
        
        if update.stripe_price_id is not None:
            updates.append(f"stripe_price_id = ${param_idx}")
            params.append(update.stripe_price_id)
            param_idx += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        params.append(package_id)
        
        query = f"""
            UPDATE token_packages 
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${param_idx}
            RETURNING *
        """
        
        row = await conn.fetchrow(query, *params)
        
        if not row:
            raise HTTPException(status_code=404, detail="Package not found")
        
        return {"success": True, "package": dict(row)}


@app.delete("/api/admin/token-packages/{package_id}")
async def delete_token_package(package_id: int, current_user: dict = Depends(require_superadmin)):
    """Deactivate a token package (soft delete)"""
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE token_packages 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        """, package_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Package not found")
        
        return {"success": True, "message": "Package deactivated"}


@app.get("/api/admin/token-transactions")
async def get_admin_token_transactions(
    limit: int = 20, 
    offset: int = 0,
    current_user: dict = Depends(require_superadmin)
):
    """Get all token transactions (admin view)"""
    async with db_pool.acquire() as conn:
        try:
            transactions = await conn.fetch("""
                SELECT 
                    tt.id,
                    u.email as user_email,
                    tt.amount,
                    tt.transaction_type,
                    tt.description as package_name,
                    tt.created_at,
                    CASE WHEN tt.amount > 0 THEN 'credit' ELSE 'debit' END as status
                FROM token_transactions tt
                LEFT JOIN users u ON tt.user_id = u.id
                WHERE tt.transaction_type IN ('purchase', 'bonus', 'refund')
                ORDER BY tt.created_at DESC
                LIMIT $1 OFFSET $2
            """, limit, offset)
            
            return [dict(t) for t in transactions]
        except Exception as e:
            return []


# ============================================================================
# SUPER ADMIN - SYSTEM SETTINGS
# ============================================================================

class SystemSettingsUpdate(BaseModel):
    maintenance_mode: Optional[bool] = None
    registration_enabled: Optional[bool] = None
    free_trial_enabled: Optional[bool] = None
    free_trial_tokens: Optional[int] = None
    default_user_role: Optional[str] = None
    max_events_per_user: Optional[int] = None
    max_photos_per_event: Optional[int] = None


# In-memory settings cache (in production, use Redis or database)
_system_settings = {
    "maintenance_mode": False,
    "registration_enabled": True,
    "free_trial_enabled": True,
    "free_trial_tokens": 50,
    "default_user_role": "user",
    "max_events_per_user": 10,
    "max_photos_per_event": 1000
}


@app.get("/api/admin/settings")
async def get_system_settings(current_user: dict = Depends(require_superadmin)):
    """Get system settings"""
    async with db_pool.acquire() as conn:
        try:
            # Try to load from database
            row = await conn.fetchrow("SELECT settings FROM system_settings WHERE id = 1")
            if row and row['settings']:
                import json
                return json.loads(row['settings'])
        except:
            pass
    
    return _system_settings


@app.put("/api/admin/settings")
async def update_system_settings(
    settings: SystemSettingsUpdate,
    current_user: dict = Depends(require_superadmin)
):
    """Update system settings"""
    global _system_settings
    
    # Update in-memory cache
    if settings.maintenance_mode is not None:
        _system_settings["maintenance_mode"] = settings.maintenance_mode
    if settings.registration_enabled is not None:
        _system_settings["registration_enabled"] = settings.registration_enabled
    if settings.free_trial_enabled is not None:
        _system_settings["free_trial_enabled"] = settings.free_trial_enabled
    if settings.free_trial_tokens is not None:
        _system_settings["free_trial_tokens"] = settings.free_trial_tokens
    if settings.default_user_role is not None:
        _system_settings["default_user_role"] = settings.default_user_role
    if settings.max_events_per_user is not None:
        _system_settings["max_events_per_user"] = settings.max_events_per_user
    if settings.max_photos_per_event is not None:
        _system_settings["max_photos_per_event"] = settings.max_photos_per_event
    
    # Try to persist to database
    async with db_pool.acquire() as conn:
        try:
            import json
            settings_json = json.dumps(_system_settings)
            await conn.execute("""
                INSERT INTO system_settings (id, settings, updated_at)
                VALUES (1, $1, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET 
                    settings = $1,
                    updated_at = CURRENT_TIMESTAMP
            """, settings_json)
        except Exception as e:
            # Table might not exist, that's okay - settings are in memory
            print(f"Could not persist settings to DB: {e}")
    
    return {"success": True, "settings": _system_settings}


if __name__ == "__main__":
    import uvicorn
    # Listen on all interfaces (0.0.0.0) to support both IPv4 and IPv6
    uvicorn.run(app, host="0.0.0.0", port=3001)

