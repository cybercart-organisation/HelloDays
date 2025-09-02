import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { NameDayService, FlatNameDay } from '../services/name-day.service';
import { Contact } from '../models/contact.model';

interface HomeEvent {
  title: string;
  type: 'Birthday' | 'Name Day';
  date: Date;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule] // Correct imports added
})
export class HomePage {
  today = new Date();
  todaysReminders: HomeEvent[] = [];
  upcomingReminders: HomeEvent[] = [];
  todaysNameDays: string[] = [];

  constructor(
    private dataService: DataService,
    private nameDayService: NameDayService
  ) {}

  ionViewWillEnter() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    const reminders = await this.dataService.getContacts();
    const allNameDays = await this.nameDayService.getAllNameDays();

    this.processTodaysReminders(reminders);
    this.processUpcomingReminders(reminders);
    this.processTodaysNameDays(allNameDays);
  }

  private processTodaysReminders(reminders: Contact[]) {
    const todayString = this.today.toDateString();
    const events: HomeEvent[] = [];

    reminders.forEach(r => {
      if (r.birthday && new Date(r.birthday).toDateString() === todayString) {
        events.push({ title: `${r.firstName} ${r.lastName || ''}`, type: 'Birthday', date: new Date(r.birthday) });
      }
      r.nameDays.forEach(nd => {
        if (new Date(nd.date).toDateString() === todayString) {
          events.push({ title: `${r.firstName} ${r.lastName || ''}`, type: 'Name Day', date: new Date(nd.date) });
        }
      });
    });
    this.todaysReminders = events;
  }

  private processUpcomingReminders(reminders: Contact[]) {
    const tomorrow = new Date(this.today);
    tomorrow.setDate(this.today.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(this.today);
    sevenDaysFromNow.setDate(this.today.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const events: HomeEvent[] = [];
    reminders.forEach(r => {
      if (r.birthday) {
        const birthDate = new Date(r.birthday);
        if (birthDate >= tomorrow && birthDate <= sevenDaysFromNow) {
          events.push({ title: `${r.firstName} ${r.lastName || ''}`, type: 'Birthday', date: birthDate });
        }
      }
      r.nameDays.forEach(nd => {
        const nameDayDate = new Date(nd.date);
        if (nameDayDate >= tomorrow && nameDayDate <= sevenDaysFromNow) {
          events.push({ title: `${r.firstName} ${r.lastName || ''}`, type: 'Name Day', date: nameDayDate });
        }
      });
    });
    this.upcomingReminders = events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private processTodaysNameDays(allNameDays: FlatNameDay[]) {
    const todayString = this.today.toDateString();
    this.todaysNameDays = allNameDays
      .filter(nd => new Date(nd.date).toDateString() === todayString)
      .map(nd => nd.name);
  }
}