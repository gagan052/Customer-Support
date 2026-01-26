// AI Agent Simulator - Demonstrates the agent decision-making flow
// In production, this would connect to your FastAPI backend

export interface AgentDecision {
  intent: string;
  confidence: number;
  sentiment: "positive" | "neutral" | "negative";
  action: "resolve" | "clarify" | "escalate";
  response: string;
  ragSources?: string[];
}

// Simulated knowledge base entries
const knowledgeBase = [
  {
    topic: "password reset",
    keywords: ["password", "reset", "forgot", "login", "can't access"],
    response: "To reset your password, click 'Forgot Password' on the login page. You'll receive an email with a secure link valid for 24 hours. If you don't see it, check your spam folder.",
    confidence: 0.92,
  },
  {
    topic: "billing inquiry",
    keywords: ["bill", "charge", "payment", "invoice", "subscription", "refund"],
    response: "I can help with billing questions. Your invoices are available in Account Settings → Billing. For refunds, requests within 30 days are processed in 3-5 business days.",
    confidence: 0.88,
  },
  {
    topic: "technical support",
    keywords: ["error", "bug", "crash", "not working", "broken", "issue"],
    response: "I understand you're experiencing a technical issue. Could you please describe what you were doing when this happened? Any error messages would help me diagnose the problem faster.",
    confidence: 0.75,
    needsClarification: true,
  },
  {
    topic: "feature request",
    keywords: ["feature", "request", "suggestion", "would be nice", "wish", "add"],
    response: "Thank you for your feedback! I've logged your feature request. Our product team reviews all suggestions monthly. You can track popular requests in our public roadmap.",
    confidence: 0.85,
  },
  {
    topic: "account deletion",
    keywords: ["delete", "remove", "close account", "cancel", "terminate"],
    response: "I can help with account deletion. Before proceeding, please note this is irreversible and all data will be permanently deleted after 30 days. Would you like me to initiate this process?",
    confidence: 0.90,
  },
];

// Sentiment analysis simulation
function analyzeSentiment(text: string): "positive" | "neutral" | "negative" {
  const lowerText = text.toLowerCase();
  const positiveWords = ["thank", "great", "awesome", "love", "excellent", "helpful", "perfect"];
  const negativeWords = ["angry", "frustrated", "terrible", "awful", "hate", "worst", "unacceptable", "ridiculous"];
  
  const positiveScore = positiveWords.filter(w => lowerText.includes(w)).length;
  const negativeScore = negativeWords.filter(w => lowerText.includes(w)).length;
  
  if (negativeScore > positiveScore) return "negative";
  if (positiveScore > negativeScore) return "positive";
  return "neutral";
}

// Intent classification simulation
function classifyIntent(text: string): { intent: string; confidence: number; entry: typeof knowledgeBase[0] | null } {
  const lowerText = text.toLowerCase();
  
  let bestMatch: typeof knowledgeBase[0] | null = null;
  let bestScore = 0;
  
  for (const entry of knowledgeBase) {
    const matchedKeywords = entry.keywords.filter(k => lowerText.includes(k));
    const score = matchedKeywords.length / entry.keywords.length;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  
  if (bestMatch && bestScore > 0.2) {
    // Add some variation to confidence based on text length and clarity
    const confidenceVariation = Math.random() * 0.1 - 0.05;
    const adjustedConfidence = Math.min(0.99, Math.max(0.4, bestMatch.confidence + confidenceVariation));
    
    return {
      intent: bestMatch.topic,
      confidence: adjustedConfidence,
      entry: bestMatch,
    };
  }
  
  return {
    intent: "general inquiry",
    confidence: 0.5,
    entry: null,
  };
}

// Decision engine simulation
function makeDecision(confidence: number, sentiment: "positive" | "neutral" | "negative"): "resolve" | "clarify" | "escalate" {
  // Escalate if user is frustrated and confidence is low
  if (sentiment === "negative" && confidence < 0.7) {
    return "escalate";
  }
  
  // Standard confidence thresholds
  if (confidence >= 0.85) return "resolve";
  if (confidence >= 0.6) return "clarify";
  return "escalate";
}

export async function processMessage(userMessage: string): Promise<AgentDecision> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
  
  const sentiment = analyzeSentiment(userMessage);
  const { intent, confidence, entry } = classifyIntent(userMessage);
  const action = makeDecision(confidence, sentiment);
  
  let response: string;
  
  if (action === "escalate") {
    response = "I want to make sure you get the best possible help. Let me connect you with a human specialist who can assist you more thoroughly. Please hold for a moment.";
  } else if (action === "clarify" || !entry) {
    response = entry?.response || "I'd like to help you better. Could you please provide more details about your question or issue? The more specific you are, the more accurately I can assist you.";
  } else {
    response = entry.response;
  }
  
  return {
    intent,
    confidence,
    sentiment,
    action,
    response,
    ragSources: entry ? [`KB: ${entry.topic}`] : undefined,
  };
}

// Quick replies for common actions
export const quickReplies = [
  "How do I reset my password?",
  "I need help with my bill",
  "Something isn't working",
  "I have a feature suggestion",
  "How do I contact support?",
];
