import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../auth/authService.ts';
import { db } from '../db/database.ts';
import { User, UserRole } from '../db/schema.ts';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.rental_scout_token;

  if (!token) {
    return next();
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next();
  }

  const user = db.findUserById(payload.userId);
  if (user && user.isActive) {
    req.user = user;
  }

  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please sign in to access this resource.',
    });
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Forbidden: requires one of the following roles: [${allowedRoles.join(', ')}].`,
      });
    }

    next();
  };
}
