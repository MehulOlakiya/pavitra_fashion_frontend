import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Customer {
  _id: string;
  customerId: string;
  name: string;
  mobileNumber: string;
  village: string;
  totalBookings?: number; // Optional for UI display
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/customers`;

  getAll(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.base);
  }

  getById(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.base}/${encodeURIComponent(id)}`);
  }

  create(payload: Omit<Customer, '_id'>): Observable<Customer> {
    return this.http.post<Customer>(this.base, payload);
  }

  update(
    id: string,
    payload: Partial<Omit<Customer, '_id'>>,
  ): Observable<Customer> {
    return this.http.patch<Customer>(
      `${this.base}/${encodeURIComponent(id)}`,
      payload,
    );
  }

  search(query: string): Observable<Customer[]> {
    const params = new HttpParams().set('search', query);
    return this.http.get<Customer[]>(this.base, { params });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
