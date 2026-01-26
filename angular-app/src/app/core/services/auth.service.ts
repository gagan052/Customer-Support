import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Session, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _session = new BehaviorSubject<Session | null>(null);
  private _user = new BehaviorSubject<User | null>(null);
  private _loading = new BehaviorSubject<boolean>(true);

  session$ = this._session.asObservable();
  user$ = this._user.asObservable();
  loading$ = this._loading.asObservable();

  constructor(private supabaseService: SupabaseService) {
    this.init();
  }

  private init() {
    // Check active session
    this.supabaseService.supabase.auth.getSession().then(({ data: { session } }) => {
      this._session.next(session);
      this._user.next(session?.user ?? null);
      this._loading.next(false);
    });

    // Listen for auth changes
    this.supabaseService.supabase.auth.onAuthStateChange((_event, session) => {
      this._session.next(session);
      this._user.next(session?.user ?? null);
      this._loading.next(false);
    });
  }

  async signOut() {
    await this.supabaseService.supabase.auth.signOut();
  }
  
  async signInWithPassword(email: string, password: string) {
    return this.supabaseService.supabase.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string) {
    return this.supabaseService.supabase.auth.signUp({ email, password });
  }

  get currentUser() {
    return this._user.value;
  }

  get isLoading() {
    return this._loading.value;
  }
}
