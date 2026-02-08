import os
import time
from typing import List, Dict, Any, Optional
from pinecone import Pinecone, ServerlessSpec
from ..base import VectorProvider

class PineconeVectorProvider(VectorProvider):
    def __init__(self, api_key: str, index_name: str = "knowledge-base", dimension: int = 384):
        self.pc = Pinecone(api_key=api_key)
        self.index_name = index_name
        self.dimension = dimension
        self._ensure_index()
        self.index = self.pc.Index(index_name)

    def _ensure_index(self):
        try:
            existing_indexes = [i.name for i in self.pc.list_indexes()]
            if self.index_name not in existing_indexes:
                print(f"Creating Pinecone index: {self.index_name}")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                # Wait for index to be ready
                while not self.pc.describe_index(self.index_name).status['ready']:
                    time.sleep(1)
        except Exception as e:
            print(f"Error checking/creating Pinecone index: {e}")
            # Continue, assuming it might work or is handled elsewhere
            pass

    async def upsert(self, vectors: List[Dict[str, Any]], namespace: str = ""):
        # Pinecone recommends batches of 100 or less
        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            try:
                self.index.upsert(vectors=batch, namespace=namespace)
            except Exception as e:
                print(f"Error upserting to Pinecone (namespace={namespace}): {e}")
                raise e

    async def query(self, vector: List[float], top_k: int, namespace: str = "", filter: Optional[Dict] = None) -> List[Dict[str, Any]]:
        try:
            result = self.index.query(
                vector=vector,
                top_k=top_k,
                namespace=namespace,
                filter=filter,
                include_metadata=True
            )
            
            matches = []
            for match in result.matches:
                matches.append({
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata,
                    "content": match.metadata.get("content", "") if match.metadata else ""
                })
            return matches
        except Exception as e:
            print(f"Error querying Pinecone (namespace={namespace}): {e}")
            return []

    async def delete(self, ids: Optional[List[str]] = None, filter: Optional[Dict] = None, namespace: str = ""):
        try:
            if ids:
                self.index.delete(ids=ids, namespace=namespace)
            elif filter:
                self.index.delete(filter=filter, namespace=namespace)
            elif namespace:
                self.index.delete(delete_all=True, namespace=namespace)
        except Exception as e:
             print(f"Error deleting from Pinecone (namespace={namespace}): {e}")
