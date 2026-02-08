from typing import Dict, Any, Optional
from .base import EmbeddingProvider, VectorProvider, LLMProvider
from .embedding.openai import OpenAIEmbeddingProvider
from .embedding.gemini import GeminiEmbeddingProvider
from .vector.pinecone import PineconeVectorProvider
from .vector.supabase import SupabaseVectorProvider
from .llm.openai import OpenAIProvider
from .llm.gemini import GeminiProvider
import os

class ProviderFactory:
    @staticmethod
    def get_embedding_provider(name: str, config: Dict[str, Any]) -> EmbeddingProvider:
        if name == "openai":
            return OpenAIEmbeddingProvider(api_key=config.get("api_key"))
        elif name == "gemini":
            return GeminiEmbeddingProvider(api_key=config.get("api_key"))
        else:
            raise ValueError(f"Unknown embedding provider: {name}")

    @staticmethod
    def get_vector_provider(name: str, config: Dict[str, Any]) -> VectorProvider:
        if name == "pinecone":
            return PineconeVectorProvider(
                api_key=config.get("api_key"),
                index_name=config.get("index_name", "rag-index")
            )
        elif name == "supabase":
            return SupabaseVectorProvider(
                url=config.get("url", os.getenv("SUPABASE_URL")),
                key=config.get("key", os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
            )
        else:
            raise ValueError(f"Unknown vector provider: {name}")

    @staticmethod
    def get_llm_provider(name: str, config: Dict[str, Any]) -> LLMProvider:
        if name == "openai":
            return OpenAIProvider(api_key=config.get("api_key"))
        elif name == "gemini":
            return GeminiProvider(api_key=config.get("api_key"))
        else:
            raise ValueError(f"Unknown LLM provider: {name}")
