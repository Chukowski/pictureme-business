"""
Tokens API Router

Endpoints for token management, statistics, and transactions.
Uses real database queries.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import os
import json

router = APIRouter(
    prefix="/api/tokens",
    tags=["Tokens"],
)

# Database pool will be set by main.py
db_pool = None

def set_db_pool(pool):
    global db_pool
    db_pool = pool


class TokenStats(BaseModel):
    current_tokens: int
    tokens_used_month: int
    avg_daily_usage: float
    forecast_days: int
    tokens_total: int


class TokenTransaction(BaseModel):
    id: int
    date: str
    description: str
    event_name: Optional[str] = None
    amount: int
    type: str
    balance_after: int


class TokenPackage(BaseModel):
    id: int
    name: str
    tokens: int
    price_usd: float
    popular: bool = False
    stripe_price_id: Optional[str] = None


class TokenUsageByEvent(BaseModel):
    event_id: str
    event_name: str
    tokens_used: int
    last_used: str


class TokenChargeRequest(BaseModel):
    model_id: Optional[str] = None
    tokens: Optional[int] = None
    event_id: Optional[int] = None
    event_slug: Optional[str] = None
    user_slug: Optional[str] = None
    context: Optional[str] = None
    description: Optional[str] = None


async def get_current_user_from_request(request: Request) -> dict:
    """Extract user from request - imports get_current_user from main"""
    from main import get_current_user, security
    from fastapi.security import HTTPAuthorizationCredentials
    
    # Get credentials from header
    auth_header = request.headers.get("Authorization")
    credentials = None
    if auth_header and auth_header.startswith("Bearer "):
        credentials = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials=auth_header.replace("Bearer ", "")
        )
    
    return await get_current_user(request, credentials)


async def get_user_id_for_queries(conn, user: dict) -> tuple:
    """
    Get user IDs for database queries.
    Returns (legacy_user_id, uuid_user_id) where legacy is integer and uuid is string.
    Some tables use integer IDs (legacy), some use UUID strings (Better Auth).
    """
    user_id = user["id"]
    email = user.get("email")
    
    # Try to find legacy integer ID
    legacy_id = None
    if email:
        legacy_user = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1",
            email
        )
        if legacy_user:
            legacy_id = legacy_user["id"]
    
    # If user_id looks like an integer, use it directly
    try:
        legacy_id = legacy_id or int(user_id)
    except (ValueError, TypeError):
        pass
    
    return legacy_id, str(user_id)


@router.get("/stats", response_model=TokenStats)
async def get_token_stats(request: Request):
    """Get token statistics for the current user"""
    import logging
    logger = logging.getLogger(__name__)
    
    user = await get_current_user_from_request(request)
    logger.info(f"🪙 /stats called for user: {user.get('email')}")
    
    async with db_pool.acquire() as conn:
        legacy_id, uuid_id = await get_user_id_for_queries(conn, user)
        logger.info(f"🪙 /stats legacy_id={legacy_id}, uuid_id={uuid_id}")
        
        # Get current tokens and plan info - try legacy users table first
        user_data = None
        if legacy_id:
            user_data = await conn.fetchrow(
                """
                SELECT 
                    u.tokens_remaining,
                    COALESCE(bp.included_tokens, 1000) as tokens_total
                FROM users u
                LEFT JOIN business_plans bp ON u.plan_id = bp.slug
                WHERE u.id = $1
                """,
                legacy_id
            )
            logger.info(f"🪙 /stats legacy user_data: {dict(user_data) if user_data else 'Not found'}")
        
        # If not found in legacy users, try to find/create by email
        if not user_data and user.get("email"):
            # First try to find existing legacy user by email
            legacy_user = await conn.fetchrow(
                """
                SELECT 
                    u.id,
                    u.tokens_remaining,
                    COALESCE(bp.included_tokens, 1000) as tokens_total
                FROM users u
                LEFT JOIN business_plans bp ON u.plan_id = bp.slug
                WHERE u.email = $1
                """,
                user.get("email")
            )
            if legacy_user:
                legacy_id = legacy_user["id"]
                user_data = legacy_user
                logger.info(f"🪙 /stats found legacy user by email: {dict(user_data)}")
            else:
                # Create legacy user for Better Auth user
                ba_user = {
                    "id": uuid_id,
                    "email": user.get("email"),
                    "name": user.get("full_name") or user.get("name"),
                    "slug": user.get("slug")
                }
                new_id = await _ensure_legacy_user(conn, ba_user, logger)
                if new_id:
                    legacy_id = new_id
                    user_data = await conn.fetchrow(
                        """
                        SELECT 
                            u.tokens_remaining,
                            COALESCE(bp.included_tokens, 1000) as tokens_total
                        FROM users u
                        LEFT JOIN business_plans bp ON u.plan_id = bp.slug
                        WHERE u.id = $1
                        """,
                        new_id
                    )
                    logger.info(f"🪙 /stats created legacy user: id={new_id}, data={dict(user_data) if user_data else 'None'}")
        
        current_tokens = user_data["tokens_remaining"] if user_data else 0
        tokens_total = user_data["tokens_total"] if user_data else 1000
        
        # Get tokens used this month - use legacy_id if available
        first_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        tokens_used_month = 0
        
        if legacy_id:
            usage_result = await conn.fetchrow(
                """
                SELECT COALESCE(SUM(ABS(amount)), 0) as tokens_used
                FROM token_transactions
                WHERE user_id = $1 
                  AND amount < 0 
                  AND created_at >= $2
                """,
                legacy_id, first_of_month
            )
            tokens_used_month = int(usage_result["tokens_used"]) if usage_result else 0
        
        # Calculate average daily usage (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        avg_daily_usage = 0.0
        
        if legacy_id:
            daily_usage = await conn.fetchrow(
                """
                SELECT COALESCE(SUM(ABS(amount)), 0) / 30.0 as avg_daily
                FROM token_transactions
                WHERE user_id = $1 
                  AND amount < 0 
                  AND created_at >= $2
                """,
                legacy_id, thirty_days_ago
            )
            avg_daily_usage = float(daily_usage["avg_daily"]) if daily_usage else 0
        
        # Forecast days remaining
        forecast_days = int(current_tokens / avg_daily_usage) if avg_daily_usage > 0 else 999
        
        return TokenStats(
            current_tokens=current_tokens,
            tokens_used_month=tokens_used_month,
            avg_daily_usage=round(avg_daily_usage, 1),
            forecast_days=min(forecast_days, 999),
            tokens_total=tokens_total
        )


@router.get("/transactions", response_model=List[TokenTransaction])
async def get_token_transactions(request: Request, limit: int = 20):
    """Get recent token transactions"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        legacy_id, uuid_id = await get_user_id_for_queries(conn, user)
        
        if not legacy_id:
            # No legacy user, return empty list
            return []
        
        transactions = await conn.fetch(
            """
            SELECT 
                tt.id,
                tt.created_at as date,
                tt.description,
                e.title as event_name,
                tt.amount,
                tt.transaction_type as type,
                tt.balance_after
            FROM token_transactions tt
            LEFT JOIN events e ON tt.event_id = e.id
            WHERE tt.user_id = $1
            ORDER BY tt.created_at DESC
            LIMIT $2
            """,
            legacy_id, limit
        )
        
        return [
            TokenTransaction(
                id=t["id"],
                date=t["date"].isoformat() if t["date"] else "",
                description=t["description"] or "",
                event_name=t["event_name"],
                amount=t["amount"],
                type=t["type"],
                balance_after=t["balance_after"]
            )
            for t in transactions
        ]


