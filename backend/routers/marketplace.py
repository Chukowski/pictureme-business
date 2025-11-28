"""
Marketplace API Router

Endpoints for marketplace templates, LoRA models, and user library.
Templates are stored in CouchDB for consistency with events.
User library (ownership) is tracked in PostgreSQL.
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Form
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import os
import uuid
import json

router = APIRouter(
    prefix="/api/marketplace",
    tags=["Marketplace"],
)

# Database pool will be set by main.py
db_pool = None

def set_db_pool(pool):
    global db_pool
    db_pool = pool


# ===== Pydantic Models =====

class TemplateCreator(BaseModel):
    id: str
    name: str
    avatar_url: Optional[str] = None


class PipelineConfig(BaseModel):
    imageModel: Optional[str] = "seedream-v4"
    faceswapEnabled: Optional[bool] = False
    faceswapModel: Optional[str] = None
    videoEnabled: Optional[bool] = False
    videoModel: Optional[str] = None
    badgeEnabled: Optional[bool] = False


class AccessOverrides(BaseModel):
    leadCaptureRequired: Optional[bool] = False
    requirePayment: Optional[bool] = False
    hardWatermark: Optional[bool] = False
    disableDownloads: Optional[bool] = False
    allowFreePreview: Optional[bool] = True


class MarketplaceTemplate(BaseModel):
    id: str
    name: str
    description: str
    template_type: str  # 'business' or 'individual'
    category: str
    tags: List[str] = []
    
    # Preview
    preview_url: Optional[str] = None
    preview_images: List[str] = []
    
    # Individual template fields
    backgrounds: List[str] = []
    element_images: List[str] = []
    prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    
    # Pipeline config
    pipeline_config: Optional[PipelineConfig] = None
    
    # Business template full config (matches Event Template)
    business_config: Optional[dict] = None
    
    # Marketplace info
    price: int = 0  # Tokens to purchase
    tokens_cost: int = 1  # Tokens per generation
    is_public: bool = True
    is_premium: bool = False
    is_exportable: bool = True
    
    # Creator
    creator: Optional[TemplateCreator] = None
    creator_id: Optional[str] = None
    
    # Stats
    downloads: int = 0
    rating: float = 5.0
    
    # Ownership (set per-user)
    is_owned: bool = False


class LibraryItem(BaseModel):
    id: str
    template_id: str
    type: str
    name: str
    preview_url: Optional[str] = None
    template_type: str = "individual"
    purchased_at: str
    times_used: int = 0


class PipelineConfigRequest(BaseModel):
    imageModel: Optional[str] = "seedream-t2i"
    faceswapEnabled: Optional[bool] = False
    faceswapModel: Optional[str] = None
    videoEnabled: Optional[bool] = False
    videoModel: Optional[str] = None
    badgeEnabled: Optional[bool] = False


class AccessOverridesRequest(BaseModel):
    leadCaptureRequired: Optional[bool] = False
    requirePayment: Optional[bool] = False
    hardWatermark: Optional[bool] = False
    disableDownloads: Optional[bool] = False
    allowFreePreview: Optional[bool] = True


class CreateTemplateRequest(BaseModel):
    name: str
    description: str
    template_type: str = "individual"  # 'business' or 'individual'
    category: str
    tags: List[str] = []
    
    # Individual fields
    backgrounds: List[str] = []
    element_images: List[str] = []
    prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    
    # Pipeline
    pipeline_config: Optional[PipelineConfigRequest] = None
    
    # Access overrides (for business templates)
    access_overrides: Optional[AccessOverridesRequest] = None
    
    # Business template (full event template config)
    business_config: Optional[dict] = None
    
    # Marketplace
    price: int = 0
    tokens_cost: int = 1
    is_public: bool = True


async def get_current_user_from_request(request: Request) -> dict:
    """Extract user from request"""
    from main import get_current_user, security
    from fastapi.security import HTTPAuthorizationCredentials
    
    auth_header = request.headers.get("Authorization")
    credentials = None
    if auth_header and auth_header.startswith("Bearer "):
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=auth_header.replace("Bearer ", "")
        )
    
    return await get_current_user(request, credentials)


def get_couch():
    """Get CouchDB service"""
    from couchdb_service import get_couch_service
    return get_couch_service()


# ===== Default Templates (fallback) =====
DEFAULT_TEMPLATES = [
    {
        "_id": "default_neon_cyberpunk",
        "name": "Neon Cyberpunk",
        "description": "Futuristic neon-lit backgrounds with cyberpunk aesthetics",
        "template_type": "individual",
        "category": "Fantasy",
        "tags": ["neon", "cyberpunk", "futuristic"],
        "preview_url": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400",
        "backgrounds": ["https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200"],
        "prompt": "cyberpunk neon city background, futuristic, vibrant colors",
        "pipeline_config": {"imageModel": "seedream-v4"},
        "price": 0,
        "tokens_cost": 2,
        "is_public": True,
        "downloads": 1250,
        "rating": 4.8,
        "creator_id": "system",
        "creator": {"id": "system", "name": "PictureMe Studios"}
    },
    {
        "_id": "default_tropical_paradise",
        "name": "Tropical Paradise",
        "description": "Vibrant tropical beach and palm tree backgrounds",
        "template_type": "individual",
        "category": "Nature",
        "tags": ["tropical", "beach", "summer"],
        "preview_url": "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400",
        "backgrounds": ["https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200"],
        "prompt": "tropical beach paradise, palm trees, crystal clear water",
        "pipeline_config": {"imageModel": "seedream-v4"},
        "price": 0,
        "tokens_cost": 2,
        "is_public": True,
        "downloads": 2100,
        "rating": 4.9,
        "creator_id": "system",
        "creator": {"id": "system", "name": "PictureMe Studios"}
    },
    {
        "_id": "default_galaxy_dreams",
        "name": "Galaxy Dreams",
        "description": "Stunning space and galaxy backgrounds",
        "template_type": "individual",
        "category": "Fantasy",
        "tags": ["space", "galaxy", "cosmic"],
        "preview_url": "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400",
        "backgrounds": ["https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200"],
        "prompt": "cosmic galaxy background, stars, nebula, deep space",
        "pipeline_config": {"imageModel": "seedream-v4"},
        "price": 0,
        "tokens_cost": 2,
        "is_public": True,
        "downloads": 1800,
        "rating": 4.8,
        "creator_id": "system",
        "creator": {"id": "system", "name": "Space Visuals"}
    },
    {
        "_id": "default_corporate_summit",
        "name": "Corporate Summit Pro",
        "description": "Professional corporate event template with branding options",
        "template_type": "business",
        "category": "Corporate",
        "tags": ["corporate", "business", "professional"],
        "preview_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400",
        "backgrounds": ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200"],
        "prompt": "professional corporate event, modern office, business atmosphere",
        "pipeline_config": {"imageModel": "seedream-v4"},
        "business_config": {
            "name": "Corporate Summit Pro",
            "description": "Professional corporate event template",
            "images": ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200"],
            "prompt": "professional corporate event, modern office, business atmosphere",
            "active": True,
            "includeBranding": True,
            "includeHeader": True
        },
        "price": 75,
        "tokens_cost": 4,
        "is_public": True,
        "is_exportable": False,
        "downloads": 650,
        "rating": 4.7,
        "creator_id": "system",
        "creator": {"id": "system", "name": "Business Events Inc"}
    },
    {
        "_id": "default_elegant_wedding",
        "name": "Elegant Wedding Suite",
        "description": "Complete wedding template with romantic backgrounds",
        "template_type": "business",
        "category": "Weddings",
        "tags": ["wedding", "romantic", "elegant"],
        "preview_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400",
        "backgrounds": [
            "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200",
            "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200"
        ],
        "prompt": "elegant wedding venue, romantic atmosphere, soft lighting",
        "pipeline_config": {"imageModel": "seedream-v4"},
        "business_config": {
            "name": "Elegant Wedding Suite",
            "description": "Romantic wedding template",
            "images": ["https://images.unsplash.com/photo-1519741497674-611481863552?w=1200"],
            "prompt": "elegant wedding venue, romantic atmosphere, soft lighting",
            "active": True,
            "includeBranding": True
        },
        "price": 100,
        "tokens_cost": 3,
        "is_public": True,
        "is_exportable": False,
        "downloads": 890,
        "rating": 4.9,
        "creator_id": "system",
        "creator": {"id": "system", "name": "Wedding Pro"}
    }
]


async def ensure_default_templates():
    """Ensure default templates exist in CouchDB"""
    couch = get_couch()
    for template in DEFAULT_TEMPLATES:
        existing = couch.get_template_by_id(template["_id"])
        if not existing:
            try:
                template["type"] = "template"
                template["created_at"] = datetime.utcnow().isoformat()
                template["updated_at"] = datetime.utcnow().isoformat()
                couch.templates_db.create(template)
                print(f"✅ Created default template: {template['name']}")
            except Exception as e:
                print(f"⚠️ Error creating default template {template['name']}: {e}")


# ===== API Endpoints =====

@router.get("/templates")
async def get_marketplace_templates(
    request: Request,
    template_type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50
):
    """Get public marketplace templates from CouchDB"""
    # Ensure defaults exist
    await ensure_default_templates()
    
    try:
        user = await get_current_user_from_request(request)
        user_id = str(user["id"])
    except:
        user_id = None
    
    couch = get_couch()
    
    # Get templates from CouchDB
    templates = couch.get_public_templates(
        template_type=template_type,
        category=category,
        limit=limit
    )
    
    # If no templates, return defaults
    if not templates:
        templates = DEFAULT_TEMPLATES
    
    # Get user's owned template IDs from PostgreSQL
    owned_ids = set()
    if user_id and db_pool:
        try:
            async with db_pool.acquire() as conn:
                owned = await conn.fetch(
                    "SELECT template_id FROM user_library WHERE user_id = $1",
                    str(user_id)
                )
                owned_ids = {str(o["template_id"]) for o in owned}
        except Exception as e:
            print(f"⚠️ Error fetching owned templates: {e}")
    
    # Filter by search if provided
    if search:
        search_lower = search.lower()
        templates = [
            t for t in templates
            if search_lower in t.get("name", "").lower() 
            or search_lower in t.get("description", "").lower()
        ]
    
    # Format response
    result = []
    for t in templates:
        creator = t.get("creator") or {"id": t.get("creator_id", "unknown"), "name": "Unknown"}
        if isinstance(creator, str):
            creator = {"id": creator, "name": creator}
        
        result.append(MarketplaceTemplate(
            id=t.get("_id", t.get("id", "")),
            name=t.get("name", ""),
            description=t.get("description", ""),
            template_type=t.get("template_type", "individual"),
            category=t.get("category", "General"),
            tags=t.get("tags", []),
            preview_url=t.get("preview_url"),
            preview_images=t.get("preview_images", []),
            backgrounds=t.get("backgrounds", []),
            element_images=t.get("element_images", []),
            prompt=t.get("prompt"),
            negative_prompt=t.get("negative_prompt"),
            pipeline_config=t.get("pipeline_config"),
            business_config=t.get("business_config"),
            price=t.get("price", 0),
            tokens_cost=t.get("tokens_cost", 1),
            is_public=t.get("is_public", True),
            is_premium=t.get("is_premium", False),
            is_exportable=t.get("is_exportable", True),
            creator=TemplateCreator(**creator) if creator else None,
            creator_id=t.get("creator_id"),
            downloads=t.get("downloads", 0),
            rating=t.get("rating", 5.0),
            is_owned=t.get("_id", t.get("id", "")) in owned_ids or t.get("price", 0) == 0
        ))
    
    return result


@router.get("/templates/{template_id}")
async def get_template_detail(request: Request, template_id: str):
    """Get a single template by ID"""
    couch = get_couch()
    template = couch.get_template_by_id(template_id)
    
    if not template:
        # Check defaults
        for t in DEFAULT_TEMPLATES:
            if t["_id"] == template_id:
                template = t
                break
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check ownership
    try:
        user = await get_current_user_from_request(request)
        user_id = str(user["id"])
        is_owned = False
        if db_pool:
            async with db_pool.acquire() as conn:
                owned = await conn.fetchrow(
                    "SELECT id FROM user_library WHERE user_id = $1 AND template_id = $2",
                    int(user_id), template_id
                )
                is_owned = owned is not None
    except:
        is_owned = False
    
    template["is_owned"] = is_owned or template.get("price", 0) == 0
    return template


@router.get("/my-library")
async def get_my_library(request: Request):
    """Get user's template library"""
    user = await get_current_user_from_request(request)
    user_id = str(user["id"])  # Support both UUID and integer IDs
    
    if not db_pool:
        return []
    
    couch = get_couch()
    
    async with db_pool.acquire() as conn:
        # Get user's library entries
        library = await conn.fetch(
            """
            SELECT template_id, item_type, times_used, purchased_at
            FROM user_library
            WHERE user_id = $1
            ORDER BY purchased_at DESC
            """,
            user_id
        )
        
        if not library:
            return []
        
        # Get template details from CouchDB
        result = []
        for item in library:
            template_id = str(item["template_id"])
            template = couch.get_template_by_id(template_id)
            
            # Check defaults if not found
            if not template:
                for t in DEFAULT_TEMPLATES:
                    if t["_id"] == template_id:
                        template = t
                        break
            
            if template:
                result.append(LibraryItem(
                    id=f"lib_{item['template_id']}",
                    template_id=template_id,
                    type=item["item_type"],
                    name=template.get("name", "Unknown"),
                    preview_url=template.get("preview_url"),
                    template_type=template.get("template_type", "individual"),
                    purchased_at=item["purchased_at"].isoformat() if item["purchased_at"] else "",
                    times_used=item["times_used"] or 0
                ))
        
        return result


