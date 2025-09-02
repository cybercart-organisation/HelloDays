import { Injectable } from '@angular/core';
import { Contact } from '../models/contact.model';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(private storageService: StorageService) {}

  async getContacts(): Promise<Contact[]> {
    return this.storageService.getContacts();
  }

  async addContact(contact: Omit<Contact, 'id'>): Promise<Contact> {
    return this.storageService.addContact(contact);
  }

  async updateContact(contact: Contact): Promise<Contact> {
    return this.storageService.updateContact(contact);
  }

  async deleteContact(id: number): Promise<void> {
    return this.storageService.deleteContact(id);
  }
}
