"""
FastAPI Backend for AI Photo Booth
Multiuser, multi-event platform with live feeds
Uses CouchDB for events/photos, PostgreSQL for users, MinIO for images
"""

from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
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

# Import CouchDB service
from couchdb_service import get_couch_service

load_dotenv()

# ===== Configuration =====
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("VITE_POSTGRES_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
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
security = HTTPBearer()

# FastAPI app
app = FastAPI(title="AI Photo Booth API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://photo.akitapr.com",
        "https://photoapi.akitapr.com", 
        "http://localhost:8080",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ===== Database Connection =====
db_pool: Optional[asyncpg.Pool] = None

@app.on_event("startup")
async def startup():
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    print("✅ Database pool created")

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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")  # Can be UUID string or int
        if user_id is None:
            raise credentials_exception
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception
    
    async with db_pool.acquire() as conn:
        # Try to fetch user by id (supports both UUID and legacy int)
        user = await conn.fetchrow(
            "SELECT id, username, email, full_name, slug FROM users WHERE id::text = $1 AND is_active = TRUE",
            str(user_id)
        )
    
    if user is None:
        raise credentials_exception
    
    return dict(user)

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
            INSERT INTO users (username, email, password_hash, full_name, slug)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, email, full_name, slug
            """,
            user.username, user.email, hashed_pw, user.full_name, slug
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
            "SELECT id, username, email, full_name, slug, password_hash FROM users WHERE username = $1 AND is_active = TRUE",
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

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

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
async def get_user_events(current_user: dict = Depends(get_current_user)):
    """Get all events for the current user (from CouchDB)"""
    couch = get_couch_service()
    events = couch.get_events_by_user(str(current_user["id"]))
    return events

@app.post("/api/events")
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    """Create a new event (stored in CouchDB)"""
    couch = get_couch_service()
    
    # Check if slug already exists for this user
    existing = couch.get_event_by_slug(str(current_user["id"]), event.slug)
    if existing:
        raise HTTPException(status_code=400, detail="Event slug already exists")
    
    # Prepare event data
    event_data = {
        "user_id": str(current_user["id"]),
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
                INSERT INTO events (user_id, slug, title, description, start_date, end_date, is_active, theme, templates, branding, settings)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb)
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
                json.dumps(event.settings or {})
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

    # Resolve user by slug to obtain UUID (users remain in PostgreSQL)
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, full_name, slug FROM users WHERE slug = $1 AND is_active = TRUE",
            user_slug
        )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    event_doc = couch.get_event_by_slug(str(user["id"]), event_slug)

    if not event_doc or not event_doc.get("is_active", True):
        raise HTTPException(status_code=404, detail="Event not found")

    # Enrich document with user info (ensures legacy fields are present)
    event_doc.setdefault("user_id", str(user["id"]))
    event_doc["username"] = user["username"]
    event_doc["user_full_name"] = user["full_name"]
    event_doc["user_slug"] = user["slug"]

    # Ensure postgres_event_id is stored for compatibility
    if "postgres_event_id" not in event_doc:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id FROM events WHERE user_id = $1 AND slug = $2",
                user["id"], event_slug
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

    # Resolve user
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, full_name, slug FROM users WHERE slug = $1 AND is_active = TRUE",
            user_slug
        )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    event_doc = couch.get_event_by_slug(str(user["id"]), event_slug)

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
            user = await conn.fetchrow(
                "SELECT id, username, full_name, slug FROM users WHERE slug = $1 AND is_active = TRUE",
                payload.userSlug
            )

        if not user:
            raise HTTPException(status_code=404, detail="User not found for provided slug")

        user_id = user["id"]
        event_doc = couch.get_event_by_slug(str(user_id), payload.eventSlug)
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

if __name__ == "__main__":
    import uvicorn
    # Listen on all interfaces (0.0.0.0) to support both IPv4 and IPv6
    uvicorn.run(app, host="0.0.0.0", port=3001)

