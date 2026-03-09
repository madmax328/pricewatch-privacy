import mongoose, { Schema, Document } from 'mongoose';

export interface IChildAvatar {
  gender: 'boy' | 'girl';
  hair: string;
  skin: string;
}

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  childName: string;
  childAge: number;
  theme: string;
  language: string;
  title: string;
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  locale: string;
  printOrdered: boolean;
  childAvatar?: IChildAvatar;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    childName: { type: String, required: true },
    childAge: { type: Number, required: true, min: 1, max: 15 },
    theme: { type: String, required: true },
    language: { type: String, required: true, default: 'fr' },
    title: { type: String, required: true },
    content: { type: String, required: true },
    imageUrl: { type: String },
    audioUrl: { type: String },
    locale: { type: String, default: 'fr' },
    printOrdered: { type: Boolean, default: false },
    childAvatar: {
      gender: { type: String, enum: ['boy', 'girl'] },
      hair: { type: String },
      skin: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Story || mongoose.model<IStory>('Story', StorySchema);
