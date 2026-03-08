import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service';
import { AppError } from '../utils/AppError';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    next(new AppError('Access token required', 401));
    return;
  }

  try {
    const authService = new AuthService();
    const decoded = authService.verifyJWT(token);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const authService = new AuthService();
      const decoded = authService.verifyJWT(token);
      
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
      req.userRole = decoded.role;
    } catch (error) {
      // If token is invalid, just continue without auth
    }
  }
  
  next();
}

