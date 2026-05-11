import { Component, OnInit, HostListener } from '@angular/core';
import { TitleCasePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Product, ProductService } from '../../core/product.service';
import { BookingService } from '../../core/booking.service';
import { ToastService } from '../../shared/toast/toast.service';
import { PaginationComponent } from '../../shared/pagination/pagination.component';
import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';

@Component({
  selector: 'app-cloth-management',
  standalone: true,
  imports: [
    TitleCasePipe,
    DecimalPipe,
    FormsModule,
    PaginationComponent,
    CustomSelectComponent,
  ],
  templateUrl: './cloth-management.component.html',
  styleUrl: './cloth-management.component.scss',
})
export class ClothManagementComponent implements OnInit {
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  pagedProducts: Product[] = [];
  categories: string[] = [];
  loading = false;
  errorMessage = '';
  searchQuery = '';
  categoryFilter = '';

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

  constructor(
    private productService: ProductService,
    private bookingService: BookingService,
    private toastService: ToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
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
          this.applyFilter();
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
    this.bookingService
      .search({
        serialNumber: product.serialNumber,
        status: 'active',
        limit: 1,
      })
      .subscribe({
        next: (res) => {
          this.deleteHasActiveBookings = res.total > 0;
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
        this.allProducts = this.allProducts.filter(
          (p) => p._id !== product._id,
        );
        this.applyFilter();
        this.toastService.show(
          'success',
          'Deleted',
          `${product.name} has been deleted.`,
        );
        this.closeDeleteModal();
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
    this.productService.getAll().subscribe({
      next: (products) => {
        this.allProducts = products;
        this.categories = [...new Set(products.map((p) => p.category))].sort();
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load inventory. Please try again.';
        this.loading = false;
      },
    });
  }

  private applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    const cat = this.categoryFilter.toLowerCase();
    this.filteredProducts = this.allProducts.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.serialNumber.toLowerCase().includes(q);
      const matchesCategory = !cat || p.category.toLowerCase() === cat;
      return matchesSearch && matchesCategory;
    });
    this.total = this.filteredProducts.length;
    this.totalPages = Math.max(1, Math.ceil(this.total / this.limit));
    this.updatePage();
  }

  private updatePage(): void {
    const start = (this.currentPage - 1) * this.limit;
    this.pagedProducts = this.filteredProducts.slice(start, start + this.limit);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyFilter();
  }

  onCategoryChange(): void {
    this.currentPage = 1;
    this.applyFilter();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePage();
  }

  statusLabel(isActive: boolean): 'Available' | 'Inactive' {
    return isActive ? 'Available' : 'Inactive';
  }

  statusClass(isActive: boolean): string {
    return isActive ? 'status--available' : 'status--inactive';
  }

  get activeCount(): number {
    return this.filteredProducts.filter((p) => p.isActive).length;
  }

  get inactiveCount(): number {
    return this.filteredProducts.filter((p) => !p.isActive).length;
  }
}
