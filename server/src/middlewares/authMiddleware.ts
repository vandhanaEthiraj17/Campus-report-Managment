import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
    name: string;
    department?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'smart_campus_super_secret_key_2026';

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: UserRole;
      name: string;
      department?: string;
    };
    req.user = decoded;
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
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};
