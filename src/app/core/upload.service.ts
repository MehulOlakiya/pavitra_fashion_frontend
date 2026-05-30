import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = `${environment.apiUrl}/upload`;

  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/image`, formData)
      .pipe(map(res => res.url));
  }
}
