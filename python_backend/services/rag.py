import os
import uuid
import json
from typing import List, Dict, Any, Optional
from auth import UserContext
from supabase import Client
from utils import generate_embeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

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
        
        gemini_key = provider_config.get("gemini_api_key") or os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
        if not gemini_key:
             # Fallback
             gemini_key = provider_config.get("llm_api_key") or provider_config.get("embedding_api_key")
        
        if not gemini_key:
             raise Exception("Gemini API Key is required. Please set VITE_GEMINI_API_KEY.")

        # 1. Embed Last Message
        last_message = messages[-1]["content"]
        
        # Use our utility which handles truncation to 384 dims
        # Note: generate_embeddings returns a list of lists, we take the first one
        query_vectors = await generate_embeddings([last_message], gemini_key, task_type="retrieval_query")
        query_vector = query_vectors[0]
        
        # 2. Retrieve Context (Supabase Vector)
        # Using the match_documents RPC
        rpc_params = {
            "query_embedding": query_vector,
            "match_threshold": 0.5, # Adjust as needed
            "match_count": 5,
            "filter_company_id": user.company_id
        }
        
        try:
            res = self.supabase.rpc("match_documents", rpc_params).execute()
            matches = res.data
        except Exception as e:
            # Fallback for legacy schema (without filter_company_id)
            print(f"RPC Error with company_id: {e}. Retrying without filter...")
            rpc_params.pop("filter_company_id")
            res = self.supabase.rpc("match_documents", rpc_params).execute()
            matches = res.data

        context_str = "\n\n".join([m["content"] for m in matches]) if matches else "No relevant context found."
        
        # 3. Generate Response
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=gemini_key,
            temperature=0.3
        )
        
        system_prompt = f"""
You are a helpful and intelligent AI support agent.
Your goal is to assist users with their questions accurately and efficiently.

Context from Knowledge Base:
{context_str}

Instructions:
- Use the provided context to answer the user's question.
- If the context doesn't contain the answer, use your general knowledge but be transparent.
- Be polite, professional, and concise.
- Output your response in JSON format matching the schema below.
- Do NOT output markdown formatting for the JSON (no ```json ... ``` wrapper), just the raw JSON string.

Response Schema (JSON):
{{
  "content": "The actual response text to the user",
  "intent": "The classified intent (e.g., general_query, technical_issue)",
  "confidence": 0.0 to 1.0,
  "sentiment": "positive" | "neutral" | "negative",
  "action": "resolve" | "clarify" | "escalate",
  "reasoning": "Brief explanation of your decision"
}}
        """
        
        chat_messages = [SystemMessage(content=system_prompt)]
        
        # Add conversation history (last 5 messages)
        # messages list is [{"role": "user", "content": "..."}, ...]
        for msg in messages[-5:]:
            if msg["role"] == "user":
                chat_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                chat_messages.append(AIMessage(content=msg["content"]))
            # Handle 'system' if present, though usually not in this list
        
        response = await llm.ainvoke(chat_messages)
        response_text = response.content
        
        # Clean up JSON if needed (sometimes LLMs add markdown)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].strip()

        try:
            parsed_response = json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback if JSON fails
            parsed_response = {
                "content": response_text,
                "intent": "general_query",
                "confidence": 1.0,
                "sentiment": "neutral",
                "action": "resolve",
                "reasoning": "Failed to parse JSON response"
            }
        
        # 4. Persist Conversation
        new_conversation_id = conversation_id
        if self.supabase:
            try:
                if not new_conversation_id:
                    session_id = str(uuid.uuid4())
                    conv_data = {
                        "session_id": session_id,
                        "status": "active",
                        "metadata": {"user_id": user.user_id},
                        "company_id": user.company_id
                    }
                    res = self.supabase.table("conversations").insert(conv_data).execute()
                    if res.data:
                        new_conversation_id = res.data[0]['id']
                
                # Store the message
                # Assuming a messages table exists? Or maybe we just return the response
                # The original code didn't show message storage logic fully, just conversation creation.
                # I'll stick to returning the response.
            except Exception as e:
                print(f"Error persisting conversation: {e}")
                
        return {
            "response": parsed_response,
            "conversation_id": new_conversation_id
        }
