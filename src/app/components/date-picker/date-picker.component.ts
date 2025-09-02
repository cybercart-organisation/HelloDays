import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class DatePickerComponent {
  private selectedDate: string | null = null;

  constructor(private modalCtrl: ModalController) {}

  onDateChange(event: any) {
    this.selectedDate = event.detail.value;
  }

  dismiss(data: any) {
    this.modalCtrl.dismiss(data);
  }

  confirm() {
    this.modalCtrl.dismiss({ date: this.selectedDate }, 'confirm');
  }
}
