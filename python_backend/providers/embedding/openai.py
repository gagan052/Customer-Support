from typing import List
from langchain_openai import OpenAIEmbeddings
from ..base import EmbeddingProvider
import asyncio

class OpenAIEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str, model: str = "text-embedding-3-small", dimensions: int = 384):
        self.model = OpenAIEmbeddings(
            model=model,
            openai_api_key=api_key,
            dimensions=dimensions
        )

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Run synchronous langchain method in executor
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.model.embed_documents, texts)

    async def embed_query(self, text: str) -> List[float]:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.model.embed_query, text)
