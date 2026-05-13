import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService } from '../../core/product.service';
import { ToastService } from '../../shared/toast/toast.service';
import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';
import { NumbersOnlyDirective } from '../../shared/directives/numbers-only.directive';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    CustomSelectComponent,
    NumbersOnlyDirective,
  ],
  templateUrl: './add-product.component.html',
  styleUrl: './add-product.component.scss',
})
export class AddProductComponent {
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

  categories = ['Lehenga', 'Saree', 'Accessories'];

  get categoryOptions(): { value: string; label: string }[] {
    return this.categories.map((c) => ({ value: c, label: c }));
  }

  submitting = false;
  submitted = false;

  isFieldError(value: string | number | null | undefined): boolean {
    return this.submitted && !value;
  }

  constructor(
    private productService: ProductService,
    private toastService: ToastService,
    private router: Router,
  ) {}

  goBack(): void {
    this.router.navigate(['/inventory']);
  }

  onSubmit(): void {
    this.submitted = true;

    if (!this.form.serialNumber.trim() || !this.form.rentPrice) {
      this.toastService.show(
        'error',
        'Validation Error',
        'Please fill in all required fields.',
      );
      return;
    }

    this.submitting = true;
    const payload = {
      name: this.form.name.trim() || undefined,
      category: this.form.category,
      serialNumber: this.form.serialNumber.trim(),
      rentPrice: this.form.rentPrice ?? 0,
      purchasePrice: this.form.purchasePrice ?? undefined,
      sellingPrice: this.form.sellingPrice ?? undefined,
      isActive: this.form.isActive,
      imageUrl: this.form.imageUrl.trim() || undefined,
    };
    this.productService.create(payload).subscribe({
      next: () => {
        this.toastService.show(
          'success',
          'Product Added',
          'Product added successfully!',
        );
        this.router.navigate(['/inventory']);
      },
      error: () => {
        this.toastService.show(
          'error',
          'Error',
          'Failed to add product. Please try again.',
        );
        this.submitting = false;
      },
    });
  }
}
