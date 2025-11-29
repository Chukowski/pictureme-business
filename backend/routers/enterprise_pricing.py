"""
Enterprise Pricing Management API
Handles custom pricing for enterprise/business users
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import date
import json

# Import dependencies from main
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

router = APIRouter(prefix="/api/admin/enterprise", tags=["Enterprise Pricing"])


# ============================================================================
# MODELS
# ============================================================================

class CustomPricingCreate(BaseModel):
    user_id: int
    ai_model_id: str  # Renamed to avoid Pydantic conflict
    ai_model_type: str  # 'image', 'video', 'face-swap'
    token_cost: int
    price_per_token: Optional[float] = None
    notes: Optional[str] = None
    
    class Config:
        protected_namespaces = ()


class CustomPricingUpdate(BaseModel):
    token_cost: Optional[int] = None
    price_per_token: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class CustomPackageCreate(BaseModel):
    user_id: int
    name: str
    description: Optional[str] = None
    tokens: int
    price_usd: float


class EnterpriseSettingsUpdate(BaseModel):
    uses_custom_pricing: Optional[bool] = None
    default_price_per_token: Optional[float] = None
    billing_cycle: Optional[str] = None
    credit_limit: Optional[int] = None
    contract_start_date: Optional[str] = None
    contract_end_date: Optional[str] = None
    contract_notes: Optional[str] = None
    billing_email: Optional[str] = None
    billing_contact_name: Optional[str] = None


class BulkPricingCreate(BaseModel):
    user_id: int
    pricing: List[CustomPricingCreate]


class ModelInfo(BaseModel):
    ai_model_id: str
    ai_model_type: str
    default_cost: int
    description: str
    
    class Config:
        protected_namespaces = ()


# ============================================================================
# ENDPOINTS - MODEL COSTS (Default)
# ============================================================================

@router.get("/models")
async def get_all_models(db_pool=Depends(lambda: None)):
    """Get all available AI models with their default costs"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT 
                model_name as model_id,
                cost_per_generation as default_cost,
                description,
                CASE 
                    WHEN model_name LIKE '%video%' OR model_name IN ('kling-pro', 'wan-v2', 'google-video', 'veo-3.1') THEN 'video'
                    ELSE 'image'
                END as model_type
            FROM ai_generation_costs
            WHERE is_active = TRUE
            ORDER BY model_type, model_name
        """)
        
        return [dict(row) for row in rows]


@router.put("/models/{model_id}/cost")
async def update_default_model_cost(model_id: str, cost: int, description: str = None):
    """Update default cost for a model (affects all users without custom pricing)"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        query = """
            UPDATE ai_generation_costs 
            SET cost_per_generation = $1
        """
        params = [cost, model_id]
        
        if description:
            query += ", description = $3"
            params.append(description)
        
        query += " WHERE model_name = $2 RETURNING *"
        
        row = await conn.fetchrow(query, *params)
        
        if not row:
            raise HTTPException(status_code=404, detail="Model not found")
        
        return {"success": True, "model": dict(row)}


# ============================================================================
# ENDPOINTS - CUSTOM USER PRICING
# ============================================================================

@router.get("/users/{user_id}/pricing")
async def get_user_pricing(user_id: int):
    """Get all pricing for a specific user (custom + defaults)"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        # Get user info
        user = await conn.fetchrow(
            "SELECT id, email, username, name, role FROM users WHERE id = $1",
            user_id
        )
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get all models with custom pricing if exists
        rows = await conn.fetch("""
            SELECT 
                agc.model_name as model_id,
                CASE 
                    WHEN agc.model_name LIKE '%video%' OR agc.model_name IN ('kling-pro', 'wan-v2', 'google-video', 'veo-3.1') THEN 'video'
                    ELSE 'image'
                END as model_type,
                agc.cost_per_generation as default_cost,
                agc.description,
                cup.id as custom_pricing_id,
                cup.token_cost as custom_cost,
                cup.price_per_token,
                cup.notes,
                cup.is_active as custom_is_active,
                COALESCE(cup.token_cost, agc.cost_per_generation) as effective_cost,
                (cup.id IS NOT NULL) as has_custom_pricing
            FROM ai_generation_costs agc
            LEFT JOIN custom_user_pricing cup 
                ON agc.model_name = cup.model_id 
                AND cup.user_id = $1 
            WHERE agc.is_active = TRUE
            ORDER BY 
                CASE 
                    WHEN agc.model_name LIKE '%video%' OR agc.model_name IN ('kling-pro', 'wan-v2', 'google-video', 'veo-3.1') THEN 1
                    ELSE 0
                END,
                agc.model_name
        """, user_id)
        
        # Get enterprise settings
        settings = await conn.fetchrow(
            "SELECT * FROM enterprise_user_settings WHERE user_id = $1",
            user_id
        )
        
        return {
            "user": dict(user),
            "pricing": [dict(row) for row in rows],
            "settings": dict(settings) if settings else None
        }


