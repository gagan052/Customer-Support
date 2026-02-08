import os
import tempfile
import asyncio
from typing import List, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from supabase import create_client, Client, ClientOptions

def get_supabase_client(url: str, key: str, access_token: Optional[str] = None) -> Client:
    headers = {}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    
    return create_client(url, key, options=ClientOptions(headers=headers))

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
            if os.path.exists(tmp_path):
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

async def generate_embeddings(texts: List[str], api_key: str, task_type: str = "retrieval_document") -> List[List[float]]:
    """
    Generates embeddings for the given texts using Gemini.
    Handles dimension mismatch by padding/truncating to 384 dims.
    """
    
    async def embed_batch_with_retry(model, batch_texts):
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
                
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    print("Rate limit exhausted. Aborting.")
                    raise Exception("Rate limit exhausted for embedding provider. Please try again later.")

                print(f"Embedding error: {e}")
                raise e

    embeddings_model = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=api_key,
        task_type=task_type
    )
    
    # Gemini embedding models can be large.
    # Process in batches to avoid rate limits
    batch_size = 5
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        # Add delay before batch (except first)
        if i > 0:
            print(f"Sleeping 2s for Gemini rate limit... ({i}/{len(texts)})")
            await asyncio.sleep(2)
            
        batch_embeddings = await embed_batch_with_retry(embeddings_model, batch)
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
