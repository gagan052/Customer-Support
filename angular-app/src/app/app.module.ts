import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CoreModule } from './core/core.module';
import { UiModule } from './shared/ui/ui.module';
import { AuthModule } from './features/auth/auth.module';
import { DashboardComponent } from './features/dashboard/dashboard.component';

import { NgxSonnerToaster } from 'ngx-sonner';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent
  ],
  imports: [
    BrowserModule,
    // Import AuthModule before AppRoutingModule so its routes take precedence
    AuthModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    CoreModule,
    UiModule,
    NgxSonnerToaster
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