@router.get("/packages", response_model=List[TokenPackage])
async def get_token_packages():
    """Get available token packages for purchase"""
    async with db_pool.acquire() as conn:
        packages = await conn.fetch(
            """
            SELECT id, name, tokens, price_usd, stripe_price_id
            FROM token_packages
            WHERE is_active = TRUE
            ORDER BY tokens ASC
            """
        )
        
        if not packages:
            # Return default packages if none in DB
            return [
                TokenPackage(id=1, name="Starter Pack", tokens=100, price_usd=10.0, popular=False),
                TokenPackage(id=2, name="Basic Pack", tokens=500, price_usd=40.0, popular=False),
                TokenPackage(id=3, name="Pro Pack", tokens=1000, price_usd=70.0, popular=True),
                TokenPackage(id=4, name="Enterprise Pack", tokens=5000, price_usd=300.0, popular=False),
            ]
        
        return [
            TokenPackage(
                id=p["id"],
                name=p["name"],
                tokens=p["tokens"],
                price_usd=float(p["price_usd"]),
                popular=(p["tokens"] == 1000),  # Mark 1000 token pack as popular
                stripe_price_id=p["stripe_price_id"]
            )
            for p in packages
        ]


@router.get("/usage-by-event", response_model=List[TokenUsageByEvent])
async def get_token_usage_by_event(request: Request):
    """Get token usage breakdown by event"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        legacy_id, uuid_id = await get_user_id_for_queries(conn, user)
        legacy_id_str = str(legacy_id) if legacy_id else ''
        
        # events.user_id can be either integer or UUID string, compare as text
        usage = await conn.fetch(
            """
            SELECT 
                e.id::text as event_id,
                e.title as event_name,
                COALESCE(SUM(ABS(tt.amount)), 0) as tokens_used,
                MAX(tt.created_at) as last_used
            FROM events e
            LEFT JOIN token_transactions tt ON e.id = tt.event_id AND tt.amount < 0
            WHERE e.user_id::text = $1 OR e.user_id::text = $2
            GROUP BY e.id, e.title
            HAVING COALESCE(SUM(ABS(tt.amount)), 0) > 0
            ORDER BY tokens_used DESC
            LIMIT 10
            """,
            uuid_id, legacy_id_str
        )
        
        return [
            TokenUsageByEvent(
                event_id=u["event_id"],
                event_name=u["event_name"],
                tokens_used=int(u["tokens_used"]),
                last_used=u["last_used"].isoformat() if u["last_used"] else datetime.now().isoformat()
            )
            for u in usage
        ]


async def _resolve_legacy_user_id(
    conn,
    legacy_id: Optional[int],
    event_id: Optional[int],
    user_slug: Optional[str],
    event_slug: Optional[str],
) -> Optional[int]:
    """
    Resolve which legacy user should be charged.
    Priority order:
      1. Event owner (using event_id or slug context)
      2. Authenticated user (legacy_id)
      3. user_slug as legacy username/slug fallback
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"🪙 _resolve_legacy_user_id: legacy_id={legacy_id}, event_id={event_id}, user_slug={user_slug}, event_slug={event_slug}")
    
    event_row = None
    if event_id:
        event_row = await conn.fetchrow(
            "SELECT id, user_id FROM events WHERE id::text = $1",
            str(event_id)
        )
        logger.info(f"🪙 Event lookup by id={event_id}: {dict(event_row) if event_row else 'Not found'}")
    elif user_slug and event_slug:
        # Look up event by joining with users table to match user_slug
        event_row = await conn.fetchrow(
            """SELECT e.id, e.user_id FROM events e 
               JOIN users u ON e.user_id = u.id 
               WHERE u.slug = $1 AND e.slug = $2""",
            user_slug,
            event_slug
        )
        logger.info(f"🪙 Event lookup by user_slug={user_slug}, event_slug={event_slug}: {dict(event_row) if event_row else 'Not found'}")
    
    if event_row:
        raw_user_id = event_row["user_id"]
        logger.info(f"🪙 Found event with user_id={raw_user_id}")
        if raw_user_id is not None:
            try:
                result = int(raw_user_id)
                logger.info(f"🪙 user_id is integer: {result}")
                return result
            except (ValueError, TypeError):
                pass
            
            # user_id is UUID, look up email in Better Auth user table
            ba_user = await conn.fetchrow(
                'SELECT id, email, name, slug FROM "user" WHERE id::text = $1',
                str(raw_user_id)
            )
            logger.info(f"🪙 Better Auth user lookup: {dict(ba_user) if ba_user else 'Not found'}")
            if ba_user and ba_user.get("email"):
                legacy_user = await conn.fetchrow(
                    "SELECT id FROM users WHERE email = $1",
                    ba_user["email"]
                )
                logger.info(f"🪙 Legacy user by email: {dict(legacy_user) if legacy_user else 'Not found'}")
                if legacy_user:
                    return legacy_user["id"]
                
                # Create legacy user if not exists
                legacy_user = await _ensure_legacy_user(conn, ba_user, logger)
                if legacy_user:
                    return legacy_user
    
    if legacy_id:
        logger.info(f"🪙 Using provided legacy_id: {legacy_id}")
        return legacy_id
    
    # Try to find user by slug (username or slug field)
    if user_slug:
        legacy_user = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1 OR slug = $1",
            user_slug
        )
        logger.info(f"🪙 Legacy user by slug/username={user_slug}: {dict(legacy_user) if legacy_user else 'Not found'}")
        if legacy_user:
            return legacy_user["id"]
        
        # Try to find Better Auth user by slug and then get legacy user by email
        # user_slug might be formatted like "christian-berenger"
        ba_user = await conn.fetchrow(
            'SELECT id, email, name, slug FROM "user" WHERE slug = $1 OR name ILIKE $2',
            user_slug,
            user_slug.replace('-', ' ')
        )
        logger.info(f"🪙 Better Auth user by slug={user_slug}: {dict(ba_user) if ba_user else 'Not found'}")
        if ba_user and ba_user.get("email"):
            legacy_user = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1",
                ba_user["email"]
            )
            logger.info(f"🪙 Legacy user by BA email: {dict(legacy_user) if legacy_user else 'Not found'}")
            if legacy_user:
                return legacy_user["id"]
            
            # Create legacy user if not exists
            legacy_user = await _ensure_legacy_user(conn, ba_user, logger)
            if legacy_user:
                return legacy_user
    
    logger.warning(f"🪙 Could not resolve legacy user id")
    return None


