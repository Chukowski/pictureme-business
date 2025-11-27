"""
Billing API Router

Endpoints for billing, invoices, payment methods, and subscriptions.
Integrates with Stripe for real payments.
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import os

router = APIRouter(
    prefix="/api/billing",
    tags=["Billing"],
)

# Database pool will be set by main.py
db_pool = None

def set_db_pool(pool):
    global db_pool
    db_pool = pool


class Invoice(BaseModel):
    id: str
    amount: float
    status: str
    description: str
    created_at: str
    pdf_url: Optional[str] = None


class PaymentMethod(BaseModel):
    id: str
    type: str
    last4: Optional[str] = None
    brand: Optional[str] = None
    exp_month: Optional[int] = None
    exp_year: Optional[int] = None
    is_default: bool = False


class CurrentPlan(BaseModel):
    id: str
    name: str
    price: float
    interval: str
    tokens_monthly: int
    max_events: int
    features: List[str]
    next_billing_date: Optional[str] = None
    status: str = "active"


class StripeConnectStatus(BaseModel):
    connected: bool
    account_id: Optional[str] = None
    charges_enabled: bool = False
    payouts_enabled: bool = False
    onboarding_url: Optional[str] = None


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


def get_stripe():
    """Get configured Stripe client"""
    import stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    return stripe


@router.get("/invoices", response_model=List[Invoice])
async def get_invoices(request: Request):
    """Get user's billing invoices from Stripe"""
    stripe = get_stripe()
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        customer = await conn.fetchrow(
            "SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1",
            user["id"]
        )
        
        if not customer:
            return []
        
        try:
            invoices = stripe.Invoice.list(
                customer=customer["stripe_customer_id"],
                limit=20
            )
            
            return [
                Invoice(
                    id=inv.id,
                    amount=inv.amount_paid / 100,
                    status=inv.status,
                    description=inv.description or f"Invoice {inv.number}",
                    created_at=datetime.fromtimestamp(inv.created).isoformat(),
                    pdf_url=inv.invoice_pdf
                )
                for inv in invoices.data
            ]
        except Exception as e:
            print(f"Error fetching invoices: {e}")
            return []


@router.get("/payment-methods", response_model=List[PaymentMethod])
async def get_payment_methods(request: Request):
    """Get user's payment methods from Stripe"""
    stripe = get_stripe()
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        customer = await conn.fetchrow(
            "SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1",
            user["id"]
        )
        
        if not customer:
            return []
        
        try:
            # Get customer to find default payment method
            stripe_customer = stripe.Customer.retrieve(customer["stripe_customer_id"])
            default_pm = stripe_customer.invoice_settings.default_payment_method
            
            payment_methods = stripe.PaymentMethod.list(
                customer=customer["stripe_customer_id"],
                type="card"
            )
            
            return [
                PaymentMethod(
                    id=pm.id,
                    type="card",
                    last4=pm.card.last4,
                    brand=pm.card.brand.capitalize(),
                    exp_month=pm.card.exp_month,
                    exp_year=pm.card.exp_year,
                    is_default=(pm.id == default_pm)
                )
                for pm in payment_methods.data
            ]
        except Exception as e:
            print(f"Error fetching payment methods: {e}")
            return []


@router.get("/current-plan", response_model=CurrentPlan)
async def get_current_plan(request: Request):
    """Get user's current subscription plan"""
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        plan_data = await conn.fetchrow(
            """
            SELECT 
                bp.slug as id,
                bp.name,
                bp.monthly_price as price,
                bp.included_tokens as tokens_monthly,
                bp.max_concurrent_events as max_events,
                bp.features,
                u.plan_renewal_date
            FROM users u
            LEFT JOIN business_plans bp ON u.plan_id = bp.slug
            WHERE u.id = $1
            """,
            user["id"]
        )
        
        if not plan_data or not plan_data["id"]:
            # Default free plan for individuals
            return CurrentPlan(
                id="free",
                name="Free",
                price=0,
                interval="month",
                tokens_monthly=100,
                max_events=0,
                features=["100 tokens/month", "Personal use only"],
                status="active"
            )
        
        features = plan_data["features"] if isinstance(plan_data["features"], list) else []
        
        return CurrentPlan(
            id=plan_data["id"],
            name=plan_data["name"],
            price=float(plan_data["price"]),
            interval="month",
            tokens_monthly=plan_data["tokens_monthly"],
            max_events=plan_data["max_events"],
            features=features,
            next_billing_date=plan_data["plan_renewal_date"].isoformat() if plan_data["plan_renewal_date"] else None,
            status="active"
        )


@router.post("/upgrade")
async def upgrade_plan(request: Request, plan_id: str):
    """Create Stripe checkout session for plan upgrade"""
    stripe = get_stripe()
    user = await get_current_user_from_request(request)
    
    # Plan price IDs (should be in DB or env)
    plan_prices = {
        "event_starter": os.getenv("STRIPE_PRICE_EVENT_STARTER"),
        "event_pro": os.getenv("STRIPE_PRICE_EVENT_PRO"),
        "masters": os.getenv("STRIPE_PRICE_MASTERS")
    }
    
    price_id = plan_prices.get(plan_id)
    if not price_id:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    async with db_pool.acquire() as conn:
        # Get or create Stripe customer
        customer = await conn.fetchrow(
            "SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1",
            user["id"]
        )
        
        if not customer:
            stripe_customer = stripe.Customer.create(
                email=user["email"],
                metadata={"user_id": str(user["id"])}
            )
            await conn.execute(
                """
                INSERT INTO stripe_customers (user_id, stripe_customer_id, email)
                VALUES ($1, $2, $3)
                """,
                user["id"], stripe_customer.id, user["email"]
            )
            customer_id = stripe_customer.id
        else:
            customer_id = customer["stripe_customer_id"]
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8080")
    
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{frontend_url}/admin/billing?success=true&plan={plan_id}",
        cancel_url=f"{frontend_url}/admin/billing?canceled=true",
        metadata={
            "user_id": str(user["id"]),
            "plan_id": plan_id
        }
    )
    
    return {
        "success": True,
        "checkout_url": session.url,
        "session_id": session.id
    }


