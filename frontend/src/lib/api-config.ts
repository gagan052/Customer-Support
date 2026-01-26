
export function getOpenAIKey(): string | undefined {
  const localKey = typeof localStorage !== "undefined" ? localStorage.getItem("openai_api_key") : null;
  if (localKey && localKey.trim()) {
    return localKey.trim();
  }
  const envKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }
  return undefined;
}

export function getGeminiKey(): string | undefined {
  const localKey = typeof localStorage !== "undefined" ? localStorage.getItem("gemini_api_key") : null;
  if (localKey && localKey.trim()) {
    return localKey.trim();
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }
  return undefined;
}

export function getActiveProvider(): 'openai' | 'gemini' {
  const provider = localStorage.getItem("ai_provider");
  if (provider === 'gemini' || provider === 'openai') {
    return provider;
  }
  
  // Auto-detect: if Gemini key exists but OpenAI doesn't, use Gemini
  if (getGeminiKey() && !getOpenAIKey()) {
    return 'gemini';
  }
  
  return 'openai'; // Default
}
