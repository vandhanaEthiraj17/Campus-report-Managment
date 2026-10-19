import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    name: string;
    department?: string;
  };
}

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    if (!secret || secret === 'smart_campus_super_secret_key_2026' || secret.length < 32) {
      throw new Error(
        '[FATAL CONFIGURATION ERROR] In production mode, a strong, random JWT_SECRET of at least 32 characters must be supplied via environment variables.'
      );
    }
    return secret;
  }

  return secret || 'smart_campus_super_secret_key_2026';
};

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as {
      userId: string;
      email: string;
      role: UserRole;
      name: string;
      department?: string;
    };

    // Verify user in database to ensure role, active state, and verification are valid and up to date
    const dbUser = await User.findById(decoded.userId);
    if (!dbUser) {
      res.status(401).json({ message: 'Authentication failed. User does not exist.' });
      return;
    }

    if (!dbUser.isActive) {
      res.status(403).json({ message: 'Your account is currently inactive. Please contact the administrator.' });
      return;
    }

    if (!dbUser.isEmailVerified) {
      res.status(403).json({ message: 'Please verify your college email before accessing this resource.' });
      return;
    }

    req.user = {
      userId: dbUser._id.toString(),
      email: dbUser.email,
      role: dbUser.role,
      name: dbUser.name,
      department: dbUser.department,
    };
    next();
  } catch (err) {
    res.status(403).json({ message: 'Invalid or expired access token.' });
  }
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
      return;
    }
    next();
  };
};

export const generateToken = (user: {
  _id: string | unknown;
  email: string;
  role: UserRole;
  name: string;
  department?: string;
}): string => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
};
