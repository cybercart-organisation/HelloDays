import { Component } from '@angular/core';
import { DataService } from '../services/data.service';
import { Contact } from '../models/contact.model';
import { NameDayService, FlatNameDay } from '../services/name-day.service';
import { IonicModule, ActionSheetController, ModalController, ActionSheetButton, ToastController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ContactFormPage } from '../contact-form/contact-form.page';
import { ThemeService } from '../services/theme.service';
import { NotificationService } from '../services/notification.service';

type EventType = 'birthday' | 'nameDay' | 'both' | null;
interface CalendarEvent { title: string; type: 'Birthday' | 'Name Day'; date: Date; isReminder: boolean; }
interface CalendarDay { date: number; isToday: boolean; isCurrentMonth: boolean; eventType: EventType; fullDate: Date; events: CalendarEvent[]; }

@Component({
  selector: 'app-calendar',
  templateUrl: 'calendar.page.html',
  styleUrls: ['calendar.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class CalendarPage {
  currentDate = new Date();
  daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: (CalendarDay | null)[][] = [];
  eventsByDay = new Map<string, CalendarEvent[]>();
  selectedDayEvents: CalendarEvent[] = [];
  selectedDate: Date | null = null;

  constructor(
    private dataService: DataService,
    private nameDayService: NameDayService,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private themeService: ThemeService,
    private notificationService: NotificationService,
    private toastCtrl: ToastController
  ) {}

  ionViewWillEnter() { this.loadDataAndGenerateCalendar(); }

  async loadDataAndGenerateCalendar() {
    this.eventsByDay.clear();
    const reminders = await this.dataService.getContacts();
    const reminderEvents = this.mapRemindersToEvents(reminders);

    const allNameDays = await this.nameDayService.getAllNameDays();
    const generalNameDayEvents = this.mapAllNameDaysToEvents(allNameDays, reminders);

    const allEvents = [...reminderEvents, ...generalNameDayEvents];
    
    allEvents.forEach(event => {
      const eventDate = new Date(event.date);
      const key = `${eventDate.getMonth()}-${eventDate.getDate()}`;
      const existingEvents = this.eventsByDay.get(key) || [];
      this.eventsByDay.set(key, [...existingEvents, event]);
    });

    this.generateCalendar();
  }

  generateCalendar() {
    // ... (omitting for brevity, this logic is unchanged)
    const date = new Date(this.currentDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();
    const weeks: (CalendarDay | null)[][] = [];
    let currentWeek: (CalendarDay | null)[] = [];
    let dayCounter = 1;
    for (let i = 0; i < startDayOfWeek; i++) { currentWeek.push(null); }
    while (dayCounter <= daysInMonth) {
      if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
      const fullDate = new Date(year, month, dayCounter);
      const isToday = fullDate.toDateString() === new Date().toDateString();
      const eventKey = `${fullDate.getMonth()}-${fullDate.getDate()}`;
      const eventsOnDay = this.eventsByDay.get(eventKey) || [];
      const reminderEventsOnDay = eventsOnDay.filter(e => e.isReminder);
      const hasBirthday = reminderEventsOnDay.some(e => e.type === 'Birthday');
      const hasNameDay = reminderEventsOnDay.some(e => e.type === 'Name Day');
      let eventType: EventType = null;
      if (hasBirthday && hasNameDay) { eventType = 'both'; }
      else if (hasBirthday) { eventType = 'birthday'; }
      else if (hasNameDay) { eventType = 'nameDay'; }
      currentWeek.push({ date: dayCounter, isToday, isCurrentMonth: true, eventType, fullDate, events: eventsOnDay });
      dayCounter++;
    }
    while (currentWeek.length < 7) { currentWeek.push(null); }
    weeks.push(currentWeek);
    this.calendarDays = weeks;
  }

  private normalizeString(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  mapRemindersToEvents(contacts: Contact[]): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    contacts.forEach(contact => {
      if (contact.birthday) { events.push({ title: `🎂 ${contact.firstName}`, type: 'Birthday', date: new Date(contact.birthday), isReminder: true }); }
      contact.nameDays.forEach(nd => { events.push({ title: `🎉 ${contact.firstName}`, type: 'Name Day', date: new Date(nd.date), isReminder: true }); });
    });
    return events;
  }

  mapAllNameDaysToEvents(allNameDays: FlatNameDay[], reminders: Contact[]): CalendarEvent[] {
    // Create a Set of normalized keys for efficient lookup: "normalizedFirstName-month-day"
    const reminderNameDayKeys = new Set(reminders.flatMap(r => r.nameDays.map(nd => {
      const date = new Date(nd.date);
      return `${this.normalizeString(r.firstName)}-${date.getMonth()}-${date.getDate()}`;
    })));
    
    return allNameDays
      .filter(nd => {
        const date = new Date(nd.date);
        const key = `${this.normalizeString(nd.name)}-${date.getMonth()}-${date.getDate()}`;
        return !reminderNameDayKeys.has(key); // Filter out if a reminder already exists
      })
      .map(nd => ({ title: nd.name, type: 'Name Day', date: new Date(nd.date), isReminder: false }));
  }

  previousMonth() { this.currentDate.setMonth(this.currentDate.getMonth() - 1); this.generateCalendar(); this.clearSelection(); }
  nextMonth() { this.currentDate.setMonth(this.currentDate.getMonth() + 1); this.generateCalendar(); this.clearSelection(); }

  async selectDate(day: CalendarDay | null) {
    if (!day) return;
    this.selectedDate = day.fullDate;
    this.selectedDayEvents = day.events.map(e => {
      if (e.isReminder) { return { ...e, title: `${e.title.replace(/🎂 |🎉 /g, '')}'s ${e.type}` }; }
      return e;
    });
    const generalNameDays = day.events.filter(e => !e.isReminder);
    const actionSheetButtons: ActionSheetButton[] = generalNameDays.map(event => ({
      text: `Create Reminder for ${event.title}`,
      handler: () => this.openReminderForm({ firstName: event.title, nameDayDate: day.fullDate.toISOString() })
    }));
    actionSheetButtons.push({
      text: 'Add New Reminder',
      handler: () => this.openReminderForm({ birthdayDate: day.fullDate.toISOString() })
    });
    actionSheetButtons.push({ text: 'Cancel', role: 'cancel' });
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Actions for ${day.fullDate.toLocaleDateString()}`,
      buttons: actionSheetButtons
    });
    await actionSheet.present();
  }

  async openReminderForm(initialData: any) {
    const modal = await this.modalCtrl.create({
      component: ContactFormPage,
      componentProps: { initialData }
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data && data.role === 'save') {
      const newContact = await this.dataService.addContact(data.contact);
      await this.notificationService.scheduleReminders(newContact);
      this.presentToast('Reminder added successfully!');
      this.loadDataAndGenerateCalendar();
    }
  }

  clearSelection() { this.selectedDate = null; this.selectedDayEvents = []; }

  async presentToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    toast.present();
  }
}
