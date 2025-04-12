import { Code, ICode, CppVersion } from '../domain/Code';
import { ApiError } from '../middleware/errorHandler';

let codes: ICode[] = [];

export class CodeService {
  static async saveCode(userId: string, title: string, code: string, language: string = 'cpp', cppVersion: CppVersion = 'cpp17'): Promise<ICode> {
    const newCode = new Code(userId, title, code, language, cppVersion);
    codes.push(newCode);
    return newCode;
  }

  static async updateCode(id: string, userId: string, title: string, code: string, cppVersion?: CppVersion): Promise<ICode> {
    const codeIndex = codes.findIndex(c => c.id === id && c.userId === userId);
    
    if (codeIndex === -1) {
      throw new ApiError('Code not found or not authorized', 404);
    }
    
    const updatedCode = {
      ...codes[codeIndex],
      title,
      code,
      updatedAt: new Date(),
      ...(cppVersion && { cppVersion })
    };
    
    codes[codeIndex] = updatedCode;
    
    return updatedCode;
  }

  static async getCodeById(id: string, userId: string): Promise<ICode> {
    const code = codes.find(c => c.id === id && c.userId === userId);
    
    if (!code) {
      throw new ApiError('Code not found or not authorized', 404);
    }
    
    return code;
  }

  static async getAllCodesByUser(userId: string): Promise<ICode[]> {
    return codes.filter(c => c.userId === userId);
  }

  static async deleteCode(id: string, userId: string): Promise<void> {
    const codeIndex = codes.findIndex(c => c.id === id && c.userId === userId);
    
    if (codeIndex === -1) {
      throw new ApiError('Code not found or not authorized', 404);
    }
    
    codes.splice(codeIndex, 1);
  }

  // Sadece test amacıyla
  static resetCodes(): void {
    codes = [];
  }
} 