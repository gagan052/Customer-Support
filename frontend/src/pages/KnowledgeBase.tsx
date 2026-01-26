
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { 
  BookOpen, 
  Upload, 
  FileText, 
  Search,
  Plus,
  Folder,
  MoreVertical,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  Edit
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { processDocument } from "@/lib/client-knowledge-service";

import { getActiveProvider } from "@/lib/api-config";

// ... existing imports

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // 1. Fetch Documents from Supabase
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["knowledge-documents", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("knowledge_documents")
        .select("*")
        .order("updated_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // 2. Fetch Stats
  const { data: stats } = useQuery({
    queryKey: ["knowledge-stats"],
    queryFn: async () => {
      const { data: docs } = await supabase.from("knowledge_documents").select("chunk_count");
      
      const totalDocs = docs?.length || 0;
      const totalChunks = docs?.reduce((acc, curr) => acc + (curr.chunk_count || 0), 0) || 0;
      const provider = getActiveProvider();

      return [
        { label: "Total Documents", value: totalDocs.toString() },
        { label: "Total Chunks", value: totalChunks.toString() },
        { label: "Embedding Model", value: provider === 'gemini' ? "Gemini Text-Emb-004" : "OpenAI Text-Emb-3" },
        { label: "Vector DB", value: "Supabase Vec" }, // Using Supabase pgvector as "Vector DB" proxy
      ];
    }
  });

  // 3. Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileName = `${Date.now()}-${file.name}`;
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const fileText = isPdf ? "" : await file.text().catch(() => "");
      
      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;

      // Create DB Entry
      const { data, error: dbError } = await supabase
        .from("knowledge_documents")
        .insert({
          name: file.name,
          file_type: file.type,
          status: "pending", // Will be processed by Edge Function
          metadata: { storage_path: fileName },
          // Store content so the viewer can show it immediately (and edits can work without re-download).
          content: fileText
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Trigger Processing (Client-Side / Python Backend)
      try {
        await processDocument(data.id);
      } catch (err: any) {
        console.error("Processing failed, but file uploaded:", err);
        toast.error(`Processing failed: ${err.message}`);
        // Don't throw here so we still show the file in the list (as pending/failed)
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success("Document uploaded and processed");
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-stats"] });
    },
    onError: (error: any) => {
      // If we caught the error in mutationFn, this might not trigger unless we re-throw
      // But we want to ensure the list updates even if processing fails
      toast.error(`Upload failed: ${error.message}`);
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    }
  });

  // 4. Re-index Mutation
  const reindexMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("knowledge_documents")
        .update({ status: "pending" })
        .eq("id", id);
      
      // Use client-side processing instead of Edge Function
      await processDocument(id);
    },
    onSuccess: () => {
      toast.success("Re-indexing completed");
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to re-index: " + error.message);
    }
  });

  // 5. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Document deleted");
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-stats"] });
    },
    onError: () => toast.error("Failed to delete document")
  });

  // 6. Update Content Mutation
  const updateContentMutation = useMutation({
    mutationFn: async ({ id, content, storagePath }: { id: string; content: string; storagePath: string }) => {
      // 1. Update Storage (optional but good for consistency)
      if (storagePath) {
        const blob = new Blob([content], { type: "text/plain" });
        const file = new File([blob], storagePath.split('/').pop() || "updated.txt", { type: "text/plain" });
        const { error: storageError } = await supabase.storage
          .from("documents")
          .upload(storagePath, file, { upsert: true });
        if (storageError) throw storageError;
      }

      // 2. Update DB
      const { error: dbError } = await supabase
        .from("knowledge_documents")
        .update({ content: content, status: "pending" })
        .eq("id", id);
      
      if (dbError) throw dbError;

      // 3. Trigger Re-index
      // Use client-side processing
      await processDocument(id);
    },
    onSuccess: () => {
      toast.success("Document updated and re-indexed");
      setIsSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
    },
    onError: (error: any) => {
      toast.error("Failed to update document: " + error.message);
    }
  });

  const handleEditClick = (doc: any) => {
    setSelectedDoc(doc);
    setIsSheetOpen(true);
    // Prefer DB content if present; otherwise, load from storage.
    const initial = doc.content || "";
    setEditContent(initial);
    if (!initial && doc.metadata?.storage_path) {
      supabase.storage
        .from("documents")
        .download(doc.metadata.storage_path)
        .then(async ({ data, error }) => {
          if (error || !data) return;
          const text = await data.text().catch(() => "");
          setEditContent(text);
        })
        .catch(() => {});
    }
  };

  const handleSaveContent = () => {
    if (selectedDoc) {
      updateContentMutation.mutate({ 
        id: selectedDoc.id, 
        content: editContent,
        storagePath: selectedDoc.metadata?.storage_path 
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-accent" />
              Knowledge Base
            </h1>
            <p className="text-muted-foreground">Manage documents for RAG retrieval</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => document.getElementById('search-input')?.focus()}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Upload className="w-4 h-4 mr-2" />}
              Upload Document
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".txt,.md,.json,.pdf" // Restrict types for simplicity in this iteration
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(stats || [
            { label: "Total Documents", value: "0" },
            { label: "Total Chunks", value: "0" },
            { label: "Embedding Model", value: "MiniLM-L6" },
            { label: "Vector DB", value: "Pinecone" },
          ]).map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass-card">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              id="search-input"
              placeholder="Search documents..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Folder
          </Button>
        </div>

        {/* Documents List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Manage your indexed content</CardDescription>
          </CardHeader>
          <CardContent>
            {docsLoading ? (
               <div className="flex justify-center py-8">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
            ) : (
              <div className="space-y-1">
                {documents?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors group cursor-pointer"
                    onClick={() => handleEditClick(item)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                        {item.file_type?.includes('folder') ? <Folder className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.chunk_count || 0} chunks</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant="outline" 
                        className={
                          item.status === "indexed" ? "text-success border-success/30 bg-success/10" :
                          item.status === "needs-update" ? "text-warning border-warning/30 bg-warning/10" :
                          item.status === "error" ? "text-destructive border-destructive/30 bg-destructive/10" :
                          "text-muted-foreground"
                        }
                      >
                        {item.status}
                      </Badge>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleEditClick(item); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); reindexMutation.mutate(item.id); }}>
                          <RefreshCw className={`w-4 h-4 ${reindexMutation.isPending && reindexMutation.variables === item.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(item.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {documents?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No documents found. Upload one to get started.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="sm:max-w-2xl w-full">
            <SheetHeader>
              <SheetTitle>Document Viewer</SheetTitle>
              <SheetDescription>
                View and edit the content of {selectedDoc?.name}. Saving will re-index the document.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 h-[calc(100vh-200px)]">
              <Textarea 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)} 
                className="h-full resize-none font-mono text-sm"
                placeholder="Document content..."
              />
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={() => setIsSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveContent} disabled={updateContentMutation.isPending}>
                {updateContentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </MainLayout>
  );
}
