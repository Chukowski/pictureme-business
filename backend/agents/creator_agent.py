"""
Creator Agent - AI creative hub for PictureMe.Now

The Creator Agent is an intelligent partner that helps users:
- Create and enhance high-quality prompts for AI image/video generation
- Generate stunning images and videos all in one chat
- Understand platform models and token capabilities
- Access creations seamlessly via the user's Gallery
"""
Supports both Pydantic AI v1.0+ and fallback to direct API calls.
"""

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

# Try to import pydantic-ai, fallback to direct API calls
PYDANTIC_AI_AVAILABLE = False
try:
    from pydantic_ai import Agent, RunContext
    PYDANTIC_AI_AVAILABLE = True
    print(f"✅ Pydantic AI available - using Creator Agent")
except ImportError:
    print(f"⚠️ Pydantic AI not available - using direct API calls")


# ===== Context / Dependencies =====

@dataclass
class AssistantContext:
    """Context passed to Assistant for each interaction"""
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    current_page: Optional[str] = None
    user_name: Optional[str] = None


# ===== System Prompt =====

ASSISTANT_SYSTEM_PROMPT = """You are the Creator Agent, the powerful AI creative core of PictureMe.Now.

Your personality:
- Creative, visionary, and technical 🎨
- You are an expert in generative AI, prompt engineering, and visual storytelling
- You use occasional emojis to inspire creativity ✨
- You speak with confidence and clarity
- You can respond in Spanish or English depending on how the user writes to you
- You use Markdown formatting for better readability (bold, lists, code blocks)

Your Mission:
You are an all-in-one creative hub. Your goal is to help users generate high-quality prompts, images, and videos. 

Your capabilities:
1. **AI Creation Studio**: Help users brainstorm and create prompts for images and videos.
2. **Creative Partner**: Suggest styles, lighting, and artistic directions to elevate results.
3. **Gallery Integration**: Explain that any photos or videos created through this chat will automatically appear in the user's Gallery.
4. **Technical Expert**: Know everything about our models (Nano Banana, Seedream, Flux, etc.) and their token costs.

Key platform features you should know about:
- **Gallery**: The central place where all creations are stored.
- **Token System**: Credits used for AI generations:
  - Image models: Nano Banana = 1 token, Seedream = 1 token, Nano Banana Pro = 15 tokens, Flux = 4 tokens
  - Video models: 150-300 tokens per 5s video
- **Model Tiers**:
  - **Nano Banana**: Fast, simple generations.
  - **Seedream**: Excellent for blending elements and fast iterations.
  - **Flux Realism**: High-end photorealism.
  - **Nano Banana Pro**: Maximum quality and detail.

When helping with prompts, remember:
- Creator prompts should be vivid and detailed.
- Use language like "High-end cinematic lighting," "8k resolution," "Ultra-realistic textures."
- For people: emphasize preserving likeness when requested.
- Describe the background, style, and atmosphere clearly.

## GENERATIVE UI - CREATIVE TOOLS

You can show interactive UI components in the chat by using special markers. Use these when appropriate:

### Plan Cards (use when user asks about upgrading, plans, or pricing):
- To show Event Starter plan card: [[plan_card:starter]]
- To show Event Pro plan card: [[plan_card:pro]]
- To show Masters plan card: [[plan_card:masters]]

Example: If user says "quiero actualizar mi plan" or "upgrade plan", respond with a brief explanation and include the relevant plan card(s).

### Token Packages (use when user asks about buying tokens):
- Format: [[token_package:tokens=5000|price=49.99|bonus=10]]

### Auth Cards (use when user needs to register or login - ONLY for guests/unauthenticated users):
- To show registration card: [[auth:register]]
- To show login card: [[auth:login]]
- To show both options: [[auth:both]]

IMPORTANT RULES:
1. Always include a text explanation along with the UI components. Don't just show the component alone.
2. Everything created here is saved to the private Gallery.
3. For guests asking to do authenticated actions: show [[auth:both]] and explain they need an account.
4. Focus on creation - do not offer navigation help as users should stay in the creation flow.