async def _ensure_legacy_user(conn, ba_user: dict, logger) -> Optional[int]:
    """
    Ensure a legacy user exists for a Better Auth user.
    Creates one if it doesn't exist, copying relevant data.
    """
    email = ba_user.get("email")
    if not email:
        return None
    
    # Check if legacy user already exists
    existing = await conn.fetchrow(
        "SELECT id FROM users WHERE email = $1",
        email
    )
    if existing:
        return existing["id"]
    
    # Create legacy user
    name = ba_user.get("name") or email.split("@")[0]
    slug = ba_user.get("slug") or name.lower().replace(" ", "-")
    username = slug.replace("-", "_")
    
    try:
        new_user = await conn.fetchrow(
            """
            INSERT INTO users (username, email, full_name, slug, role, tokens_remaining, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'business_masters', 7000, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (email) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING id
            """,
            username,
            email,
            name,
            slug
        )
        if new_user:
            logger.info(f"🪙 Created legacy user for {email}: id={new_user['id']}")
            return new_user["id"]
    except Exception as e:
        logger.error(f"🪙 Failed to create legacy user for {email}: {e}")
    
    return None


async def _get_token_cost_for_model(conn, legacy_user_id: int, model_id: Optional[str]) -> int:
    """Determine how many tokens to charge for a given model/user combination"""
    import logging
    logger = logging.getLogger(__name__)
    
    if not model_id:
        logger.info("🪙 No model_id provided, using default cost: 10")
        return 10
    
    # 1. First check for custom user pricing (enterprise/custom pricing)
    try:
        custom_row = await conn.fetchrow("""
            SELECT token_cost FROM custom_user_pricing 
            WHERE user_id = $1 AND model_id = $2 AND is_active = TRUE
        """, legacy_user_id, model_id)
        
        if custom_row and custom_row.get("token_cost"):
            cost = int(custom_row["token_cost"])
            logger.info(f"🪙 Using CUSTOM user pricing for model {model_id}: {cost} tokens (user_id={legacy_user_id})")
            return cost
    except Exception as e:
        logger.warning(f"🪙 custom_user_pricing lookup failed: {e}")
    
    # 2. Check default pricing from ai_generation_costs table
    try:
        default_row = await conn.fetchrow(
            "SELECT cost_per_generation FROM ai_generation_costs WHERE model_name = $1 AND is_active = TRUE",
            model_id
        )
        if default_row and default_row.get("cost_per_generation"):
            cost = int(default_row["cost_per_generation"])
            logger.info(f"🪙 Using DEFAULT pricing for model {model_id}: {cost} tokens")
            return cost
    except Exception as e:
        logger.warning(f"🪙 ai_generation_costs lookup failed: {e}")
    
    # 3. Fallback hardcoded costs (in case tables don't exist or no data)
    model_costs = {
        "fal-ai/nano-banana/edit": 10,
        "fal-ai/bytedance/seedream/v4/edit": 15,
        "fal-ai/flux-2-pro/edit": 20,
        "fal-ai/flux/dev": 15,
    }
    
    cost = model_costs.get(model_id, 10)
    logger.info(f"🪙 Using FALLBACK cost for model {model_id}: {cost} tokens")
    return cost


