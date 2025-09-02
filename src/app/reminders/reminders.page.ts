import { Component } from '@angular/core';
import { ModalController, AlertController, ToastController, IonicModule } from '@ionic/angular';
import { DataService } from '../services/data.service';
import { NotificationService } from '../services/notification.service';
import { Contact } from '../models/contact.model';
import { ContactFormPage } from '../contact-form/contact-form.page';
import { CommonModule } from '@angular/common';

interface Reminder extends Contact {
  nextEventDate?: Date;
}

interface ReminderGroup {
  name: string;
  reminders: Reminder[];
}

@Component({
  selector: 'app-reminders',
  templateUrl: 'reminders.page.html',
  styleUrls: ['reminders.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class RemindersPage {
  groupedReminders: ReminderGroup[] = [];

  constructor(
    private dataService: DataService,
    private notificationService: NotificationService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ionViewWillEnter() {
    await this.loadAndProcessReminders();
  }

  async loadAndProcessReminders() {
    const contacts = await this.dataService.getContacts();
    
    const remindersWithDate: Reminder[] = contacts.map(contact => ({
      ...contact,
      nextEventDate: this.getNextEventDate(contact) || undefined
    }));

    remindersWithDate.sort((a, b) => {
      if (a.nextEventDate && b.nextEventDate) {
        return a.nextEventDate.getTime() - b.nextEventDate.getTime();
      }
      if (a.nextEventDate) return -1;
      if (b.nextEventDate) return 1;
      return 0;
    });

    this.groupedReminders = this.groupReminders(remindersWithDate);
  }

  private getNextEventDate(contact: Contact): Date | null {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentYear = now.getFullYear();
    let nextEventDate: Date | null = null;

    const allEventDates: Date[] = [];
    if (contact.birthday) { allEventDates.push(new Date(contact.birthday)); }
    contact.nameDays.forEach(nd => { allEventDates.push(new Date(nd.date)); });

    for (const date of allEventDates) {
      let nextOccurrence = new Date(date);
      nextOccurrence.setFullYear(currentYear);
      if (nextOccurrence < now) {
        nextOccurrence.setFullYear(currentYear + 1);
      }
      if (!nextEventDate || nextOccurrence < nextEventDate) {
        nextEventDate = nextOccurrence;
      }
    }
    return nextEventDate;
  }

  private groupReminders(reminders: Reminder[]): ReminderGroup[] {
    const groups = new Map<string, Reminder[]>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    reminders.forEach(reminder => {
      const groupName = this.getGroupName(reminder.nextEventDate, today);
      const group = groups.get(groupName) || [];
      group.push(reminder);
      groups.set(groupName, group);
    });

    const groupOrder = ["Today", "This Week", "Next Week", "This Month", "Next Month", "Later", "No Upcoming Events"];
    const result: ReminderGroup[] = [];
    for (const name of groupOrder) {
      if (groups.has(name)) {
        result.push({ name, reminders: groups.get(name)! });
      }
    }
    return result;
  }

  private getGroupName(eventDate: Date | undefined, today: Date): string {
    if (!eventDate) {
      return "No Upcoming Events";
    }

    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((eventDate.getTime() - today.getTime()) / oneDay);

    if (diffDays === 0) return "Today";
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));

    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfWeek.getDate() + 7);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    if (eventDate <= endOfWeek) return "This Week";
    if (eventDate <= endOfNextWeek) return "Next Week";
    if (eventDate <= endOfMonth) return "This Month";
    if (eventDate <= endOfNextMonth) return "Next Month";
    
    return "Later";
  }

  async openContactForm(reminder: Contact | null = null) {
    // ... (omitting for brevity, this logic is unchanged)
    const modal = await this.modalCtrl.create({
      component: ContactFormPage,
      componentProps: { contactToEdit: reminder }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data && data.role === 'save') {
      const contact = data.contact;
      if (contact.id) {
        const updatedContact = await this.dataService.updateContact(contact);
        await this.notificationService.cancelReminders(updatedContact.id);
        await this.notificationService.scheduleReminders(updatedContact);
        this.presentToast('Reminder updated successfully!');
      } else {
        const newContact = await this.dataService.addContact(contact);
        await this.notificationService.scheduleReminders(newContact);
        this.presentToast('Reminder added successfully!');
      }
      await this.loadAndProcessReminders();
    }
  }

  async deleteReminder(id: number) {
    // ... (omitting for brevity, this logic is unchanged)
    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this reminder?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          handler: async () => {
            await this.notificationService.cancelReminders(id);
            await this.dataService.deleteContact(id);
            await this.loadAndProcessReminders();
            this.presentToast('Reminder deleted.');
          }
        }
      ]
    });
    await alert.present();
  }

  async presentToast(message: string) {
    // ... (omitting for brevity, this logic is unchanged)
    const toast = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    toast.present();
  }
}