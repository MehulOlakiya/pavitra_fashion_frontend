import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Product, ProductService } from '../../core/product.service';
import { ToastService } from '../../shared/toast/toast.service';
import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';
import { NumbersOnlyDirective } from '../../shared/directives/numbers-only.directive';

@Component({
  selector: 'app-edit-product',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    CustomSelectComponent,
    NumbersOnlyDirective,
  ],
  templateUrl: './edit-product.component.html',
  styleUrl: './edit-product.component.scss',
})
export class EditProductComponent implements OnInit {
  loading = true;
  submitting = false;
  productId = '';

  form = {
    name: '',
    category: '',
    serialNumber: '',
    rentPrice: null as number | null,
    purchasePrice: null as number | null,
    sellingPrice: null as number | null,
    imageUrl: '',
    isActive: true,
  };

  categories = ['Sherwani', 'Lehenga', 'Saree', 'Kurta Set', 'Accessories'];

  get categoryOptions(): { value: string; label: string }[] {
    return this.categories.map((c) => ({ value: c, label: c }));
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.productId) {
      this.router.navigate(['/inventory']);
      return;
    }
    this.productService.getById(this.productId).subscribe({
      next: (p: Product) => {
        this.form.name = p.name ?? '';
        this.form.category = p.category;
        this.form.serialNumber = p.serialNumber;
        this.form.rentPrice = p.rentPrice ?? null;
        this.form.purchasePrice = (p as any).purchasePrice ?? null;
        this.form.sellingPrice = p.sellingPrice ?? null;
        this.form.isActive = p.isActive;
        this.form.imageUrl = p.imageUrl ?? '';
        this.loading = false;
      },
      error: () => {
        this.toastService.show(
          'error',
          'Load Failed',
          'Could not load product details.',
        );
        this.router.navigate(['/inventory']);
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/inventory']);
  }

  onSubmit(): void {
    if (
      !this.form.name.trim() ||
      !this.form.category ||
      !this.form.serialNumber.trim()
    ) {
      this.toastService.show(
        'error',
        'Validation Error',
        'Please fill in all required fields.',
      );
      return;
    }
    this.submitting = true;

    const payload: Partial<Omit<Product, '_id'>> & { purchasePrice?: number } =
      {
        name: this.form.name.trim(),
        category: this.form.category,
        serialNumber: this.form.serialNumber.trim(),
        rentPrice: this.form.rentPrice ?? 0,
        purchasePrice: this.form.purchasePrice ?? 0,
        sellingPrice: this.form.sellingPrice ?? 0,
        isActive: this.form.isActive,
        imageUrl: this.form.imageUrl.trim() || undefined,
      };

    this.productService.update(this.productId, payload).subscribe({
      next: () => {
        this.toastService.show(
          'success',
          'Product Updated',
          'Changes saved successfully!',
        );
        this.router.navigate(['/inventory']);
      },
      error: () => {
        this.toastService.show(
          'error',
          'Error',
          'Failed to update product. Please try again.',
        );
        this.submitting = false;
      },
    });
  }
}
