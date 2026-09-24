import { isObjectIdOrHexString, mongo, type Types } from 'mongoose';
import type { NewUser, User } from '../../domain/user';
import { ConflictError } from '../../errors/app-error';
import type { UserRepository } from '../../repositories/user.repository';
import { UserModel, type UserDocument } from '../database/models/user.model';

type StoredUser = UserDocument & { _id: Types.ObjectId };

const DUPLICATE_KEY_ERROR = 11000;

export class MongoUserRepository implements UserRepository {
  async create(user: NewUser): Promise<User> {
    try {
      const created = await UserModel.create(user);
      return toDomain(created.toObject());
    } catch (error) {
      if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY_ERROR) {
        throw new ConflictError('Username or email is already registered');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    if (!isObjectIdOrHexString(id)) {
      return null;
    }

    const user = await UserModel.findById(id).lean<StoredUser>().exec();
    return user ? toDomain(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ email: email.toLowerCase() }).lean<StoredUser>().exec();
    return user ? toDomain(user) : null;
  }
}

function toDomain(user: StoredUser): User {
  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
