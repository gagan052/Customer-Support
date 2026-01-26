import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService, Message } from '../services/chat.service';
import { toast } from 'ngx-sonner';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-chat-page',
  template: `
    <app-main-layout>
      <div class="h-screen flex flex-col">
        <app-chat-header 
          (onEscalate)="handleEscalate()"
        ></app-chat-header>
        
        <div class="flex-1 overflow-y-auto" #scrollArea>
          <div class="py-4 space-y-1">
             <app-message-bubble 
               *ngFor="let msg of messages$ | async" 
               [message]="msg"
             ></app-message-bubble>
             
             <app-typing-indicator *ngIf="isTyping$ | async"></app-typing-indicator>
          </div>
        </div>

        <app-quick-replies 
           *ngIf="showQuickReplies && (messages$ | async)?.length === 1"
           [replies]="quickReplies"
           (onSelect)="handleSendMessage($event)"
        ></app-quick-replies>

        <app-chat-input 
          (onSend)="handleSendMessage($event)" 
          [disabled]="(isTyping$ | async) || false"
        ></app-chat-input>
      </div>
    </app-main-layout>
  `
})
export class ChatPageComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollArea') private scrollArea!: ElementRef;

  messages$: Observable<Message[]>;
  isTyping$: Observable<boolean>;
  showQuickReplies = true;

  quickReplies = [
    "How do I reset my password?",
    "I need help with my bill",
    "Something isn't working",
    "I have a feature suggestion",
    "I want to request a refund",
  ];

  constructor(private chatService: ChatService) {
    this.messages$ = this.chatService.messages$;
    this.isTyping$ = this.chatService.isTyping$;
  }

  ngOnInit() {
    this.chatService.initializeChat();
    
    // Subscribe to events (logic handled in service, but we might want logs)
    this.chatService.onEscalate$.subscribe(() => {
        console.log("[Chat] Escalation triggered");
    });
    this.chatService.onResolve$.subscribe(() => {
        console.log("[Chat] Issue resolved");
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollArea.nativeElement.scrollTop = this.scrollArea.nativeElement.scrollHeight;
    } catch(err) { }
  }

  async handleSendMessage(content: string) {
    this.showQuickReplies = false;
    await this.chatService.sendMessage(content);
  }

  handleEscalate() {
    toast.info("Connecting to human agent...", {
      description: "Please wait while we connect you.",
    });
  }
}
