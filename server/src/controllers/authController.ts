import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, UserRole } from '../models/User';
import { Otp } from '../models/Otp';
import { generateToken, AuthRequest } from '../middlewares/authMiddleware';

const hashOtp = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

const getExpectedDomain = (): string => {
  const domain = process.env.COLLEGE_EMAIL_DOMAIN || '@adhiyamaan.ac.in';
  return domain.startsWith('@') ? domain : `@${domain}`;
};

export const getAuthConfig = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    enableDemoLogin: process.env.ENABLE_DEMO_LOGIN !== 'false',
    collegeDomain: getExpectedDomain(),
  });
};

export const registerSendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, department, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate college email domain
    const expectedDomain = getExpectedDomain();
    if (!normalizedEmail.endsWith(expectedDomain.toLowerCase())) {
      res.status(400).json({ message: 'Please use your official college email address.' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists.' });
      return;
    }

    // Check OTP resend cooldown
    const existingOtp = await Otp.findOne({ email: normalizedEmail });
    if (existingOtp && existingOtp.cooldownExpiry > new Date()) {
      const secondsLeft = Math.ceil((existingOtp.cooldownExpiry.getTime() - Date.now()) / 1000);
      res.status(400).json({ message: `Please wait ${secondsLeft} seconds before requesting a new OTP.` });
      return;
    }

    // Generate time-limited 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOtp(otp);

    // Hash password before storing temporarily
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const cooldownSeconds = Number(process.env.OTP_RESEND_COOLDOWN) || 60;
    const cooldownExpiry = new Date(Date.now() + cooldownSeconds * 1000);

    await Otp.findOneAndUpdate(
      { email: normalizedEmail },
      {
        otpHash,
        expiresAt,
        cooldownExpiry,
        attempts: 0,
        pendingUserData: {
          name,
          passwordHash,
          role: 'STUDENT', // Force STUDENT role during public self-registration
          department: department || '',
          phone: phone || '',
        },
      },
      { upsert: true, new: true }
    );

    // Securely print OTP to server console (instead of sending email in dev environment)
    console.log(`\n--- [EMAIL SERVICE] OTP SENT ---`);
    console.log(`To:      ${normalizedEmail}`);
    console.log(`OTP:     ${otp}`);
    console.log(`Expires: ${expiryMinutes} minutes`);
    console.log(`---------------------------------\n`);

    res.status(200).json({ message: 'OTP sent to your official college email. Please verify.' });
  } catch (error: any) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: error.message || 'Server error during OTP transmission.' });
  }
};

export const registerVerifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ message: 'Email and OTP code are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpDoc = await Otp.findOne({ email: normalizedEmail });

    if (!otpDoc) {
      res.status(400).json({ message: 'No pending verification found for this email.' });
      return;
    }

    // Check expiration
    if (new Date() > otpDoc.expiresAt) {
      res.status(400).json({ message: 'OTP has expired. Please request a new OTP.' });
      return;
    }

    // Check attempts limit
    const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS) || 3;
    if (otpDoc.attempts >= maxAttempts) {
      res.status(400).json({ message: 'Too many failed attempts. Please request a new OTP.' });
      return;
    }

    // Verify OTP hash
    if (hashOtp(otp) !== otpDoc.otpHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      res.status(400).json({ message: 'Invalid OTP. Please try again.' });
      return;
    }

    let user;

    if (otpDoc.pendingUserData) {
      // 1. Creating Student account (Self-registration flow)
      const { name, passwordHash, role, department, phone } = otpDoc.pendingUserData;

      user = await User.create({
        name,
        email: normalizedEmail,
        passwordHash,
        role: 'STUDENT', // Force STUDENT role
        department: department || '',
        phone: phone || '',
        isActive: true,
        isEmailVerified: true,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      });
    } else {
      // 2. Verifying existing unverified account (e.g. Admin-created user logging in for the first time)
      user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }

      user.isEmailVerified = true;
      user.isActive = true;
      await user.save();
    }

    // Remove OTP document upon successful verification
    await Otp.deleteOne({ _id: otpDoc._id });

    // Generate JWT session token
    const token = generateToken(user);

    res.status(201).json({
      message: 'Email verified and authenticated successfully.',
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
    console.error('Verify OTP Error:', error);
    res.status(500).json({ message: error.message || 'Server error during OTP verification.' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  res.status(400).json({
    message: 'Direct registration is disabled. Please verify your email using the OTP registration flow.',
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for demo login block in production
    const demoEmails = [
      'student@campus.edu',
      'faculty@campus.edu',
      'admin@campus.edu',
      'elec.staff@campus.edu',
      'plumb.staff@campus.edu',
      'it.staff@campus.edu',
    ];
    if (demoEmails.includes(normalizedEmail) && process.env.ENABLE_DEMO_LOGIN === 'false') {
      res.status(403).json({ message: 'Demo login is disabled in production.' });
      return;
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials. User not found.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: 'Your account is currently inactive. Please contact the administrator.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
      return;
    }

    // Secure Verification check: if unverified, block login and trigger OTP send
    if (!user.isEmailVerified) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = hashOtp(otp);

      const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES) || 5;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
      const cooldownExpiry = new Date(Date.now() + 60 * 1000);

      await Otp.findOneAndUpdate(
        { email: normalizedEmail },
        {
          otpHash,
          expiresAt,
          cooldownExpiry,
          attempts: 0,
          pendingUserData: undefined, // existing user login flow
        },
        { upsert: true, new: true }
      );

      console.log(`\n--- [EMAIL SERVICE] OTP SENT (LOGIN VERIFICATION) ---`);
      console.log(`To:      ${normalizedEmail}`);
      console.log(`OTP:     ${otp}`);
      console.log(`Expires: ${expiryMinutes} minutes`);
      console.log("------------------------------------------------------\n");

      res.status(403).json({
        message: 'Please verify your college email before logging in. An OTP has been sent.',
        email: user.email,
        requiresVerification: true,
      });
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
