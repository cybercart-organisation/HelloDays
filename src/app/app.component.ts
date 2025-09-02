import { Component } from '@angular/core';
import { StorageService } from './services/storage.service';
import { NotificationService } from './services/notification.service';
import { ThemeService } from './services/theme.service';
import { SettingsService } from './services/settings.service';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, RouterModule]
})
export class AppComponent {
  constructor(
    private storageService: StorageService,
    private notificationService: NotificationService,
    private themeService: ThemeService,
    private settingsService: SettingsService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.storageService.init();
    this.notificationService.requestPermissions();
    this.themeService.init();
    this.settingsService.init();
  }
}