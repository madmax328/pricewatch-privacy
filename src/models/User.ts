import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryAddress {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  emailVerified?: Date;
  plan: 'free' | 'premium' | 'superpremium';
  // Monthly counter (free plan)
  storiesUsedThisMonth: number;
  storiesResetDate: Date;
  // Daily counter (premium plan)
  storiesCreatedToday: number;
  storiesDailyResetDate: Date;
  // Stripe
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCurrentPeriodEnd?: Date;
  // Profile
  locale: string;
  deliveryAddress?: IDeliveryAddress;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryAddressSchema = new Schema<IDeliveryAddress>(
  {
    firstName: { type: String },
    lastName: { type: String },
    address: { type: String },
    city: { type: String },
    postalCode: { type: String },
    country: { type: String },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, select: false },
    image: { type: String },
    emailVerified: { type: Date },
    plan: { type: String, enum: ['free', 'premium', 'superpremium'], default: 'free' },
    // Monthly counter (free)
    storiesUsedThisMonth: { type: Number, default: 0 },
    storiesResetDate: { type: Date, default: () => new Date() },
    // Daily counter (premium)
    storiesCreatedToday: { type: Number, default: 0 },
    storiesDailyResetDate: { type: Date, default: () => new Date() },
    // Stripe
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String },
    stripeCurrentPeriodEnd: { type: Date },
    // Profile
    locale: { type: String, default: 'fr' },
    deliveryAddress: { type: DeliveryAddressSchema },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
