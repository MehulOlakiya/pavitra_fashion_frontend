import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule, DecimalPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Product, ProductService } from '../../core/product.service';
import {
  BookingService,
  Booking,
  BookingStatus,
} from '../../core/booking.service';
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

  // Analytics
  get totalRevenue(): number {
    return this.allBookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((sum, b) => sum + b.advancePayment + b.remainingPayment, 0);
  }

  get collected(): number {
    return this.allBookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((sum, b) => sum + b.advancePayment, 0);
  }

  get rentalCount(): number {
    return this.allBookings.filter((b) => b.status !== 'cancelled').length;
  }

  // Action menu
  openMenuId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private bookingService: BookingService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!id) {
      this.router.navigate(['/inventory']);
      return;
    }
    this.productService.getById(id).subscribe({
      next: (product) => {
        this.product = product;
        this.loading = false;
        this.loadBookings(product.serialNumber);
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
      active: 'Active',
      pending_return: 'Pending Return',
      returned: 'Returned',
      cancelled: 'Cancelled',
    };
    return map[status] ?? status;
  }

  statusClass(status: BookingStatus): string {
    const map: Record<BookingStatus, string> = {
      active: 'badge--active',
      pending_return: 'badge--pending',
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
}
