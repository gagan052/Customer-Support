export function getOpenAIKey(): string | undefined {
  const localKey = localStorage.getItem("openai_api_key");
  if (localKey && localKey.trim()) {
    return localKey.trim();
  }
  return undefined;
}

export function getGeminiKey(): string | undefined {
  const localKey = localStorage.getItem("gemini_api_key");
  if (localKey && localKey.trim()) {
    return localKey.trim();
  }
  return undefined;
}

export function getActiveProvider(): 'openai' | 'gemini' {
  const provider = localStorage.getItem("ai_provider");
  if (provider === 'gemini' || provider === 'openai') {
    return provider as 'openai' | 'gemini';
  }
  
  if (getGeminiKey() && !getOpenAIKey()) {
    return 'gemini';
  }
  
  return 'openai';
}
