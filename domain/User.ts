import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

export interface IUser {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User implements IUser {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(username: string, email: string, password: string) {
    this.id = uuidv4();
    this.username = username;
    this.email = email;
    this.password = password;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  async hashPassword(): Promise<void> {
    this.password = await argon2.hash(this.password);
  }

  async comparePassword(candidatePassword: string): Promise<boolean> {
    return await argon2.verify(this.password, candidatePassword);
  }
}