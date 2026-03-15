export type ContactEntity = {
  id: string;
  name: string;
  type: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
  createdAt: string;
};

export class ContactResponse {
  id!: string;
  name!: string;
  type!: string;
  document!: string | null;
  phone!: string | null;
  email!: string | null;
  active!: boolean;
  createdAt!: string;

  static from(entity: ContactEntity): ContactResponse {
    return Object.assign(new ContactResponse(), entity);
  }
}
