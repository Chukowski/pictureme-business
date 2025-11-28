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


@router.get("/stats", response_model=TokenStats)
async def get_token_stats(request: Request):
    """Get token statistics for the current user"""
    user = await get_current_user_from_request(request)
    user_id = user["id"]
    
    async with db_pool.acquire() as conn:
        # Get current tokens and plan info - try legacy users table first
        user_data = await conn.fetchrow(
            """
            SELECT 
                u.tokens_remaining,
                COALESCE(bp.included_tokens, 1000) as tokens_total
            FROM users u
            LEFT JOIN business_plans bp ON u.plan_id = bp.slug
            WHERE u.id = $1
            """,
            user_id
        )
        
        # If not found in legacy users, check Better Auth user table
        if not user_data:
            # For Better Auth users, use default token allocation
            user_data = await conn.fetchrow(
                """
                SELECT 
                    COALESCE(
                        (SELECT tokens_remaining FROM users WHERE email = u.email),
                        1000
                    ) as tokens_remaining,
                    1000 as tokens_total
                FROM "user" u
                WHERE u.id = $1
                """,
                user_id
            )
        
        current_tokens = user_data["tokens_remaining"] if user_data else 0
        tokens_total = user_data["tokens_total"] if user_data else 1000
        
        # Get tokens used this month
        first_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        usage_result = await conn.fetchrow(
            """
            SELECT COALESCE(SUM(ABS(amount)), 0) as tokens_used
            FROM token_transactions
            WHERE user_id = $1 
              AND amount < 0 
              AND created_at >= $2
            """,
            user_id, first_of_month
        )
        tokens_used_month = int(usage_result["tokens_used"]) if usage_result else 0
        
        # Calculate average daily usage (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        daily_usage = await conn.fetchrow(
            """
            SELECT COALESCE(SUM(ABS(amount)), 0) / 30.0 as avg_daily
            FROM token_transactions
            WHERE user_id = $1 
              AND amount < 0 
              AND created_at >= $2
            """,
            user_id, thirty_days_ago
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
    user_id = user["id"]
    
    async with db_pool.acquire() as conn:
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
            user_id, limit
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
    user_id = user["id"]
    
    async with db_pool.acquire() as conn:
        usage = await conn.fetch(
            """
            SELECT 
                e.id::text as event_id,
                e.title as event_name,
                COALESCE(SUM(ABS(tt.amount)), 0) as tokens_used,
                MAX(tt.created_at) as last_used
            FROM events e
            LEFT JOIN token_transactions tt ON e.id = tt.event_id AND tt.amount < 0
            WHERE e.user_id = $1
            GROUP BY e.id, e.title
            HAVING COALESCE(SUM(ABS(tt.amount)), 0) > 0
            ORDER BY tokens_used DESC
            LIMIT 10
            """,
            user_id
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
