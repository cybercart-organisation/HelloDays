import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface NameDayData {
  [month: string]: {
    [day: string]: {
      [tradition: string]: string[];
    };
  };
}

export interface FlatNameDay {
  name: string;
  normalizedName: string;
  date: string;
  tradition: string;
}

@Injectable({
  providedIn: 'root'
})
export class NameDayService {
  private nameDayData: NameDayData | null = null;
  private flatNameDayList: FlatNameDay[] = [];

  constructor(private http: HttpClient) {
    this.loadNameDays();
  }

  private normalizeString(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private async loadNameDays() {
    try {
      this.nameDayData = await firstValueFrom(
        this.http.get<NameDayData>('assets/namedays/namedays.json')
      );
      this.prepareFlatList();
    } catch (error) {
      console.error('Error loading name day data:', error);
    }
  }

  private prepareFlatList() {
    if (!this.nameDayData) return;

    this.flatNameDayList = [];
    const currentYear = new Date().getFullYear();
    const monthMap: { [key: string]: number } = {
      January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
      July: 6, August: 7, September: 8, October: 9, November: 10, December: 11
    };

    for (const monthName in this.nameDayData) {
      const monthIndex = monthMap[monthName];
      if (monthIndex === undefined) continue;

      const days = this.nameDayData[monthName];
      for (const day in days) {
        const traditions = days[day];
        for (const tradition in traditions) {
          const names = traditions[tradition];
          names.forEach(name => {
            const date = new Date(currentYear, monthIndex, parseInt(day, 10));
            this.flatNameDayList.push({
              name: name,
              normalizedName: this.normalizeString(name),
              date: date.toISOString(),
              tradition: tradition
            });
          });
        }
      }
    }
  }

  async findDatesForName(name: string, tradition: string = 'Hungary'): Promise<string[]> {
    if (this.flatNameDayList.length === 0) await this.loadNameDays();

    const normalizedInput = this.normalizeString(name);
    return this.flatNameDayList
      .filter(item => item.normalizedName === normalizedInput && item.tradition === tradition)
      .map(item => item.date);
  }

  async getAutocompleteSuggestions(partialName: string, tradition: string = 'Hungary'): Promise<string[]> {
    if (this.flatNameDayList.length === 0) await this.loadNameDays();

    const normalizedInput = this.normalizeString(partialName);
    if (!normalizedInput) return [];

    const suggestions = this.flatNameDayList
      .filter(item => item.normalizedName.startsWith(normalizedInput) && item.tradition === tradition)
      .map(item => item.name);

    return [...new Set(suggestions)];
  }

  async getAllNameDays(): Promise<FlatNameDay[]> {
    if (this.flatNameDayList.length === 0) {
      await this.loadNameDays();
    }
    return this.flatNameDayList;
  }
}
