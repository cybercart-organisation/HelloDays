import { Component, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../services/theme.service';
import { BackupService } from '../services/backup.service';
import { NotificationService } from '../services/notification.service';
import { DataService } from '../services/data.service';
import { SettingsService, AppSettings } from '../services/settings.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class SettingsPage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  // This property will be a full ISO string for the template to use
  displayTime: string = new Date().toISOString();
  private settingsSub!: Subscription;

  constructor(
    public themeService: ThemeService,
    private backupService: BackupService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private notificationService: NotificationService,
    private dataService: DataService,
    private settingsService: SettingsService
  ) {}

  ngOnInit() {
    this.settingsSub = this.settingsService.settings$.subscribe(settings => {
      // When settings load, create a valid Date object for the pipe
      const [hour, minute] = settings.defaultReminderTime.split(':');
      const date = new Date();
      date.setHours(Number(hour), Number(minute), 0);
      this.displayTime = date.toISOString();
    });
  }

  onThemeChange(event: any) {
    this.themeService.toggleTheme();
  }

  onTimeChange(event: any) {
    const newTimeValue = event.detail.value;
    // Extract just the HH:mm part to save in settings
    const time = newTimeValue.split('T')[1].slice(0, 8);
    
    const currentSettings = this.settingsService.getCurrentSettings();
    const newSettings: AppSettings = { ...currentSettings, defaultReminderTime: time };
    this.settingsService.saveSettings(newSettings);
    this.presentToast('Default reminder time saved.');
  }

  async exportData() {
    await this.backupService.exportReminders();
    this.presentToast('Reminders exported successfully.');
  }

  triggerImport() {
    this.fileInput.nativeElement.click();
  }

  async importData(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const alert = await this.alertCtrl.create({
      header: 'Confirm Import',
      message: 'This will overwrite all current reminders. Are you sure?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Import',
          handler: async () => {
            const result = await this.backupService.importReminders(file);
            if (result.success) {
              this.presentToast(result.message);
              await this.rescheduleAllNotifications();
            } else {
              this.presentToast(`Error: ${result.message}`, 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
    this.fileInput.nativeElement.value = '';
  }

  async rescheduleAllNotifications() {
    await this.notificationService.cancelAll();
    const reminders = await this.dataService.getContacts();
    for (const reminder of reminders) {
      await this.notificationService.scheduleReminders(reminder);
    }
    console.log('All notifications have been rescheduled.');
  }

  async presentToast(message: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({ message, duration: 3000, color, position: 'bottom' });
    toast.present();
  }

  ngOnDestroy() {
    if (this.settingsSub) {
      this.settingsSub.unsubscribe();
    }
  }
}