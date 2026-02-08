
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Bot, Building2, Code2, Database, Lock, ShieldCheck, Zap, Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const LandingPage = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Enterprise RAG</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>

          {/* Mobile Nav */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <div className="flex flex-col gap-4 mt-8">
                  <Link to="/login">
                    <Button variant="ghost" className="w-full justify-start">Sign In</Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 md:py-32">
          <motion.div 
            className="mx-auto max-w-[800px] text-center"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <Badge variant="secondary" className="mb-4">
                Enterprise Ready v2.0
              </Badge>
            </motion.div>
            <motion.h1 
              className="mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-6xl text-slate-900"
              variants={itemVariants}
            >
              Deploy Production-Grade <span className="text-primary">RAG Agents</span> in Minutes
            </motion.h1>
            <motion.p 
              className="mb-8 text-lg text-slate-600 md:text-xl"
              variants={itemVariants}
            >
              A complete platform for building, managing, and scaling Retrieval-Augmented Generation systems. 
              Support for Managed or Bring-Your-Own infrastructure.
            </motion.p>
            <motion.div 
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
              variants={itemVariants}
            >
              <Link to="/signup">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Building Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/documentation">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                  View Documentation
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* The Model Section */}
        <section className="bg-white py-24 border-y">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">The Model & Interface</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Experience our advanced chat interface powered by state-of-the-art LLMs.
              </p>
            </div>
            
            <div className="mx-auto max-w-5xl rounded-xl border bg-slate-50/50 p-4 shadow-2xl">
              <div className="rounded-lg border bg-white p-6 shadow-sm min-h-[500px] flex flex-col">
                {/* Mock Chat Interface */}
                <div className="flex items-center gap-3 border-b pb-4 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <span className="block h-2 w-2 rounded-full bg-green-600"></span>
                      Online
                    </p>
                  </div>
                </div>
                
                <div className="flex-1 space-y-4 mb-4">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-slate-600">U</span>
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-800">
                      How do I configure a custom vector provider?
                    </div>
                  </div>
                  
                  <div className="flex gap-3 flex-row-reverse">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
                      To configure a custom vector provider, you can use the Provider API. Simply send a POST request to the configuration endpoint with your Pinecone or Supabase credentials. Would you like to see a code example?
                    </div>
                  </div>

                  <div className="flex gap-3">
                     <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-slate-600">U</span>
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-800">
                      Yes, show me the Python example.
                    </div>
                  </div>

                   <div className="flex gap-3 flex-row-reverse">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground max-w-[80%]">
                      <pre className="font-mono text-xs bg-black/20 p-2 rounded mt-1 overflow-x-auto">
{`from providers.factory import ProviderFactory

provider = ProviderFactory.get_vector_provider(
    "pinecone", 
    {"api_key": "your-key"}
)`}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Type your message..." 
                      className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      disabled
                    />
                    <div className="absolute right-2 top-2 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Section */}
        <section className="py-24 bg-slate-50">
          <div className="container mx-auto px-4">
             <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Comprehensive Documentation</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Everything you need to integrate and scale.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <Code2 className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>SDK & Widget</CardTitle>
                  <CardDescription>
                    Drop-in JavaScript SDK and Chat Widget for instant integration.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-slate-950 text-slate-50 p-3 rounded-lg text-xs font-mono mb-4">
                    npm install @rag-platform/sdk
                  </pre>
                  <Link to="/documentation" className="text-primary hover:underline text-sm font-medium flex items-center">
                    Read SDK Docs <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <Lock className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Auth & Security</CardTitle>
                  <CardDescription>
                    Enterprise-grade security with API Keys, RBAC, and Audit Logs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600 mb-4">
                    <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-green-500" /> API Key Management</li>
                    <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-green-500" /> Role-Based Access</li>
                    <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-green-500" /> Audit Logging</li>
                  </ul>
                   <Link to="/documentation" className="text-primary hover:underline text-sm font-medium flex items-center">
                    Security Guide <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-white border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <Database className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>Providers</CardTitle>
                  <CardDescription>
                    Configure your preferred Vector Stores and LLMs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">OpenAI</Badge>
                    <Badge variant="outline">Gemini</Badge>
                    <Badge variant="outline">Pinecone</Badge>
                    <Badge variant="outline">Supabase</Badge>
                  </div>
                   <Link to="/documentation" className="text-primary hover:underline text-sm font-medium flex items-center">
                    Configuration Docs <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-white border-t">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
                  Enterprise-Grade <br/> Infrastructure
                </h2>
                <p className="text-lg text-slate-600 mb-8">
                  Built for scale and security. Whether you're a startup or a large enterprise, our platform adapts to your needs.
                </p>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Multi-Tenancy</h3>
                      <p className="text-slate-600">Strict data isolation with company-level scoping.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Dual Operating Modes</h3>
                      <p className="text-slate-600">Choose between Managed Infrastructure or Bring-Your-Own (BYO).</p>
                    </div>
                  </div>
                   <div className="flex gap-4">
                     <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Knowledge Management</h3>
                      <p className="text-slate-600">Advanced ingestion pipeline with chunking and embedding strategies.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative lg:ml-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4 mt-12">
                     <Card className="bg-slate-50 border-none shadow-md">
                        <CardContent className="p-6">
                           <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                              <Zap className="h-5 w-5" />
                           </div>
                           <h4 className="font-bold mb-2">Fast</h4>
                           <p className="text-sm text-slate-500">Optimized latency for real-time chat.</p>
                        </CardContent>
                     </Card>
                     <Card className="bg-slate-50 border-none shadow-md">
                        <CardContent className="p-6">
                           <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-4">
                              <ShieldCheck className="h-5 w-5" />
                           </div>
                           <h4 className="font-bold mb-2">Secure</h4>
                           <p className="text-sm text-slate-500">SOC2 compliant architecture patterns.</p>
                        </CardContent>
                     </Card>
                  </div>
                  <div className="space-y-4">
                     <Card className="bg-slate-50 border-none shadow-md">
                        <CardContent className="p-6">
                           <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
                              <Bot className="h-5 w-5" />
                           </div>
                           <h4 className="font-bold mb-2">Smart</h4>
                           <p className="text-sm text-slate-500">Advanced RAG with context retention.</p>
                        </CardContent>
                     </Card>
                     <Card className="bg-slate-50 border-none shadow-md">
                        <CardContent className="p-6">
                           <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                              <Code2 className="h-5 w-5" />
                           </div>
                           <h4 className="font-bold mb-2">Extensible</h4>
                           <p className="text-sm text-slate-500">API-first design for developers.</p>
                        </CardContent>
                     </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-slate-950 text-white text-center">
           <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">Ready to transform your support?</h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
                 Join thousands of companies building better customer experiences with our Enterprise RAG Platform.
              </p>
              <Link to="/signup">
                <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                   Get Started for Free
                </Button>
              </Link>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 bg-white border-t">
         <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
               <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Zap className="h-5 w-5 text-primary-foreground" />
               </div>
               <span className="text-xl font-bold">Enterprise RAG</span>
            </div>
            <div className="text-sm text-slate-500">
               © 2024 Enterprise RAG Platform. All rights reserved.
            </div>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
