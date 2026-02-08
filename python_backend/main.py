import os
import json
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Load env from local directory
load_dotenv()

# Add current directory to path so imports work
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auth import get_current_user, UserContext, supabase, supabase_url, supabase_key
from services.ingestion import IngestionService
from services.rag import RAGService
from utils import get_supabase_client

app = FastAPI()

# Helper to get authenticated client
def get_auth_client(user: UserContext):
    if user.token:
        return get_supabase_client(supabase_url, supabase_key, user.token)
    return supabase

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://localhost:8080", "http://0.0.0.0:8080"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "x-api-key"],
)

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    provider_config: Optional[Dict[str, str]] = None
    conversation_id: Optional[str] = None

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Enterprise RAG Platform (Simplified)"}

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
        
        # Use authenticated client if available to satisfy RLS
        client = get_auth_client(user)
        service = IngestionService(client)
        result = await service.ingest_file(
            file, 
            user_config_dict, 
            user,
            document_id
        )
        
        return result
    except Exception as e:
        print(f"Ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(
    request: ChatRequest,
    user: UserContext = Depends(get_current_user)
):
    try:
        # Use authenticated client if available to satisfy RLS
        client = get_auth_client(user)
        service = RAGService(client)
        
        # Merge user provided config with env vars if needed
        config = request.provider_config or {}
        
        response = await service.chat(
            request.messages,
            config,
            user,
            request.conversation_id
        )
        
        return response
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
