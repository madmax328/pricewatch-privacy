import mongoose, { Schema, Document } from 'mongoose';

export interface IPromoCode extends Document {
  code: string; // e.g. "NOEL25"
  discountType: 'percent' | 'fixed'; // percent = % off, fixed = € off
  discountValue: number; // e.g. 25 (for 25%) or 300 (for €3.00 in cents)
  appliesTo: 'book' | 'subscription' | 'all';
  maxUses?: number; // null = unlimited
  usedCount: number;
  expiresAt?: Date; // null = never expires
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percent', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    appliesTo: { type: String, enum: ['book', 'subscription', 'all'], default: 'all' },
    maxUses: { type: Number },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.PromoCode || mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
