import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  LucideAngularModule, 
  Loader2, X, Circle, MessageSquare, CheckCircle2, AlertTriangle, TrendingUp, Clock, Users, Zap, 
  ArrowUpRight, ArrowDownRight, Brain, Search, Filter, Star, MoreVertical, Phone, ArrowRight, 
  Frown, AlertCircle, BookOpen, Upload, FileText, Plus, Folder, Eye, Trash2, RefreshCw, Edit, 
  TrendingDown, Settings, Bell, Shield, Database, Save, Key, EyeOff, Sparkles 
} from 'lucide-angular';
import { ButtonDirective } from './button.directive';
import { InputDirective } from './input.directive';
import { LabelDirective } from './label.directive';
import { BadgeDirective } from './badge.directive';
import { TextareaDirective } from './textarea.directive';
import { SheetComponent } from './sheet/sheet.component';
import { SwitchComponent } from './switch/switch.component';
import { SliderComponent } from './slider/slider.component';
import { SeparatorComponent } from './separator/separator.component';
import { RadioGroupComponent } from './radio-group/radio-group.component';
import { RadioGroupItemComponent } from './radio-group/radio-group-item.component';
import { 
  CardComponent, 
  CardHeaderComponent, 
  CardTitleComponent, 
  CardDescriptionComponent, 
  CardContentComponent, 
  CardFooterComponent 
} from './card/card.component';

@NgModule({
  declarations: [
    ButtonDirective,
    InputDirective,
    LabelDirective,
    BadgeDirective,
    TextareaDirective,
    SheetComponent,
    SwitchComponent,
    SliderComponent,
    SeparatorComponent,
    RadioGroupComponent,
    RadioGroupItemComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    CardFooterComponent
  ],
  imports: [
    CommonModule,
    LucideAngularModule.pick({ 
      Loader2, X, Circle, MessageSquare, CheckCircle2, AlertTriangle, TrendingUp, Clock, Users, Zap, 
      ArrowUpRight, ArrowDownRight, Brain, Search, Filter, Star, MoreVertical, Phone, ArrowRight, 
      Frown, AlertCircle, BookOpen, Upload, FileText, Plus, Folder, Eye, Trash2, RefreshCw, Edit, 
      TrendingDown, Settings, Bell, Shield, Database, Save, Key, EyeOff, Sparkles 
    })
  ],
  exports: [
    ButtonDirective,
    InputDirective,
    LabelDirective,
    BadgeDirective,
    TextareaDirective,
    SheetComponent,
    SwitchComponent,
    SliderComponent,
    SeparatorComponent,
    RadioGroupComponent,
    RadioGroupItemComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    CardFooterComponent,
    LucideAngularModule
  ]
})
export class UiModule { }
