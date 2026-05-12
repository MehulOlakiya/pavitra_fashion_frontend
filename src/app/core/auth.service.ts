import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoggedInUser {
  id: string;
  name: string;
  email: string;
  role: string;
  profileImage: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: LoggedInUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly loginUrl = `${environment.apiUrl}/auth/login`;

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.loginUrl, payload);
  }

  /** Returns true when a JWT token exists in localStorage and has not expired. */
  isTokenValid(): boolean {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;
    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) return false;
      const decoded = JSON.parse(
        atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')),
      );
      const nowSeconds = Math.floor(Date.now() / 1000);
      return typeof decoded.exp === 'number' && decoded.exp > nowSeconds;
    } catch {
      return false;
    }
  }
}
