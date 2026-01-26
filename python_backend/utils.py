import os
import io
from typing import List, Optional, Tuple
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_openai import OpenAIEmbeddings
from supabase import create_client, Client, ClientOptions
import tempfile
import time
import asyncio
from pinecone import Pinecone, ServerlessSpec

def get_supabase_client(url: str, key: str, access_token: Optional[str] = None) -> Client:
    headers = {}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    
    return create_client(url, key, options=ClientOptions(headers=headers))

def _merge_metadata(existing: Optional[dict], updates: Optional[dict]) -> dict:
    base = existing or {}
    if not isinstance(base, dict):
        base = {}
    extra = updates or {}
    if not isinstance(extra, dict):
        extra = {}
    return {**base, **extra}

def get_pinecone_client() -> Optional[Pinecone]:
    api_key = os.getenv("VITE_PINECONE_API_KEY")
    if not api_key:
        return None
    return Pinecone(api_key=api_key)

def process_file(file_content: bytes, file_name: str) -> List[Document]:
    """
    Extracts text from a file (PDF or Text) and splits it into chunks.
    """
    file_ext = os.path.splitext(file_name)[1].lower()
    
    if file_ext == '.pdf':
        # Create a temp file because PyPDFLoader expects a file path
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(file_content)
            tmp_path = tmp_file.name
        
        try:
            loader = PyPDFLoader(tmp_path)
            docs = loader.load()
            print(f"Extracted {len(docs)} pages from PDF")
        except Exception as e:
            print(f"Error loading PDF: {e}")
            docs = []
        finally:
            os.remove(tmp_path)
            
    else:
        # Assume text-based
        try:
            text = file_content.decode('utf-8', errors='ignore')
            # Check if text is empty or whitespace
            if not text.strip():
                print("Warning: Extracted text is empty")
                docs = []
            else:
                print(f"Extracted text length: {len(text)} chars")
                docs = [Document(page_content=text, metadata={"source": file_name})]
        except Exception as e:
            print(f"Error decoding text file: {e}")
            docs = []

    if not docs:
        print("No documents created from file content")
        return []

    # Split text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    
    split_docs = text_splitter.split_documents(docs)
    print(f"Split documents into {len(split_docs)} chunks")
    return split_docs

async def generate_embeddings(texts: List[str], provider: str, api_key: str) -> List[List[float]]:
    """
    Generates embeddings for the given texts using the specified provider.
    Handles dimension mismatch by padding if necessary.
    Target dimension: 384 (matches Supabase vector schema).
    Includes rate limiting and retry logic.
    """
    
    async def embed_batch_with_retry(model, batch_texts, is_gemini=False):
        max_retries = 5
        base_delay = 2 # seconds
        
        for attempt in range(max_retries):
            try:
                # Add a small delay between requests to be polite
                if attempt == 0:
                    await asyncio.sleep(0.5)
                
                # Use run_in_executor for synchronous embed_documents call to avoid blocking
                loop = asyncio.get_event_loop()
                embeddings = await loop.run_in_executor(None, model.embed_documents, batch_texts)
                return embeddings
            except Exception as e:
                error_str = str(e)
                # Check for rate limit errors (429 or RESOURCE_EXHAUSTED)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    if attempt < max_retries - 1:
                        wait_time = base_delay * (2 ** attempt) # Exponential backoff
                        print(f"Rate limit hit. Retrying in {wait_time}s... (Attempt {attempt + 1}/{max_retries})")
                        await asyncio.sleep(wait_time)
                        continue
                
                # If we've exhausted retries on a rate-limit error, do NOT fall back to mock embeddings
                # Pinecone rejects zero vectors. Raise an error instead.
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    print("Rate limit exhausted. Aborting.")
                    raise Exception("Rate limit exhausted for embedding provider. Please try again later.")

                # Re-raise other errors
                print(f"Embedding error: {e}")
                raise e

    if provider == 'gemini':
        embeddings_model = GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=api_key
        )
        
        # Gemini text-embedding-004 is 768 dims.
        # Process in batches to avoid rate limits
        # Gemini Free Tier is 15 RPM. We must be very conservative.
        # Batch size 5, delay 10s = ~6 requests per minute.
        batch_size = 5
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            # Add delay before batch (except first)
            if i > 0:
                print(f"Sleeping 10s for Gemini rate limit... ({i}/{len(texts)})")
                await asyncio.sleep(10)
                
            batch_embeddings = await embed_batch_with_retry(embeddings_model, batch, is_gemini=True)
            all_embeddings.extend(batch_embeddings)
        
        # Convert to 384-dimensional vectors (truncate or pad as needed)
        target_dim = 384
        processed_embeddings: List[List[float]] = []
        for emb in all_embeddings:
            if len(emb) >= target_dim:
                processed_embeddings.append(emb[:target_dim])
            else:
                processed_embeddings.append(emb + [0.0] * (target_dim - len(emb)))
        return processed_embeddings
        
    elif provider == 'openai':
        embeddings_model = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=api_key,
            dimensions=384
        )
        # OpenAI handles batching internally well, but let's be safe
        batch_size = 50
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = await embed_batch_with_retry(embeddings_model, batch)
            all_embeddings.extend(batch_embeddings)

        # Ensure 384 dims (in case model/config changes)
        target_dim = 384
        processed_embeddings: List[List[float]] = []
        for emb in all_embeddings:
            if len(emb) >= target_dim:
                processed_embeddings.append(emb[:target_dim])
            else:
                processed_embeddings.append(emb + [0.0] * (target_dim - len(emb)))
        return processed_embeddings
    
    else:
        raise ValueError(f"Unsupported provider: {provider}")

