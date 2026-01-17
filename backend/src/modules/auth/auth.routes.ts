import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';

const router = Router();
const authService = new AuthService();

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Google token is required' });
    }

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
  } catch (error) {
    res.status(401).json({
      message: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
});

export default router;

