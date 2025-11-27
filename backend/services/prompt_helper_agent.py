"""
Prompt Helper Service - AI-assisted prompt generation

This service helps users:
- Create effective prompts for image generation
- Enhance existing prompts
- Suggest prompts based on context (event type, template style, etc.)

Environment Variables:
- PROMPT_HELPER_MODEL: The model to use (default: gpt-4o-mini)
- OPENAI_API_KEY: Required if using OpenAI models
- GOOGLE_API_KEY: Required if using Google models
"""

import os
import json
from typing import Optional, Literal
from pathlib import Path
from pydantic import BaseModel, Field

# Load .env file if it exists (for local development)
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Configuration
PROMPT_HELPER_MODEL = os.getenv("PROMPT_HELPER_MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

print(f"🤖 Prompt Helper Model: {PROMPT_HELPER_MODEL}")
print(f"🔑 OpenAI API Key: {'✅ Set' if OPENAI_API_KEY else '❌ Not set'}")
print(f"🔑 Google API Key: {'✅ Set' if GOOGLE_API_KEY else '❌ Not set'}")


class PromptSuggestion(BaseModel):
    """Structured output for prompt suggestions"""
    enhanced_prompt: str = Field(description="The enhanced or generated prompt")
    explanation: str = Field(description="Brief explanation of the changes/suggestions")
    tips: list[str] = Field(default_factory=list, description="Additional tips for better results")
    alternative_prompts: list[str] = Field(default_factory=list, description="2-3 alternative prompt variations")


# System prompts for different sections
SECTION_INSTRUCTIONS = {
    "template": """You are an expert AI image generation prompt engineer specializing in photo booth experiences.
Your task is to help create prompts that will transform photos using AI models like Seedream, Imagen, and Flux.

Key principles for photo booth prompts:
- Focus on COMPOSITING the person from the original photo into new scenes
- ALWAYS preserve the person's face, expression, and likeness from the original photo
- Use clear language about keeping the original person: "Keep the person from the original photo", "Preserve the subject's face and features"
- Describe the desired background, style, and atmosphere
- Include lighting and mood descriptors
- Avoid overly complex prompts - clarity is key

Example good prompts:
- "Keep the person from the original photo and place them in a futuristic cityscape at sunset. Preserve their face and expression. Add dramatic lighting with neon reflections."
- "Transform the background into a vintage 1920s setting. Keep the person's likeness but add sepia tones, film grain, and art deco elements around them."
- "Composite the original person into a magical forest scene with glowing fireflies and soft ethereal lighting. Maintain their exact appearance."
""",
    
    "description": """You are helping write event descriptions for AI photo booth experiences.
Create engaging, clear descriptions that explain what guests will experience.
Keep descriptions concise but exciting. Mention the AI transformation aspect.
""",
    
    "badge": """You are helping create prompts for AI-generated event badges.
These prompts transform attendee photos into stylized badge portraits.
Focus on:
- Professional or themed transformations
- Consistent style across all badges
- Clear face preservation
- Background suitable for badges (clean, not busy)
""",
    
    "video": """You are helping create prompts for AI video generation from images.
These prompts guide how a still image should be animated.
Focus on:
- Subtle, natural movements
- Camera motion suggestions
- Atmosphere and mood
- Keep movements realistic and not too dramatic
"""
}


async def _call_openai(system_prompt: str, user_message: str) -> dict:
    """Call OpenAI API directly"""
    import httpx
    
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not set")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": PROMPT_HELPER_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.7,
                "max_tokens": 1000
            },
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)


async def _call_google(system_prompt: str, user_message: str) -> dict:
    """Call Google Gemini API directly"""
    import httpx
    
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY not set")
    
    # Use gemini-2.0-flash or gemini-1.5-flash
    model = "gemini-2.0-flash"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            headers={"Content-Type": "application/json"},
            params={"key": GOOGLE_API_KEY},
            json={
                "contents": [{
                    "parts": [{"text": f"{system_prompt}\n\nUser request: {user_message}\n\nRespond with a JSON object containing: enhanced_prompt, explanation, tips (array), alternative_prompts (array)"}]
                }],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1000,
                    "responseMimeType": "application/json"
                }
            },
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
        content = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(content)


