import stripe
import os
from dotenv import load_dotenv

# Load env from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

def list_webhooks():
    if not stripe.api_key:
        print("❌ STRIPE_SECRET_KEY not found in .env")
        return

    try:
        endpoints = stripe.WebhookEndpoint.list(limit=10)
        print(f"📋 Found {len(endpoints.data)} webhook endpoints:")
        for ep in endpoints.data:
            print(f"   - ID: {ep.id}")
            print(f"     URL: {ep.url}")
            print(f"     Status: {ep.status}")
            print(f"     Events: {ep.enabled_events}")
            print("---")
    except Exception as e:
        print(f"❌ Error listing webhooks: {e}")

def create_webhook(url):
    if not stripe.api_key:
        print("❌ STRIPE_SECRET_KEY not found in .env")
        return

    print(f"🚀 Creating webhook for URL: {url}")
    try:
        endpoint = stripe.WebhookEndpoint.create(
            url=url,
            enabled_events=[
                "checkout.session.completed",
                "invoice.payment_succeeded",
            ],
            description="Billing & Token Webhook"
        )
        print(f"✅ Webhook created successfully!")
        print(f"   ID: {endpoint.id}")
        print(f"   Secret: {endpoint.secret}")
        print(f"\n📝 Add this to your backend/.env:")
        print(f"STRIPE_BILLING_WEBHOOK_SECRET={endpoint.secret}")
    except Exception as e:
        print(f"❌ Error creating webhook: {e}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "create":
        if len(sys.argv) < 3:
            print("Usage: python manage_webhooks.py create <url>")
        else:
            create_webhook(sys.argv[2])
    else:
        list_webhooks()

