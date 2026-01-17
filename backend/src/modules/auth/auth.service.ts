import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config/env';
import { UserRepo } from '../user/user.repo';
import { User } from '../user/user.model';

export interface GoogleTokenPayload {
  sub: string; // Google user ID
  email: string;
  name: string;
  picture?: string;
}

export class AuthService {
  private userRepo: UserRepo;
  private googleClient: OAuth2Client;

  constructor() {
    this.userRepo = new UserRepo();
    this.googleClient = new OAuth2Client(config.google.clientId);
  }

  async verifyGoogleToken(token: string): Promise<GoogleTokenPayload> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: config.google.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token payload');
      }

      return {
        sub: payload.sub,
        email: payload.email || '',
        name: payload.name || '',
        picture: payload.picture,
      };
    } catch (error) {
      throw new Error('Invalid Google token');
    }
  }

  async authenticateWithGoogle(token: string): Promise<{ user: User; jwtToken: string }> {
    const googlePayload = await this.verifyGoogleToken(token);
    const user = await this.userRepo.findOrCreateByGoogle(
      googlePayload.sub,
      googlePayload.email,
      googlePayload.name
    );

    const jwtToken = this.generateJWT(user);

    return { user, jwtToken };
  }

  generateJWT(user: User): string {
    return jwt.sign(
      {
        userId: user.userId,
        email: user.emailId,
        role: user.role,
      },
      config.jwt.secret,
      { expiresIn: '7d' }
    );
  }

  verifyJWT(token: string): { userId: string; email?: string; role: string } {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
        email?: string;
        role: string;
      };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

