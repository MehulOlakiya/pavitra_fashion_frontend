import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-range-picker.component.html',
  styleUrl: './date-range-picker.component.scss',
})
export class DateRangePickerComponent implements OnChanges {
  @Input() fromDate: Date | null = null;
  @Input() toDate: Date | null = null;
  @Output() rangeChange = new EventEmitter<{
    from: Date | null;
    to: Date | null;
  }>();
  @Output() apply = new EventEmitter<{ from: Date | null; to: Date | null }>();
  @Output() clear = new EventEmitter<void>();

  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth();

  // Internal pending selection
  pendingFrom: Date | null = null;
  pendingTo: Date | null = null;
  hoverDate: Date | null = null;

  readonly today = new Date();
  readonly monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  readonly dayHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  years: number[] = [];
  calendarDays: Date[] = [];

  constructor() {
    const cur = new Date().getFullYear();
    for (let y = cur - 5; y <= cur + 5; y++) this.years.push(y);
    this.buildCalendar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fromDate']) this.pendingFrom = this.fromDate;
    if (changes['toDate']) this.pendingTo = this.toDate;
    if (this.pendingFrom) {
      this.viewYear = this.pendingFrom.getFullYear();
      this.viewMonth = this.pendingFrom.getMonth();
      this.buildCalendar();
    }
  }

  buildCalendar(): void {
    const firstDay = new Date(this.viewYear, this.viewMonth, 1).getDay();
    const daysInMonth = new Date(
      this.viewYear,
      this.viewMonth + 1,
      0,
    ).getDate();
    const prevMonth = this.viewMonth === 0 ? 11 : this.viewMonth - 1;
    const prevYear = this.viewMonth === 0 ? this.viewYear - 1 : this.viewYear;
    const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

    const days: Date[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(new Date(prevYear, prevMonth, daysInPrevMonth - i));
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(this.viewYear, this.viewMonth, d));
    }
    this.calendarDays = days;
  }

  prevMonth(): void {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear--;
    } else this.viewMonth--;
    this.buildCalendar();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear++;
    } else this.viewMonth++;
    this.buildCalendar();
  }

  onYearChange(value: string): void {
    this.viewYear = +value;
    this.buildCalendar();
  }

  onDayClick(day: Date): void {
    if (!this.isCurrentMonth(day)) return;

    if (!this.pendingFrom || (this.pendingFrom && this.pendingTo)) {
      // Start fresh selection
      this.pendingFrom = day;
      this.pendingTo = null;
    } else {
      // Second click — set end
      if (day < this.pendingFrom) {
        this.pendingTo = this.pendingFrom;
        this.pendingFrom = day;
      } else {
        this.pendingTo = day;
      }
    }
    this.hoverDate = null;
  }

  onDayHover(day: Date): void {
    if (this.pendingFrom && !this.pendingTo) {
      this.hoverDate = day;
    }
  }

  onDayLeave(): void {
    this.hoverDate = null;
  }

  onApply(): void {
    this.apply.emit({ from: this.pendingFrom, to: this.pendingTo });
  }

  onClear(): void {
    this.pendingFrom = null;
    this.pendingTo = null;
    this.hoverDate = null;
    this.clear.emit();
  }

  isCurrentMonth(day: Date): boolean {
    return day.getMonth() === this.viewMonth;
  }

  isToday(day: Date): boolean {
    return this.sameDay(day, this.today);
  }

  isStart(day: Date): boolean {
    return !!(this.pendingFrom && this.sameDay(day, this.pendingFrom));
  }

  isEnd(day: Date): boolean {
    const end =
      this.pendingTo ??
      (this.pendingFrom && this.hoverDate ? this.hoverDate : null);
    return !!(end && this.sameDay(day, end));
  }

  isInRange(day: Date): boolean {
    const start = this.pendingFrom;
    const end = this.pendingTo ?? this.hoverDate;
    if (!start || !end) return false;
    const lo = start < end ? start : end;
    const hi = start < end ? end : start;
    return day > lo && day < hi;
  }

  isSelected(day: Date): boolean {
    return this.isStart(day) || this.isEnd(day);
  }

  get labelText(): string {
    if (this.pendingFrom && this.pendingTo) {
      return `${this.fmtFull(this.pendingFrom)} → ${this.fmtFull(this.pendingTo)}`;
    }
    if (this.pendingFrom)
      return `${this.fmtFull(this.pendingFrom)} → pick end date`;
    return 'Pick start date';
  }

  private sameDay(a: Date, b: Date): boolean {
    return (
      a.getDate() === b.getDate() &&
      a.getMonth() === b.getMonth() &&
      a.getFullYear() === b.getFullYear()
    );
  }

  private fmtFull(d: Date): string {
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
