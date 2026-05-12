import {
  Component,
  Input,
  forwardRef,
  ElementRef,
  HostListener,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  templateUrl: './custom-select.component.html',
  styleUrl: './custom-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true,
    },
  ],
})
export class CustomSelectComponent implements ControlValueAccessor {
  @Input() options: SelectOption[] = [];
  @Input() placeholder = 'Select...';
  @Input() hasError = false;

  isOpen = false;
  selectedValue = '';
  isDisabled = false;

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private elRef: ElementRef) {}

  writeValue(value: string): void {
    this.selectedValue = value ?? '';
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  toggle(): void {
    if (!this.isDisabled) {
      this.isOpen = !this.isOpen;
    }
  }

  select(value: string): void {
    this.selectedValue = value;
    this.onChange(value);
    this.onTouched();
    this.isOpen = false;
  }

  get selectedLabel(): string {
    return (
      this.options.find((o) => o.value === this.selectedValue)?.label ||
      this.placeholder
    );
  }

  get hasValue(): boolean {
    return this.options.some((o) => o.value === this.selectedValue);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(e.target)) {
      this.isOpen = false;
    }
  }
}
