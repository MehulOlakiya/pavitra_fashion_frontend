import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Product {
  _id: string;
  name?: string;
  imageUrl: string;
  serialNumber: string;
  sellingPrice?: number;
  purchasePrice?: number;
  rentPrice: number;
  category: string;
  isActive: boolean;
}

export interface PaginatedProducts {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductAnalytics {
  total: number;
  active: number;
  inactive: number;
  categories: string[];
}

export interface ApiBooking {
  _id: string;
  productSerialNumber: string;
  customer: {
    _id: string;
    name: string;
    mobileNumber: string;
    village: string;
  };
  advancePayment: number;
  remainingPayment: number;
  bookingDate: string;
  returnDate: string;
  status: 'booked' | 'rented' | 'pending_return' | 'returned' | 'cancelled';
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
    // High-limit fetch for places that need all products (image maps, dropdowns)
    let params = new HttpParams().set('page', '1').set('limit', '500');
    if (category) params = params.set('category', category);
    return this.http
      .get<PaginatedProducts>(this.base, { params })
      .pipe(map((res) => res.data));
  }

  getPaginated(
    params: {
      page?: number;
      limit?: number;
      category?: string;
      search?: string;
    } = {},
  ): Observable<PaginatedProducts> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit)
      httpParams = httpParams.set('limit', String(params.limit));
    if (params.category)
      httpParams = httpParams.set('category', params.category);
    if (params.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<PaginatedProducts>(this.base, { params: httpParams });
  }

  getAnalytics(params?: { fromDate?: string; toDate?: string }): Observable<ProductAnalytics> {
    let httpParams = new HttpParams();
    if (params?.fromDate) httpParams = httpParams.set('fromDate', params.fromDate);
    if (params?.toDate) httpParams = httpParams.set('toDate', params.toDate);
    return this.http.get<ProductAnalytics>(`${this.base}/analytics`, { params: httpParams });
  }

  getById(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/${encodeURIComponent(id)}`);
  }

  getInventoryDetail(serialNumber: string): Observable<InventoryDetail> {
    return this.http.get<InventoryDetail>(
      `${this.base}/serial/${encodeURIComponent(serialNumber)}/inventory`,
    );
  }

  create(
    payload: Omit<Product, '_id' | 'imageUrl'> & { imageUrl?: string },
  ): Observable<Product> {
    return this.http.post<Product>(this.base, payload);
  }

  update(
    id: string,
    payload: Partial<Omit<Product, '_id'>>,
  ): Observable<Product> {
    return this.http.patch<Product>(
      `${this.base}/${encodeURIComponent(id)}`,
      payload,
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }

  /** Upload an image file to Cloudinary via the backend, returns the public URL. */
  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(
      `${environment.apiUrl}/upload/image`,
      formData,
    );
  }

  /**
   * Returns paginated products that are available (not booked) within the
   * given [from, to] date range. Server handles all overlap logic.
   */
  getAvailable(params: {
    from: Date;
    to: Date;
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Observable<PaginatedProducts> {
    let httpParams = new HttpParams()
      .set('from', params.from.toISOString())
      .set('to', params.to.toISOString());
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit)
      httpParams = httpParams.set('limit', String(params.limit));
    if (params.category)
      httpParams = httpParams.set('category', params.category);
    if (params.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<PaginatedProducts>(`${this.base}/available`, {
      params: httpParams,
    });
  }

  search(query: string, limit = 20): Observable<Product[]> {
    const params = new HttpParams()
      .set('search', query.trim())
      .set('limit', limit.toString());
    return this.http
      .get<{ data: Product[] }>(this.base, { params })
      .pipe(map((res) => res.data.filter((p) => p.isActive)));
  }

  importProducts(file: File): Observable<{
    imported: number;
    skipped: number;
    errors: { row: number; message: string }[];
  }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{
      imported: number;
      skipped: number;
      errors: { row: number; message: string }[];
    }>(`${this.base}/import`, form);
  }
}
