# Agents module
from .creator_agent import (
    chat_with_creator_agent as chat_with_akito,
    AssistantContext as AkitoContext,
    PYDANTIC_AI_AVAILABLE
)

# Only export creator_agent if pydantic-ai is available
if PYDANTIC_AI_AVAILABLE:
    from .creator_agent import creator_agent as akito_agent
    __all__ = ["akito_agent", "chat_with_akito", "AkitoContext", "PYDANTIC_AI_AVAILABLE"]
else:
    __all__ = ["chat_with_akito", "AkitoContext", "PYDANTIC_AI_AVAILABLE"]
