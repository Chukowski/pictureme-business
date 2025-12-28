"""
CopilotKit Endpoint

Provides the CopilotKit integration endpoint for the Akito AI assistant.
This enables advanced features like:
- Streaming responses
- Frontend actions
- Generative UI
- Human-in-the-loop workflows
"""

from fastapi import APIRouter
from copilotkit import CopilotKitRemoteEndpoint, Action
from copilotkit.integrations.fastapi import add_fastapi_endpoint
import os

# Import Creator agent functions
from agents.creator_agent import (
    chat_with_creator_agent as chat_with_akito,
    _get_token_costs,
    _get_plan_info,
    _enhance_prompt,
    ASSISTANT_SYSTEM_PROMPT as AKITO_SYSTEM_PROMPT,
    OPENAI_API_KEY,
)

def _get_navigation_path(intent: str) -> str:
    """Helper to get navigation paths for common intents."""
    nav_map = {
        "dashboard": "/creator/dashboard",
        "home": "/creator/dashboard",
        "studio": "/creator/studio",
        "create": "/creator/studio",
        "gallery": "/creator/gallery",
        "booth": "/creator/booth",
        "billing": "/creator/billing",
        "plans": "/creator/billing",
        "tokens": "/creator/billing",
        "support": "/creator/support",
        "settings": "/creator/settings",
        "chat": "/creator/chat",
        "templates": "/creator/templates",
        "models": "/creator/templates",
    }
    
    intent_lower = intent.lower()
    for key, path in nav_map.items():
        if key in intent_lower:
            return path
            
    return "/creator/dashboard"  # Default fallback

router = APIRouter()

# ===== Action Handlers =====

async def navigate_handler(intent: str) -> str:
    """Navigate to a specific page based on user intent."""
    return _get_navigation_path(intent)


async def get_token_costs_handler() -> str:
    """Get information about token costs for AI models."""
    return _get_token_costs()


async def get_plan_info_handler(plan_name: str = None) -> str:
    """Get information about subscription plans."""
    return _get_plan_info(plan_name)


async def enhance_prompt_handler(prompt: str, style: str = None) -> str:
    """Enhance a prompt for better AI image generation results."""
    return _enhance_prompt(prompt, style)


async def create_event_handler() -> str:
    """Guide user to create a new event."""
    return "To create a new event, navigate to /admin/events/create. I'll help you set it up step by step!"


async def explain_feature_handler(feature: str) -> str:
    """Explain a specific feature of the platform."""
    features = {
        "tokens": "Tokens are credits used for AI generations. Different models cost different amounts: Nano Banana = 1 token, Seedream = 1 token, video models = 150+ tokens.",
        "events": "Events are photo booth experiences you create for your guests. Each event can have multiple templates with different AI transformations.",
        "templates": "Templates define how photos are transformed. They include prompts, background images, and element images for AI mixing.",
        "faceswap": "Faceswap preserves the person's face while transforming everything else. Available on Event Pro and Masters plans.",
        "branding": "Branding lets you customize your events with logos, colors, and themes. Custom themes are available on higher plans.",
        "lead_capture": "Lead capture collects guest information (email, phone) before or after photo generation. Great for marketing!",
    }
    return features.get(feature.lower(), f"I don't have specific information about '{feature}'. Can you tell me more about what you'd like to know?")


# ===== CopilotKit SDK Setup =====

def create_copilotkit_sdk(context=None):
    """Create the CopilotKit SDK with actions."""
    
    # Get user context if available
    user_role = "guest"
    if context and context.get("properties"):
        user_role = context["properties"].get("user_role", "guest")
    
    # Base actions available to all users
    actions = [
        Action(
            name="navigate",
            handler=navigate_handler,
            description="Navigate to a specific page in the application based on user intent. Use this when the user wants to go somewhere.",
            parameters=[
                {
                    "name": "intent",
                    "type": "string",
                    "description": "What the user wants to do or where they want to go (e.g., 'create event', 'billing', 'studio')",
                    "required": True,
                }
            ]
        ),
        Action(
            name="get_token_costs",
            handler=get_token_costs_handler,
            description="Get information about how many tokens different AI models cost. Use this when users ask about pricing or token usage.",
            parameters=[]
        ),
        Action(
            name="get_plan_info",
            handler=get_plan_info_handler,
            description="Get information about subscription plans and their features. Use this when users ask about plans, pricing, or what features they get.",
            parameters=[
                {
                    "name": "plan_name",
                    "type": "string",
                    "description": "Optional: specific plan name to get info about (starter, pro, masters)",
                    "required": False,
                }
            ]
        ),
        Action(
            name="enhance_prompt",
            handler=enhance_prompt_handler,
            description="Improve a prompt for better AI image generation results. Use this when users want help with their prompts.",
            parameters=[
                {
                    "name": "prompt",
                    "type": "string",
                    "description": "The current prompt to enhance",
                    "required": True,
                },
                {
                    "name": "style",
                    "type": "string",
                    "description": "Optional style preference: professional, fun, artistic, dramatic",
                    "required": False,
                }
            ]
        ),
        Action(
            name="create_event",
            handler=create_event_handler,
            description="Help the user create a new photo booth event. Use this when users want to create or set up an event.",
            parameters=[]
        ),
        Action(
            name="explain_feature",
            handler=explain_feature_handler,
            description="Explain a specific feature of the platform. Use this when users ask 'what is X' or 'how does Y work'.",
            parameters=[
                {
                    "name": "feature",
                    "type": "string",
                    "description": "The feature to explain (tokens, events, templates, faceswap, branding, lead_capture)",
                    "required": True,
                }
            ]
        ),
    ]
    
    return CopilotKitRemoteEndpoint(actions=actions)


# Create the SDK instance
sdk = CopilotKitRemoteEndpoint(
    actions=lambda context: create_copilotkit_sdk(context).actions
)

# Add the FastAPI endpoint
# This will be mounted at /copilotkit in main.py

