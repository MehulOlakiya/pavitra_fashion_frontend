import { Component, ElementRef, ViewChild } from '@angular/core';
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
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

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
  uploadingImage = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

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

  triggerFileInput(): void {
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
    this.form.imageUrl = '';
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

    if (this.selectedFile) {
      this.uploadingImage = true;
      this.productService.uploadImage(this.selectedFile).subscribe({
        next: ({ url }) => {
          this.form.imageUrl = url;
          this.uploadingImage = false;
          this.saveProduct();
        },
        error: () => {
          this.toastService.show(
            'error',
            'Upload Failed',
            'Could not upload image. Please try again.',
          );
          this.submitting = false;
          this.uploadingImage = false;
        },
      });
    } else {
      this.saveProduct();
    }
  }

  private saveProduct(): void {
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
