import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService } from '../../core/booking.service';
import { Product, ProductService } from '../../core/product.service';
import { ToastService } from '../../shared/toast/toast.service';
import { CommonModule } from '@angular/common';
import { DatepickerComponent } from '../../shared/datepicker/datepicker.component';

@Component({
  selector: 'app-booking',
  imports: [FormsModule, CommonModule, DatepickerComponent],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss',
})
export class BookingComponent implements OnInit {
  item = {
    serial: '',
    collection: 'Premium Collection',
    name: '',
    rate: '',
    image: '',
  };

  form = {
    customerName: '',
    mobileNumber: '',
    villageCity: '',
    bookingDate: '',
    returnDate: '',
    advancePayment: null as number | null,
    remainingPayment: null as number | null,
  };

  loading = false;
  submitted = false;

  /** Product search state */
  productSelected = false;
  searchQuery = '';
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  searchLoading = false;
  dropdownVisible = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private bookingService: BookingService,
    private productService: ProductService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((p) => {
      if (p['serial']) {
        this.item.serial = p['serial'];
        if (p['name']) this.item.name = p['name'];
        if (p['rate']) this.item.rate = p['rate'];
        if (p['image']) this.item.image = p['image'];
        this.productSelected = true;
      } else {
        this.productSelected = false;
        this.loadProducts();
      }
    });
  }

  private loadProducts(): void {
    this.searchLoading = true;
    this.productService.getAll().subscribe({
      next: (products) => {
        this.allProducts = products;
        this.searchLoading = false;
      },
      error: () => {
        this.searchLoading = false;
        this.toast.error('Error', 'Could not load products.');
      },
    });
  }

  onSearchInput(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredProducts = [];
      this.dropdownVisible = false;
      return;
    }
    this.filteredProducts = this.allProducts.filter((p) =>
      p.serialNumber.toLowerCase().includes(q),
    );
    console.log('fdfsdfsdf', this.allProducts);
    this.dropdownVisible = true;
  }

  selectProduct(product: Product): void {
    this.item.serial = product.serialNumber;
    this.item.name = product.name;
    this.item.rate = `₹${product.rentPrice.toLocaleString('en-IN')}`;
    this.item.image = product.imageUrl;
    this.item.collection = product.category ?? 'Premium Collection';
    this.productSelected = true;
    this.dropdownVisible = false;
    this.searchQuery = '';
  }

  clearProduct(): void {
    this.item = {
      serial: '',
      collection: 'Premium Collection',
      name: '',
      rate: '',
      image: '',
    };
    this.productSelected = false;
    this.searchQuery = '';
    this.filteredProducts = [];
    if (this.allProducts.length === 0) {
      this.loadProducts();
    }
  }

  bookingDateObj: Date | null = null;

  private toISTDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}T00:00:00.000+05:30`;
  }

  onBookingDateChange(value: Date | null): void {
    this.bookingDateObj = value;
    this.form.bookingDate = value ? this.toISTDate(value) : '';
  }

  onReturnDateChange(value: Date | null): void {
    this.form.returnDate = value ? this.toISTDate(value) : '';
  }

  onSubmit(): void {
    this.submitted = true;
    if (
      !this.item.serial ||
      !this.form.customerName ||
      !this.form.mobileNumber ||
      !this.form.villageCity ||
      !this.form.bookingDate ||
      !this.form.returnDate ||
      this.form.advancePayment === null ||
      this.form.remainingPayment === null
    ) {
      this.toast.error('Validation failed', 'Please fill all required fields.');
      return;
    }

    this.loading = true;
    this.bookingService
      .create({
        productSerialNumber: this.item.serial,
        customerName: this.form.customerName,
        customerPhone: this.form.mobileNumber,
        village: this.form.villageCity,
        advancePayment: this.form.advancePayment,
        remainingPayment: this.form.remainingPayment,
        bookingDate: this.form.bookingDate,
        returnDate: this.form.returnDate,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.toast.success(
            'Booking created',
            'The booking was saved successfully.',
          );
          this.router.navigate(['/bookings']);
        },
        error: (err) => {
          this.loading = false;
          const message: string =
            err?.error?.message ?? 'Could not save booking. Please try again.';
          this.toast.error('Booking failed', message);
        },
      });
  }

  onCancel(): void {
    this.router.navigate(['/bookings']);
  }

  goBack(): void {
    this.router.navigate(['/bookings']);
  }
}
