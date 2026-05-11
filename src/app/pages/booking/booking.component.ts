import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BookingService, Booking } from '../../core/booking.service';
import { Product, ProductService } from '../../core/product.service';
import { ToastService } from '../../shared/toast/toast.service';
import { CommonModule } from '@angular/common';
import { DatepickerComponent } from '../../shared/datepicker/datepicker.component';

@Component({
  selector: 'app-booking',
  imports: [FormsModule, CommonModule, RouterLink, DatepickerComponent],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss',
})
export class BookingComponent implements OnInit {
  // Step 1 – dates
  bookingDate: Date | null = null;
  returnDate: Date | null = null;
  readonly today = new Date();

  get datesSelected(): boolean {
    return !!(
      this.bookingDate &&
      this.returnDate &&
      this.returnDate >= this.bookingDate
    );
  }

  // Step 2 – product
  selectedProduct: Product | null = null;
  productSelected = false;
  searchQuery = '';
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  dropdownVisible = false;

  // Conflict
  conflictBookings: Booking[] = [];
  conflictLoading = false;
  hasConflict = false;

  // Customer / payment form
  form = {
    customerName: '',
    mobileNumber: '',
    villageCity: '',
    advancePayment: null as number | null,
    remainingPayment: null as number | null,
  };

  submitted = false;
  loading = false;
  confirmed = false;

  constructor(
    private router: Router,
    private bookingService: BookingService,
    private productService: ProductService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.productService.getAll().subscribe({
      next: (products) =>
        (this.allProducts = products.filter((p) => p.isActive)),
      error: () => {},
    });
  }

  onDateChange(): void {
    if (this.productSelected) {
      this.clearProduct();
    }
  }

  onSearchInput(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredProducts = [];
      this.dropdownVisible = false;
      return;
    }
    this.filteredProducts = this.allProducts.filter(
      (p) =>
        p.serialNumber.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q),
    );
    this.dropdownVisible = true;
  }

  selectProduct(product: Product): void {
    this.selectedProduct = product;
    this.productSelected = true;
    this.dropdownVisible = false;
    this.searchQuery = '';
    this.confirmed = false;
    this.checkConflict(product);
  }

  clearProduct(): void {
    this.selectedProduct = null;
    this.productSelected = false;
    this.conflictBookings = [];
    this.hasConflict = false;
    this.searchQuery = '';
    this.filteredProducts = [];
    this.confirmed = false;
  }

  private toISTDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00:00.000+05:30`;
  }

  private checkConflict(product: Product): void {
    this.conflictLoading = true;
    this.hasConflict = false;
    this.conflictBookings = [];
    this.bookingService
      .search({
        serialNumber: product.serialNumber,
        fromDate: this.toISTDate(this.bookingDate!),
        toDate: this.toISTDate(this.returnDate!),
      })
      .subscribe({
        next: (res) => {
          this.conflictBookings = res.data;
          this.hasConflict = res.data.length > 0;
          this.conflictLoading = false;
        },
        error: () => {
          this.conflictLoading = false;
        },
      });
  }

  get canConfirm(): boolean {
    if (this.conflictLoading) return false;
    return this.hasConflict ? this.confirmed : true;
  }

  formatDate(d: Date | string | null): string {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  onSubmit(): void {
    this.submitted = true;
    if (
      !this.selectedProduct ||
      !this.bookingDate ||
      !this.returnDate ||
      !this.form.customerName ||
      !this.form.mobileNumber ||
      !this.form.villageCity ||
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
    this.loading = true;
    this.bookingService
      .create({
        productSerialNumber: this.selectedProduct.serialNumber,
        customerName: this.form.customerName,
        customerPhone: this.form.mobileNumber,
        village: this.form.villageCity,
        advancePayment: this.form.advancePayment!,
        remainingPayment: this.form.remainingPayment!,
        bookingDate: this.toISTDate(this.bookingDate),
        returnDate: this.toISTDate(this.returnDate),
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.toast.show(
            'success',
            'Booking Created',
            'The booking was saved successfully.',
          );
          this.router.navigate(['/bookings']);
        },
        error: (err) => {
          this.loading = false;
          const message: string =
            err?.error?.message ?? 'Could not save booking. Please try again.';
          this.toast.show('error', 'Booking Failed', message);
        },
      });
  }

  goBack(): void {
    this.router.navigate(['/bookings']);
  }
}
