import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Booking } from './booking.service';

export interface Customer {
  _id: string;
  customerId: string;
  name: string;
  mobileNumber: string;
  village: string;
  totalBooking?: number;
  pendingPayment?: number;
  createdAt?: string | Date;
  bookings?: Booking[];
}

export interface CustomerInsightsResponse {
  customer: Customer;
  analytics: {
    totalRevenue: number;
    pendingPayment: number;
    totalBookingsCount: number;
  };
}

export interface PaginatedCustomers {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerReport extends Customer {
  totalRevenue?: number;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/customers`;

  getAll(page = 1, limit = 10, search?: string): Observable<PaginatedCustomers> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
      
    if (search) {
      params = params.set('search', search);
    }
    
    return this.http.get<PaginatedCustomers>(this.base, { params });
  }

  getListAnalytics(params?: { fromDate?: string; toDate?: string }): Observable<{ total: number, active: number, newThisMonth: number }> {
    let httpParams = new HttpParams();
    if (params?.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params?.toDate) httpParams = httpParams.set('toDate', params.toDate);
    return this.http.get<{ total: number, active: number, newThisMonth: number }>(`${this.base}/analytics`, { params: httpParams });
  }

  getById(id: string): Observable<Customer> {
    return this.http.get<Customer>(`${this.base}/${encodeURIComponent(id)}`);
  }

  getInsights(id: string): Observable<CustomerInsightsResponse> {
    return this.http.get<CustomerInsightsResponse>(`${this.base}/${encodeURIComponent(id)}/insights`);
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

  search(query: string, page = 1, limit = 10): Observable<PaginatedCustomers> {
    const params = new HttpParams()
      .set('search', query)
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http.get<PaginatedCustomers>(this.base, { params });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }

  getReport(): Observable<CustomerReport[]> {
    return this.http.get<CustomerReport[]>(`${this.base}/report`);
  }
}
