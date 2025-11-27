"""
Prompt Helper API Router

Provides endpoints for AI-assisted prompt generation and enhancement
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal

from services.prompt_helper_agent import (
    generate_prompt_suggestion,
    get_quick_suggestions,
    PromptSuggestion,
)

router = APIRouter(
    prefix="/api/prompt-helper",
    tags=["Prompt Helper"],
)


class PromptRequest(BaseModel):
    """Request body for prompt generation"""
    user_request: str = Field(..., description="What the user wants", min_length=3)
    section: Literal["template", "description", "badge", "video"] = Field(
        default="template",
        description="Which section this prompt is for"
    )
    current_prompt: Optional[str] = Field(
        default=None,
        description="Existing prompt to enhance"
    )
    event_type: Optional[str] = Field(
        default=None,
        description="Type of event (e.g., corporate, wedding, party)"
    )
    style_hints: Optional[str] = Field(
        default=None,
        description="Style preferences (e.g., professional, fun, artistic)"
    )


class QuickEnhanceRequest(BaseModel):
    """Request for quick prompt enhancement"""
    prompt: str = Field(..., description="The prompt to enhance", min_length=3)
    enhancement_type: Literal["more_detail", "more_dramatic", "more_professional", "more_creative", "simplify"] = Field(
        default="more_detail",
        description="Type of enhancement to apply"
    )


@router.post("/generate", response_model=PromptSuggestion)
async def generate_prompt(request: PromptRequest):
    """
    Generate or enhance a prompt using AI
    
    This endpoint uses a Pydantic AI agent to help users create effective prompts
    for image/video generation.
    """
    try:
        result = await generate_prompt_suggestion(
            user_request=request.user_request,
            section=request.section,
            current_prompt=request.current_prompt,
            event_type=request.event_type,
            style_hints=request.style_hints,
        )
        return result
    except Exception as e:
        print(f"❌ Error generating prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate prompt: {str(e)}")


@router.post("/quick-enhance", response_model=PromptSuggestion)
async def quick_enhance_prompt(request: QuickEnhanceRequest):
    """
    Quickly enhance a prompt with a specific improvement type
    """
    enhancement_requests = {
        "more_detail": "Add more specific details and descriptors to make the image generation more precise",
        "more_dramatic": "Make this prompt more dramatic with stronger lighting, contrast, and atmosphere",
        "more_professional": "Make this prompt more professional and corporate-friendly",
        "more_creative": "Make this prompt more creative and artistic with unique visual elements",
        "simplify": "Simplify this prompt while keeping the core concept, make it cleaner and more focused",
    }
    
    try:
        result = await generate_prompt_suggestion(
            user_request=enhancement_requests[request.enhancement_type],
            section="template",
            current_prompt=request.prompt,
        )
        return result
    except Exception as e:
        print(f"❌ Error enhancing prompt: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to enhance prompt: {str(e)}")


@router.get("/suggestions/{section}")
async def get_suggestions(section: str = "template"):
    """
    Get quick suggestion categories for the UI
    
    Returns predefined styles, moods, and other options that users can click
    to quickly modify their prompts.
    """
    return get_quick_suggestions(section)


@router.get("/health")
async def health_check():
    """Check if the prompt helper service is available"""
    return {"status": "ok", "service": "prompt-helper"}

