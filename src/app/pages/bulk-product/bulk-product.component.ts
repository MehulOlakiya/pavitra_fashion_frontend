import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../core/product.service';
import { ToastService } from '../../shared/toast/toast.service';

export interface BulkRow {
  serialNumber: string;
  name: string;
  rentPrice: number | null;
  purchasePrice: number | null;
  sellingPrice: number | null;
  imageUrl: string;
  // local upload state
  uploading: boolean;
  uploadError: string;
  hasError: boolean;
  errorMsg: string;
}

@Component({
  selector: 'app-bulk-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bulk-product.component.html',
  styleUrl: './bulk-product.component.scss',
})
export class BulkProductComponent {
  rows: BulkRow[] = [];
  saving = false;

  // Photo modal state
  photoModalOpen = false;
  photoModalRowIndex = -1;
  photoPreviewUrl: string | null = null;
  photoSelectedFile: File | null = null;
  photoUploading = false;

  constructor(
    private productService: ProductService,
    private toast: ToastService,
    private router: Router,
  ) {
    this.addRows(10);
  }

  private emptyRow(): BulkRow {
    return {
      serialNumber: '',
      name: '',
      rentPrice: null,
      purchasePrice: null,
      sellingPrice: null,
      imageUrl: '',
      uploading: false,
      uploadError: '',
      hasError: false,
      errorMsg: '',
    };
  }

  addRows(count = 5): void {
    for (let i = 0; i < count; i++) {
      this.rows.push(this.emptyRow());
    }
  }

  removeRow(i: number): void {
    this.rows.splice(i, 1);
  }

  // ── Photo Modal ───────────────────────────────────────────

  openPhotoModal(index: number): void {
    this.photoModalRowIndex = index;
    this.photoPreviewUrl = this.rows[index].imageUrl || null;
    this.photoSelectedFile = null;
    this.photoModalOpen = true;
  }

  closePhotoModal(): void {
    this.photoModalOpen = false;
    this.photoPreviewUrl = null;
    this.photoSelectedFile = null;
  }

  onPhotoFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.photoSelectedFile = file;
    // Local preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoPreviewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  uploadPhoto(): void {
    if (!this.photoSelectedFile) return;
    this.photoUploading = true;
    const row = this.rows[this.photoModalRowIndex];
    row.uploading = true;
    row.uploadError = '';

    this.productService.uploadImage(this.photoSelectedFile).subscribe({
      next: (res) => {
        row.imageUrl = res.url;
        row.uploading = false;
        this.photoUploading = false;
        this.toast.show('success', 'Uploaded', 'Photo uploaded successfully.');
        this.closePhotoModal();
      },
      error: () => {
        row.uploading = false;
        row.uploadError = 'Upload failed. Try again.';
        this.photoUploading = false;
        this.toast.show('error', 'Upload Failed', 'Could not upload the image.');
      },
    });
  }

  removePhoto(i: number): void {
    this.rows[i].imageUrl = '';
  }

  // ── Save All ──────────────────────────────────────────────

  get filledRows(): BulkRow[] {
    return this.rows.filter((r) => r.serialNumber.trim());
  }

  saveAll(): void {
    // Clear previous errors
    this.rows.forEach((r) => {
      r.hasError = false;
      r.errorMsg = '';
    });

    const valid = this.filledRows;
    if (valid.length === 0) {
      this.toast.show('error', 'Empty', 'Please fill at least one SN Number.');
      return;
    }

    // Client-side: check duplicate serial numbers within the table
    const sns = valid.map((r) => r.serialNumber.trim());
    const duplicates = sns.filter((sn, i) => sns.indexOf(sn) !== i);
    if (duplicates.length > 0) {
      this.toast.show('error', 'Duplicate SN', `Duplicate serial numbers: ${[...new Set(duplicates)].join(', ')}`);
      return;
    }

    const payload = valid.map((r) => ({
      serialNumber: r.serialNumber.trim(),
      name: r.name.trim() || undefined,
      rentPrice: r.rentPrice ?? 0,
      purchasePrice: r.purchasePrice ?? undefined,
      sellingPrice: r.sellingPrice ?? undefined,
      imageUrl: r.imageUrl || undefined,
      category: 'lehenga', // default category
      isActive: true,
    }));

    this.saving = true;
    this.productService.createBulk(payload).subscribe({
      next: (res) => {
        this.saving = false;
        // Mark rows that had backend errors
        res.errors.forEach((e) => {
          const row = this.rows.find((r) => r.serialNumber.trim() === e.serialNumber);
          if (row) {
            row.hasError = true;
            row.errorMsg = e.message;
          }
        });

        if (res.inserted > 0) {
          this.toast.show(
            'success',
            'Saved!',
            `${res.inserted} product(s) saved. ${res.skipped > 0 ? res.skipped + ' skipped.' : ''}`,
          );
          if (res.skipped === 0) {
            this.router.navigate(['/inventory']);
          }
        } else {
          this.toast.show('error', 'None Saved', `All ${res.skipped} product(s) were skipped.`);
        }
      },
      error: () => {
        this.saving = false;
        this.toast.show('error', 'Save Failed', 'Could not save products. Please try again.');
      },
    });
  }
}
