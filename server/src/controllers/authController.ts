import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User';
import { generateToken, AuthRequest } from '../middlewares/authMiddleware';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, department, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required.' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const validRole: UserRole = ['STUDENT', 'FACULTY', 'STAFF', 'ADMIN'].includes(role)
      ? role
      : 'STUDENT';

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: validRole,
      department: department || '',
      phone: phone || '',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
    });

    const token = generateToken(newUser);

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        phone: newUser.phone,
        avatarUrl: newUser.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    res.status(500).json({ message: error.message || 'Server error during registration.' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials. User not found.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Account has been deactivated. Please contact campus admin.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
      return;
    }

    const token = generateToken(user);

    res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    res.status(500).json({ message: error.message || 'Server error during login.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ message: 'User profile not found.' });
      return;
    }

    res.status(200).json({ user });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching profile.' });
  }
};
