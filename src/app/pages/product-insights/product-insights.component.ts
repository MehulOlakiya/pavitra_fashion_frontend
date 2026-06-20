import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, DecimalPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Product, ProductInsights, ProductService } from '../../core/product.service';
import {
  BookingService,
  Booking,
  BookingStatus,
} from '../../core/booking.service';
import { ExpenseService, Expense } from '../../core/expense.service';
import { ToastService } from '../../shared/toast/toast.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

@Component({
  selector: 'app-product-insights',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    TitleCasePipe,
    RouterLink,
    PaginationComponent,
  ],
  templateUrl: './product-insights.component.html',
  styleUrl: './product-insights.component.scss',
})
export class ProductInsightsComponent implements OnInit {
  product: Product | null = null;
  allBookings: Booking[] = [];
  pagedBookings: Booking[] = [];

  loading = true;
  bookingsLoading = false;

  // Pagination
  currentPage = 1;
  readonly limit = 5;
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.allBookings.length / this.limit));
  }
  get total(): number {
    return this.allBookings.length;
  }

  // Analytics (server-calculated)
  insights: ProductInsights = { totalRevenue: 0, rentalCount: 0, profit: 0, totalExpense: 0 };
  insightsLoading = false;

  // Action menu
  openMenuId: string | null = null;

  // Active Tab
  activeTab: 'bookings' | 'expenses' = 'bookings';

  // Expense History
  expenses: Expense[] = [];
  expensesLoading = false;
  expenseCurrentPage = 1;
  readonly expenseLimit = 10;
  expenseTotal = 0;
  expenseTotalPages = 1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private bookingService: BookingService,
    private expenseService: ExpenseService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id') ?? '';
      if (!id) {
        this.router.navigate(['/inventory']);
        return;
      }

      this.loading = true;
      this.productService.getById(id).subscribe({
        next: (product) => {
          this.product = product;
          this.loading = false;
          this.loadBookings(product.serialNumber);
          this.loadInsights(id);
        },
        error: () => {
          this.toast.show(
            'error',
            'Not Found',
            'Could not load product details.',
          );
          this.router.navigate(['/inventory']);
        },
      });
    });
  }

  private loadBookings(serialNumber: string): void {
    this.bookingsLoading = true;
    this.bookingService.search({ serialNumber, limit: 500 }).subscribe({
      next: (res) => {
        this.allBookings = res.data;
        this.updatePage();
        this.bookingsLoading = false;
      },
      error: () => {
        this.bookingsLoading = false;
      },
    });
  }

  private loadInsights(productId: string): void {
    this.insightsLoading = true;
    this.productService.getInsights(productId).subscribe({
      next: (data) => { this.insights = data; this.insightsLoading = false; },
      error: () => { this.insightsLoading = false; },
    });
  }

  private updatePage(): void {
    const start = (this.currentPage - 1) * this.limit;
    this.pagedBookings = this.allBookings.slice(start, start + this.limit);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updatePage();
  }

  formatDate(d: string | Date | null): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  statusLabel(status: BookingStatus): string {
    const map: Record<BookingStatus, string> = {
      booked: 'Booked',
      rented: 'Rented',
      pending_return: 'Pending Return',
      partial_return: 'Partial Return',
      returned: 'Returned',
      cancelled: 'Cancelled',
    };
    return map[status] ?? status;
  }

  statusClass(status: BookingStatus): string {
    const map: Record<BookingStatus, string> = {
      booked: 'badge--booked',
      rented: 'badge--rented',
      pending_return: 'badge--pending',
      partial_return: 'badge--partial',
      returned: 'badge--returned',
      cancelled: 'badge--cancelled',
    };
    return map[status] ?? '';
  }

  initials(name: string): string {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  avatarClass(idx: number): string {
    return ['avatar--primary', 'avatar--secondary', 'avatar--tertiary'][
      idx % 3
    ];
  }

  isCancelled(status: BookingStatus): boolean {
    return status === 'cancelled';
  }

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuId = null;
  }

  editBooking(id: string): void {
    this.router.navigate(['/bookings/edit', id]);
  }

  switchTab(tab: 'bookings' | 'expenses'): void {
    this.activeTab = tab;
    if (tab === 'expenses' && this.expenses.length === 0 && !this.expensesLoading) {
      this.loadExpenses();
    }
  }

  private loadExpenses(): void {
    if (!this.product?._id) return;
    this.expensesLoading = true;
    this.expenseService
      .getByProduct(this.product._id, this.expenseCurrentPage, this.expenseLimit)
      .subscribe({
        next: (res) => {
          this.expenses = res.data;
          this.expenseTotal = res.total;
          this.expenseTotalPages = res.totalPages;
          this.expensesLoading = false;
        },
        error: () => { this.expensesLoading = false; },
      });
  }

  goToExpensePage(page: number): void {
    this.expenseCurrentPage = page;
    this.loadExpenses();
  }

  expenseCategoryLabel(cat: string): string {
    const map: Record<string, string> = {
      washing: 'Washing',
      stitching: 'Stitching',
      blouse_stitching: 'Blouse Stitching',
    };
    return map[cat] ?? cat;
  }

  expenseStatusLabel(status: string): string {
    const map: Record<string, string> = {
      sent_for_washing: 'Sent',
      washing_in_progress: 'In Progress',
      returned_from_washing: 'Returned',
      sent_for_stitching: 'Sent',
      stitching_in_progress: 'In Progress',
      returned_from_stitching: 'Returned',
      sent_for_blouse_stitching: 'Sent',
      blouse_stitching_in_progress: 'In Progress',
      returned_from_blouse_stitching: 'Returned',
    };
    return map[status] ?? status;
  }

  expenseStatusClass(status: string): string {
    if (status.includes('returned')) return 'badge--returned';
    if (status.includes('progress')) return 'badge--progress';
    return 'badge--sent';
  }
}
