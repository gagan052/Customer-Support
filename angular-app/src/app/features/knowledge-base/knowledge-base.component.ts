import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../shared/ui/ui.module';
import { LucideAngularModule } from 'lucide-angular';
import { CoreModule } from '../../core/core.module';
import { SupabaseService } from '../../core/services/supabase.service';
import { KnowledgeService } from './services/knowledge.service';
import { getActiveProvider } from '../../shared/utils/api-config';
import { toast } from 'ngx-sonner';
import { formatDistanceToNow } from 'date-fns';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    LucideAngularModule,
    CoreModule
  ],
  template: `
    <app-main-layout>
      <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold flex items-center gap-2">
              <lucide-icon name="book-open" class="w-6 h-6 text-accent"></lucide-icon>
              Knowledge Base
            </h1>
            <p class="text-muted-foreground">Manage documents for RAG retrieval</p>
          </div>
          <div class="flex gap-3">
            <button appButton variant="outline" (click)="focusSearch()">
              <lucide-icon name="search" class="w-4 h-4 mr-2"></lucide-icon>
              Search
            </button>
            <button appButton (click)="fileInput.click()" [disabled]="uploading">
              <lucide-icon *ngIf="!uploading" name="upload" class="w-4 h-4 mr-2"></lucide-icon>
              <lucide-icon *ngIf="uploading" name="loader-2" class="w-4 h-4 mr-2 animate-spin"></lucide-icon>
              Upload Document
            </button>
            <input 
              #fileInput
              type="file" 
              class="hidden" 
              accept=".txt,.md,.json"
              (change)="handleFileUpload($event)"
            />
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div *ngFor="let stat of stats; let i = index" [@fadeInUp]="{ value: 'in', params: { delay: i * 100 } }">
            <app-card class="glass-card">
              <app-card-content class="p-4">
                <p class="text-sm text-muted-foreground">{{ stat.label }}</p>
                <p class="text-2xl font-bold mt-1">{{ stat.value }}</p>
              </app-card-content>
            </app-card>
          </div>
        </div>

        <!-- Search & Filter -->
        <div class="flex gap-4">
          <div class="relative flex-1">
            <lucide-icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"></lucide-icon>
            <input 
              #searchInput
              appInput
              placeholder="Search documents..." 
              class="pl-9"
              [(ngModel)]="searchQuery"
              (ngModelChange)="fetchDocuments()"
            />
          </div>
          <button appButton variant="outline">
            <lucide-icon name="plus" class="w-4 h-4 mr-2"></lucide-icon>
            Add Folder
          </button>
        </div>

        <!-- Documents List -->
        <app-card class="glass-card">
          <app-card-header>
            <app-card-title>Documents</app-card-title>
            <app-card-description>Manage your indexed content</app-card-description>
          </app-card-header>
          <app-card-content>
            <div *ngIf="docsLoading" class="flex justify-center py-8">
              <lucide-icon name="loader-2" class="h-8 w-8 animate-spin text-primary"></lucide-icon>
            </div>
            
            <div *ngIf="!docsLoading" class="space-y-1">
              <div
                *ngFor="let item of documents"
                class="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors group cursor-pointer"
                (click)="handleEditClick(item)"
              >
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <lucide-icon *ngIf="item.file_type?.includes('folder')" name="folder" class="w-5 h-5"></lucide-icon>
                    <lucide-icon *ngIf="!item.file_type?.includes('folder')" name="file-text" class="w-5 h-5"></lucide-icon>
                  </div>
                  <div>
                    <p class="font-medium">{{ item.name }}</p>
                    <div class="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{{ item.chunk_count || 0 }} chunks</span>
                      <span>•</span>
                      <span>{{ formatTime(item.updated_at) }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-4">
                  <span appBadge [variant]="'outline'" [class]="getStatusClass(item.status)">
                    {{ item.status }}
                  </span>
                  
                  <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button appButton size="icon" variant="ghost" class="h-8 w-8" (click)="$event.stopPropagation(); handleEditClick(item)">
                      <lucide-icon name="edit" class="w-4 h-4"></lucide-icon>
                    </button>
                    <button appButton size="icon" variant="ghost" class="h-8 w-8" (click)="$event.stopPropagation(); reindexDocument(item)">
                      <lucide-icon 
                        name="refresh-cw" 
                        [class]="'w-4 h-4 ' + (reindexingId === item.id ? 'animate-spin' : '')"
                      ></lucide-icon>
                    </button>
                    <button appButton size="icon" variant="ghost" class="h-8 w-8 text-destructive" (click)="$event.stopPropagation(); deleteDocument(item.id)">
                      <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
                    </button>
                  </div>
                </div>
              </div>

              <p *ngIf="documents.length === 0" class="text-center text-muted-foreground py-8">
                No documents found. Upload one to get started.
              </p>
            </div>
          </app-card-content>
        </app-card>

        <!-- Document Viewer Sheet -->
        <app-sheet [open]="isSheetOpen" (openChange)="isSheetOpen = $event" class="sm:max-w-2xl w-full">
          <div class="flex flex-col space-y-2 text-center sm:text-left mb-4">
            <h2 class="text-lg font-semibold text-foreground">Document Viewer</h2>
            <p class="text-sm text-muted-foreground">
              View and edit the content of {{ selectedDoc?.name }}. Saving will re-index the document.
            </p>
          </div>
          <div class="py-4 h-[calc(100vh-200px)]">
            <textarea 
              appTextarea
              [(ngModel)]="editContent" 
              class="h-full resize-none font-mono text-sm"
              placeholder="Document content..."
            ></textarea>
          </div>
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4">
             <button appButton variant="outline" (click)="isSheetOpen = false">Cancel</button>
             <button appButton (click)="handleSaveContent()" [disabled]="saving">
               <lucide-icon *ngIf="saving" name="loader-2" class="w-4 h-4 mr-2 animate-spin"></lucide-icon>
               Save Changes
             </button>
          </div>
        </app-sheet>
      </div>
    </app-main-layout>
  `,
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms {{ delay }}ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ], { params: { delay: 0 } })
    ])
  ]
})
export class KnowledgeBaseComponent implements OnInit {
  searchQuery = '';
  documents: any[] = [];
  stats: any[] = [];
  selectedDoc: any = null;
  editContent = '';
  isSheetOpen = false;
  
