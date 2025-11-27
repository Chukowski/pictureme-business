# Agents module
from .akito_agent import (
    chat_with_akito,
    chat_with_akito_sync,
    AkitoContext,
    PYDANTIC_AI_AVAILABLE
)

# Only export akito_agent if pydantic-ai is available
if PYDANTIC_AI_AVAILABLE:
    from .akito_agent import akito_agent
    __all__ = ["akito_agent", "chat_with_akito", "chat_with_akito_sync", "AkitoContext", "PYDANTIC_AI_AVAILABLE"]
else:
    __all__ = ["chat_with_akito", "chat_with_akito_sync", "AkitoContext", "PYDANTIC_AI_AVAILABLE"]
