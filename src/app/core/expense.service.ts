import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Party } from './party.service';

export type ExpenseCategory = 'washing' | 'stitching' | 'blouse_stitching' | string;

export type ExpenseStatus =
  | 'sent_for_washing'
  | 'washing_in_progress'
  | 'returned_from_washing'
  | 'sent_for_stitching'
  | 'stitching_in_progress'
  | 'returned_from_stitching'
  | 'sent_for_blouse_stitching'
  | 'blouse_stitching_in_progress'
  | 'returned_from_blouse_stitching'
  | 'sent'
  | 'in_progress'
  | 'returned'
  | 'partial_return'
  | string;

export interface ExpenseProduct {
  _id: string;
  name: string;
  serialNumber: string;
  imageUrl?: string;
  category?: string;
}

export interface ExpenseItem {
  product: ExpenseProduct;
  quantity: number;
  isReturned?: boolean;
}

export interface Expense {
  _id: string;
  expenseNo: string;
  party: Party;
  category: ExpenseCategory;
  items: ExpenseItem[];
  perPiecePrice: number;
  totalQuantity: number;
  totalPrice: number;
  remarks?: string;
  status: ExpenseStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExpenseSummary {
  washing: number;
  stitching: number;
  blouse_stitching: number;
  pendingReturns: number;
}

export interface CreateExpenseItemPayload {
  product: string;
  quantity: number;
  isReturned?: boolean;
}

export interface CreateExpensePayload {
  party: string;
  category: ExpenseCategory;
  items: CreateExpenseItemPayload[];
  perPiecePrice: number;
  remarks?: string;
}

export interface SearchExpenseParams {
  search?: string;
  partyId?: string;
  category?: ExpenseCategory;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/expenses`;

  search(params: SearchExpenseParams): Observable<PaginatedExpenses> {
    let p = new HttpParams();
    if (params.search) p = p.set('search', params.search);
    if (params.partyId) p = p.set('partyId', params.partyId);
    if (params.category) p = p.set('category', params.category);
    if (params.status) p = p.set('status', params.status);
    if (params.fromDate) p = p.set('fromDate', params.fromDate);
    if (params.toDate) p = p.set('toDate', params.toDate);
    if (params.page) p = p.set('page', String(params.page));
    if (params.limit) p = p.set('limit', String(params.limit));
    return this.http.get<PaginatedExpenses>(`${this.base}/search`, { params: p });
  }

  getSummary(): Observable<ExpenseSummary> {
    return this.http.get<ExpenseSummary>(`${this.base}/summary`);
  }

  getById(id: string): Observable<Expense> {
    return this.http.get<Expense>(`${this.base}/${id}`);
  }

  getByProduct(productId: string, page = 1, limit = 10): Observable<PaginatedExpenses> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));
    return this.http.get<PaginatedExpenses>(`${this.base}/by-product/${productId}`, { params });
  }

  getTotalByProduct(productId: string): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${this.base}/total-by-product/${productId}`);
  }

  create(payload: CreateExpensePayload): Observable<Expense> {
    return this.http.post<Expense>(this.base, payload);
  }

  update(id: string, payload: Partial<CreateExpensePayload>): Observable<Expense> {
    return this.http.patch<Expense>(`${this.base}/${id}`, payload);
  }

  updateStatus(id: string, status: string): Observable<Expense> {
    return this.http.patch<Expense>(`${this.base}/${id}/status`, { status });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