Always be inspiring and help users push the boundaries of what's possible with AI!
"""


# ===== Pydantic AI Agent (if available) =====

creator_agent = None

if PYDANTIC_AI_AVAILABLE:
    creator_agent = Agent(
        AKITO_MODEL,
        deps_type=AssistantContext,
        instructions=ASSISTANT_SYSTEM_PROMPT,
    )
    
    @creator_agent.tool
    async def get_token_costs(ctx: RunContext[AssistantContext]) -> str:
        """Get information about token costs for different AI models."""
        return _get_token_costs()
    
    @creator_agent.tool
    async def get_plan_info(ctx: RunContext[AssistantContext], plan_name: Optional[str] = None) -> str:
        """Get information about subscription plans."""
        return _get_plan_info(plan_name)
    
    @creator_agent.tool
    async def enhance_prompt(ctx: RunContext[AssistantContext], current_prompt: str, style: Optional[str] = None) -> str:
        """Enhance an existing prompt for better AI image generation results."""
        return _enhance_prompt(current_prompt, style)
    
    @creator_agent.instructions
    def add_context_instructions(ctx: RunContext[AssistantContext]) -> str:
        """Add context-specific instructions based on user info."""
        return _get_context_instructions(ctx.deps)


# ===== Tool Implementations =====

def _get_token_costs() -> str:
    return """**Token Costs:**

**Image Generation:**
- Nano Banana (Fast) = 1 token
- Seedream v4 (Fast, mixing) = 1 token  
- Nano Banana Pro (High quality) = 15 tokens
- Flux Realism = 4 tokens

**Video Generation:**
- Minimax Video = 150 tokens per 5s
- Veo 2 = 200 tokens per 5s
- Veo 3.1 = 300 tokens per 5s
"""


def _get_plan_info(plan_name: Optional[str] = None) -> str:
    plans = {
        "individual": "**Individual** - Free / Pay as you go\\n- Personal use, basic templates",
        "starter": "**Event Starter** - $400/month\\n- 1,000 tokens/month\\n- 1 active event\\n- Basic analytics\\n- BYOH (Bring Your Own Hardware)\\n- Email support",
        "pro": "**Event Pro** - $1,500/month\\n- 5,000 tokens/month\\n- Up to 2 active events\\n- Advanced analytics\\n- Lead capture & branded feeds\\n- Priority support",
        "masters": "**Masters** - From $3,000/month\\n- 10,000 tokens/month\\n- Up to 3 active events\\n- Premium templates & LoRA models\\n- Revenue-share & hardware options\\n- Print module\\n- Dedicated account manager",
    }
    
    if plan_name:
        for key, info in plans.items():
            if key in plan_name.lower():
                return info
    
    return "**Plans:**\\n\\n" + "\\n\\n".join(plans.values())


def _enhance_prompt(current_prompt: str, style: Optional[str] = None) -> str:
    enhanced = current_prompt
    
    preservation_keywords = ["keep", "preserve", "mantener", "preservar"]
    if not any(kw in current_prompt.lower() for kw in preservation_keywords):
        enhanced = f"Keep the person from the original photo and preserve their face. {enhanced}"
    
    style_additions = {
        "professional": " Professional lighting, clean composition.",
        "fun": " Vibrant colors, playful mood.",
        "artistic": " Artistic composition, creative lighting.",
        "dramatic": " Cinematic lighting, high contrast.",
    }
    
    if style and style.lower() in style_additions:
        enhanced += style_additions[style.lower()]
    
    return f"Enhanced prompt: \\\"{enhanced}\\\""


def _get_context_instructions(ctx: AssistantContext) -> str:
    instructions = []
    
    # Check if user is on landing page (not logged in context)
    is_landing_page = ctx.current_page in ["/", "/landing", ""] or ctx.current_page is None
    is_guest = not ctx.user_id or ctx.user_role == "guest" or not ctx.user_role
    
    if is_landing_page or is_guest:
        instructions.append("""