@router.post("/charge")
async def charge_tokens(request: Request, payload: TokenChargeRequest):
    """
    Charge tokens for an AI operation. Works for both authenticated (dashboard)
    and public stations (registration/booth) using event context.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"🪙 Token charge request: model={payload.model_id}, event_id={payload.event_id}, event_slug={payload.event_slug}, user_slug={payload.user_slug}")
    
    user = None
    try:
        user = await get_current_user_from_request(request)
        logger.info(f"🪙 Authenticated user: {user.get('email') if user else 'None'}")
    except Exception as e:
        # Anonymous usage (e.g., public booth)
        logger.info(f"🪙 Anonymous request (no auth): {e}")
        user = None
    
    async with db_pool.acquire() as conn:
        legacy_id = None
        uuid_id = None
        if user:
            legacy_id, uuid_id = await get_user_id_for_queries(conn, user)
            logger.info(f"🪙 User IDs resolved: legacy={legacy_id}, uuid={uuid_id}")
        
        legacy_id = await _resolve_legacy_user_id(
            conn,
            legacy_id,
            payload.event_id,
            payload.user_slug,
            payload.event_slug
        )
        
        logger.info(f"🪙 Final legacy_id for charge: {legacy_id}")
        
        if not legacy_id:
            logger.error("🪙 Unable to resolve user for token charge")
            raise HTTPException(status_code=400, detail="Unable to resolve user for token charge")
        
        tokens_to_charge = payload.tokens
        if tokens_to_charge is None:
            tokens_to_charge = await _get_token_cost_for_model(conn, legacy_id, payload.model_id)
        
        if tokens_to_charge <= 0:
            raise HTTPException(status_code=400, detail="Invalid token amount")
        
        async with conn.transaction():
            user_row = await conn.fetchrow(
                "SELECT tokens_remaining FROM users WHERE id = $1 FOR UPDATE",
                legacy_id
            )
            if not user_row:
                raise HTTPException(status_code=404, detail="User not found for token charge")
            
            current_tokens = user_row["tokens_remaining"] or 0
            new_balance = current_tokens - tokens_to_charge
            
            await conn.execute(
                "UPDATE users SET tokens_remaining = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
                new_balance,
                legacy_id
            )
            
            metadata = {
                "model_id": payload.model_id,
                "context": payload.context,
                "description": payload.description,
            }
            
            await conn.execute(
                """
                INSERT INTO token_transactions 
                    (user_id, amount, transaction_type, description, event_id, balance_after, metadata)
                VALUES ($1, $2, 'usage', $3, $4, $5, $6)
                """,
                legacy_id,
                -tokens_to_charge,
                payload.description or payload.context or f"AI usage ({payload.model_id or 'model'})",
                payload.event_id,
                new_balance,
                json.dumps(metadata)
            )
        
        logger.info(f"🪙 ✅ Token charge complete: user={legacy_id}, charged={tokens_to_charge}, new_balance={new_balance}")
        
        return {
            "success": True,
            "tokens_charged": tokens_to_charge,
            "new_balance": new_balance
        }


@router.post("/purchase")
async def purchase_tokens(request: Request, package_id: int):
    """Create Stripe checkout session for token purchase"""
    import stripe
    
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    user = await get_current_user_from_request(request)
    user_id = user["id"]
    
    async with db_pool.acquire() as conn:
        # Get package
        package = await conn.fetchrow(
            "SELECT * FROM token_packages WHERE id = $1 AND is_active = TRUE",
            package_id
        )
        
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Get or create Stripe customer
        customer = await conn.fetchrow(
            "SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1",
            user_id
        )
        
        if not customer:
            # Create Stripe customer
            stripe_customer = stripe.Customer.create(
                email=user["email"],
                metadata={"user_id": str(user_id)}
            )
            await conn.execute(
                """
                INSERT INTO stripe_customers (user_id, stripe_customer_id, email)
                VALUES ($1, $2, $3)
                """,
                user_id, stripe_customer.id, user["email"]
            )
            customer_id = stripe_customer.id
        else:
            customer_id = customer["stripe_customer_id"]
        
        # Create checkout session
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8080")
        
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": package["name"],
                        "description": f"{package['tokens']} tokens for AI Photo Booth",
                    },
                    "unit_amount": int(float(package["price_usd"]) * 100),
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{frontend_url}/admin/tokens?success=true&session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/admin/tokens?canceled=true",
            metadata={
                "user_id": str(user_id),
                "package_id": str(package_id),
                "tokens": str(package["tokens"])
            }
        )
        
        return {
            "success": True,
            "checkout_url": session.url,
            "session_id": session.id
        }


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks for token purchases"""
    import stripe
    
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        metadata = session.get("metadata", {})
        
        user_id = int(metadata.get("user_id", 0))
        tokens = int(metadata.get("tokens", 0))
        
        if user_id and tokens:
            async with db_pool.acquire() as conn:
                # Get current balance
                current = await conn.fetchrow(
                    "SELECT tokens_remaining FROM users WHERE id = $1",
                    user_id
                )
                current_tokens = current["tokens_remaining"] if current else 0
                new_balance = current_tokens + tokens
                
                # Update user tokens
                await conn.execute(
                    "UPDATE users SET tokens_remaining = $1 WHERE id = $2",
                    new_balance, user_id
                )
                
                # Record transaction
                await conn.execute(
                    """
                    INSERT INTO token_transactions 
                    (user_id, amount, transaction_type, description, balance_after, metadata)
                    VALUES ($1, $2, 'purchase', $3, $4, $5)
                    """,
                    user_id, tokens, f"Purchased {tokens} tokens",
                    new_balance, {"stripe_session_id": session["id"]}
                )
    
    return {"status": "success"}
