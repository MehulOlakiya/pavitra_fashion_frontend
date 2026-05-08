import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ElementRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-datepicker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './datepicker.component.html',
  styleUrl: './datepicker.component.scss',
})
export class DatepickerComponent implements OnChanges {
  @Input() placeholder = 'Select date';
  @Input() value: Date | null = null;
  @Input() minDate: Date | null = null;
  @Input() invalid = false;
  @Output() valueChange = new EventEmitter<Date | null>();

  isOpen = false;
  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth();

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
  readonly dayHeaders = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  years: number[] = [];
  calendarDays: Date[] = [];

  constructor(private el: ElementRef) {
    const cur = new Date().getFullYear();
    for (let y = cur - 5; y <= cur + 5; y++) this.years.push(y);
    this.generateCalendar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.value) {
      this.viewYear = this.value.getFullYear();
      this.viewMonth = this.value.getMonth();
      this.generateCalendar();
    }
  }

  get displayValue(): string {
    if (!this.value) return '';
    const d = this.value;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  generateCalendar(): void {
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

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  prevMonth(): void {
    if (this.viewMonth === 0) {
      this.viewMonth = 11;
      this.viewYear--;
    } else this.viewMonth--;
    this.generateCalendar();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) {
      this.viewMonth = 0;
      this.viewYear++;
    } else this.viewMonth++;
    this.generateCalendar();
  }

  onMonthChange(value: string): void {
    this.viewMonth = +value;
    this.generateCalendar();
  }

  onYearChange(value: string): void {
    this.viewYear = +value;
    this.generateCalendar();
  }

  selectDate(date: Date): void {
    if (this.isDisabled(date)) return;
    this.value = date;
    this.valueChange.emit(date);
    this.isOpen = false;
  }

  clear(event?: MouseEvent): void {
    event?.stopPropagation();
    this.value = null;
    this.valueChange.emit(null);
  }

  close(): void {
    this.isOpen = false;
  }

  isToday(date: Date): boolean {
    return (
      date.getDate() === this.today.getDate() &&
      date.getMonth() === this.today.getMonth() &&
      date.getFullYear() === this.today.getFullYear()
    );
  }

  isSelected(date: Date): boolean {
    if (!this.value) return false;
    return (
      date.getDate() === this.value.getDate() &&
      date.getMonth() === this.value.getMonth() &&
      date.getFullYear() === this.value.getFullYear()
    );
  }

  isCurrentMonth(date: Date): boolean {
    return (
      date.getMonth() === this.viewMonth && date.getFullYear() === this.viewYear
    );
  }

  isDisabled(date: Date): boolean {
    if (!this.minDate) return false;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const min = new Date(
      this.minDate.getFullYear(),
      this.minDate.getMonth(),
      this.minDate.getDate(),
    );
    return d < min;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.isOpen = false;
    }
  }
}
