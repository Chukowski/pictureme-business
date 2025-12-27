"""
Assistant API Router

Provides endpoints for the AI assistant and CopilotKit integration.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, List, Any

router = APIRouter(
    prefix="/api/akito",
    tags=["Assistant"],
)


class ChatMessage(BaseModel):
    """A chat message"""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request body for chat"""
    message: str = Field(..., description="The user's message", min_length=1)
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    current_page: Optional[str] = None
    user_name: Optional[str] = None
    message_history: Optional[List[ChatMessage]] = None
    
    class Config:
        extra = "ignore"  # Ignore extra fields from frontend


class ChatResponse(BaseModel):
    """Response from Assistant"""
    response: str
    suggestions: List[str] = Field(default_factory=list)


class ActionRequest(BaseModel):
    """Request for a specific action"""
    action: str  # "navigate", "enhance_prompt", "explain_feature"
    parameters: dict = Field(default_factory=dict)
    user_id: Optional[str] = None
    user_role: Optional[str] = None
    current_page: Optional[str] = None


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant_endpoint(request: Request):
    """
    Chat with the AI assistant.
    
    The assistant can help with:
    - Navigation suggestions
    - Prompt creation and enhancement
    - Feature explanations
    - Event setup guidance
    - Troubleshooting
    """
    try:
        # Parse raw body for debugging
        body = await request.json()
        print(f"🤖 Assistant received: {body}")
        
        # Validate manually
        message = body.get("message", "").strip()
        if not message:
            raise HTTPException(status_code=422, detail="Message is required")
        
        user_id = body.get("user_id")
        user_role = body.get("user_role")
        current_page = body.get("current_page")
        user_name = body.get("user_name")
        is_authenticated = body.get("is_authenticated", False)
        agent_tier = body.get("agent_tier", "standard")
        raw_history = body.get("message_history", [])
        
        # Log status
        print(f"   🔐 Auth status: {'Authenticated' if is_authenticated else 'Guest'} | Agent: {agent_tier} | User: {user_id} | Role: {user_role}")
        
        # Convert message history to the format expected by the agent
        history = None
        if raw_history:
            history = []
            for msg in raw_history:
                if isinstance(msg, dict):
                    history.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        
        # Select agent based on tier
        if agent_tier == "business":
            from agents.business_agent import chat_with_business_agent
            response = await chat_with_business_agent(
                message=message,
                user_id=user_id,
                user_role=user_role,
                current_page=current_page,
                user_name=user_name,
                message_history=history
            )
        else:
            from agents.creator_agent import chat_with_creator_agent
            response = await chat_with_creator_agent(
                message=message,
                user_id=user_id,
                user_role=user_role,
                current_page=current_page,
                user_name=user_name,
                message_history=history,
                is_authenticated=is_authenticated
            )
        
        # Generate contextual suggestions based on auth status
        suggestions = _generate_suggestions(message, current_page, is_authenticated)
        
        return ChatResponse(response=response, suggestions=suggestions)
    except Exception as e:
        print(f"❌ Error in Assistant chat: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to chat with Assistant: {str(e)}")


@router.post("/action")
async def execute_action(request: ActionRequest):
    """
    Execute a specific Assistant action.
    
    Actions:
    - navigate: Get navigation path
    - enhance_prompt: Improve a prompt
    - explain_feature: Get feature explanation
    """
    try:
        from agents.creator_agent import creator_agent, AssistantContext
        
        context = AssistantContext(
            user_id=request.user_id,
            user_role=request.user_role,
            current_page=request.current_page
        )
        
        if request.action == "navigate":
            intent = request.parameters.get("intent", "")
            result = await creator_agent.run(
                f"Help me navigate to: {intent}",
                deps=context
            )
            return {"action": "navigate", "result": result.output}
        
        elif request.action == "enhance_prompt":
            prompt = request.parameters.get("prompt", "")
            style = request.parameters.get("style")
            result = await creator_agent.run(
                f"Enhance this prompt for AI image generation: {prompt}" + (f" Style: {style}" if style else ""),
                deps=context
            )
            return {"action": "enhance_prompt", "result": result.output}
        
        elif request.action == "explain_feature":
            feature = request.parameters.get("feature", "")
            result = await creator_agent.run(
                f"Explain the feature: {feature}",
                deps=context
            )
            return {"action": "explain_feature", "result": result.output}
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: {request.action}")
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error executing Assistant action: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to execute action: {str(e)}")


@router.get("/suggestions")
async def get_contextual_suggestions(current_page: Optional[str] = None):
    """Get contextual suggestions based on the current page."""
    suggestions = _generate_suggestions("", current_page)
    return {"suggestions": suggestions}


@router.get("/health")
async def health_check():
    """Check if Assistant is available."""
    return {"status": "ok", "agent": "assistant", "version": "1.0.0"}


def _generate_suggestions(message: str, current_page: Optional[str], is_authenticated: bool = False) -> List[str]:
    """Generate contextual suggestions based on message, page, and auth status."""
    suggestions = []
    
    # Landing page / public pages - guest mode
    is_landing = not current_page or current_page in ["/", "/landing", ""]
    
    if not is_authenticated or is_landing:
        # Guest suggestions - focus on info and registration
        suggestions = [
            "¿Qué es PictureMe.Now?",
            "¿Cuáles son los planes disponibles?",
            "¿Cómo me registro?",
        ]
    elif current_page:
        # Authenticated user suggestions based on page
        if "events/create" in current_page or "events/edit" in current_page:
            suggestions = [
                "Ayúdame a crear un prompt",
                "¿Cuál es la diferencia entre modos de evento?",
                "¿Cómo añado imágenes de elementos?",
            ]
        elif "studio" in current_page:
            suggestions = [
                "Mejora mi prompt actual",
                "¿Qué modelos hay disponibles?",
                "¿Cuántos tokens cuesta esto?",
            ]
        elif "billing" in current_page:
            suggestions = [
                "Compara los planes",
                "¿Qué incluye Event Pro?",
                "¿Cómo funcionan los tokens?",
            ]
        elif "tokens" in current_page:
            suggestions = [
                "¿Cuántos tokens necesito?",
                "¿Cuál es el mejor paquete?",
                "¿Cuánto cuestan los videos?",
            ]
        elif "/admin/auth" in current_page:
            suggestions = [
                "¿Olvidé mi contraseña?",
                "¿Cómo me registro?",
                "¿Qué planes hay disponibles?",
            ]
        elif "/admin" in current_page:
            suggestions = [
                "Llévame a crear un evento",
                "¿Cómo funcionan los tokens?",
                "Ver mis estadísticas",
            ]
        else:
            suggestions = [
                "¿Qué puedo hacer aquí?",
                "Llévame al dashboard",
                "Ayúdame a empezar",
            ]
    else:
        suggestions = [
            "¿Qué es PictureMe.Now?",
            "¿Cuáles son los planes disponibles?",
            "¿Cómo me registro?",
        ]
    
    return suggestions
