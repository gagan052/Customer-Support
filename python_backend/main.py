import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Load env from frontend directory if not present
# Must be loaded BEFORE importing auth which relies on env vars
load_dotenv('../frontend/.env')

# Add current directory to path so imports work
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auth import get_current_user, UserContext, supabase
from services.ingestion import IngestionService
from services.rag import RAGService

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    provider_config: Optional[Dict[str, str]] = None

def get_provider_config(user_config: Optional[Dict] = None) -> Dict[str, str]:
    # Default to Managed Mode (Env Vars)
    # Priority: Env Vars -> Default Values
    
    # We use Gemini as default managed provider for embeddings/LLM
    # And Pinecone or Supabase for Vector
    
    pinecone_key = os.getenv("VITE_PINECONE_API_KEY")
    gemini_key = os.getenv("VITE_GEMINI_API_KEY")
    openai_key = os.getenv("VITE_OPENAI_API_KEY")
    supabase_url = os.getenv("VITE_SUPABASE_URL")
    supabase_key = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY") # Or service role
    
    config = {
        "embedding_provider": "gemini",
        "embedding_api_key": gemini_key,
        "vector_provider": "pinecone" if pinecone_key else "supabase",
        "vector_api_key": pinecone_key if pinecone_key else supabase_key,
        "llm_provider": "gemini",
        "llm_api_key": gemini_key,
        # For Supabase vector provider
        "url": supabase_url,
        "key": supabase_key
    }
    
    # If user supplies config (BYO Mode), override defaults
    if user_config:
        # Filter out empty values
        clean_config = {k: v for k, v in user_config.items() if v}
        config.update(clean_config)
        
    # Validate keys exist
    if not config.get("embedding_api_key"):
        # Fallback to OpenAI if Gemini missing?
        if openai_key:
             config["embedding_provider"] = "openai"
             config["embedding_api_key"] = openai_key
        else:
             pass # Will fail later or we raise here
             
    # Raise if still missing
    # We skip strict validation here to allow factory to raise specific errors
        
    return config

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Enterprise RAG Platform"}

@app.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    provider_config: Optional[str] = Form(None), # JSON string
    document_id: Optional[str] = Form(None),
    user: UserContext = Depends(get_current_user)
):
    """
    Ingest a document into the RAG system.
    Only Admins/Owners can perform this action.
    """
    if user.role not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Only admins or owners can ingest documents")
        
    try:
        user_config_dict = json.loads(provider_config) if provider_config else {}
    except json.JSONDecodeError:
        user_config_dict = {}
        
    config = get_provider_config(user_config_dict)
    
    service = IngestionService(supabase)
    return await service.ingest_file(file, config, user, document_id)

@app.post("/chat")
async def chat(
    request: ChatRequest,
    user: UserContext = Depends(get_current_user)
):
    """
    Chat with the RAG system.
    Accessible to all authenticated users (employees).
    """
    config = get_provider_config(request.provider_config)
    
    # Pass supabase client for persistence
    service = RAGService(supabase)
    return await service.chat(request.messages, config, user)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
