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

const JWT_SECRET = process.env.JWT_SECRET || 'smart_campus_super_secret_key_2026';

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};
