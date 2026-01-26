import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './layout/sidebar.component';
import { MainLayoutComponent } from './layout/main-layout.component';
import { LucideAngularModule, MessageSquare, LayoutDashboard, BookOpen, Users, Settings, BarChart3, Zap, AlertTriangle, HelpCircle } from 'lucide-angular';

@NgModule({
  declarations: [
    SidebarComponent,
    MainLayoutComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    LucideAngularModule.pick({
      MessageSquare, LayoutDashboard, BookOpen, Users, Settings, BarChart3, Zap, AlertTriangle, HelpCircle
    })
  ],
  exports: [
    MainLayoutComponent
  ]
})
export class CoreModule { }
