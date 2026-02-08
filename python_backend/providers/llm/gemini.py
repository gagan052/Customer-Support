from typing import Optional, List, Dict, Any
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from ..base import LLMProvider

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-pro"):
        self.client = ChatGoogleGenerativeAI(
            google_api_key=api_key, 
            model=model,
            convert_system_message_to_human=True # Gemini sometimes has issues with system messages
        )

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        
        response = await self.client.ainvoke(messages)
        return str(response.content)

    async def chat(self, messages: List[Dict[str, str]], **kwargs) -> str:
        lc_messages = []
        for msg in messages:
            if msg["role"] == "system":
                lc_messages.append(SystemMessage(content=msg["content"]))
            elif msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            # Assistant messages handling could be added here if needed for history
            
        response = await self.client.ainvoke(lc_messages)
        return str(response.content)
