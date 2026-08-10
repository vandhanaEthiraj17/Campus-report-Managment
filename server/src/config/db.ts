import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_campus_db';
    await mongoose.connect(mongoURI);
    console.log(`[MongoDB] Database connected successfully: ${mongoURI}`);
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    process.exit(1);
  }
};
