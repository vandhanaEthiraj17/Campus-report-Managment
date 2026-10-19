import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_campus_db';
    await mongoose.connect(mongoURI);
    // Sanitize any password embedded in connection string before logging
    const sanitizedURI = mongoURI.replace(/:([^@]+)@/, ':****@');
    console.log(`[MongoDB] Database connected successfully: ${sanitizedURI}`);
  } catch (error: any) {
    console.error('[MongoDB] Connection error occurred:', error?.message || 'Database unavailable');
    process.exit(1);
  }
};
