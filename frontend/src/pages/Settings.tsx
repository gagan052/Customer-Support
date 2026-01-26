import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Settings as SettingsIcon, 
  Brain,
  Zap,
  Bell,
  Shield,
  Database,
  Save,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  User,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [autoResolveThreshold, setAutoResolveThreshold] = useState([85]);
  const [clarifyThreshold, setClarifyThreshold] = useState([60]);
  const [sentimentEscalation, setSentimentEscalation] = useState(true);
  const [autoResolve, setAutoResolve] = useState(true);
  
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [activeProvider, setActiveProvider] = useState<"openai" | "gemini">("openai");

  // Profile State
  const [displayName, setDisplayName] = useState("");

  // Fetch User Profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
        
      if (error) throw error;
      return data;
    }
  });

  // Update local state when profile loads
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  // Update Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { error } = await supabase
        .from("user_profiles")
        .update({ display_name: name })
        .eq("id", session.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (err) => {
      toast.error("Failed to update profile: " + err.message);
    }
  });

  useEffect(() => {
    const storedKey = localStorage.getItem("openai_api_key");
    if (storedKey) setApiKey(storedKey);
    
    const storedGeminiKey = localStorage.getItem("gemini_api_key");
    if (storedGeminiKey) setGeminiApiKey(storedGeminiKey);
    
    const storedProvider = localStorage.getItem("ai_provider");
    if (storedProvider === "openai" || storedProvider === "gemini") {
      setActiveProvider(storedProvider);
    } else {
      // Auto-detect preference if not set
      if (storedGeminiKey && !storedKey) setActiveProvider("gemini");
    }
  }, []);

  const handleSave = () => {
    // Save Profile
    if (displayName !== profile?.display_name) {
      updateProfileMutation.mutate(displayName);
    }

    // Save OpenAI Key
    if (apiKey.trim()) {
      localStorage.setItem("openai_api_key", apiKey.trim());
    } else {
      localStorage.removeItem("openai_api_key");
    }
    
    // Save Gemini Key
    if (geminiApiKey.trim()) {
      localStorage.setItem("gemini_api_key", geminiApiKey.trim());
    } else {
      localStorage.removeItem("gemini_api_key");
    }
    
    // Save Provider
    localStorage.setItem("ai_provider", activeProvider);

    toast.success("Settings saved successfully", {
      description: `Active Provider: ${activeProvider === 'openai' ? 'OpenAI' : 'Google Gemini'}`
    });
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-accent" />
              Settings
            </h1>
            <p className="text-muted-foreground">Configure your AI Support Agent</p>
          </div>
          <Button variant="accent" onClick={handleSave} disabled={updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>

        {/* Profile Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-accent" />
                Profile Settings
              </CardTitle>
              <CardDescription>
                Manage your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input 
                        value={displayName} 
                        onChange={(e) => setDisplayName(e.target.value)} 
                        placeholder="Your Name"
                      />
                   </div>
                   <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        value={profile?.email || "Loading..."} 
                        disabled 
                        className="bg-secondary/50"
                      />
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* API Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-accent" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Manage your AI provider credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Active Provider</Label>
                  <RadioGroup 
                    value={activeProvider} 
                    onValueChange={(val: "openai" | "gemini") => setActiveProvider(val)}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem value="openai" id="openai" className="peer sr-only" />
                      <Label
                        htmlFor="openai"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-accent [&:has([data-state=checked])]:border-accent cursor-pointer"
                      >
                        <Zap className="mb-3 h-6 w-6" />
                        OpenAI
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="gemini" id="gemini" className="peer sr-only" />
                      <Label
                        htmlFor="gemini"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-accent [&:has([data-state=checked])]:border-accent cursor-pointer"
                      >
                        <Sparkles className="mb-3 h-6 w-6" />
                        Google Gemini
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {activeProvider === "openai" && (
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">OpenAI API Key</Label>
                    <div className="relative">
                      <Input 
                        id="apiKey" 
                        type={showKey ? "text" : "password"} 
                        placeholder="sk-..." 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="pr-10"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports GPT-4o, GPT-3.5 Turbo.
                    </p>
                  </div>
                )}

                {activeProvider === "gemini" && (
                  <div className="space-y-2">
                    <Label htmlFor="geminiApiKey">Gemini API Key</Label>
                    <div className="relative">
                      <Input 
                        id="geminiApiKey" 
                        type={showGeminiKey ? "text" : "password"} 
                        placeholder="AIza..." 
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="pr-10"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports Gemini Pro 1.5. Free tier available.
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Your key is stored locally in your browser and sent securely to our edge functions. 
                  It is never stored in our database.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Decision Engine */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-accent" />
                Decision Engine
              </CardTitle>
              <CardDescription>
                Configure confidence thresholds for agent decisions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Auto-Resolve Threshold</Label>
                  <span className="text-sm font-mono text-accent">{autoResolveThreshold}%</span>
                </div>
                <Slider
                  value={autoResolveThreshold}
                  onValueChange={setAutoResolveThreshold}
                  min={50}
                  max={99}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Queries with confidence above this threshold will be auto-resolved
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Clarification Threshold</Label>
                  <span className="text-sm font-mono text-warning">{clarifyThreshold}%</span>
                </div>
                <Slider
                  value={clarifyThreshold}
                  onValueChange={setClarifyThreshold}
                  min={30}
                  max={84}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Between this and auto-resolve: ask clarification. Below: escalate.
                </p>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Sentiment-Based Escalation</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically escalate frustrated users even with medium confidence
                  </p>
                </div>
                <Switch checked={sentimentEscalation} onCheckedChange={setSentimentEscalation} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Auto-Resolve</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Allow agent to resolve queries without human review
                  </p>
                </div>
                <Switch checked={autoResolve} onCheckedChange={setAutoResolve} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* LLM Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                LLM Configuration
              </CardTitle>
              <CardDescription>
                Local model settings (via Ollama)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input value="mistral:7b" readOnly className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Ollama Endpoint</Label>
                  <Input value="http://localhost:11434" placeholder="http://localhost:11434" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Temperature</Label>
                  <Input type="number" value="0.7" min="0" max="2" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input type="number" value="512" min="64" max="4096" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Vector Database */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-accent" />
                Vector Database
              </CardTitle>
              <CardDescription>
                RAG retrieval configuration (Managed via Python Backend)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vector DB</Label>
                  <Input value="Supabase pgvector" readOnly className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Embedding Model</Label>
                  <Input value={activeProvider === 'gemini' ? "Gemini Text-Embedding-004" : "OpenAI text-embedding-3-small"} readOnly className="bg-secondary/50" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Chunk Size</Label>
                  <Input type="number" value="1000" readOnly className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Chunk Overlap</Label>
                  <Input type="number" value="200" readOnly className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Top-K Results</Label>
                  <Input type="number" value="5" readOnly className="bg-secondary/50" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-accent" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Escalation Alerts</Label>
                  <p className="text-xs text-muted-foreground mt-1">Get notified when conversations escalate</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Low Confidence Warnings</Label>
                  <p className="text-xs text-muted-foreground mt-1">Alert when agent confidence drops below 50%</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Negative Sentiment Alerts</Label>
                  <p className="text-xs text-muted-foreground mt-1">Immediate notification for frustrated users</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}
