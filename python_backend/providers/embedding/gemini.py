from typing import List
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from ..base import EmbeddingProvider
import asyncio

class GeminiEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str, model: str = "models/text-embedding-004"):
        self.model = GoogleGenerativeAIEmbeddings(
            model=model,
            google_api_key=api_key
        )
        self.target_dim = 384 # Gemini 004 is 768, we need to truncate/pad

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        loop = asyncio.get_event_loop()
        
        # Gemini Free Tier is 15 RPM. We must be very conservative.
        # Batch size 5, delay 10s = ~6 requests per minute.
        batch_size = 5
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            # Add delay before batch (except first)
            if i > 0:
                await asyncio.sleep(10)
            
            try:
                embeddings = await loop.run_in_executor(None, self.model.embed_documents, batch)
                all_embeddings.extend(embeddings)
            except Exception as e:
                print(f"Gemini embedding error: {e}")
                # If one batch fails, we probably should fail the whole thing or return partial?
                # Raising ensures the caller knows something went wrong.
                raise e

        return [self._process_dim(e) for e in all_embeddings]

    async def embed_query(self, text: str) -> List[float]:
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(None, self.model.embed_query, text)
        return self._process_dim(embedding)

    def _process_dim(self, embedding: List[float]) -> List[float]:
        if len(embedding) >= self.target_dim:
            return embedding[:self.target_dim]
        return embedding + [0.0] * (self.target_dim - len(embedding))
