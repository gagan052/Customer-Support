import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiModule } from '../../shared/ui/ui.module';
import { LucideAngularModule } from 'lucide-angular';
import { CoreModule } from '../../core/core.module';
import { LabelComponent } from '../../shared/ui/label/label.component';
import { toast } from 'ngx-sonner';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UiModule,
    LucideAngularModule,
    CoreModule,
    LabelComponent
  ],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <app-main-layout>
      <div class="p-6 space-y-6 max-w-4xl">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold flex items-center gap-2">
              <lucide-icon name="settings" class="w-6 h-6 text-accent"></lucide-icon>
              Settings
            </h1>
            <p class="text-muted-foreground">Configure your AI Support Agent</p>
          </div>
          <button appButton variant="accent" (click)="handleSave()">
            <lucide-icon name="save" class="w-4 h-4 mr-2"></lucide-icon>
            Save Changes
          </button>
        </div>

        <!-- API Configuration -->
        <div [@fadeInUp]>
          <app-card class="glass-card border-accent/20">
            <app-card-header>
              <app-card-title class="flex items-center gap-2">
                <lucide-icon name="key" class="w-5 h-5 text-accent"></lucide-icon>
                API Configuration
              </app-card-title>
              <app-card-description>
                Manage your AI provider credentials
              </app-card-description>
            </app-card-header>
            <app-card-content>
              <div class="space-y-6">
                <div class="space-y-3">
                  <app-label>Active Provider</app-label>
                  <app-radio-group 
                    [value]="activeProvider" 
                    (valueChange)="activeProvider = $event"
                    class="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <app-radio-group-item value="openai" id="openai" class="peer sr-only"></app-radio-group-item>
                      <app-label
                        htmlFor="openai"
                        class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-accent [&:has([data-state=checked])]:border-accent cursor-pointer"
                      >
                        <lucide-icon name="zap" class="mb-3 h-6 w-6"></lucide-icon>
                        OpenAI
                      </app-label>
                    </div>
                    <div>
                      <app-radio-group-item value="gemini" id="gemini" class="peer sr-only"></app-radio-group-item>
                      <app-label
                        htmlFor="gemini"
                        class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-accent [&:has([data-state=checked])]:border-accent cursor-pointer"
                      >
                        <lucide-icon name="sparkles" class="mb-3 h-6 w-6"></lucide-icon>
                        Google Gemini
                      </app-label>
                    </div>
                  </app-radio-group>
                </div>

                <div *ngIf="activeProvider === 'openai'" class="space-y-2">
                  <app-label htmlFor="apiKey">OpenAI API Key</app-label>
                  <div class="relative">
                    <input 
                      appInput
                      id="apiKey" 
                      [type]="showKey ? 'text' : 'password'" 
                      placeholder="sk-..." 
                      [(ngModel)]="apiKey"
                      class="pr-10"
                    />
                    <button 
                      type="button"
                      (click)="showKey = !showKey"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <lucide-icon [name]="showKey ? 'eye-off' : 'eye'" class="w-4 h-4"></lucide-icon>
                    </button>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    Supports GPT-4o, GPT-3.5 Turbo.
                  </p>
                </div>

                <div *ngIf="activeProvider === 'gemini'" class="space-y-2">
                  <app-label htmlFor="geminiApiKey">Gemini API Key</app-label>
                  <div class="relative">
                    <input 
                      appInput
                      id="geminiApiKey" 
                      [type]="showGeminiKey ? 'text' : 'password'" 
                      placeholder="AIza..." 
                      [(ngModel)]="geminiApiKey"
                      class="pr-10"
                    />
                    <button 
                      type="button"
                      (click)="showGeminiKey = !showGeminiKey"
                      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <lucide-icon [name]="showGeminiKey ? 'eye-off' : 'eye'" class="w-4 h-4"></lucide-icon>
                    </button>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    Supports Gemini Pro 1.5. Free tier available.
                  </p>
                </div>

                <p class="text-xs text-muted-foreground">
                  Your key is stored locally in your browser and sent securely to our edge functions. 
                  It is never stored in our database.
                </p>
              </div>
            </app-card-content>
          </app-card>
        </div>

        <!-- Decision Engine -->
        <div [@fadeInUp]>
          <app-card class="glass-card">
            <app-card-header>
              <app-card-title class="flex items-center gap-2">
                <lucide-icon name="brain" class="w-5 h-5 text-accent"></lucide-icon>
                Decision Engine
              </app-card-title>
              <app-card-description>
                Configure confidence thresholds for agent decisions
              </app-card-description>
            </app-card-header>
            <app-card-content class="space-y-6">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <app-label>Auto-Resolve Threshold</app-label>
                  <span class="text-sm font-mono text-accent">{{ autoResolveThreshold[0] }}%</span>
                </div>
                <app-slider
                  [value]="autoResolveThreshold"
                  (valueChange)="autoResolveThreshold = $event"
                  [min]="50"
                  [max]="99"
                  [step]="1"
                  class="w-full"
                ></app-slider>
                <p class="text-xs text-muted-foreground">
                  Queries with confidence above this threshold will be auto-resolved
                </p>
              </div>

              <app-separator></app-separator>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <app-label>Clarification Threshold</app-label>
                  <span class="text-sm font-mono text-warning">{{ clarifyThreshold[0] }}%</span>
                </div>
                <app-slider
                  [value]="clarifyThreshold"
                  (valueChange)="clarifyThreshold = $event"
                  [min]="30"
                  [max]="84"
                  [step]="1"
                  class="w-full"
                ></app-slider>
                <p class="text-xs text-muted-foreground">
                  Between this and auto-resolve: ask clarification. Below: escalate.
                </p>
              </div>

              <app-separator></app-separator>

              <div class="flex items-center justify-between">
                <div>
                  <app-label>Sentiment-Based Escalation</app-label>
                  <p class="text-xs text-muted-foreground mt-1">
                    Automatically escalate frustrated users even with medium confidence
                  </p>
                </div>
                <app-switch [checked]="sentimentEscalation" (checkedChange)="sentimentEscalation = $event"></app-switch>
              </div>

              <div class="flex items-center justify-between">
                <div>
                  <app-label>Enable Auto-Resolve</app-label>
                  <p class="text-xs text-muted-foreground mt-1">
                    Allow agent to resolve queries without human review
                  </p>
                </div>
                <app-switch [checked]="autoResolve" (checkedChange)="autoResolve = $event"></app-switch>
              </div>
            </app-card-content>
          </app-card>
        </div>

        <!-- LLM Configuration -->
        <div [@fadeInUp]="{ value: ':enter', params: { delay: 100 } }">
          <app-card class="glass-card">
            <app-card-header>
              <app-card-title class="flex items-center gap-2">
                <lucide-icon name="zap" class="w-5 h-5 text-accent"></lucide-icon>
                LLM Configuration
              </app-card-title>
              <app-card-description>
                Local model settings (via Ollama)
              </app-card-description>
            </app-card-header>
            <app-card-content class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <app-label>Model</app-label>
                  <input appInput value="mistral:7b" readonly class="bg-secondary/50" />
                </div>
                <div class="space-y-2">
                  <app-label>Ollama Endpoint</app-label>
                  <input appInput value="http://localhost:11434" placeholder="http://localhost:11434" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <app-label>Temperature</app-label>
                  <input appInput type="number" value="0.7" min="0" max="2" step="0.1" />
                </div>
                <div class="space-y-2">
                  <app-label>Max Tokens</app-label>
                  <input appInput type="number" value="512" min="64" max="4096" />
                </div>
              </div>
            </app-card-content>
          </app-card>
        </div>

        <!-- Vector Database -->
        <div [@fadeInUp]="{ value: ':enter', params: { delay: 200 } }">
          <app-card class="glass-card">
            <app-card-header>
              <app-card-title class="flex items-center gap-2">
                <lucide-icon name="database" class="w-5 h-5 text-accent"></lucide-icon>
                Vector Database
              </app-card-title>
              <app-card-description>
                RAG retrieval configuration
              </app-card-description>
            </app-card-header>
            <app-card-content class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <app-label>Vector DB</app-label>
                  <input appInput value="ChromaDB" readonly class="bg-secondary/50" />
                </div>
                <div class="space-y-2">
                  <app-label>Embedding Model</app-label>
                  <input appInput value="all-MiniLM-L6-v2" readonly class="bg-secondary/50" />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div class="space-y-2">
                  <app-label>Chunk Size</app-label>
                  <input appInput type="number" value="500" />
                </div>
                <div class="space-y-2">
                  <app-label>Chunk Overlap</app-label>
                  <input appInput type="number" value="50" />
                </div>
                <div class="space-y-2">
                  <app-label>Top-K Results</app-label>
                  <input appInput type="number" value="3" min="1" max="10" />
                </div>
              </div>
            </app-card-content>
          </app-card>
        </div>

        <!-- Notifications -->
        <div [@fadeInUp]="{ value: ':enter', params: { delay: 300 } }">
          <app-card class="glass-card">
            <app-card-header>
              <app-card-title class="flex items-center gap-2">
                <lucide-icon name="bell" class="w-5 h-5 text-accent"></lucide-icon>
                Notifications
              </app-card-title>
            </app-card-header>
            <app-card-content class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <app-label>Escalation Alerts</app-label>
                  <p class="text-xs text-muted-foreground mt-1">Get notified when conversations escalate</p>
                </div>
                <app-switch [checked]="true"></app-switch>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <app-label>Low Confidence Warnings</app-label>
                  <p class="text-xs text-muted-foreground mt-1">Alert when agent confidence drops below 50%</p>
                </div>
                <app-switch [checked]="true"></app-switch>
              </div>
              <div class="flex items-center justify-between">
                <div>
                  <app-label>Negative Sentiment Alerts</app-label>
                  <p class="text-xs text-muted-foreground mt-1">Immediate notification for frustrated users</p>
                </div>
                <app-switch [checked]="true"></app-switch>
              </div>
            </app-card-content>
          </app-card>
        </div>
      </div>
    </app-main-layout>
  `
})
export class SettingsComponent implements OnInit {
  autoResolveThreshold: number[] = [85];
  clarifyThreshold: number[] = [60];
  sentimentEscalation = true;
  autoResolve = true;
  
  apiKey = '';
  showKey = false;
  
  geminiApiKey = '';
  showGeminiKey = false;
  activeProvider: 'openai' | 'gemini' = 'openai';

  ngOnInit() {
    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) this.apiKey = storedKey;
    
    const storedGeminiKey = localStorage.getItem('gemini_api_key');
    if (storedGeminiKey) this.geminiApiKey = storedGeminiKey;
    
    const storedProvider = localStorage.getItem('ai_provider');
    if (storedProvider === 'openai' || storedProvider === 'gemini') {
      this.activeProvider = storedProvider as 'openai' | 'gemini';
    } else {
      // Auto-detect preference if not set
      if (storedGeminiKey && !storedKey) this.activeProvider = 'gemini';
    }
  }

  handleSave() {
    // Save OpenAI Key
    if (this.apiKey.trim()) {
      localStorage.setItem('openai_api_key', this.apiKey.trim());
    } else {
      localStorage.removeItem('openai_api_key');
    }
    
    // Save Gemini Key
    if (this.geminiApiKey.trim()) {
      localStorage.setItem('gemini_api_key', this.geminiApiKey.trim());
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    
    // Save Provider
    localStorage.setItem('ai_provider', this.activeProvider);

    toast.success('Settings saved successfully', {
      description: `Active Provider: ${this.activeProvider === 'openai' ? 'OpenAI' : 'Google Gemini'}`
    });
  }
}
