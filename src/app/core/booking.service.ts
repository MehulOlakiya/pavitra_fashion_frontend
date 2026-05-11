import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type BookingStatus =
  | 'active'
  | 'pending_return'
  | 'returned'
  | 'cancelled';

export interface CreateBookingPayload {
  productSerialNumber: string;
  customerName: string;
  customerPhone: string;
  village: string;
  advancePayment: number;
  remainingPayment: number;
  bookingDate: string; // ISO date string
  returnDate: string; // ISO date string
  status?: BookingStatus;
}

export interface Booking {
  _id: string;
  productSerialNumber: string;
  customerName: string;
  customerPhone: string;
  village: string;
  advancePayment: number;
  remainingPayment: number;
  bookingDate: string;
  returnDate: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedBookings {
  data: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchBookingParams {
  customerName?: string;
  serialNumber?: string;
  customerPhone?: string;
  status?: BookingStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/bookings`;

  create(payload: CreateBookingPayload): Observable<Booking> {
    return this.http.post<Booking>(this.base, payload);
  }

  search(params: SearchBookingParams = {}): Observable<PaginatedBookings> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    });
    return this.http.get<PaginatedBookings>(`${this.base}/search`, {
      params: httpParams,
    });
  }

  findAll(page = 1, limit = 10): Observable<PaginatedBookings> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http.get<PaginatedBookings>(this.base, { params });
  }

  updateStatus(id: string, status: BookingStatus): Observable<Booking> {
    return this.http.patch<Booking>(`${this.base}/${id}`, { status });
  }

  update(
    id: string,
    payload: Partial<CreateBookingPayload>,
  ): Observable<Booking> {
    return this.http.patch<Booking>(`${this.base}/${id}`, payload);
  }

  findById(id: string): Observable<Booking> {
    return this.http.get<Booking>(`${this.base}/${id}`);
  }
}