## IMPORTANT: GUEST/LANDING PAGE MODE
The user is NOT logged in or is on the public landing page.
- Focus on explaining PictureMe.Now features, pricing, and how to get started
- Encourage them to register or log in to access full features
- If they ask to create an event or use the Creator Agent, tell them to first create an account or log in
- You can show plan cards to help them choose a plan
""")
    else:
        if ctx.user_name:
            instructions.append(f"The user's name is {ctx.user_name}.")
        
        if ctx.user_role:
            role_map = {
                "individual": "They are on the free Individual plan.",
                "business_starter": "They are on the Event Starter plan.",
                "business_eventpro": "They are on the Event Pro plan.",
                "business_masters": "They are on the Masters plan.",
                "superadmin": "They are a Super Admin.",
            }
            if ctx.user_role in role_map:
                instructions.append(role_map[ctx.user_role])
    
    if ctx.current_page:
        instructions.append(f"Current page: {ctx.current_page}")
    
    return "\\n".join(instructions)


# ===== Direct API Calls (Fallback) =====

async def _call_openai(messages: list) -> str:
    \"\"\"Call OpenAI API directly\"\"\"
    import httpx
    
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not set")
    
    model = AKITO_MODEL.replace("openai:", "") if "openai:" in AKITO_MODEL else "gpt-4o-mini"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1000
            },
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def _call_google(messages: list) -> str:
    \"\"\"Call Google Gemini API directly\"\"\"
    import httpx
    
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY not set")
    
    # Convert messages to Gemini format
    contents = []
    system_msg = None
    for msg in messages:
        if msg["role"] == "system":
            system_msg = msg["content"]
            continue
        role = "user" if msg["role"] == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })
    
    if system_msg and contents:
        contents[0]["parts"][0]["text"] = f"{system_msg}\\n\\nUser: {contents[0]['parts'][0]['text']}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
            headers={"Content-Type": "application/json"},
            params={"key": GOOGLE_API_KEY},
            json={
                "contents": contents,
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1000}
            },
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]


# ===== Main Chat Function =====

async def chat_with_creator_agent(
    message: str,
    user_id: Optional[str] = None,
    user_role: Optional[str] = None,
    current_page: Optional[str] = None,
    user_name: Optional[str] = None,
    message_history: list = None,
    is_authenticated: bool = False
) -> str:
    \"\"\"
    Send a message to Assistant and get a response.
    \"\"\"
    # Override authentication based on explicit flag
    effective_user_id = user_id if is_authenticated else None
    effective_user_role = user_role if is_authenticated else "guest"
    effective_user_name = user_name if is_authenticated else None
    
    context = AssistantContext(
        user_id=effective_user_id,
        user_role=effective_user_role,
        current_page=current_page,
        user_name=effective_user_name
    )
    
    # Use Pydantic AI if available
    if PYDANTIC_AI_AVAILABLE and creator_agent:
        try:
            result = await creator_agent.run(
                message,
                deps=context,
                message_history=message_history or []
            )
            return result.output
        except Exception as e:
            print(f"❌ Pydantic AI error, falling back to direct API: {e}")
    
    # Fallback to direct API calls
    system_prompt = ASSISTANT_SYSTEM_PROMPT + "\\n\\n" + _get_context_instructions(context)
    
    messages = [{"role": "system", "content": system_prompt}]
    
    if message_history:
        for msg in message_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ["user", "assistant"]:
                messages.append({"role": role, "content": content})
    
    messages.append({"role": "user", "content": message})
    
    try:
        if OPENAI_API_KEY:
            return await _call_openai(messages)
        elif GOOGLE_API_KEY:
            return await _call_google(messages)
        else:
            return "Lo siento, no tengo acceso a un modelo de AI. Por favor configura OPENAI_API_KEY o GOOGLE_API_KEY."
    except Exception as e:
        print(f"❌ Assistant API error: {e}")
        # Try fallback
        try:
            if GOOGLE_API_KEY and OPENAI_API_KEY:
                return await _call_google(messages)
        except:
            pass
        return f"Lo siento, hubo un error. Por favor intenta de nuevo."


def chat_with_creator_agent_sync(
    message: str,
    user_id: Optional[str] = None,
    user_role: Optional[str] = None,
    current_page: Optional[str] = None,
    user_name: Optional[str] = None,
    message_history: list = None
) -> str:
    \"\"\"Synchronous version of chat_with_creator_agent.\"\"\"
    import asyncio
    return asyncio.run(chat_with_creator_agent(
        message=message,
        user_id=user_id,
        user_role=user_role,
        current_page=current_page,
        user_name=user_name,
        message_history=message_history
    ))


print(f"🤖 Creator Agent initialized with model: {AKITO_MODEL}")
print(f"🔑 OpenAI API Key: {'✅ Set' if OPENAI_API_KEY else '❌ Not set'}")
print(f"🔑 Google API Key: {'✅ Set' if GOOGLE_API_KEY else '❌ Not set'}")