@router.post("/cancel")
async def cancel_subscription(request: Request):
    """Cancel current subscription"""
    stripe = get_stripe()
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        customer = await conn.fetchrow(
            "SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1",
            user["id"]
        )
        
        if not customer:
            raise HTTPException(status_code=400, detail="No subscription found")
        
        # Get active subscription
        subscriptions = stripe.Subscription.list(
            customer=customer["stripe_customer_id"],
            status="active"
        )
        
        if not subscriptions.data:
            raise HTTPException(status_code=400, detail="No active subscription")
        
        # Cancel at period end
        stripe.Subscription.modify(
            subscriptions.data[0].id,
            cancel_at_period_end=True
        )
        
        return {
            "success": True,
            "message": "Subscription will be canceled at the end of the billing period",
            "end_date": datetime.fromtimestamp(subscriptions.data[0].current_period_end).isoformat()
        }


@router.post("/payment-methods")
async def add_payment_method(request: Request):
    """Create setup intent for adding a new payment method"""
    stripe = get_stripe()
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        customer = await conn.fetchrow(
            "SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1",
            user["id"]
        )
        
        if not customer:
            stripe_customer = stripe.Customer.create(
                email=user["email"],
                metadata={"user_id": str(user["id"])}
            )
            await conn.execute(
                """
                INSERT INTO stripe_customers (user_id, stripe_customer_id, email)
                VALUES ($1, $2, $3)
                """,
                user["id"], stripe_customer.id, user["email"]
            )
            customer_id = stripe_customer.id
        else:
            customer_id = customer["stripe_customer_id"]
    
    setup_intent = stripe.SetupIntent.create(
        customer=customer_id,
        payment_method_types=["card"]
    )
    
    return {
        "success": True,
        "client_secret": setup_intent.client_secret
    }


@router.delete("/payment-methods/{payment_method_id}")
async def remove_payment_method(request: Request, payment_method_id: str):
    """Remove a payment method"""
    stripe = get_stripe()
    user = await get_current_user_from_request(request)
    
    try:
        stripe.PaymentMethod.detach(payment_method_id)
        return {"success": True, "message": "Payment method removed"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ===== Stripe Connect for Revenue Share (Masters Plan) =====

@router.get("/connect/status", response_model=StripeConnectStatus)
async def get_connect_status(request: Request):
    """Get Stripe Connect status for revenue share"""
    stripe = get_stripe()
    user = await get_current_user_from_request(request)
    
    # Only Masters plan can have Connect
    if user.get("role") != "business_masters":
        return StripeConnectStatus(connected=False)
    
    async with db_pool.acquire() as conn:
        connect = await conn.fetchrow(
            "SELECT stripe_connect_id FROM users WHERE id = $1",
            user["id"]
        )
        
        if not connect or not connect.get("stripe_connect_id"):
            return StripeConnectStatus(connected=False)
        
        try:
            account = stripe.Account.retrieve(connect["stripe_connect_id"])
            return StripeConnectStatus(
                connected=True,
                account_id=account.id,
                charges_enabled=account.charges_enabled,
                payouts_enabled=account.payouts_enabled
            )
        except Exception:
            return StripeConnectStatus(connected=False)


@router.post("/connect/onboard")
async def start_connect_onboarding(request: Request):
    """Start Stripe Connect onboarding for revenue share"""
    stripe = get_stripe()
    user = await get_current_user_from_request(request)
    
    if user.get("role") != "business_masters":
        raise HTTPException(status_code=403, detail="Only Masters plan can use revenue share")
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8080")
    
    async with db_pool.acquire() as conn:
        # Check if already has Connect account
        existing = await conn.fetchrow(
            "SELECT stripe_connect_id FROM users WHERE id = $1",
            user["id"]
        )
        
        if existing and existing.get("stripe_connect_id"):
            account_id = existing["stripe_connect_id"]
        else:
            # Create Connect account
            account = stripe.Account.create(
                type="express",
                country="US",
                email=user["email"],
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True}
                },
                metadata={"user_id": str(user["id"])}
            )
            account_id = account.id
            
            # Save account ID
            await conn.execute(
                "UPDATE users SET stripe_connect_id = $1 WHERE id = $2",
                account_id, user["id"]
            )
        
        # Create onboarding link
        account_link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=f"{frontend_url}/admin/billing?connect_refresh=true",
            return_url=f"{frontend_url}/admin/billing?connect_success=true",
            type="account_onboarding"
        )
        
        return {
            "success": True,
            "onboarding_url": account_link.url
        }


@router.get("/connect/dashboard")
async def get_connect_dashboard_link(request: Request):
    """Get Stripe Connect dashboard link"""
    stripe = get_stripe()
    user = await get_current_user_from_request(request)
    
    async with db_pool.acquire() as conn:
        connect = await conn.fetchrow(
            "SELECT stripe_connect_id FROM users WHERE id = $1",
            user["id"]
        )
        
        if not connect or not connect.get("stripe_connect_id"):
            raise HTTPException(status_code=400, detail="No Connect account found")
        
        login_link = stripe.Account.create_login_link(connect["stripe_connect_id"])
        
        return {
            "success": True,
            "dashboard_url": login_link.url
        }
