from fastapi import Header, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from supabase import Client, create_client
import os
import hashlib

# Initialize Supabase client for Auth (Service Role for checking keys)
supabase_url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
# Prefer service role key for admin tasks, but fall back to anon key if that's all we have (might limit functionality)
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing Supabase credentials. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_ equivalents) are set.")

supabase: Client = create_client(supabase_url, supabase_key)

class UserContext(BaseModel):
    user_id: str
    company_id: str
    role: str

async def get_current_user(
    x_api_key: Optional[str] = Header(None, alias="x-api-key"),
    authorization: Optional[str] = Header(None)
) -> UserContext:
    
    # 1. API Key Auth (for SDK/Widget)
    if x_api_key:
        # Hash the key to match storage
        key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
        
        res = supabase.table("api_keys").select("company_id, scope").eq("key_hash", key_hash).execute()
        
        if not res.data:
            raise HTTPException(status_code=401, detail="Invalid API Key")
        
        key_record = res.data[0]
        
        return UserContext(
            user_id="api_key", # Represents machine/widget user
            company_id=key_record["company_id"],
            role="employee" # API keys act as employees/agents
        )

    # 2. Bearer Token Auth (for Dashboard/Management)
    if authorization:
        token = authorization.split(" ")[1]
        user_res = supabase.auth.get_user(token)
        
        if not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid Token")
            
        user_id = user_res.user.id
        
        # Fetch profile to get company_id
        profile_res = supabase.table("user_profiles").select("company_id, role").eq("user_id", user_id).execute()
        
        if not profile_res.data:
             raise HTTPException(status_code=403, detail="User has no profile/company")
             
        profile = profile_res.data[0]
        
        return UserContext(
            user_id=user_id,
            company_id=profile["company_id"],
            role=profile["role"]
        )

    raise HTTPException(status_code=401, detail="Missing Authentication")