async def ingest_document(
    file_content: bytes, 
    file_name: str, 
    supabase_url: str, 
    supabase_key: str,
    provider: str,
    api_key: str,
    access_token: Optional[str] = None,
    document_id: Optional[str] = None
) -> dict:
    
    supabase = get_supabase_client(supabase_url, supabase_key, access_token)
    pc = get_pinecone_client()

    if not pc:
         raise ValueError("Pinecone API Key is missing. Please set VITE_PINECONE_API_KEY in .env.")

    # Initialize Pinecone Index
    index_name = "knowledge-base"
    try:
        # Check if index exists
        existing_indexes = [i.name for i in pc.list_indexes()]
        if index_name not in existing_indexes:
            pc.create_index(
                name=index_name,
                dimension=384,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1") # Default free tier region
            )
            # Wait for index to be ready
            while not pc.describe_index(index_name).status['ready']:
                time.sleep(1)
    except Exception as e:
        print(f"Pinecone Index Error: {e}")
        # Assuming index might exist or permission issue
        pass

    index = pc.Index(index_name)

    existing_doc = None
    if document_id:
        try:
            existing_doc_res = supabase.table("knowledge_documents").select("id, metadata").eq("id", document_id).single().execute()
            existing_doc = existing_doc_res.data
        except Exception:
            existing_doc = None
    
    # 1. Process File
    chunks = process_file(file_content, file_name)
    texts = [chunk.page_content for chunk in chunks if chunk.page_content and chunk.page_content.strip()]
    
    if not texts:
        if document_id:
            supabase.table("knowledge_documents").update({
                "status": "error",
                "metadata": _merge_metadata(existing_doc.get("metadata") if existing_doc else None, {"error": "No text extracted from file"})
            }).eq("id", document_id).execute()
        return {"status": "error", "message": "No text extracted"}

    if document_id:
        # Update existing document status to pending
        supabase.table("knowledge_documents").update({
            "status": "pending",
            "metadata": _merge_metadata(existing_doc.get("metadata") if existing_doc else None, {"provider": provider})
        }).eq("id", document_id).execute()
        
        # Delete existing chunks from Pinecone?
        # Pinecone doesn't support delete by metadata filter efficiently in free tier (sometimes).
        # But delete by ID prefix or exact ID is fine.
        # We need a strategy for IDs. 
        # Strategy: chunk_id = {document_id}_{index}
        # We can delete by prefix if possible, or delete all known chunks.
        # For now, we will just upsert (overwrite) if IDs match, but if document is shorter, old chunks might remain.
        # Better: delete all vectors with metadata document_id.
        try:
             index.delete(filter={"document_id": document_id})
        except Exception as e:
             print(f"Pinecone delete error (maybe not supported in starter): {e}")

        # Also clean up Supabase chunks just in case
        supabase.table("document_chunks").delete().eq("document_id", document_id).execute()
    else:
        # 2. Create Document Entry
        doc_entry = {
            "name": file_name,
            "file_type": os.path.splitext(file_name)[1].lower().replace('.', ''),
            "chunk_count": len(chunks),
            "status": "pending",
            "metadata": {"provider": provider}
        }
        res = supabase.table("knowledge_documents").insert(doc_entry).execute()
        if not res.data:
            raise Exception("Failed to insert document record")
        document_id = res.data[0]['id']
    
    try:
        # 3. Generate Embeddings
        print(f"Generating embeddings for {len(texts)} chunks using {provider}...")
        embeddings = await generate_embeddings(texts, provider, api_key)
        
        # 4. Upsert to Pinecone
        print(f"Upserting to Pinecone index '{index_name}'...")
        vectors = []
        for i, (text, vector) in enumerate(zip(texts, embeddings)):
            # Validate vector is not all zeros (Pinecone requirement)
            if not any(v != 0 for v in vector):
                 print(f"Warning: Skipping chunk {i} because embedding vector contains only zeros.")
                 continue

            chunk_id = f"{document_id}_{i}"
            vectors.append({
                "id": chunk_id,
                "values": vector,
                "metadata": {
                    "document_id": document_id,
                    "content": text,
                    "source": file_name
                }
            })
            
        # Batch upsert
        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            index.upsert(vectors=batch)
        
        # Update status to indexed
        supabase.table("knowledge_documents").update({
            "status": "indexed",
            "chunk_count": len(chunks),
            "updated_at": "now()"
        }).eq("id", document_id).execute()
        
        print(f"Successfully indexed {file_name} ({document_id})")
        return {"status": "success", "document_id": document_id, "chunks": len(chunks)}

    except Exception as e:
        print(f"Error during ingestion for {file_name}: {e}")
        # Update status to error in Supabase
        if document_id:
            try:
                supabase.table("knowledge_documents").update({
                    "status": "error",
                    "metadata": _merge_metadata(existing_doc.get("metadata") if existing_doc else None, {"error": str(e)})
                }).eq("id", document_id).execute()
            except Exception as update_err:
                print(f"Failed to update error status in Supabase: {update_err}")
        
        raise e

async def query_pinecone(
    query: str,
    provider: str,
    api_key: str
) -> List[str]:
    pc = get_pinecone_client()
    if not pc:
         raise ValueError("Pinecone API Key is missing.")
    
    index_name = "knowledge-base"
    index = pc.Index(index_name)

    # Generate embedding for query
    # Need to wrap single query in list
    embeddings = await generate_embeddings([query], provider, api_key)
    query_vector = embeddings[0]

    # Query Pinecone
    result = index.query(
        vector=query_vector,
        top_k=5,
        include_metadata=True
    )

    matches = []
    for match in result.matches:
        if match.metadata and "content" in match.metadata:
             matches.append(match.metadata["content"])
    
    return matches
