import os
from fastapi import UploadFile
from typing import Optional, List
from auth import UserContext
from utils import process_file, generate_embeddings
from supabase import Client
from postgrest.exceptions import APIError

class IngestionService:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client

    async def ingest_file(
        self, 
        file: UploadFile, 
        provider_config: dict, 
        user: UserContext,
        document_id: Optional[str] = None
    ):
        # 1. Create or Get Document Record
        if document_id:
            try:
                # Check ownership
                try:
                    res = self.supabase.table("knowledge_documents").select("id").eq("id", document_id).eq("company_id", user.company_id).execute()
                except APIError as e:
                    if '42703' in str(e): # column does not exist
                        res = self.supabase.table("knowledge_documents").select("id").eq("id", document_id).execute()
                    else:
                        raise e

                if not res.data:
                    raise Exception("Document not found or access denied")
                
                self.supabase.table("knowledge_documents").update({
                    "status": "pending",
                    "metadata": {"uploaded_by": user.user_id, "retry": True}
                }).eq("id", document_id).execute()
            except APIError as e:
                raise Exception(f"Database error: {str(e)}")
        else:
            doc_entry = {
                "name": file.filename,
                "file_type": file.filename.split('.')[-1] if '.' in file.filename else "txt",
                "status": "pending",
                "metadata": {"uploaded_by": user.user_id},
                "company_id": user.company_id
            }
            try:
                res = self.supabase.table("knowledge_documents").insert(doc_entry).execute()
                if not res.data:
                    raise Exception("Failed to create document record")
                document_id = res.data[0]['id']
            except APIError as e:
                if '42703' in str(e): # column does not exist
                     doc_entry.pop("company_id")
                     res = self.supabase.table("knowledge_documents").insert(doc_entry).execute()
                     if not res.data:
                        raise Exception("Failed to create document record (legacy)")
                     document_id = res.data[0]['id']
                else:
                    raise Exception(f"Database error creating document: {str(e)}")

        try:
            # 2. Process File
            content = await file.read()
            chunks = process_file(content, file.filename)
            texts = [c.page_content for c in chunks]
            
            if not texts:
                raise Exception("No text extracted")

            # 3. Embed (Using Gemini)
            gemini_key = provider_config.get("gemini_api_key") or os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
            
            if not gemini_key:
                # Fallback to provider_config if key is there (legacy format)
                gemini_key = provider_config.get("embedding_api_key")
                
            if not gemini_key:
                raise Exception("Gemini API Key is required. Please set VITE_GEMINI_API_KEY env var.")

            embeddings = await generate_embeddings(texts, gemini_key)
            
            # 4. Store Vectors in Supabase
            vectors_data = []
            for i, (text, emb) in enumerate(zip(texts, embeddings)):
                vectors_data.append({
                    "document_id": document_id,
                    "content": text,
                    "embedding": emb,
                    "company_id": user.company_id
                })
            
            # Insert in batches to avoid payload limit
            batch_size = 50
            for i in range(0, len(vectors_data), batch_size):
                batch = vectors_data[i:i + batch_size]
                try:
                    self.supabase.table("document_chunks").insert(batch).execute()
                except APIError as e:
                    # Check for column missing error (42703 or PGRST204)
                    if '42703' in str(e) or 'PGRST204' in str(e) or "Could not find the 'company_id' column" in str(e):
                         # Retry batch without company_id
                         for item in batch:
                             item.pop("company_id")
                         self.supabase.table("document_chunks").insert(batch).execute()
                    else:
                        raise e

            # 5. Update Document Status
            self.supabase.table("knowledge_documents").update({
                "status": "indexed",
                "chunk_count": len(texts)
            }).eq("id", document_id).execute()
            
            return {"status": "success", "document_id": document_id, "chunks": len(texts)}

        except Exception as e:
            # Mark as error
            if document_id:
                self.supabase.table("knowledge_documents").update({
                    "status": "error",
                    "metadata": {"error": str(e)}
                }).eq("id", document_id).execute()
            raise e
