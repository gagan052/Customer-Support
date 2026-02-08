from typing import List, Dict, Any, Optional
from supabase import Client, create_client
from ..base import VectorProvider
import os

class SupabaseVectorProvider(VectorProvider):
    def __init__(self, url: str, key: str):
        self.client: Client = create_client(url, key)

    async def upsert(self, vectors: List[Dict[str, Any]], namespace: str = ""):
        """
        Upserts vectors into the 'document_chunks' table.
        The 'vectors' list is expected to have:
        - id
        - values (embedding)
        - metadata (which should contain document_id, content, etc.)
        """
        rows = []
        for v in vectors:
            metadata = v.get("metadata", {})
            row = {
                # We might need to handle ID generation if not provided, but usually it is.
                # If 'id' is a string like "docId_chunkIndex", we can use that if the DB supports text IDs or we map it.
                # The schema uses uuid for id. If the passed ID is not UUID, we might have issues.
                # However, IngestionService generates IDs like "doc_id_0". This is not a UUID.
                # The schema expects 'id' to be UUID. 
                # Strategy: We can let Supabase generate the ID, or we hash the string ID to UUID.
                # But 'document_chunks' table has 'id' as UUID.
                # Let's assume for Supabase provider we ignore the input ID and let DB generate it, 
                # OR we try to cast.
                # Ideally, we should change the schema to allow text IDs or change ingestion to not care.
                # For now, let's map the fields.
                "document_id": metadata.get("document_id"),
                "content": metadata.get("content"),
                "embedding": v["values"],
                "company_id": namespace
            }
            rows.append(row)
            
        if rows:
            self.client.table("document_chunks").insert(rows).execute()

    async def query(self, vector: List[float], top_k: int, namespace: str = "", filter: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Calls the 'match_documents' RPC.
        """
        params = {
            "query_embedding": vector,
            "match_threshold": 0.5, # Default threshold
            "match_count": top_k,
            "filter_company_id": namespace
        }
        
        try:
            res = self.client.rpc("match_documents", params).execute()
            matches = []
            for item in res.data:
                matches.append({
                    "id": item["id"],
                    "score": item["similarity"],
                    "metadata": {
                        "document_id": item["document_id"],
                        "content": item["content"]
                        # match_documents RPC might need to return more metadata if needed
                    },
                    "content": item["content"]
                })
            return matches
        except Exception as e:
            print(f"Supabase vector query error: {e}")
            return []

    async def delete(self, ids: List[str], namespace: str = ""):
        # Deleting by document_id is common, or by chunk ID.
        # This implementation assumes IDs are chunk IDs.
        if ids:
            self.client.table("document_chunks").delete().in_("id", ids).eq("company_id", namespace).execute()
