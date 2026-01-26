import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ConversationsComponent } from './features/conversations/conversations.component';
import { EscalationsComponent } from './features/escalations/escalations.component';
import { KnowledgeBaseComponent } from './features/knowledge-base/knowledge-base.component';
import { AnalyticsComponent } from './features/analytics/analytics.component';
import { SettingsComponent } from './features/settings/settings.component';
import { NotFoundComponent } from './features/not-found/not-found.component';

const routes: Routes = [
  { 
    path: '', 
    loadChildren: () => import('./features/chat/chat.module').then(m => m.ChatModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'conversations',
    component: ConversationsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'escalations',
    component: EscalationsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'knowledge',
    component: KnowledgeBaseComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'analytics',
    component: AnalyticsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
