import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DailyBookingStats {
  date: string;
  booked: number;
  rented: number;
  pending_return: number;
  returned: number;
  cancelled: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/analytics`;

  getBookingStats(startDate: Date, endDate: Date): Observable<DailyBookingStats[]> {
    const params = new HttpParams()
      .set('startDate', startDate.toISOString())
      .set('endDate', endDate.toISOString());

    return this.http.get<DailyBookingStats[]>(`${this.apiUrl}/booking-stats`, { params });
  }

  getMonthlyRevenue(year: string): Observable<MonthlyRevenueData[]> {
    const params = new HttpParams().set('year', year);
    return this.http.get<MonthlyRevenueData[]>(`${this.apiUrl}/monthly-revenue`, { params });
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard-stats`);
  }
}

export interface MonthlyRevenueData {
  month: string;
  value: number;
}

export interface StatItem {
  value: number;
  trend: string;
}

export interface DashboardStats {
  totalCloths: StatItem;
  activeBookings: StatItem;
  pendingPayments: StatItem;
  monthlyRevenue: StatItem;
  returnedThisMonth: StatItem;
  todaysReturns: StatItem;
}
