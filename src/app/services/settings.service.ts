import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';

const SETTINGS_KEY = 'app_settings';

export interface AppSettings {
  defaultReminderTime: string; // ISO 8601 time string
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private _settings = new BehaviorSubject<AppSettings>({
    defaultReminderTime: '09:00:00'
  });
  settings$ = this._settings.asObservable();

  constructor(private storage: Storage) {}

  async init() {
    await this.storage.create();
    const storedSettings = await this.storage.get(SETTINGS_KEY);
    if (storedSettings) {
      this._settings.next(storedSettings);
    }
  }

  async saveSettings(settings: AppSettings) {
    this._settings.next(settings);
    await this.storage.set(SETTINGS_KEY, settings);
  }

  getCurrentSettings(): AppSettings {
    return this._settings.getValue();
  }
}
