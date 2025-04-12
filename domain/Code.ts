import { v4 as uuidv4 } from 'uuid';

export type CppVersion = 'cpp98' | 'cpp11' | 'cpp14' | 'cpp17' | 'cpp20';

export interface ICode {
  id: string;
  userId: string;
  title: string;
  code: string;
  language: string;
  cppVersion?: CppVersion;
  createdAt: Date;
  updatedAt: Date;
}

export class Code implements ICode {
  id: string;
  userId: string;
  title: string;
  code: string;
  language: string;
  cppVersion: CppVersion;
  createdAt: Date;
  updatedAt: Date;

  constructor(userId: string, title: string, code: string, language: string = 'cpp', cppVersion: CppVersion = 'cpp17') {
    this.id = uuidv4();
    this.userId = userId;
    this.title = title;
    this.code = code;
    this.language = language;
    this.cppVersion = cppVersion;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
} 