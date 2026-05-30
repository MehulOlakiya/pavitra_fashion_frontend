import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CustomerService, Customer } from '../../core/customer.service';
import { BookingService, Booking } from '../../core/booking.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';

@Component({
  selector: 'app-customer-insights',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, PaginationComponent],
  templateUrl: './customer-insights.component.html',
  styleUrl: './customer-insights.component.scss',
})
export class CustomerInsightsComponent implements OnInit {
  customer: Customer | null = null;
  loading = true;

  // Real Bookings Data
  pagedBookings: (Booking & {
    totalItems?: number;
    amount?: number;
    remaining?: number;
  })[] = [];
  bookingsLoading = false;

  // Pagination
  currentPage = 1;
  readonly limit = 4;
  total = 0;
  totalPages = 1;

  // Analytics
  totalRevenue = 0;
  pendingPayment = 0;
  totalBookingsCount = 0;

  openMenuId: string | null = null;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private customerService = inject(CustomerService);
  private bookingService = inject(BookingService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/customers']);
      return;
    }

    this.customerService.getInsights(id).subscribe({
      next: (res) => {
        this.customer = res.customer;
        this.totalRevenue = res.analytics.totalRevenue;
        this.pendingPayment = res.analytics.pendingPayment;
        this.totalBookingsCount = res.analytics.totalBookingsCount;
        this.loading = false;
        this.loadBookings();
      },
      error: () => {
        this.router.navigate(['/customers']);
      },
    });
  }

  private loadBookings(): void {
    if (!this.customer?._id) return;
    this.bookingsLoading = true;
    this.bookingService
      .search({
        customerId: this.customer._id,
        page: this.currentPage,
        limit: this.limit,
      })
      .subscribe({
        next: (res) => {
          this.total = res.total;
          this.totalPages = res.totalPages;
          // Transform the bookings to include totalItems
          this.pagedBookings = res.data.map((b) => ({
            ...b,
            amount: (b.advancePayment || 0) + (b.remainingPayment || 0),
            remaining: b.remainingPayment || 0,
            totalItems: b.items.reduce(
              (sum, item) => sum + (item.quantity || 1),
              0,
            ),
          }));
          this.bookingsLoading = false;
        },
        error: () => {
          this.bookingsLoading = false;
        },
      });
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadBookings();
  }

  formatDate(d: string | Date | null): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      booked: 'Pending Pickup',
      rented: 'Rented',
      pending_return: 'Pending Return',
      returned: 'Returned',
      cancelled: 'Cancelled',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      booked: 'badge--booked',
      rented: 'badge--rented',
      pending_return: 'badge--pending',
      returned: 'badge--returned',
      cancelled: 'badge--cancelled',
    };
    return map[status] ?? '';
  }

  initials(name: string): string {
    if (!name) return 'CU';
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }

  isCancelled(status: string): boolean {
    return status === 'cancelled';
  }

  viewBooking(id: string): void {
    this.router.navigate(['/bookings', id]);
  }

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuId = null;
  }
}
