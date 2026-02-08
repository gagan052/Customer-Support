from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class EmbeddingProvider(ABC):
    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents."""
        pass

    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        """Embed a single query."""
        pass

class VectorProvider(ABC):
    @abstractmethod
    async def upsert(self, vectors: List[Dict[str, Any]], namespace: str = ""):
        """
        Upsert vectors.
        vectors: List of dicts with keys: id, values (embedding), metadata
        namespace: The namespace to upsert into (e.g. company_id)
        """
        pass

    @abstractmethod
    async def query(self, vector: List[float], top_k: int, namespace: str = "", filter: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Query vectors.
        Returns list of matches with score, id, metadata.
        """
        pass
    
    @abstractmethod
    async def delete(self, ids: Optional[List[str]] = None, filter: Optional[Dict] = None, namespace: str = ""):
        """Delete vectors by IDs or filter."""
        pass

class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        """Generate text completion."""
        pass
    
    @abstractmethod
    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Chat completion. Messages: [{'role': 'user', 'content': '...'}, ...]"""
        pass