async def generate_prompt_suggestion(
    user_request: str,
    section: Literal["template", "description", "badge", "video"] = "template",
    current_prompt: Optional[str] = None,
    event_type: Optional[str] = None,
    style_hints: Optional[str] = None,
) -> PromptSuggestion:
    """
    Generate or enhance a prompt using AI
    
    Args:
        user_request: What the user wants
        section: Which section this prompt is for
        current_prompt: Existing prompt to enhance (optional)
        event_type: Type of event (optional)
        style_hints: Style preferences (optional)
    
    Returns:
        PromptSuggestion with enhanced prompt and tips
    """
    # Build system prompt
    system_prompt = SECTION_INSTRUCTIONS.get(section, SECTION_INSTRUCTIONS["template"])
    
    # Build user message with context
    parts = [f"User request: {user_request}"]
    
    if current_prompt:
        parts.append(f"\nCurrent prompt to enhance: \"{current_prompt}\"")
        parts.append("Please improve this prompt while keeping its core intent.")
    
    if event_type:
        parts.append(f"\nEvent type: {event_type}")
    
    if style_hints:
        parts.append(f"\nDesired style: {style_hints}")
    
    parts.append("\n\nRespond with a JSON object containing:")
    parts.append("- enhanced_prompt: The improved/generated prompt")
    parts.append("- explanation: Brief explanation of what you did")
    parts.append("- tips: Array of 2-3 tips for better results")
    parts.append("- alternative_prompts: Array of 2-3 alternative prompt variations")
    
    user_message = "\n".join(parts)
    
    # Try OpenAI first, fall back to Google
    try:
        if OPENAI_API_KEY and "gpt" in PROMPT_HELPER_MODEL.lower():
            result = await _call_openai(system_prompt, user_message)
        elif GOOGLE_API_KEY:
            result = await _call_google(system_prompt, user_message)
        elif OPENAI_API_KEY:
            result = await _call_openai(system_prompt, user_message)
        else:
            raise ValueError("No API key configured. Set OPENAI_API_KEY or GOOGLE_API_KEY")
    except Exception as e:
        print(f"❌ AI call failed: {e}")
        # Try the other provider
        try:
            if GOOGLE_API_KEY and "gpt" in PROMPT_HELPER_MODEL.lower():
                result = await _call_google(system_prompt, user_message)
            elif OPENAI_API_KEY:
                result = await _call_openai(system_prompt, user_message)
            else:
                raise
        except Exception as e2:
            print(f"❌ Fallback also failed: {e2}")
            raise e
    
    return PromptSuggestion(
        enhanced_prompt=result.get("enhanced_prompt", user_request),
        explanation=result.get("explanation", "Enhanced your prompt"),
        tips=result.get("tips", []),
        alternative_prompts=result.get("alternative_prompts", [])
    )


# Quick suggestion categories for UI
QUICK_SUGGESTIONS = {
    "template": {
        "styles": [
            {"label": "Professional", "prompt_hint": "corporate, clean, professional lighting"},
            {"label": "Artistic", "prompt_hint": "artistic, painterly, creative composition"},
            {"label": "Futuristic", "prompt_hint": "sci-fi, neon, cyberpunk aesthetics"},
            {"label": "Vintage", "prompt_hint": "retro, film grain, nostalgic feel"},
            {"label": "Fantasy", "prompt_hint": "magical, ethereal, fantasy world"},
            {"label": "Minimalist", "prompt_hint": "clean, simple, modern minimalism"},
        ],
        "moods": [
            {"label": "Dramatic", "prompt_hint": "dramatic lighting, high contrast, cinematic"},
            {"label": "Cheerful", "prompt_hint": "bright, colorful, happy atmosphere"},
            {"label": "Mysterious", "prompt_hint": "moody, shadows, enigmatic feel"},
            {"label": "Elegant", "prompt_hint": "sophisticated, luxurious, refined"},
        ],
        "backgrounds": [
            {"label": "Urban", "prompt_hint": "city skyline, urban environment"},
            {"label": "Nature", "prompt_hint": "natural landscape, outdoor setting"},
            {"label": "Studio", "prompt_hint": "professional studio backdrop"},
            {"label": "Abstract", "prompt_hint": "abstract patterns, geometric shapes"},
        ],
    },
    "video": {
        "motions": [
            {"label": "Subtle Zoom", "prompt_hint": "slow zoom in, focus on subject"},
            {"label": "Pan", "prompt_hint": "gentle pan across the scene"},
            {"label": "Parallax", "prompt_hint": "parallax depth effect, layers moving"},
            {"label": "Breathing", "prompt_hint": "subtle breathing motion, living photo"},
        ],
        "atmospheres": [
            {"label": "Dreamy", "prompt_hint": "soft focus transitions, dreamy atmosphere"},
            {"label": "Dynamic", "prompt_hint": "energetic movement, dynamic camera"},
            {"label": "Calm", "prompt_hint": "slow, peaceful, meditative motion"},
        ],
    },
}


def get_quick_suggestions(section: str = "template") -> dict:
    """Get quick suggestion categories for the UI"""
    return QUICK_SUGGESTIONS.get(section, QUICK_SUGGESTIONS["template"])
