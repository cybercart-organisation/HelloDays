import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Contact } from '../models/contact.model';

const REMINDERS_KEY = 'reminders';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private _storage: Storage | null = null;

  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
  }

  async getContacts(): Promise<Contact[]> {
    return (await this._storage?.get(REMINDERS_KEY)) || [];
  }

  public async saveContacts(contacts: Contact[]) {
    await this._storage?.set(REMINDERS_KEY, contacts);
  }

  async addContact(contact: Omit<Contact, 'id'>): Promise<Contact> {
    const contacts = await this.getContacts();
    const newId = Math.max(...contacts.map(c => c.id), 0) + 1;
    const newContact: Contact = { id: newId, ...contact };
    contacts.push(newContact);
    await this.saveContacts(contacts);
    return newContact;
  }

  async updateContact(contactToUpdate: Contact): Promise<Contact> {
    let contacts = await this.getContacts();
    contacts = contacts.map(c => c.id === contactToUpdate.id ? contactToUpdate : c);
    await this.saveContacts(contacts);
    return contactToUpdate;
  }

  async deleteContact(id: number): Promise<void> {
    let contacts = await this.getContacts();
    contacts = contacts.filter(c => c.id !== id);
    await this.saveContacts(contacts);
  }
}