import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService } from '../../core/product.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [FormsModule, RouterModule],
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
    isActive: true,
  };

  categories = ['Sherwani', 'Lehenga', 'Saree', 'Kurta Set', 'Accessories'];

  previewUrls: string[] = [];
  selectedFiles: File[] = [];

  submitting = false;

  constructor(
    private productService: ProductService,
    private toastService: ToastService,
    private router: Router,
  ) {}

  goBack(): void {
    this.router.navigate(['/inventory']);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files) this.addFiles(Array.from(files));
  }

  private addFiles(files: File[]): void {
    const first = files.find((f) =>
      ['image/jpeg', 'image/png'].includes(f.type),
    );
    if (!first) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrls = [e.target?.result as string];
    };
    reader.readAsDataURL(first);
    this.selectedFiles = [first];
  }

  removeImage(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.previewUrls.splice(index, 1);
    this.selectedFiles.splice(index, 1);
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

    const payload = {
      name: this.form.name.trim(),
      category: this.form.category,
      serialNumber: this.form.serialNumber.trim(),
      rentPrice: this.form.rentPrice ?? 0,
      purchasePrice: this.form.purchasePrice ?? 0,
      sellingPrice: this.form.sellingPrice ?? 0,
      isActive: this.form.isActive,
      imageUrl: this.previewUrls[0] ?? '',
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
