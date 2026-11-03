import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  recipe_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  photo_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    recipe_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    photo_url: { type: String, default: null },
  },
  {
    collection: 'reviews',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ReviewSchema.index({ recipe_id: 1, user_id: 1 });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);

