import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/db';
import { User, UserRole } from './user.model';

export class UserRepo {
  private repository: Repository<User>;

  constructor() {
    this.repository = AppDataSource.getRepository(User);
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.repository.findOne({ where: { googleId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { emailId: email } });
  }

  async findById(userId: string): Promise<User | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async findOrCreateByGoogle(googleId: string, email: string, name: string): Promise<User> {
    let user = await this.findByGoogleId(googleId);
    
    if (!user) {
      // Check if user exists with this email
      user = await this.findByEmail(email);
      
      if (user) {
        // Link Google account to existing user
        user.googleId = googleId;
        user = await this.repository.save(user);
      } else {
        // Create new user
        user = await this.create({
          googleId,
          emailId: email,
          username: name,
          role: UserRole.USER,
        });
      }
    }
    
    return user;
  }
}

