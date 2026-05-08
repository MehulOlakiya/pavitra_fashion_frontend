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
}
