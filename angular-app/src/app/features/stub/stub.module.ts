import { Component } from '@angular/core';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CoreModule } from '../../core/core.module';

@Component({
  selector: 'app-coming-soon',
  template: `
    <app-main-layout>
      <div class="flex items-center justify-center h-[calc(100vh-64px)]">
        <div class="text-center">
          <h1 class="text-2xl font-bold">Coming Soon</h1>
          <p class="text-muted-foreground">This feature is under development.</p>
        </div>
      </div>
    </app-main-layout>
  `
})
export class ComingSoonComponent {}

@NgModule({
  declarations: [ComingSoonComponent],
  imports: [
    CommonModule,
    CoreModule,
    RouterModule.forChild([
      { path: '', component: ComingSoonComponent }
    ])
  ]
})
export class StubModule {}
