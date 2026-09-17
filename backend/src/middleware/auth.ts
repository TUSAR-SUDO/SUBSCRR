import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import db from '../db/index.js';
import { AppError } from './errorHandler.js';
import { User } from '../types/index.js';

export interface AuthRequest extends Request {
  user?: User;
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    // Algorithm pinned: an attacker-supplied token declaring alg=none or RS256
    // can never be accepted, regardless of library defaults.
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as { userId: string };
    const user = await db.get<User>('SELECT id, email, name, role, default_currency, monthly_budget, monthly_budget_cents, email_preferences, created_at, updated_at FROM users WHERE id = ?', [decoded.userId]);

    if (!user) {
      throw new AppError('User session expired or user no longer exists.', 401);
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new AppError('Invalid or expired authentication token', 401));
    } else {
      next(error);
    }
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Admin access required for this action.', 403));
  }
  next();
}
