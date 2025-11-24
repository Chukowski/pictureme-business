"""
Stripe Service for Payment Processing and Token Management
"""
import os
import stripe
from typing import Dict, List, Optional
from datetime import datetime

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class StripeService:
    """Service for handling Stripe payments and subscriptions"""
    
    def __init__(self):
        self.api_key = stripe.api_key
        if not self.api_key:
            print("⚠️  Warning: STRIPE_SECRET_KEY not set. Stripe functionality will be limited.")
    
    # ========================================================================
    # CUSTOMERS
    # ========================================================================
    
    async def create_customer(self, email: str, name: str, user_id: int, metadata: Dict = None) -> stripe.Customer:
        """Create a Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    "user_id": str(user_id),
                    **(metadata or {})
                }
            )
            return customer
        except stripe.error.StripeError as e:
            print(f"❌ Error creating Stripe customer: {e}")
            raise
    
    async def get_customer(self, customer_id: str) -> stripe.Customer:
        """Get a Stripe customer by ID"""
        try:
            return stripe.Customer.retrieve(customer_id)
        except stripe.error.StripeError as e:
            print(f"❌ Error retrieving Stripe customer: {e}")
            raise
    
    async def update_customer(self, customer_id: str, **kwargs) -> stripe.Customer:
        """Update a Stripe customer"""
        try:
            return stripe.Customer.modify(customer_id, **kwargs)
        except stripe.error.StripeError as e:
            print(f"❌ Error updating Stripe customer: {e}")
            raise
    
    # ========================================================================
    # PRODUCTS & PRICES
    # ========================================================================
    
    async def create_product(self, name: str, description: str, metadata: Dict = None) -> stripe.Product:
        """Create a Stripe product"""
        try:
            product = stripe.Product.create(
                name=name,
                description=description,
                metadata=metadata or {}
            )
            return product
        except stripe.error.StripeError as e:
            print(f"❌ Error creating Stripe product: {e}")
            raise
    
    async def create_price(
        self,
        product_id: str,
        amount_cents: int,
        currency: str = "usd",
        metadata: Dict = None
    ) -> stripe.Price:
        """Create a Stripe price for a product"""
        try:
            price = stripe.Price.create(
                product=product_id,
                unit_amount=amount_cents,
                currency=currency,
                metadata=metadata or {}
            )
            return price
        except stripe.error.StripeError as e:
            print(f"❌ Error creating Stripe price: {e}")
            raise
    
    async def list_prices(self, product_id: Optional[str] = None, active: bool = True) -> List[stripe.Price]:
        """List all prices, optionally filtered by product"""
        try:
            params = {"active": active}
            if product_id:
                params["product"] = product_id
            
            prices = stripe.Price.list(**params)
            return prices.data
        except stripe.error.StripeError as e:
            print(f"❌ Error listing Stripe prices: {e}")
            raise
    
    # ========================================================================
    # PAYMENT INTENTS (One-time payments)
    # ========================================================================
    
    async def create_payment_intent(
        self,
        amount_cents: int,
        customer_id: str,
        currency: str = "usd",
        metadata: Dict = None
    ) -> stripe.PaymentIntent:
        """Create a payment intent for one-time payment"""
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency=currency,
                customer=customer_id,
                metadata=metadata or {},
                automatic_payment_methods={"enabled": True}
            )
            return intent
        except stripe.error.StripeError as e:
            print(f"❌ Error creating payment intent: {e}")
            raise
    
    async def get_payment_intent(self, payment_intent_id: str) -> stripe.PaymentIntent:
        """Get a payment intent by ID"""
        try:
            return stripe.PaymentIntent.retrieve(payment_intent_id)
        except stripe.error.StripeError as e:
            print(f"❌ Error retrieving payment intent: {e}")
            raise
    
    async def confirm_payment_intent(self, payment_intent_id: str) -> stripe.PaymentIntent:
        """Confirm a payment intent"""
        try:
            return stripe.PaymentIntent.confirm(payment_intent_id)
        except stripe.error.StripeError as e:
            print(f"❌ Error confirming payment intent: {e}")
            raise
    
    # ========================================================================
    # CHECKOUT SESSIONS
    # ========================================================================
    
    async def create_checkout_session(
        self,
        price_id: str,
        customer_id: str,
        success_url: str,
        cancel_url: str,
        metadata: Dict = None,
        quantity: int = 1
    ) -> stripe.checkout.Session:
        """Create a Stripe Checkout session"""
        try:
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[{
                    "price": price_id,
                    "quantity": quantity,
                }],
                mode="payment",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata or {}
            )
            return session
        except stripe.error.StripeError as e:
            print(f"❌ Error creating checkout session: {e}")
            raise
    
    async def get_checkout_session(self, session_id: str) -> stripe.checkout.Session:
        """Get a checkout session by ID"""
        try:
            return stripe.checkout.Session.retrieve(session_id)
        except stripe.error.StripeError as e:
            print(f"❌ Error retrieving checkout session: {e}")
            raise
    
    # ========================================================================
    # SUBSCRIPTIONS
    # ========================================================================
    
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        metadata: Dict = None
    ) -> stripe.Subscription:
        """Create a subscription"""
        try:
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                metadata=metadata or {}
            )
            return subscription
        except stripe.error.StripeError as e:
            print(f"❌ Error creating subscription: {e}")
            raise
    
    async def get_subscription(self, subscription_id: str) -> stripe.Subscription:
        """Get a subscription by ID"""
        try:
            return stripe.Subscription.retrieve(subscription_id)
        except stripe.error.StripeError as e:
            print(f"❌ Error retrieving subscription: {e}")
            raise
    
    async def cancel_subscription(self, subscription_id: str, at_period_end: bool = True) -> stripe.Subscription:
        """Cancel a subscription"""
        try:
            if at_period_end:
                return stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                return stripe.Subscription.delete(subscription_id)
        except stripe.error.StripeError as e:
            print(f"❌ Error canceling subscription: {e}")
            raise
    
    async def list_subscriptions(self, customer_id: str) -> List[stripe.Subscription]:
        """List all subscriptions for a customer"""
        try:
            subscriptions = stripe.Subscription.list(customer=customer_id)
            return subscriptions.data
        except stripe.error.StripeError as e:
            print(f"❌ Error listing subscriptions: {e}")
            raise
    
    # ========================================================================
    # REFUNDS
    # ========================================================================
    
    async def create_refund(
        self,
        payment_intent_id: str,
        amount_cents: Optional[int] = None,
        reason: Optional[str] = None
    ) -> stripe.Refund:
        """Create a refund for a payment"""
        try:
            params = {"payment_intent": payment_intent_id}
            if amount_cents:
                params["amount"] = amount_cents
            if reason:
                params["reason"] = reason
            
            refund = stripe.Refund.create(**params)
            return refund
        except stripe.error.StripeError as e:
            print(f"❌ Error creating refund: {e}")
            raise
    
    # ========================================================================
    # WEBHOOKS
    # ========================================================================
    
    def construct_webhook_event(self, payload: bytes, sig_header: str, webhook_secret: str):
        """Construct and verify a webhook event"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            return event
        except ValueError as e:
            print(f"❌ Invalid payload: {e}")
            raise
        except stripe.error.SignatureVerificationError as e:
            print(f"❌ Invalid signature: {e}")
            raise
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def cents_to_dollars(self, cents: int) -> float:
        """Convert cents to dollars"""
        return cents / 100.0
    
    def dollars_to_cents(self, dollars: float) -> int:
        """Convert dollars to cents"""
        return int(dollars * 100)
    
    async def get_payment_methods(self, customer_id: str) -> List[stripe.PaymentMethod]:
        """Get all payment methods for a customer"""
        try:
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type="card"
            )
            return payment_methods.data
        except stripe.error.StripeError as e:
            print(f"❌ Error listing payment methods: {e}")
            raise
    
    async def detach_payment_method(self, payment_method_id: str) -> stripe.PaymentMethod:
        """Detach a payment method from a customer"""
        try:
            return stripe.PaymentMethod.detach(payment_method_id)
        except stripe.error.StripeError as e:
            print(f"❌ Error detaching payment method: {e}")
            raise


# Singleton instance
_stripe_service = None

def get_stripe_service() -> StripeService:
    """Get or create the Stripe service singleton"""
    global _stripe_service
    if _stripe_service is None:
        _stripe_service = StripeService()
    return _stripe_service

