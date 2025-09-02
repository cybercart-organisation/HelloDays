export interface Contact {
  id: number;
  firstName: string;
  lastName?: string;
  birthday?: string;
  phoneNumber?: string; // New optional property
  nameDays: { date: string; notes?: string }[];
  reminderEnabled: boolean;
}