  docsLoading = false;
  uploading = false;
  reindexingId: string | null = null;
  saving = false;

  @ViewChild('searchInput') searchInput!: ElementRef;

  constructor(
    private supabaseService: SupabaseService,
    private knowledgeService: KnowledgeService
  ) {}

  ngOnInit() {
    this.fetchDocuments();
    this.fetchStats();
  }

  get supabase() {
    return this.supabaseService.supabase;
  }

  async fetchDocuments() {
    this.docsLoading = true;
    try {
      let query = this.supabase
        .from("knowledge_documents")
        .select("*")
        .order("updated_at", { ascending: false });

      if (this.searchQuery) {
        query = query.ilike("name", `%${this.searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      this.documents = data || [];
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to fetch documents");
    } finally {
      this.docsLoading = false;
    }
  }

  async fetchStats() {
    try {
      const { data: docs } = await this.supabase.from("knowledge_documents").select("chunk_count");
      
      const totalDocs = docs?.length || 0;
      const totalChunks = docs?.reduce((acc, curr) => acc + (curr.chunk_count || 0), 0) || 0;
      const provider = getActiveProvider();

      this.stats = [
        { label: "Total Documents", value: totalDocs.toString() },
        { label: "Total Chunks", value: totalChunks.toString() },
        { label: "Embedding Model", value: provider === 'gemini' ? "Gemini Text-Emb-004" : "OpenAI Text-Emb-3" },
        { label: "Vector DB", value: "Supabase Vec" },
      ];
    } catch (error) {
      console.error(error);
    }
  }

  async handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    
    const file = input.files[0];
    this.uploading = true;

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const fileText = await file.text().catch(() => "");
      
      // Upload to Storage
      const { error: uploadError } = await this.supabase.storage
        .from("documents")
        .upload(fileName, file);
        
      if (uploadError) throw uploadError;

      // Create DB Entry
      const { data, error: dbError } = await this.supabase
        .from("knowledge_documents")
        .insert({
          name: file.name,
          file_type: file.type,
          status: "pending",
          metadata: { storage_path: fileName },
          content: fileText
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success("Document uploaded and processed");
      this.fetchDocuments();
      this.fetchStats();

      // Trigger Processing
      try {
        await this.knowledgeService.processDocument(data.id);
      } catch (err: any) {
        console.error("Processing failed, but file uploaded:", err);
        toast.error(`Processing failed: ${err.message}`);
      }

    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      this.uploading = false;
      input.value = ''; // Reset input
    }
  }

  async reindexDocument(item: any) {
    this.reindexingId = item.id;
    try {
      await this.supabase
        .from("knowledge_documents")
        .update({ status: "pending" })
        .eq("id", item.id);
      
      await this.knowledgeService.processDocument(item.id);
      
      toast.success("Re-indexing completed");
      this.fetchDocuments();
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to re-index: " + error.message);
    } finally {
      this.reindexingId = null;
    }
  }

  async deleteDocument(id: string) {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const { error } = await this.supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", id);
      if (error) throw error;
      
      toast.success("Document deleted");
      this.fetchDocuments();
      this.fetchStats();
    } catch (error) {
      toast.error("Failed to delete document");
    }
  }

  handleEditClick(doc: any) {
    this.selectedDoc = doc;
    this.isSheetOpen = true;
    
    const initial = doc.content || "";
    this.editContent = initial;
    
    if (!initial && doc.metadata?.storage_path) {
      this.supabase.storage
        .from("documents")
        .download(doc.metadata.storage_path)
        .then(async ({ data, error }) => {
          if (error || !data) return;
          const text = await data.text().catch(() => "");
          this.editContent = text;
        })
        .catch(() => {});
    }
  }

  async handleSaveContent() {
    if (!this.selectedDoc) return;
    
    this.saving = true;
    try {
      const storagePath = this.selectedDoc.metadata?.storage_path;
      
      if (storagePath) {
        const blob = new Blob([this.editContent], { type: "text/plain" });
        const file = new File([blob], storagePath.split('/').pop() || "updated.txt", { type: "text/plain" });
        const { error: storageError } = await this.supabase.storage
          .from("documents")
          .upload(storagePath, file, { upsert: true });
        if (storageError) throw storageError;
      }

      const { error: dbError } = await this.supabase
        .from("knowledge_documents")
        .update({ content: this.editContent, status: "pending" })
        .eq("id", this.selectedDoc.id);
      
      if (dbError) throw dbError;

      await this.knowledgeService.processDocument(this.selectedDoc.id);
      
      toast.success("Document updated and re-indexed");
      this.isSheetOpen = false;
      this.fetchDocuments();
    } catch (error: any) {
      toast.error("Failed to update document: " + error.message);
    } finally {
      this.saving = false;
    }
  }

  focusSearch() {
    this.searchInput?.nativeElement?.focus();
  }

  formatTime(date: string) {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  }

  getStatusClass(status: string) {
    if (status === "indexed") return "text-success border-success/30 bg-success/10";
    if (status === "needs-update") return "text-warning border-warning/30 bg-warning/10";
    if (status === "error") return "text-destructive border-destructive/30 bg-destructive/10";
    return "text-muted-foreground";
  }
}
