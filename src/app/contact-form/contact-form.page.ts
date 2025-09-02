import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Contact } from '../models/contact.model';
import { NameDayService } from '../services/name-day.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { DatePickerComponent } from '../components/date-picker/date-picker.component';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.page.html',
  styleUrls: ['./contact-form.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ContactFormPage implements OnInit {
  @Input() contactToEdit: Contact | null = null;
  @Input() initialData: { firstName?: string; nameDayDate?: string; birthdayDate?: string; } | null = null;

  contact: Omit<Contact, 'id'> & { id?: number } = {
    firstName: '',
    lastName: '',
    birthday: undefined,
    phoneNumber: '', // Add phoneNumber
    nameDays: [],
    reminderEnabled: true
  };

  isEdit = false;
  nameSuggestions: string[] = [];
  private nameChanged = new Subject<string>();
  private autoAddedNameDayDates: string[] = [];

  constructor(
    private modalCtrl: ModalController,
    private nameDayService: NameDayService
  ) {
    this.nameChanged.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(name => this.nameDayService.getAutocompleteSuggestions(name))
    ).subscribe(suggestions => {
      this.nameSuggestions = suggestions;
    });
  }

  ngOnInit() {
    if (this.contactToEdit) {
      this.isEdit = true;
      this.contact = { ...this.contactToEdit };
    } else if (this.initialData) {
      if (this.initialData.firstName) {
        this.contact.firstName = this.initialData.firstName;
      }
      if (this.initialData.nameDayDate) {
        this.contact.nameDays.push({ date: this.initialData.nameDayDate });
      }
      if (this.initialData.birthdayDate) {
        this.contact.birthday = this.initialData.birthdayDate;
      }
    }
  }

  onNameChange(event: any) {
    if (this.autoAddedNameDayDates.length > 0) {
      this.contact.nameDays = this.contact.nameDays.filter(
        nd => !this.autoAddedNameDayDates.includes(nd.date)
      );
      this.autoAddedNameDayDates = [];
    }
    const name = event.target.value;
    if (name) {
      this.nameChanged.next(name);
    } else {
      this.nameSuggestions = [];
    }
  }

  async selectNameSuggestion(name: string) {
    this.contact.firstName = name;
    this.nameSuggestions = [];
    const dates = await this.nameDayService.findDatesForName(name);
    dates.forEach(date => {
      if (!this.contact.nameDays.some(nd => nd.date === date)) {
        this.contact.nameDays.push({ date });
        this.autoAddedNameDayDates.push(date);
      }
    });
  }

  async addDate(type: 'birthday' | 'nameDay') {
    const modal = await this.modalCtrl.create({
      component: DatePickerComponent,
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data && data.date) {
      if (type === 'birthday') {
        this.contact.birthday = data.date;
      } else {
        this.contact.nameDays.push({ date: data.date });
      }
    }
  }

  removeBirthday(event: MouseEvent) {
    event.stopPropagation();
    this.contact.birthday = undefined;
  }

  removeNameDay(index: number) {
    this.contact.nameDays.splice(index, 1);
  }

  dismissModal(data: any = null) {
    this.modalCtrl.dismiss(data);
  }

  saveContact() {
    this.modalCtrl.dismiss({ contact: this.contact, role: 'save' });
  }
}
