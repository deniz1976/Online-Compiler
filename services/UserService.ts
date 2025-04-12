import { User, IUser } from '../domain/User';
import jwt from 'jsonwebtoken';
import { ApiError } from '../middleware/errorHandler';

let users: IUser[] = [];

export class UserService {
  static async register(username: string, email: string, password: string): Promise<IUser> {
    const existingUser = users.find(u => u.email === email || u.username === username);
    if (existingUser) {
      throw new ApiError('Email or username already in use', 400);
    }
    
    const user = new User(username, email, password);
    await user.hashPassword();
    
    users.push(user);
    
    return user;
  }
  
  static async login(email: string, password: string): Promise<{ user: IUser, token: string }> {
    const user = users.find(u => u.email === email);
    if (!user) {
      throw new ApiError('Invalid credentials', 401);
    }
    
    const userInstance = new User(user.username, user.email, user.password);
    Object.assign(userInstance, user);
    
    const isPasswordCorrect = await userInstance.comparePassword(password);
    if (!isPasswordCorrect) {
      throw new ApiError('Invalid credentials', 401);
    }

    const jwtSecret = process.env.JWT_SECRET || 'default_secret_please_change';
    
    const token = jwt.sign(
      { id: user.id },
      Buffer.from(jwtSecret),
      { expiresIn: '1h' }
    );
    
    return {
      user,
      token
    };
  }
  
  static async getUserById(id: string): Promise<IUser | null> {
    const user = users.find(u => u.id === id);
    return user || null;
  }

  static async getAllUsers(): Promise<IUser[]> {
    return users;
  }
  
  static resetUsers(): void {
    users = [];
  }
} 