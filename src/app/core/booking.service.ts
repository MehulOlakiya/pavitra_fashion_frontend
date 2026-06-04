import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type BookingStatus =
  | 'booked'
  | 'rented'
  | 'pending_return'
  | 'returned'
  | 'cancelled';

export type BeltType = 'HB' | 'FB';

export interface CreateBookingPayload {
  productSerialNumber?: string; // Kept for backwards compatibility
  items: { serialNumber: string; quantity: number; beltType?: BeltType; freshPiece?: boolean; freshPieceCost?: number; rentPrice?: number; }[];
  customer: string; // Customer ObjectId
  advancePayment?: number;
  remainingPayment?: number;
  totalPayment?: number;
  totalDiscount?: number;
  bookingDate: string; // ISO date string
  pickupTime?: 'Morning' | 'Evening';
  returnDate: string; // ISO date string
  returnTime?: 'Morning' | 'Evening';
  status?: BookingStatus;
  beltType?: BeltType;
  note?: string;
  freshPiece?: boolean;
  freshPieceCost?: number;
}

export interface BookingCustomer {
  _id: string;
  customerId: string;
  name: string;
  mobileNumber: string;
  village: string;
}

export interface Booking {
  _id: string;
  orderId?: string;
  productSerialNumber?: string;
  items: { serialNumber: string; quantity: number; beltType?: BeltType; freshPiece?: boolean; freshPieceCost?: number; rentPrice?: number; }[];
  customer: BookingCustomer;
  advancePayment?: number;
  remainingPayment?: number;
  totalPayment?: number;
  totalDiscount?: number;
  bookingDate: string;
  pickupTime?: 'Morning' | 'Evening';
  returnDate: string;
  returnTime?: 'Morning' | 'Evening';
  status: BookingStatus;
  beltType?: BeltType;
  note?: string;
  freshPiece?: boolean;
  freshPieceCost?: number;
  isBillSend?: boolean;
  isDeleted?: boolean;
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

export interface BookingAnalytics {
  total: number;
  booked: number;
  rented: number;
  pending_return: number;
  returned: number;
  cancelled: number;
}

export interface SearchBookingParams {
  customerId?: string;
  customerName?: string;
  orderId?: string;
  serialNumber?: string;
  customerPhone?: string;
  status?: BookingStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  overlap?: string;
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

  markBillSent(id: string): Observable<Booking> {
    return this.http.patch<Booking>(`${this.base}/${id}/bill-sent`, {});
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  getAnalytics(
    params: { fromDate?: string; toDate?: string } = {},
  ): Observable<BookingAnalytics> {
    let httpParams = new HttpParams();
    if (params.fromDate)
      httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    return this.http.get<BookingAnalytics>(`${this.base}/analytics`, {
      params: httpParams,
    });
  }

  downloadInvoice(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, {
      responseType: 'blob',
    });
  }

  getReport(params: { status?: string; fromDate?: string; toDate?: string } = {}): Observable<Booking[]> {
    let httpParams = new HttpParams();
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params.toDate) httpParams = httpParams.set('toDate', params.toDate);
    return this.http.get<Booking[]>(`${this.base}/report`, { params: httpParams });
  }
}
