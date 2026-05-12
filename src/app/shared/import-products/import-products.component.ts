import {
  Component,
  Output,
  EventEmitter,
  HostListener,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as XLSX from 'xlsx';
import { ProductService } from '../../core/product.service';
import { ToastService } from '../toast/toast.service';

interface ImportError {
  row: number;
  message: string;
}

@Component({
  selector: 'app-import-products',
  imports: [CommonModule],
  templateUrl: './import-products.component.html',
  styleUrl: './import-products.component.scss',
})
export class ImportProductsComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  isDragOver = false;
  importing = false;

  result: { imported: number; skipped: number; errors: ImportError[] } | null =
    null;

  readonly sampleCsvUrl = this.buildSampleCsvUrl();
  readonly sampleXlsxUrl = this.buildSampleXlsxUrl();

  constructor(
    private productService: ProductService,
    private toast: ToastService,
  ) {}

  private buildSampleCsvUrl(): string {
    const headers =
      'name,serialNumber,rentPrice,sellingPrice,purchasePrice,category,imageUrl';
    const sample =
      'Sample Lehenga,SN001,500,5000,3000,lehenga,https://example.com/image.jpg';
    const blob = new Blob([`${headers}\n${sample}`], { type: 'text/csv' });
    return URL.createObjectURL(blob);
  }

  private buildSampleXlsxUrl(): string {
    const rows = [
      [
        'name',
        'serialNumber',
        'rentPrice',
        'sellingPrice',
        'purchasePrice',
        'category',
        'imageUrl',
      ],
      [
        'Sample Lehenga',
        'SN001',
        500,
        5000,
        3000,
        'lehenga',
        'https://example.com/image.jpg',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    const buf: ArrayBuffer = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    return URL.createObjectURL(blob);
  }

  close(): void {
    this.closed.emit();
  }

  triggerFilePicker(): void {
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.setFile(input.files[0]);
  }

  @HostListener('dragover', ['$event'])
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = true;
  }

  @HostListener('dragleave')
  onDragLeave(): void {
    this.isDragOver = false;
  }

  @HostListener('drop', ['$event'])
  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.isDragOver = false;
    const file = e.dataTransfer?.files[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File): void {
    const allowed = /\.(csv|xlsx|xls)$/i;
    if (!allowed.test(file.name)) {
      this.toast.show(
        'error',
        'Invalid File',
        'Only CSV and Excel files are allowed.',
      );
      return;
    }
    this.selectedFile = file;
    this.result = null;
  }

  removeFile(): void {
    this.selectedFile = null;
    this.result = null;
    this.fileInputRef.nativeElement.value = '';
  }

  doImport(): void {
    if (!this.selectedFile) return;
    this.importing = true;
    this.result = null;
    this.productService.importProducts(this.selectedFile).subscribe({
      next: (res) => {
        this.importing = false;
        this.result = res;
        if (res.imported > 0) {
          this.toast.show(
            'success',
            'Import Complete',
            `${res.imported} product(s) imported successfully.`,
          );
          this.imported.emit();
        } else {
          this.toast.show(
            'error',
            'Nothing Imported',
            'No products were imported. Check the errors below.',
          );
        }
      },
      error: (err) => {
        this.importing = false;
        const msg = err?.error?.message ?? 'Import failed. Please try again.';
        this.toast.show('error', 'Import Failed', msg);
      },
    });
  }

  get fileSize(): string {
    if (!this.selectedFile) return '';
    const kb = this.selectedFile.size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  }
}
