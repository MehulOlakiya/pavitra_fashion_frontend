import { Injectable, signal, computed } from '@angular/core';
import { LoggedInUser } from './auth.service';

@Injectable({ providedIn: 'root' })
export class UserStateService {
  private readonly _user = signal<LoggedInUser | null>(this.loadFromStorage());

  readonly user = this._user.asReadonly();

  /** First letter(s) of the user's name for avatar fallback */
  readonly initials = computed(() => {
    const name = this._user()?.name ?? '';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  });

  setUser(user: LoggedInUser): void {
    this._user.set(user);
  }

  clear(): void {
    this._user.set(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  }

  private loadFromStorage(): LoggedInUser | null {
    try {
      const raw = localStorage.getItem('user');
      return raw ? (JSON.parse(raw) as LoggedInUser) : null;
    } catch {
      return null;
    }
  }
}
