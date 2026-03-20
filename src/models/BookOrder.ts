import mongoose, { Schema, Document } from 'mongoose';

export interface IBookOrder extends Document {
  userId: mongoose.Types.ObjectId;
  storyId: mongoose.Types.ObjectId;
  storyTitle: string;
  childName: string;
  // Delivery
  deliveryAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  // Pricing
  amountPaid: number; // in cents
  currency: string;
  promoCode?: string;
  discountAmount?: number; // in cents
  loyaltyPromoCode?: string; // auto-generated after purchase, printed in book
  // Payment
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  // Lulu Direct
  luluJobId?: string;
  luluOrderId?: string;
  // Status
  status: 'pending_payment' | 'paid' | 'in_production' | 'shipped' | 'delivered' | 'cancelled' | 'error';
  trackingUrl?: string;
  trackingNumber?: string;
  carrier?: string;
  // Dates
  paidAt?: Date;
  shippedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookOrderSchema = new Schema<IBookOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    storyTitle: { type: String, required: true },
    childName: { type: String, required: true },
    deliveryAddress: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    amountPaid: { type: Number, required: true },
    currency: { type: String, default: 'eur' },
    promoCode: { type: String },
    discountAmount: { type: Number, default: 0 },
    loyaltyPromoCode: { type: String },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    luluJobId: { type: String },
    luluOrderId: { type: String },
    status: {
      type: String,
      enum: ['pending_payment', 'paid', 'in_production', 'shipped', 'delivered', 'cancelled', 'error'],
      default: 'pending_payment',
      index: true,
    },
    trackingUrl: { type: String },
    trackingNumber: { type: String },
    carrier: { type: String },
    paidAt: { type: Date },
    shippedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.BookOrder || mongoose.model<IBookOrder>('BookOrder', BookOrderSchema);