@router.post("/users/{user_id}/pricing")
async def create_custom_pricing(user_id: int, pricing: CustomPricingCreate, admin_id: int = None):
    """Create custom pricing for a user/model combination"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        # Verify user exists
        user = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        try:
            row = await conn.fetchrow("""
                INSERT INTO custom_user_pricing 
                    (user_id, model_id, model_type, token_cost, price_per_token, notes, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (user_id, model_id) 
                DO UPDATE SET 
                    token_cost = EXCLUDED.token_cost,
                    price_per_token = EXCLUDED.price_per_token,
                    notes = EXCLUDED.notes,
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            """, user_id, pricing.ai_model_id, pricing.ai_model_type, 
                pricing.token_cost, pricing.price_per_token, pricing.notes, admin_id)
            
            return {"success": True, "pricing": dict(row)}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))


@router.put("/users/{user_id}/pricing/{model_id}")
async def update_custom_pricing(user_id: int, model_id: str, update: CustomPricingUpdate):
    """Update custom pricing for a user/model"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        # Build dynamic update
        updates = []
        params = []
        param_idx = 1
        
        if update.token_cost is not None:
            updates.append(f"token_cost = ${param_idx}")
            params.append(update.token_cost)
            param_idx += 1
        
        if update.price_per_token is not None:
            updates.append(f"price_per_token = ${param_idx}")
            params.append(update.price_per_token)
            param_idx += 1
        
        if update.notes is not None:
            updates.append(f"notes = ${param_idx}")
            params.append(update.notes)
            param_idx += 1
        
        if update.is_active is not None:
            updates.append(f"is_active = ${param_idx}")
            params.append(update.is_active)
            param_idx += 1
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        params.extend([user_id, model_id])
        
        query = f"""
            UPDATE custom_user_pricing 
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ${param_idx} AND model_id = ${param_idx + 1}
            RETURNING *
        """
        
        row = await conn.fetchrow(query, *params)
        
        if not row:
            raise HTTPException(status_code=404, detail="Custom pricing not found")
        
        return {"success": True, "pricing": dict(row)}


@router.delete("/users/{user_id}/pricing/{model_id}")
async def delete_custom_pricing(user_id: int, model_id: str):
    """Delete (deactivate) custom pricing for a user/model"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE custom_user_pricing 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND model_id = $2
            RETURNING *
        """, user_id, model_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Custom pricing not found")
        
        return {"success": True, "message": "Custom pricing deactivated"}


@router.post("/users/{user_id}/pricing/bulk")
async def create_bulk_pricing(user_id: int, pricing_list: List[CustomPricingCreate], admin_id: int = None):
    """Create/update multiple custom pricing entries at once"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        # Verify user exists
        user = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        results = []
        async with conn.transaction():
            for pricing in pricing_list:
                row = await conn.fetchrow("""
                    INSERT INTO custom_user_pricing 
                        (user_id, model_id, model_type, token_cost, price_per_token, notes, created_by)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (user_id, model_id) 
                    DO UPDATE SET 
                        token_cost = EXCLUDED.token_cost,
                        price_per_token = EXCLUDED.price_per_token,
                        notes = EXCLUDED.notes,
                        is_active = TRUE,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                """, user_id, pricing.ai_model_id, pricing.ai_model_type,
                    pricing.token_cost, pricing.price_per_token, pricing.notes, admin_id)
                results.append(dict(row))
        
        return {"success": True, "count": len(results), "pricing": results}


# ============================================================================
# ENDPOINTS - ENTERPRISE SETTINGS
# ============================================================================

@router.get("/users/{user_id}/settings")
async def get_enterprise_settings(user_id: int):
    """Get enterprise settings for a user"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM enterprise_user_settings WHERE user_id = $1",
            user_id
        )
        
        if not row:
            # Return default settings if none exist
            return {
                "user_id": user_id,
                "uses_custom_pricing": False,
                "default_price_per_token": 0.10,
                "billing_cycle": "monthly",
                "credit_limit": 0,
                "current_credit_used": 0
            }
        
        return dict(row)


