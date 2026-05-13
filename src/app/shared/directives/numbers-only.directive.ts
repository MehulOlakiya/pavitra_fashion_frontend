import { Directive, HostListener } from '@angular/core';

/**
 * Restricts input[type="number"] fields to digits, decimal point,
 * and control keys only. Blocks letters (including 'e', 'E', '+', '-').
 */
@Directive({
  selector: 'input[type="number"]',
  standalone: true,
})
export class NumbersOnlyDirective {
  private readonly ALLOWED_KEYS = new Set([
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    '.',
  ]);

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Allow control combos (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z)
    if (event.ctrlKey || event.metaKey) {
      return;
    }
    // Allow whitelisted control keys
    if (this.ALLOWED_KEYS.has(event.key)) {
      return;
    }
    // Allow digit keys 0-9
    if (/^\d$/.test(event.key)) {
      return;
    }
    // Block everything else (letters, 'e', 'E', '+', '-', etc.)
    event.preventDefault();
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    // Allow only strings that are valid non-negative numbers
    if (!/^\d*\.?\d*$/.test(pasted)) {
      event.preventDefault();
    }
  }
}
