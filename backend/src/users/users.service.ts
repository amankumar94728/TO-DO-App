import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  /** Find a user by email address (used during login) */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  /** Create a new user with a pre-hashed password */
  async create(email: string, passwordHash: string): Promise<UserDocument> {
    const user = new this.userModel({ email: email.toLowerCase(), passwordHash });
    return user.save();
  }
}
