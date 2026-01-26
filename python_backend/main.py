import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
from utils import ingest_document, query_pinecone

# Load env from frontend directory if not present
load_dotenv('../frontend/.env')

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    provider: str
    # api_key: str # Deprecated: Use .env

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Python Knowledge Backend"}

@app.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    provider: str = Form(...),
    # api_key: Optional[str] = Form(None), # Deprecated: Use .env
    document_id: Optional[str] = Form(None),
    supabase_url: Optional[str] = Form(None),
    supabase_key: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None)
):
    """
    Ingests a document: Extracts text -> Chunks -> Embeds -> Stores in Pinecone.
    """
    try:
        content = await file.read()
        
        # Determine API Key from Environment (Strictly enforce .env for ingestion)
        final_api_key = None
        
        # Force Gemini for embedding/ingestion to avoid OpenAI quota limits
        # The user requested to use Gemini API key from .env for embedding/chunking
        if provider == 'openai':
            print("Notice: Switching provider from 'openai' to 'gemini' to avoid quota limits.")
            provider = 'gemini'
        
        if provider == 'gemini':
            final_api_key = os.getenv("VITE_GEMINI_API_KEY")
            
        if not final_api_key:
             # Fallback check
             final_api_key = os.getenv("VITE_GEMINI_API_KEY")
             provider = 'gemini' # Ensure provider matches key

        if not final_api_key:
            raise HTTPException(status_code=500, detail=f"Missing Server-Side API Key for provider: {provider}. Please configure .env file.")

        # Determine Supabase Config
        final_sb_url = supabase_url or os.getenv("VITE_SUPABASE_URL")
        final_sb_key = supabase_key or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
        
        if not final_sb_url or not final_sb_key:
             raise HTTPException(status_code=500, detail="Missing Supabase Configuration")

        # Extract access token from header (Bearer <token>)
        access_token = None
        if authorization and authorization.startswith("Bearer "):
            access_token = authorization.split(" ")[1]

        result = await ingest_document(
            file_content=content,
            file_name=file.filename,
            supabase_url=final_sb_url,
            supabase_key=final_sb_key,
            provider=provider,
            api_key=final_api_key,
            access_token=access_token,
            document_id=document_id
        )
        
        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_endpoint(request: QueryRequest):
    """
    Queries Pinecone for relevant documents.
    """
    try:
        # Determine API Key from Environment (Strictly enforce .env for query embedding)
        final_api_key = None
        
        # Force Gemini for retrieval as well, since ingestion used Gemini
        if request.provider == 'openai':
            request.provider = 'gemini'
            
        if request.provider == 'gemini':
            final_api_key = os.getenv("VITE_GEMINI_API_KEY")
            
        if not final_api_key:
             # Fallback check
             final_api_key = os.getenv("VITE_GEMINI_API_KEY")
             request.provider = 'gemini'
             
        if not final_api_key:
            raise HTTPException(status_code=500, detail="Missing Server-Side API Key for retrieval. Please configure .env file.")

        results = await query_pinecone(
            query=request.query,
            provider=request.provider,
            api_key=final_api_key
        )
        return {"matches": results}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
