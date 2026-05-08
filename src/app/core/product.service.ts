import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Product {
  _id: string;
  name: string;
  imageUrl: string;
  serialNumber: string;
  sellingPrice: number;
  rentPrice: number;
  category: string;
  isActive: boolean;
}

export interface ApiBooking {
  _id: string;
  productSerialNumber: string;
  customerName: string;
  customerPhone: string;
  village: string;
  advancePayment: number;
  remainingPayment: number;
  bookingDate: string;
  returnDate: string;
  status: 'active' | 'pending_return' | 'returned' | 'cancelled';
}

export interface InventoryDetail {
  product: Product;
  futureBookings: ApiBooking[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/products`;

  getAll(category?: string): Observable<Product[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<Product[]>(this.base, { params });
  }

  getInventoryDetail(serialNumber: string): Observable<InventoryDetail> {
    return this.http.get<InventoryDetail>(
      `${this.base}/serial/${encodeURIComponent(serialNumber)}/inventory`,
    );
  }
}
