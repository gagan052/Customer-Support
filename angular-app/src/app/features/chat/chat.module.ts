import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { UiModule } from '../../shared/ui/ui.module';
import { ChatPageComponent } from './pages/chat-page.component';
import { ChatHeaderComponent } from './components/chat-header.component';
import { ChatInputComponent } from './components/chat-input.component';
import { MessageBubbleComponent } from './components/message-bubble.component';
import { QuickRepliesComponent } from './components/quick-replies.component';
import { TypingIndicatorComponent } from './components/typing-indicator.component';

const routes: Routes = [
  { path: '', component: ChatPageComponent }
];

import { LucideAngularModule, Bot, User, AlertTriangle, CheckCircle2, Send, Mic, Paperclip, Phone, MoreVertical, Zap } from 'lucide-angular';
import { CoreModule } from '../../core/core.module';

@NgModule({
  declarations: [
    ChatPageComponent,
    ChatHeaderComponent,
    ChatInputComponent,
    MessageBubbleComponent,
    QuickRepliesComponent,
    TypingIndicatorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    UiModule,
    CoreModule,
    RouterModule.forChild(routes),
    LucideAngularModule.pick({ 
      Bot, User, AlertTriangle, CheckCircle2, Send, Mic, Paperclip, Phone, MoreVertical, Zap 
    })
  ]
})
export class ChatModule { }
