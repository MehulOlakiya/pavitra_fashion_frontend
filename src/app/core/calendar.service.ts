import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── API response shape (subset of backend BookingDocument) ──
export interface CalendarBookingItem {
  serialNumber: string;
  quantity: number;
  product?: { name?: string; imageUrl?: string };
}

export interface CalendarCustomer {
  _id: string;
  name: string;
  mobileNumber?: string;
}

export interface CalendarBooking {
  _id: string;
  orderId: string;
  bookingDate: string; // ISO string
  returnDate: string; // ISO string
  status: 'booked' | 'rented' | 'pending_return' | 'returned' | 'cancelled';
  customer: CalendarCustomer;
  items: CalendarBookingItem[];
  productSerialNumber?: string;
  remainingPayment?: number;
  advancePayment?: number;
}

export interface CalendarBookingsResponse {
  data: CalendarBooking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/bookings`;

  /**
   * Fetch all bookings whose booking or return date overlaps the given month.
   * Uses GET /api/bookings/search with a wide date window covering the full month.
   */
  getBookingsForMonth(
    year: number,
    month: number,
  ): Observable<CalendarBookingsResponse> {
    // First and last day of the month
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 0); // last day

    const params = new HttpParams()
      .set('fromDate', from.toISOString())
      .set('toDate', to.toISOString())
      .set('limit', '20000') // fetch up to 200 bookings per month
      .set('page', '1');

    return this.http.get<CalendarBookingsResponse>(`${this.apiUrl}/search`, {
      params,
    });
  }
}
