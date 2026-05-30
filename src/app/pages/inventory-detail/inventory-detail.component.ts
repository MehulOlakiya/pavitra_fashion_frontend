import { Component, OnInit } from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ApiBooking,
  InventoryDetail,
  Product,
  ProductService,
} from '../../core/product.service';

export interface DisplayBooking {
  initials: string;
  color: 'primary' | 'secondary' | 'tertiary';
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  returnDate: string;
  status: string;
  paymentStatus: 'Paid' | 'Pending';
}

const AVATAR_COLORS: DisplayBooking['color'][] = [
  'primary',
  'secondary',
  'tertiary',
];

function toDisplayBooking(b: ApiBooking, idx: number): DisplayBooking {
  const name = b.customer?.name || 'Unknown';
  const parts = name.trim().split(' ');
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();

  const statusMap: Record<ApiBooking['status'], string> = {
    booked: 'Pending Pickup',
    rented: 'Rented',
    pending_return: 'Upcoming',
    returned: 'Completed',
    cancelled: 'Cancelled',
  };

  return {
    initials,
    color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
    customerName: name,
    customerPhone: b.customer?.mobileNumber || '',
    bookingDate: new Date(b.bookingDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    returnDate: new Date(b.returnDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    status: statusMap[b.status] ?? b.status,
    paymentStatus: b.remainingPayment === 0 ? 'Paid' : 'Pending',
  };
}

@Component({
  selector: 'app-inventory-detail',
  imports: [DecimalPipe, TitleCasePipe, RouterLink],
  templateUrl: './inventory-detail.component.html',
  styleUrl: './inventory-detail.component.scss',
})
export class InventoryDetailComponent implements OnInit {
  searchQuery = '';
  loading = false;
  errorMessage = '';

  product: Product | null = null;
  bookings: DisplayBooking[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((p) => {
      const q = p['q']?.trim() ?? '';
      this.searchQuery = q;
      if (q) {
        this.loadInventory(q);
      }
    });
  }

  private loadInventory(serialNumber: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.product = null;
    this.bookings = [];

    this.productService.getInventoryDetail(serialNumber).subscribe({
      next: (data: InventoryDetail) => {
        this.product = data.product;
        this.bookings = data.futureBookings.map((b, i) =>
          toDisplayBooking(b, i),
        );
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage =
          err.status === 404
            ? `No product found with serial number "${serialNumber}".`
            : 'Failed to load inventory details. Please try again.';
        this.loading = false;
      },
    });
  }

  addBooking(): void {
    if (!this.product) return;
    this.router.navigate(['/bookings/new'], {
      queryParams: {
        serial: this.product.serialNumber,
        name: this.product.name,
        rate: this.product.rentPrice,
        image: this.product.imageUrl,
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/bookings']);
  }
}
