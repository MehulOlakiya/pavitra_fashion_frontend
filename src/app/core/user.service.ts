import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfile {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  returnNotificationTime?: string;
  pickupNotificationTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`);
  }

  updateProfile(data: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.apiUrl}/me`, data);
  }
}
