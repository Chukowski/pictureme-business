\"\"\"
Business Agent - Enterprise Photo Booth Assistant

Dedicated to business tier users, focusing on:
- Event management & scaling
- Organization & Staff management
- Advanced analytics & business metrics
- Enterprise-grade troubleshooting
\"\"\"

import os
import json
from typing import Optional
from dataclasses import dataclass
from pathlib import Path

# Load environment
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Configuration
AKITO_MODEL = os.getenv("AKITO_MODEL", "openai:gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

# Try to import pydantic-ai
PYDANTIC_AI_AVAILABLE = False
try:
    from pydantic_ai import Agent, RunContext
    PYDANTIC_AI_AVAILABLE = True
except ImportError:
    pass


# ===== Context / Dependencies =====

@dataclass
class BusinessContext:
    \"\"\"Context passed to Business Assist for each interaction\"\"\"
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    current_page: Optional[str] = None
    user_name: Optional[str] = None


# ===== System Prompt =====

BUSINESS_SYSTEM_PROMPT = \"\"\"You are Business Assist, the specialized AI partner for PictureMe.Now Enterprise and Business clients.

Your personality:
- Highly professional, efficient, and operationally focused
- Direct and informational tone
- Expert in event logistics, staff management, and business scaling
- Responses are concise and action-oriented
- Markdown formatting is required for readability (bold, lists, code blocks)
- You can respond in Spanish or English depending on the user's input

Your focus areas:
1. **Organization Management**: Managing staff roles, permissions, and multi-user environments.
2. **Advanced Event Logic**: Complex metadata, logic flows, and custom integrations.
3. **Analytics & Metrics**: Interpreting lead capture data, usage statistics, and growth metrics.
4. **Platform Scaling**: Managing multiple simultaneous events and high-traffic scenarios.
5. **Business Settings**: Branding consistency, custom domains, and API configurations.

Key enterprise features:
- **Staff Roles**: Admin, Super Admin, and Staff (event-specific).
- **Multi-Event Workflows**: Managing dozens of events simultaneously.
- **Advanced Metadata**: Capturing custom visitor data during registration.
- **Branded Feeds**: Fully white-labeled galleries for corporate clients.
- **Enterprise Models**: Veo 3.1, Flux Realism, and custom LoRA models.

Available pages to navigate to (RELATIVE paths):
- /admin - Main dashboard
- /admin/events - Event management list
- /admin/events/create - Setup new professional event
- /admin/organization - Manage your team and staff
- /admin/settings/business - Business branding and configurations
- /admin/analytics - Performance and lead statistics
- /admin/tokens - Professional token packages
- /admin/marketplace - Asset and template management

IMPORTANT URL RULES:
- NEVER use hardcoded domains like "example.com"
- Always use RELATIVE paths starting with "/"

## GENERATIVE UI MARKERS

Use these when relevant to help business users:

### Navigation Cards:
- Format: [[navigate:path=/admin/organization|title=Manage Team|description=Invite staff and set permissions]]

### Business Navigation (Auto-Navigate):
- Format: [[navigate_now:/admin/analytics]]
- ONLY for explicit requests to move to a certain dashboard.

### Analytics Summary (Placeholder):
- Format: [[analytics_summary:recent]] - used to suggest they check their metrics.

Always prioritize operational efficiency and help the user manage their business smoothly!
\"\"\"


# ===== Pydantic AI Agent =====

business_agent = None

if PYDANTIC_AI_AVAILABLE:
    business_agent = Agent(
        AKITO_MODEL,
        deps_type=BusinessContext,
        instructions=BUSINESS_SYSTEM_PROMPT,
    )
    
    @business_agent.tool
    async def get_business_navigation(ctx: RunContext[BusinessContext], intent: str) -> str:
        \"\"\"Get the navigation path for business operations.\"\"\"
        navigation_map = {
            "organization": "/admin/organization",
            "staff": "/admin/organization",
            "team": "/admin/organization",
            "analytics": "/admin/analytics",
            "metrics": "/admin/analytics",
            "stats": "/admin/analytics",
            "business": "/admin/settings/business",
            "branding": "/admin/settings/business",
            "events": "/admin/events",
            "create event": "/admin/events/create",
        }
        
        intent_lower = intent.lower()
        for key, path in navigation_map.items():
            if key in intent_lower:
                return f"Path for {key}: {path}"
        return \"Available business sections: organization, analytics, business settings, events.\"


# ===== Direct API Calls (Fallback) =====

async def _call_llm(messages: list) -> str:
    \"\"\"Call LLM API directly\"\"\"
    import httpx
    
    if OPENAI_API_KEY:
        model = AKITO_MODEL.replace(\"openai:\", \"\") if \"openai:\" in AKITO_MODEL else \"gpt-4o-mini\"
        url = \"https://api.openai.com/v1/chat/completions\"
        headers = {\"Authorization\": f\"Bearer {OPENAI_API_KEY}\", \"Content-Type\": \"application/json\"}
        payload = {\"model\": model, \"messages\": messages, \"temperature\": 0.5}
    elif GOOGLE_API_KEY:
        # Simplified Gemini fallback (contents format required)
        return \"Gemini fallback not implemented in this draft for brevity\"
    else:
        return \"No API key available for Business Assist.\"

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload, timeout=30.0)
        response.raise_for_status()
        data = response.json()
        return data[\"choices\"][0][\"message\"][\"content\"]


# ===== Main Chat Function =====

async def chat_with_business_agent(
    message: str,
    user_id: Optional[str] = None,
    user_role: Optional[str] = None,
    current_page: Optional[str] = None,
    user_name: Optional[str] = None,
    message_history: list = None
) -> str:
    \"\"\"
    Send a message to Business Assist and get a response.
    \"\"\"
    context = BusinessContext(
        user_id=user_id,
        user_role=user_role,
        current_page=current_page,
        user_name=user_name
    )
    
    # Use Pydantic AI if available
    if PYDANTIC_AI_AVAILABLE and business_agent:
        try:
            result = await business_agent.run(
                message,
                deps=context,
                message_history=message_history or []
            )
            return result.output
        except Exception as e:
            print(f\"❌ Business Agent error, falling back to direct API: {e}\")
    
    # Fallback to direct API calls
    messages = [{\"role\": \"system\", \"content\": BUSINESS_SYSTEM_PROMPT}]
    if message_history:
        messages.extend(message_history)
    messages.append({\"role\": \"user\", \"content\": message})
    
    try:
        return await _call_llm(messages)
    except Exception as e:
        print(f\"❌ Business Assist API error: {e}\")
        return f\"Sorry, I encountered an operational error. Please try again or contact support.\"
