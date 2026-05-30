import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BookingService, BookingStatus } from '../../core/booking.service';
import { ToastService } from '../../shared/toast/toast.service';
import { DatepickerComponent } from '../../shared/datepicker/datepicker.component';
import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';
import { NumbersOnlyDirective } from '../../shared/directives/numbers-only.directive';

@Component({
  selector: 'app-edit-booking',
  imports: [
    FormsModule,
    CommonModule,
    RouterLink,
    DatepickerComponent,
    CustomSelectComponent,
    NumbersOnlyDirective,
  ],
  templateUrl: './edit-booking.component.html',
  styleUrl: './edit-booking.component.scss',
})
export class EditBookingComponent implements OnInit {
  loading = true;
  saving = false;

  bookingId = '';

  readonly today = new Date();

  bookingDate: Date | null = null;
  returnDate: Date | null = null;
  items: { serialNumber: string; quantity: number }[] = [];

  form = {
    productSerialNumber: '',
    customerName: '',
    customerPhone: '',
    village: '',
    advancePayment: null as number | null,
    remainingPayment: null as number | null,
    status: 'booked' as BookingStatus,
    customerId: '' as string,
  };

  readonly statusOptions: { value: BookingStatus; label: string }[] = [
    { value: 'booked', label: 'Pending Pickup' },
    { value: 'rented', label: 'Rented' },
    { value: 'pending_return', label: 'Pending Return' },
    { value: 'returned', label: 'Returned' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  submitted = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.bookingId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.bookingId) {
      this.router.navigate(['/bookings']);
      return;
    }
    this.bookingService.findById(this.bookingId).subscribe({
      next: (b) => {
        this.form.productSerialNumber = b.productSerialNumber || '';
        this.items = b.items || [];
        this.form.customerName = b.customer?.name ?? '';
        this.form.customerPhone = b.customer?.mobileNumber ?? '';
        this.form.village = b.customer?.village ?? '';
        this.form.customerId = b.customer?._id ?? '';
        this.form.advancePayment = b.advancePayment ?? null;
        this.form.remainingPayment = b.remainingPayment ?? null;
        this.form.status = b.status;
        this.bookingDate = new Date(b.bookingDate);
        this.returnDate = new Date(b.returnDate);
        this.loading = false;
      },
      error: () => {
        this.toast.show(
          'error',
          'Load Failed',
          'Could not load booking details.',
        );
        this.router.navigate(['/bookings']);
      },
    });
  }

  private toISTDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00:00.000Z`;
  }

  onSubmit(): void {
    this.submitted = true;
    if (
      !this.bookingDate ||
      !this.returnDate ||
      !this.form.customerName ||
      !this.form.customerPhone ||
      !this.form.village ||
      this.form.advancePayment === null ||
      this.form.remainingPayment === null
    ) {
      this.toast.show(
        'error',
        'Validation Failed',
        'Please fill all required fields.',
      );
      return;
    }
    this.saving = true;
    this.bookingService
      .update(this.bookingId, {
        productSerialNumber: this.form.productSerialNumber,
        customer: this.form.customerId,
        advancePayment: this.form.advancePayment!,
        remainingPayment: this.form.remainingPayment!,
        bookingDate: this.toISTDate(this.bookingDate),
        returnDate: this.toISTDate(this.returnDate),
        status: this.form.status,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.toast.show(
            'success',
            'Booking Updated',
            'Changes saved successfully.',
          );
          this.router.navigate(['/bookings']);
        },
        error: (err) => {
          this.saving = false;
          const message: string =
            err?.error?.message ?? 'Could not save changes. Please try again.';
          this.toast.show('error', 'Update Failed', message);
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/bookings']);
  }
}
