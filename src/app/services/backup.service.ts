import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { StorageService } from './storage.service';
import { Contact } from '../models/contact.model';

@Injectable({
  providedIn: 'root'
})
export class BackupService {

  constructor(
    private dataService: DataService,
    private storageService: StorageService
  ) { }

  async exportReminders() {
    const reminders = await this.dataService.getContacts();
    const jsonString = JSON.stringify(reminders, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `hellodays_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async importReminders(file: File): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonString = event.target?.result as string;
          const reminders = JSON.parse(jsonString) as Contact[];

          // Basic validation
          if (!Array.isArray(reminders) || (reminders.length > 0 && !reminders[0].firstName)) {
            throw new Error('Invalid backup file format.');
          }

          // This is where we would ask for confirmation in the UI
          // For now, we'll just overwrite
          await this.storageService.saveContacts(reminders);
          resolve({ success: true, message: `${reminders.length} reminders imported successfully.` });

        } catch (error: any) {
          resolve({ success: false, message: error.message || 'Failed to parse backup file.' });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, message: 'Failed to read the file.' });
      };
      reader.readAsText(file);
    });
  }
}