@router.put("/users/{user_id}/settings")
async def update_enterprise_settings(user_id: int, settings: EnterpriseSettingsUpdate, admin_id: int = None):
    """Update enterprise settings for a user"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        # Check if settings exist
        existing = await conn.fetchrow(
            "SELECT id FROM enterprise_user_settings WHERE user_id = $1",
            user_id
        )
        
        if existing:
            # Build dynamic update
            updates = []
            params = []
            param_idx = 1
            
            fields = [
                ('uses_custom_pricing', settings.uses_custom_pricing),
                ('default_price_per_token', settings.default_price_per_token),
                ('billing_cycle', settings.billing_cycle),
                ('credit_limit', settings.credit_limit),
                ('contract_notes', settings.contract_notes),
                ('billing_email', settings.billing_email),
                ('billing_contact_name', settings.billing_contact_name),
            ]
            
            for field_name, field_value in fields:
                if field_value is not None:
                    updates.append(f"{field_name} = ${param_idx}")
                    params.append(field_value)
                    param_idx += 1
            
            # Handle date fields
            if settings.contract_start_date:
                updates.append(f"contract_start_date = ${param_idx}")
                params.append(date.fromisoformat(settings.contract_start_date))
                param_idx += 1
            
            if settings.contract_end_date:
                updates.append(f"contract_end_date = ${param_idx}")
                params.append(date.fromisoformat(settings.contract_end_date))
                param_idx += 1
            
            if not updates:
                return {"success": True, "message": "No fields to update"}
            
            params.append(user_id)
            
            query = f"""
                UPDATE enterprise_user_settings 
                SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ${param_idx}
                RETURNING *
            """
            
            row = await conn.fetchrow(query, *params)
        else:
            # Create new settings
            row = await conn.fetchrow("""
                INSERT INTO enterprise_user_settings (
                    user_id, uses_custom_pricing, default_price_per_token,
                    billing_cycle, credit_limit, contract_start_date, contract_end_date,
                    contract_notes, billing_email, billing_contact_name, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            """, 
                user_id,
                settings.uses_custom_pricing or False,
                settings.default_price_per_token or 0.10,
                settings.billing_cycle or 'monthly',
                settings.credit_limit or 0,
                date.fromisoformat(settings.contract_start_date) if settings.contract_start_date else None,
                date.fromisoformat(settings.contract_end_date) if settings.contract_end_date else None,
                settings.contract_notes,
                settings.billing_email,
                settings.billing_contact_name,
                admin_id
            )
        
        return {"success": True, "settings": dict(row)}


# ============================================================================
# ENDPOINTS - CUSTOM PACKAGES
# ============================================================================

@router.get("/users/{user_id}/packages")
async def get_user_packages(user_id: int):
    """Get custom token packages for a user"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT * FROM custom_user_packages 
            WHERE user_id = $1 AND is_active = TRUE
            ORDER BY tokens ASC
        """, user_id)
        
        return [dict(row) for row in rows]


@router.post("/users/{user_id}/packages")
async def create_user_package(user_id: int, package: CustomPackageCreate, admin_id: int = None):
    """Create a custom token package for a user"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow("""
                INSERT INTO custom_user_packages 
                    (user_id, name, description, tokens, price_usd, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            """, user_id, package.name, package.description, 
                package.tokens, package.price_usd, admin_id)
            
            return {"success": True, "package": dict(row)}
        except Exception as e:
            if "unique constraint" in str(e).lower():
                raise HTTPException(status_code=400, detail="Package with this name already exists for user")
            raise HTTPException(status_code=400, detail=str(e))


@router.delete("/users/{user_id}/packages/{package_id}")
async def delete_user_package(user_id: int, package_id: int):
    """Delete (deactivate) a custom package"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow("""
            UPDATE custom_user_packages 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND user_id = $2
            RETURNING *
        """, package_id, user_id)
        
        if not row:
            raise HTTPException(status_code=404, detail="Package not found")
        
        return {"success": True, "message": "Package deactivated"}


# ============================================================================
# ENDPOINTS - ENTERPRISE USERS LIST
# ============================================================================

@router.get("/users")
async def get_enterprise_users():
    """Get all enterprise/business users with their pricing summary"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT 
                u.id as user_id,
                u.email,
                u.username,
                u.name,
                u.role,
                u.tokens_remaining,
                u.subscription_tier,
                u.is_active,
                u.created_at,
                eus.uses_custom_pricing,
                eus.default_price_per_token,
                eus.credit_limit,
                eus.current_credit_used,
                eus.billing_cycle,
                eus.contract_start_date,
                eus.contract_end_date,
                COUNT(DISTINCT cup.id) FILTER (WHERE cup.is_active = TRUE) as custom_pricing_count,
                COUNT(DISTINCT cupack.id) FILTER (WHERE cupack.is_active = TRUE) as custom_packages_count
            FROM users u
            LEFT JOIN enterprise_user_settings eus ON u.id = eus.user_id
            LEFT JOIN custom_user_pricing cup ON u.id = cup.user_id
            LEFT JOIN custom_user_packages cupack ON u.id = cupack.user_id
            WHERE u.role IN ('business', 'business_masters', 'enterprise', 'admin')
            GROUP BY u.id, u.email, u.username, u.name, u.role, u.tokens_remaining, 
                     u.subscription_tier, u.is_active, u.created_at,
                     eus.uses_custom_pricing, eus.default_price_per_token, eus.credit_limit, 
                     eus.current_credit_used, eus.billing_cycle, 
                     eus.contract_start_date, eus.contract_end_date
            ORDER BY u.created_at DESC
        """)
        
        return [dict(row) for row in rows]


# ============================================================================
# ENDPOINTS - ADD TOKENS TO USER
# ============================================================================

@router.post("/users/{user_id}/tokens")
async def add_tokens_to_user(user_id: int, tokens: int, reason: str = "Admin adjustment", admin_id: int = None):
    """Add tokens to a user's balance"""
    from main import db_pool as pool
    
    async with pool.acquire() as conn:
        async with conn.transaction():
            # Get current balance
            user = await conn.fetchrow(
                "SELECT tokens_remaining FROM users WHERE id = $1 FOR UPDATE",
                user_id
            )
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            new_balance = user['tokens_remaining'] + tokens
            
            # Update balance
            await conn.execute(
                "UPDATE users SET tokens_remaining = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                new_balance, user_id
            )
            
            # Record transaction
            await conn.execute("""
                INSERT INTO token_transactions 
                    (user_id, amount, transaction_type, description, balance_after, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, user_id, tokens, 'bonus' if tokens > 0 else 'adjustment',
                reason, new_balance, json.dumps({"admin_id": admin_id}))
            
            return {
                "success": True,
                "user_id": user_id,
                "tokens_added": tokens,
                "new_balance": new_balance,
                "reason": reason
            }

