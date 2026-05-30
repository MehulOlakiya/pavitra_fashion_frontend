import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { TitleCasePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  Product,
  ProductService,
  ProductAnalytics,
} from '../../core/product.service';
import { BookingService } from '../../core/booking.service';
import { ToastService } from '../../shared/toast/toast.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { forkJoin } from 'rxjs';
import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';
import { ImportProductsComponent } from '../../shared/import-products/import-products.component';
import { DateRangePickerComponent } from '../../shared/date-range-picker/date-range-picker.component';

@Component({
  selector: 'app-cloth-management',
  standalone: true,
  imports: [
    TitleCasePipe,
    DecimalPipe,
    FormsModule,
    PaginationComponent,
    CustomSelectComponent,
    ImportProductsComponent,
    DateRangePickerComponent,
  ],
  templateUrl: './cloth-management.component.html',
  styleUrl: './cloth-management.component.scss',
})
export class ClothManagementComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  categories: string[] = [];
  loading = false;
  errorMessage = '';
  importDrawerOpen = false;
  searchQuery = '';
  categoryFilter = '';

  // Date range availability filter
  dateRangePickerOpen = false;
  dateRangeFrom: Date | null = null;
  dateRangeTo: Date | null = null;
  availabilityLoading = false;
  dateFilteredProducts: Product[] | null = null;



  get categoryOptions(): { value: string; label: string }[] {
    const fmt = (s: string) =>
      s
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    return [
      { value: '', label: 'Category: All' },
      ...this.categories.map((cat) => ({ value: cat, label: fmt(cat) })),
    ];
  }

  // Action menu
  openMenuId: string | null = null;

  // Delete confirmation modal
  deletingProduct: Product | null = null;
  deleteChecking = false;
  deleteHasActiveBookings = false;
  deleteConfirming = false;

  // Pagination
  currentPage = 1;
  totalPages = 1;
  total = 0;
  readonly limit = 10;

  private searchSubject = new Subject<string>();
  private sub = new Subscription();

  constructor(
    private productService: ProductService,
    private bookingService: BookingService,
    private toastService: ToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadAnalytics();

    this.sub.add(
      this.searchSubject
        .pipe(debounceTime(400), distinctUntilChanged())
        .subscribe(() => {
          this.currentPage = 1;
          if (this.dateRangeFrom) {
            this.loadAvailable();
          } else {
            this.load();
          }
        }),
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  onImportComplete(): void {
    this.importDrawerOpen = false;
    this.currentPage = 1;
    this.load();
    this.loadAnalytics();
  }

  addProduct(): void {
    this.router.navigate(['/inventory/add']);
  }

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  closeMenu(): void {
    this.openMenuId = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuId = null;
    this.dateRangePickerOpen = false;
  }

  onViewInsights(product: Product): void {
    this.router.navigate(['/inventory/insights', product._id]);
  }

  onEdit(product: Product): void {
    this.router.navigate(['/inventory/edit', product._id]);
  }

  onToggleActive(product: Product): void {
    const updated = { ...product, isActive: !product.isActive };
    this.productService
      .update(product._id, { isActive: updated.isActive })
      .subscribe({
        next: () => {
          product.isActive = updated.isActive;
          this.toastService.show(
            'success',
            'Status Updated',
            `${product.name} has been ${updated.isActive ? 'activated' : 'deactivated'}.`,
          );
        },
        error: () =>
          this.toastService.show('error', 'Error', 'Failed to update status.'),
      });
  }

  onDelete(product: Product): void {
    this.closeMenu();
    this.deletingProduct = product;
    this.deleteHasActiveBookings = false;
    this.deleteChecking = true;
    this.deleteConfirming = false;
    forkJoin([
      this.bookingService.search({
        serialNumber: product.serialNumber,
        status: 'booked',
        limit: 1,
      }),
      this.bookingService.search({
        serialNumber: product.serialNumber,
        status: 'rented',
        limit: 1,
      })
    ]).subscribe({
      next: ([resBooked, resRented]) => {
        this.deleteHasActiveBookings = resBooked.total > 0 || resRented.total > 0;
        this.deleteChecking = false;
      },
      error: () => {
        this.deleteChecking = false;
      },
    });
  }

  closeDeleteModal(): void {
    this.deletingProduct = null;
    this.deleteChecking = false;
    this.deleteHasActiveBookings = false;
    this.deleteConfirming = false;
  }

  confirmDelete(): void {
    if (!this.deletingProduct) return;
    this.deleteConfirming = true;
    const product = this.deletingProduct;
    this.productService.delete(product._id).subscribe({
      next: () => {
        this.toastService.show(
          'success',
          'Deleted',
          `${product.name} has been deleted.`,
        );
        this.closeDeleteModal();
        this.load();
      },
      error: () => {
        this.toastService.show('error', 'Error', 'Failed to delete product.');
        this.deleteConfirming = false;
      },
    });
  }

  private load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.sub.add(
      this.productService
        .getPaginated({
          page: this.currentPage,
          limit: this.limit,
          category: this.categoryFilter || undefined,
          search: this.searchQuery.trim() || undefined,
        })
        .subscribe({
          next: (res) => {
            this.products = res.data;
            this.total = res.total;
            this.totalPages = res.totalPages;
            this.loading = false;
          },
          error: () => {
            this.errorMessage = 'Failed to load inventory. Please try again.';
            this.loading = false;
          },
        }),
    );
  }

  private loadAnalytics(): void {
    this.sub.add(
      this.productService.getAnalytics().subscribe({
        next: (a) => {
          this.categories = a.categories.slice().sort();
        },
      }),
    );
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onCategoryChange(): void {
    this.currentPage = 1;
    if (this.dateRangeFrom) {
      this.loadAvailable();
    } else {
      this.load();
    }
  }

  onPageChange(page: number): void {
    if (page === this.currentPage) return;
    this.currentPage = page;
    if (this.dateRangeFrom) {
      this.loadAvailable();
    } else {
      this.load();
    }
  }

  statusLabel(isActive: boolean): 'Available' | 'Inactive' {
    return isActive ? 'Available' : 'Inactive';
  }

  statusClass(isActive: boolean): string {
    return isActive ? 'status--available' : 'status--inactive';
  }

  // ── Date Range Availability Filter ─────────────────────

  get displayedProducts(): Product[] {
    return this.dateFilteredProducts ?? this.products;
  }

  formatDateRange(): string {
    if (!this.dateRangeFrom) return '';
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return this.dateRangeTo
      ? `${fmt(this.dateRangeFrom)} – ${fmt(this.dateRangeTo)}`
      : fmt(this.dateRangeFrom);
  }

  onToggleDateRangePicker(event: MouseEvent): void {
    event.stopPropagation();
    this.dateRangePickerOpen = !this.dateRangePickerOpen;
  }

  onDateRangeApply(range: { from: Date | null; to: Date | null }): void {
    if (!range.from || !range.to) return;
    this.dateRangeFrom = range.from;
    this.dateRangeTo = range.to;
    this.dateRangePickerOpen = false;
    this.currentPage = 1;
    this.loadAvailable();
  }

  private loadAvailable(): void {
    if (!this.dateRangeFrom || !this.dateRangeTo) return;
    this.availabilityLoading = true;
    this.dateFilteredProducts = null;
    this.sub.add(
      this.productService
        .getAvailable({
          from: this.dateRangeFrom,
          to: this.dateRangeTo,
          page: this.currentPage,
          limit: this.limit,
          category: this.categoryFilter || undefined,
          search: this.searchQuery.trim() || undefined,
        })
        .subscribe({
          next: (res) => {
            this.dateFilteredProducts = res.data;
            this.total = res.total;
            this.totalPages = res.totalPages;
            this.availabilityLoading = false;
          },
          error: () => {
            this.availabilityLoading = false;
            this.toastService.show(
              'error',
              'Error',
              'Failed to check availability.',
            );
          },
        }),
    );
  }

  onDateRangeClear(): void {
    this.dateRangeFrom = null;
    this.dateRangeTo = null;
    this.dateRangePickerOpen = false;
    this.dateFilteredProducts = null;
    this.currentPage = 1;
    this.load();
  }
}
