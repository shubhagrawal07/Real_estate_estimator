import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import type { AuthGoogleBody } from './auth.schemas';

const authService = new AuthService();

export async function authenticateWithGoogle(req: Request, res: Response): Promise<void> {
  const { token } = req.body as AuthGoogleBody;
  const { user, jwtToken } = await authService.authenticateWithGoogle(token);
  res.json({
    user: {
      userId: user.userId,
      email: user.emailId,
      username: user.username,
      role: user.role,
    },
    token: jwtToken,
  });
}
