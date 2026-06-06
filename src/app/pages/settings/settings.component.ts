import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, UserProfile } from '../../core/user.service';
import { UploadService } from '../../core/upload.service';
import { UserStateService } from '../../core/user-state.service';

import { CustomSelectComponent } from '../../shared/custom-select/custom-select.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomSelectComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  isEditing = false;
  isSaving = false;
  isUploading = false;
  
  profile = {
    fullName: '',
    email: '',
    mobile: '',
    profileImage: 'assets/images/placeholder.png'
  };

  notifications = {
    returnTime: { hour: '10', minute: '00', ampm: 'AM' },
    pickupTime: { hour: '09', minute: '00', ampm: 'AM' }
  };

  hoursOptions = Array.from({ length: 12 }, (_, i) => {
    const val = (i + 1).toString().padStart(2, '0');
    return { value: val, label: val };
  });
  minutesOptions = ['00', '15', '30', '45'].map(m => ({ value: m, label: m }));
  ampmOptions = ['AM', 'PM'].map(a => ({ value: a, label: a }));

  imageLoadError = false;

  constructor(
    private userService: UserService,
    private uploadService: UploadService,
    private userStateService: UserStateService
  ) {}

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.userService.getProfile().subscribe((data) => {
      if (data) {
        this.imageLoadError = false;
        this.profile = {
          fullName: data.name || '',
          email: data.email || '',
          mobile: data.phone || '',
          profileImage: data.profileImage || 'assets/images/placeholder.png'
        };

        if (data.returnNotificationTime) {
          const parsed = this.parseTimeString(data.returnNotificationTime);
          if (parsed) this.notifications.returnTime = parsed;
        }

        if (data.pickupNotificationTime) {
          const parsed = this.parseTimeString(data.pickupNotificationTime);
          if (parsed) this.notifications.pickupTime = parsed;
        }
      }
    });
  }

  parseTimeString(timeStr: string) {
    const match = timeStr.match(/^(\d{2}):(\d{2})\s(AM|PM)$/);
    if (match) {
      return { hour: match[1], minute: match[2], ampm: match[3] };
    }
    return null;
  }

  formatTimeString(timeObj: { hour: string, minute: string, ampm: string }) {
    return `${timeObj.hour}:${timeObj.minute} ${timeObj.ampm}`;
  }

  toggleEdit() {
    this.isEditing = true;
  }

  cancelEdit() {
    this.isEditing = false;
    this.loadProfile(); // Reset changes
  }

  saveChanges() {
    this.isSaving = true;
    const updateData: Partial<UserProfile> = {
      name: this.profile.fullName,
      email: this.profile.email,
      phone: this.profile.mobile,
      profileImage: this.profile.profileImage === 'assets/images/placeholder.png' ? undefined : this.profile.profileImage,
      returnNotificationTime: this.formatTimeString(this.notifications.returnTime),
      pickupNotificationTime: this.formatTimeString(this.notifications.pickupTime)
    };

    this.userService.updateProfile(updateData).subscribe({
      next: (updatedProfile) => {
        this.isEditing = false;
        this.isSaving = false;
        
        // Update global user state so header syncs
        const currentUser = this.userStateService.user();
        if (currentUser && updatedProfile) {
          const newUser = {
            ...currentUser,
            name: updatedProfile.name,
            profileImage: updatedProfile.profileImage || null
          };
          this.userStateService.setUser(newUser);
          localStorage.setItem('user', JSON.stringify(newUser));
        }
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.isUploading = true;
      this.uploadService.uploadImage(file).subscribe({
        next: (url) => {
          this.profile.profileImage = url;
          this.imageLoadError = false;
          this.isUploading = false;
        },
        error: () => {
          this.isUploading = false;
        }
      });
    }
  }

  onImgError() {
    this.imageLoadError = true;
  }
}