@router.get("/my-templates")
async def get_my_templates(request: Request):
    """Get templates created by the current user"""
    user = await get_current_user_from_request(request)
    user_id = str(user["id"])
    
    couch = get_couch()
    templates = couch.get_templates_by_creator(user_id)
    
    return [
        MarketplaceTemplate(
            id=t.get("_id", ""),
            name=t.get("name", ""),
            description=t.get("description", ""),
            template_type=t.get("template_type", "individual"),
            category=t.get("category", "General"),
            tags=t.get("tags", []),
            preview_url=t.get("preview_url"),
            backgrounds=t.get("backgrounds", []),
            element_images=t.get("element_images", []),
            prompt=t.get("prompt"),
            pipeline_config=t.get("pipeline_config"),
            business_config=t.get("business_config"),
            price=t.get("price", 0),
            tokens_cost=t.get("tokens_cost", 1),
            is_public=t.get("is_public", True),
            is_exportable=t.get("is_exportable", True),
            downloads=t.get("downloads", 0),
            rating=t.get("rating", 5.0),
            is_owned=True
        )
        for t in templates
    ]


@router.post("/templates")
async def create_template(request: Request, template_data: CreateTemplateRequest):
    """Create a new marketplace template"""
    user = await get_current_user_from_request(request)
    user_id = str(user["id"])
    
    couch = get_couch()
    
    # Build template document
    pipeline_config = {}
    if template_data.pipeline_config:
        pipeline_config = template_data.pipeline_config.model_dump() if hasattr(template_data.pipeline_config, 'model_dump') else dict(template_data.pipeline_config)
    
    access_overrides = {}
    if template_data.access_overrides:
        access_overrides = template_data.access_overrides.model_dump() if hasattr(template_data.access_overrides, 'model_dump') else dict(template_data.access_overrides)
    
    template_doc = {
        "_id": str(uuid.uuid4()),
        "type": "template",
        "creator_id": user_id,
        "creator": {
            "id": user_id,
            "name": user.get("full_name") or user.get("username", "Unknown"),
            "avatar_url": user.get("avatar_url")
        },
        "name": template_data.name,
        "description": template_data.description,
        "template_type": template_data.template_type,
        "category": template_data.category,
        "tags": template_data.tags,
        "backgrounds": template_data.backgrounds,
        "element_images": template_data.element_images,
        "prompt": template_data.prompt,
        "negative_prompt": template_data.negative_prompt,
        "pipeline_config": pipeline_config,
        "access_overrides": access_overrides,
        "business_config": template_data.business_config,
        "price": template_data.price,
        "tokens_cost": template_data.tokens_cost,
        "is_public": template_data.is_public,
        "is_exportable": template_data.price == 0,  # Free templates can be exported
        "preview_url": template_data.backgrounds[0] if template_data.backgrounds else None,
    }
    
    # Create in CouchDB
    created = couch.create_template(template_doc)
    
    # Add to creator's library in PostgreSQL
    if db_pool:
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO user_library (user_id, template_id, item_type, tokens_spent)
                VALUES ($1, $2, 'template', 0)
                ON CONFLICT DO NOTHING
                """,
                int(user_id), created["_id"]
            )
    
    return {
        "success": True,
        "template_id": created["_id"],
        "name": created["name"],
        "message": "Template created successfully"
    }


@router.put("/templates/{template_id}")
async def update_template(request: Request, template_id: str, template_data: CreateTemplateRequest):
    """Update an existing template"""
    user = await get_current_user_from_request(request)
    user_id = str(user["id"])
    
    couch = get_couch()
    existing = couch.get_template_by_id(template_id)
    
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check ownership
    if existing.get("creator_id") != user_id and user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this template")
    
    # Update fields
    existing.update({
        "name": template_data.name,
        "description": template_data.description,
        "template_type": template_data.template_type,
        "category": template_data.category,
        "tags": template_data.tags,
        "backgrounds": template_data.backgrounds,
        "element_images": template_data.element_images,
        "prompt": template_data.prompt,
        "negative_prompt": template_data.negative_prompt,
        "pipeline_config": template_data.pipeline_config or {},
        "business_config": template_data.business_config,
        "price": template_data.price,
        "tokens_cost": template_data.tokens_cost,
        "is_public": template_data.is_public,
        "is_exportable": template_data.price == 0,
        "preview_url": template_data.backgrounds[0] if template_data.backgrounds else existing.get("preview_url"),
    })
    
    updated = couch.update_template(template_id, existing)
    
    return {
        "success": True,
        "template_id": updated["_id"],
        "message": "Template updated successfully"
    }


@router.delete("/templates/{template_id}")
async def delete_template(request: Request, template_id: str):
    """Delete a template"""
    user = await get_current_user_from_request(request)
    user_id = str(user["id"])
    
    couch = get_couch()
    existing = couch.get_template_by_id(template_id)
    
    if not existing:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check ownership
    if existing.get("creator_id") != user_id and user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this template")
    
    couch.delete_template(template_id)
    
    return {"success": True, "message": "Template deleted"}


@router.post("/purchase/{template_id}")
async def purchase_template(request: Request, template_id: str):
    """Purchase a template and add to library"""
    user = await get_current_user_from_request(request)
    user_id = int(user["id"])
    
    couch = get_couch()
    template = couch.get_template_by_id(template_id)
    
    # Check defaults
    if not template:
        for t in DEFAULT_TEMPLATES:
            if t["_id"] == template_id:
                template = t
                break
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    price = template.get("price", 0)
    
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database not available")
    
    async with db_pool.acquire() as conn:
        # Check if already owned
        existing = await conn.fetchrow(
            "SELECT id FROM user_library WHERE user_id = $1 AND template_id = $2",
            user_id, template_id
        )
        
        if existing:
            return {"success": True, "message": "Already in library", "tokens_spent": 0}
        
        # Check tokens if not free
        if price > 0:
            user_tokens = await conn.fetchval(
                "SELECT tokens_remaining FROM users WHERE id = $1",
                user_id
            )
            
            if user_tokens < price:
                raise HTTPException(status_code=400, detail="Insufficient tokens")
            
            # Deduct tokens
            new_balance = user_tokens - price
            await conn.execute(
                "UPDATE users SET tokens_remaining = $1 WHERE id = $2",
                new_balance, user_id
            )
            
            # Record transaction
            await conn.execute(
                """
                INSERT INTO token_transactions 
                (user_id, amount, transaction_type, description, balance_after)
                VALUES ($1, $2, 'marketplace', $3, $4)
                """,
                user_id, -price, f"Purchased template: {template.get('name', 'Unknown')}", new_balance
            )
        
        # Add to library
        await conn.execute(
            """
            INSERT INTO user_library (user_id, template_id, item_type, tokens_spent)
            VALUES ($1, $2, 'template', $3)
            """,
            user_id, template_id, price
        )
    
    # Increment downloads in CouchDB
    couch.increment_template_downloads(template_id)
    
    return {
        "success": True,
        "message": "Template added to library",
        "tokens_spent": price
    }


@router.get("/templates/{template_id}/export")
async def export_template(request: Request, template_id: str):
    """Export a template as JSON (only if exportable/free)"""
    user = await get_current_user_from_request(request)
    user_id = str(user["id"])
    
    couch = get_couch()
    template = couch.get_template_by_id(template_id)
    
    # Check defaults
    if not template:
        for t in DEFAULT_TEMPLATES:
            if t["_id"] == template_id:
                template = t.copy()
                break
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Check if exportable
    if not template.get("is_exportable", True) and template.get("price", 0) > 0:
        # Check if user owns it
        if db_pool:
            async with db_pool.acquire() as conn:
                owned = await conn.fetchrow(
                    "SELECT id FROM user_library WHERE user_id = $1 AND template_id = $2",
                    int(user_id), template_id
                )
                if not owned and template.get("creator_id") != user_id:
                    raise HTTPException(status_code=403, detail="This template cannot be exported. Purchase it first.")
    
    # Return exportable format (Event Template compatible)
    export_data = {
        "id": template.get("_id"),
        "name": template.get("name"),
        "description": template.get("description"),
        "images": template.get("backgrounds", []),
        "elementImages": template.get("element_images", []),
        "prompt": template.get("prompt", ""),
        "active": True,
        "pipelineConfig": template.get("pipeline_config", {}),
    }
    
    # Include business config if it's a business template
    if template.get("template_type") == "business" and template.get("business_config"):
        export_data = template.get("business_config")
        export_data["id"] = template.get("_id")
    
    return export_data


@router.post("/templates/{template_id}/use")
async def record_template_use(request: Request, template_id: str):
    """Record template usage"""
    user = await get_current_user_from_request(request)
    user_id = int(user["id"])
    
    if db_pool:
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE user_library 
                SET times_used = times_used + 1, last_used_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND template_id = $2
                """,
                user_id, template_id
            )
    
    return {"success": True}


# ===== LoRA Models (placeholder for future) =====

@router.get("/lora-models")
async def get_lora_models():
    """Get available LoRA models (placeholder)"""
    return [
        {
            "id": "lora_portrait_pro",
            "name": "Portrait Enhancer Pro",
            "description": "Professional portrait enhancement",
            "preview_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400",
            "price": 29.99,
            "category": "Portrait",
            "creator": "Pro Models Inc",
            "downloads": 450,
            "rating": 4.9,
            "is_owned": False
        },
        {
            "id": "lora_anime_style",
            "name": "Anime Style Master",
            "description": "Transform photos into anime style",
            "preview_url": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400",
            "price": 24.99,
            "category": "Artistic",
            "creator": "Anime AI Studio",
            "downloads": 820,
            "rating": 4.8,
            "is_owned": False
        }
    ]
