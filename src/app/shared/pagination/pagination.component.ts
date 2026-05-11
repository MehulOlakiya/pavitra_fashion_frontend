import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
  input,
} from '@angular/core';
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() total = 0;
  @Input() limit = 10;

  @Output() pageChange = new EventEmitter<number>();

  get pageNumbers(): (number | '...')[] {
    const pages: (number | '...')[] = [];
    const total = this.totalPages;
    const cur = this.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (cur > 3) pages.push('...');

    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (cur < total - 2) pages.push('...');
    pages.push(total);

    return pages;
  }

  get rangeStart(): number {
    return this.total === 0 ? 0 : (this.currentPage - 1) * this.limit + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.currentPage * this.limit, this.total);
  }

  goToPage(page: number | '...'): void {
    if (page === '...' || page === this.currentPage) return;
    this.pageChange.emit(page as number);
  }
}
