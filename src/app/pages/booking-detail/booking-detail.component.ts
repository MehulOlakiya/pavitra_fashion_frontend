import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import {
  Booking,
  BookingService,
  BookingStatus,
} from '../../core/booking.service';
import { Product, ProductService } from '../../core/product.service';

@Component({
  selector: 'app-booking-detail',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './booking-detail.component.html',
  styleUrl: './booking-detail.component.scss',
})
export class BookingDetailComponent implements OnInit {
  booking: Booking | null = null;
  product: Product | null = null;
  loading = true;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private productService: ProductService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/bookings']);
      return;
    }
    this.bookingService.findById(id).subscribe({
      next: (b) => {
        this.booking = b;
        this.loading = false;
        this.productService.search(b.productSerialNumber, 1).subscribe({
          next: (products) => {
            this.product = products[0] ?? null;
          },
        });
      },
      error: () => {
        this.errorMessage = 'Booking not found.';
        this.loading = false;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/bookings']);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  statusLabel(status: BookingStatus): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending_return':
        return 'Pending Return';
      case 'returned':
        return 'Returned';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  statusClass(status: BookingStatus): string {
    switch (status) {
      case 'active':
        return 'badge--active';
      case 'pending_return':
        return 'badge--pending';
      case 'returned':
        return 'badge--returned';
      case 'cancelled':
        return 'badge--cancelled';
      default:
        return '';
    }
  }
}
