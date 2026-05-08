import {
  Component,
  inject,
  HostListener,
  Output,
  EventEmitter,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserStateService } from '../../core/user-state.service';

@Component({
  selector: 'app-header',
  imports: [FormsModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  @Output() menuClick = new EventEmitter<void>();
  searchQuery = '';
  profileMenuOpen = false;
  mobileSearchOpen = false;
  userState = inject(UserStateService);

  constructor(private router: Router) {}

  onSearch(): void {
    const q = this.searchQuery.trim();
    if (q) {
      this.router.navigate(['/inventory-detail'], { queryParams: { q } });
      this.clearSearch();
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  closeMobileSearch(): void {
    this.mobileSearchOpen = false;
    this.searchQuery = '';
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  manageProfile(): void {
    this.profileMenuOpen = false;
    this.router.navigate(['/settings']);
  }

  logout(): void {
    this.profileMenuOpen = false;
    this.userState.clear();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.profileMenuOpen = false;
  }
}
