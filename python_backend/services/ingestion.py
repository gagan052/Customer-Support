from fastapi import UploadFile
from typing import Optional
import uuid
from providers.factory import ProviderFactory
from auth import UserContext
from utils import process_file
from supabase import Client

class IngestionService:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client

    async def ingest_file(
        self, 
        file: UploadFile, 
        provider_config: dict, 
        user: UserContext
    ):
        # 1. Create Document Record
        doc_entry = {
            "name": file.filename,
            "file_type": file.filename.split('.')[-1] if '.' in file.filename else "txt",
            "company_id": user.company_id,
            "status": "pending",
            "metadata": {"uploaded_by": user.user_id}
        }
        res = self.supabase.table("knowledge_documents").insert(doc_entry).execute()
        if not res.data:
            raise Exception("Failed to create document record")
        document_id = res.data[0]['id']

        try:
            # 2. Process File
            content = await file.read()
            chunks = process_file(content, file.filename)
            texts = [c.page_content for c in chunks]
            
            if not texts:
                raise Exception("No text extracted")

            # 3. Embed
            embed_provider = ProviderFactory.get_embedding_provider(
                provider_config.get("embedding_provider", "openai"),
                {"api_key": provider_config["embedding_api_key"]}
            )
            embeddings = await embed_provider.embed_documents(texts)
            
            # 4. Store Vector
            vector_provider = ProviderFactory.get_vector_provider(
                provider_config.get("vector_provider", "pinecone"),
                {"api_key": provider_config["vector_api_key"]}
            )
            
            vectors = []
            for i, (text, emb) in enumerate(zip(texts, embeddings)):
                 vectors.append({
                     "id": f"{document_id}_{i}",
                     "values": emb,
                     "metadata": {
                         "document_id": document_id,
                         "content": text,
                         "source": file.filename,
                         "company_id": user.company_id
                     }
                 })
                 
            await vector_provider.upsert(vectors, namespace=user.company_id)
            
            # 5. Update Status
            self.supabase.table("knowledge_documents").update({
                "status": "indexed",
                "chunk_count": len(chunks)
            }).eq("id", document_id).execute()
            
            # 6. Audit Log
            try:
                self.supabase.table("audit_logs").insert({
                    "company_id": user.company_id,
                    "user_id": user.user_id if user.user_id != "api_key" else None,
                    "action": "ingest_document",
                    "resource_type": "knowledge_documents",
                    "resource_id": document_id,
                    "details": {"filename": file.filename, "chunks": len(chunks)}
                }).execute()
            except Exception as e:
                print(f"Audit log error: {e}")

            return {"status": "success", "document_id": document_id, "chunks": len(chunks)}

        except Exception as e:
            print(f"Ingestion error: {e}")
            try:
                self.supabase.table("knowledge_documents").update({
                    "status": "error",
                    "metadata": {"error": str(e)}
                }).eq("id", document_id).execute()
            except:
                pass
            raise e
