import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Party {
  _id: string;
  name: string;
  createdAt?: string;
}

export interface PaginatedParties {
  data: Party[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class PartyService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/parties`;

  getAll(search?: string, page = 1, limit = 50): Observable<PaginatedParties> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedParties>(this.base, { params });
  }

  getById(id: string): Observable<Party> {
    return this.http.get<Party>(`${this.base}/${id}`);
  }

  create(payload: { name: string }): Observable<Party> {
    return this.http.post<Party>(this.base, payload);
  }

  update(id: string, payload: Partial<{ name: string }>): Observable<Party> {
    return this.http.patch<Party>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
