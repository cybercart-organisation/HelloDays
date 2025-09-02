import { Injectable } from '@angular/core';
import { LocalNotifications, PermissionStatus, PendingResult } from '@capacitor/local-notifications';
import { Contact } from '../models/contact.model';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor(private settingsService: SettingsService) { }

  async requestPermissions(): Promise<boolean> {
    const status: PermissionStatus = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') {
      return true;
    }
    const request = await LocalNotifications.requestPermissions();
    return request.display === 'granted';
  }

  async scheduleReminders(contact: Contact): Promise<void> {
    if (!contact.reminderEnabled) {
      return;
    }

    const settings = this.settingsService.getCurrentSettings();
    const [hour, minute] = settings.defaultReminderTime.split(':').map(Number);

    const notifications = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    if (contact.birthday) {
      const birthDate = new Date(contact.birthday);
      let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate(), hour, minute);
      if (nextBirthday < now) {
        nextBirthday.setFullYear(currentYear + 1);
      }
      notifications.push({
        id: this.generateNotificationId(contact.id, 'birthday'),
        title: 'Birthday Reminder! 🎂',
        body: `It's ${contact.firstName}'s birthday today! Don't forget to send your wishes.`,
        schedule: { at: nextBirthday },
        smallIcon: 'res://mipmap/ic_launcher',
      });
    }

    contact.nameDays.forEach((nameDay, index) => {
      const nameDayDate = new Date(nameDay.date);
      let nextNameDay = new Date(currentYear, nameDayDate.getMonth(), nameDayDate.getDate(), hour, minute);
      if (nextNameDay < now) {
        nextNameDay.setFullYear(currentYear + 1);
      }
      notifications.push({
        id: this.generateNotificationId(contact.id, `nameday_${index}`),
        title: 'Name Day Reminder! 🎉',
        body: `It's ${contact.firstName}'s name day today!`,
        schedule: { at: nextNameDay },
        smallIcon: 'res://mipmap/ic_launcher',
      });
    });

    try {
      await LocalNotifications.schedule({ notifications });
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  }

  async cancelReminders(contactId: number): Promise<void> {
    const pending = await LocalNotifications.getPending();
    const notificationsToDelete = pending.notifications.filter(
      notif => notif.id.toString().startsWith(`${contactId}_`)
    );
    if (notificationsToDelete.length > 0) {
      await LocalNotifications.cancel({ notifications: notificationsToDelete });
    }
  }

  async cancelAll(): Promise<PendingResult> {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }
    return pending;
  }

  private generateNotificationId(contactId: number, eventType: string): number {
    const s = `${contactId}_${eventType}`;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const char = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
