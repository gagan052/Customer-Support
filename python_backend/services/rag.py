from typing import List, Dict, Any, Optional
from providers.factory import ProviderFactory
from auth import UserContext
from supabase import Client
import uuid
import json

class RAGService:
    def __init__(self, supabase_client: Client = None):
        self.supabase = supabase_client

    async def chat(
        self,
        messages: List[Dict[str, str]],
        provider_config: dict,
        user: UserContext,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        
        # 1. Embed Last Message
        last_message = messages[-1]["content"]
        embed_provider = ProviderFactory.get_embedding_provider(
            provider_config.get("embedding_provider", "openai"),
            {"api_key": provider_config["embedding_api_key"]}
        )
        query_vector = await embed_provider.embed_query(last_message)
        
        # 2. Retrieve Context
        vector_provider = ProviderFactory.get_vector_provider(
            provider_config.get("vector_provider", "pinecone"),
            {"api_key": provider_config["vector_api_key"]}
        )
        matches = await vector_provider.query(
            query_vector, 
            top_k=5, 
            namespace=user.company_id
        )
        
        context_str = "\n\n".join([m["content"] for m in matches])
        
        # 3. Generate Response
        llm_provider = ProviderFactory.get_llm_provider(
            provider_config.get("llm_provider", "openai"),
            {"api_key": provider_config["llm_api_key"]}
        )
        
        system_prompt = f"""You are a helpful assistant. Use the following context to answer the user's question.
        
        Context:
        {context_str}
        """
        
        # Prepare messages for LLM
        # We might want to include history, but strictly formatted
        chat_messages = [{"role": "system", "content": system_prompt}]
        # Add last few messages for context (simple window)
        chat_messages.extend(messages[-5:]) 
        
        response_text = await llm_provider.chat(chat_messages)
        
        # 4. Persist Conversation (if DB available)
        new_conversation_id = conversation_id
        if self.supabase:
            try:
                # If no conversation_id, create one
                if not new_conversation_id:
                    conv_res = self.supabase.table("conversations").insert({
                        "company_id": user.company_id,
                        "session_id": str(uuid.uuid4()), # Generate a session ID
                        "status": "active",
                        "metadata": {"user_id": user.user_id}
                    }).execute()
                    if conv_res.data:
                        new_conversation_id = conv_res.data[0]["id"]
                
                if new_conversation_id:
                    # Log User Message
                    self.supabase.table("messages").insert({
                        "conversation_id": new_conversation_id,
                        "role": "user",
                        "content": last_message
                    }).execute()
                    
                    # Log Assistant Message
                    self.supabase.table("messages").insert({
                        "conversation_id": new_conversation_id,
                        "role": "agent", # Schema uses 'agent'
                        "content": response_text,
                        "rag_sources": [m["id"] for m in matches] # Store IDs of sources
                    }).execute()
                    
            except Exception as e:
                print(f"Error persisting chat: {e}")
        
        return {
            "response": response_text,
            "sources": matches,
            "conversation_id": new_conversation_id
        }
