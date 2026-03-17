import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  emailVerified?: Date;
  plan: 'free' | 'premium';
  storiesUsedThisMonth: number;
  storiesResetDate: Date;
  // Lemon Squeezy (replaces Stripe)
  lsCustomerId?: string;
  lsSubscriptionId?: string;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, select: false },
    image: { type: String },
    emailVerified: { type: Date },
    plan: { type: String, enum: ['free', 'premium'], default: 'free' },
    storiesUsedThisMonth: { type: Number, default: 0 },
    storiesResetDate: { type: Date, default: () => new Date() },
    lsCustomerId: { type: String },
    lsSubscriptionId: { type: String },
    locale: { type: String, default: 'fr' },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
