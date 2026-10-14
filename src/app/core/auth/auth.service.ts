import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginCredentials, RegisterData, User } from './auth.models';

/** Marks a request the auth interceptor must leave alone (no token, no refresh-on-401). */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

/**
 * Owns the session.
 *
 * - The access token lives only in memory, never in localStorage, so an XSS
 *   bug can't read a long-lived credential out of storage.
 * - The refresh token is an httpOnly cookie set by the backend; JS never sees it.
 *   On page load we call /auth/refresh to turn that cookie back into a session.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authUrl = `${environment.apiUrl}/auth`;

  private readonly currentUser = signal<User | null>(null);
  private accessToken: string | null = null;
  private refreshInFlight: Promise<string | null> | null = null;

  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUser() !== null);

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async login(credentials: LoginCredentials): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.authUrl}/login`, credentials, this.authRequestOptions()),
    );
    this.setSession(res);
  }

  /** Creates the account; the backend signs the new user in immediately. */
  async register(data: RegisterData): Promise<void> {
    const res = await firstValueFrom(
      this.http.post<AuthResponse>(`${this.authUrl}/register`, data, this.authRequestOptions()),
    );
    this.setSession(res);
  }

  /**
   * Exchanges the refresh cookie for a new access token. Resolves to null when
   * there is no valid session. Concurrent callers share one request, and a
   * cross-tab lock stops two tabs rotating the same cookie at once — the
   * backend treats a reused refresh token as theft and revokes every session.
   */
  refresh(): Promise<string | null> {
    this.refreshInFlight ??= this.withRefreshLock(() => this.requestRefresh()).finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  /** Called once at startup to restore a session from the refresh cookie. */
  async restoreSession(): Promise<void> {
    await this.refresh();
  }

  /** Ends the session; `returnUrl` brings the user back there after signing in again. */
  async logout(returnUrl?: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<void>(`${this.authUrl}/logout`, null, this.authRequestOptions()),
      );
    } catch {
      // The local session is cleared regardless; a failed server call only
      // means the refresh token expires on its own instead of right now.
    } finally {
      this.endSession(returnUrl);
    }
  }

  /** Drops local session state and sends the user to the login page. */
  endSession(returnUrl?: string): void {
    this.clearSession();
    void this.router.navigate(['/login'], {
      queryParams: returnUrl ? { returnUrl } : undefined,
    });
  }

  private async requestRefresh(): Promise<string | null> {
    try {
      const res = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.authUrl}/refresh`, null, this.authRequestOptions()),
      );
      this.setSession(res);
      return res.accessToken;
    } catch {
      this.clearSession();
      return null;
    }
  }

  private async withRefreshLock(fn: () => Promise<string | null>): Promise<string | null> {
    // Web Locks are shared across tabs of the same origin; fall back to the
    // in-tab de-duplication alone where the API is unavailable.
    if (typeof navigator === 'undefined' || !navigator.locks) return fn();
    return await navigator.locks.request('team-vault-auth-refresh', fn);
  }

  private authRequestOptions() {
    // withCredentials so the browser sends/receives the refresh cookie;
    // SKIP_AUTH so a 401 here never triggers another refresh attempt.
    return { withCredentials: true, context: new HttpContext().set(SKIP_AUTH, true) };
  }

  private setSession({ accessToken, user }: AuthResponse): void {
    this.accessToken = accessToken;
    this.currentUser.set(user);
  }

  private clearSession(): void {
    this.accessToken = null;
    this.currentUser.set(null);
  }
}
