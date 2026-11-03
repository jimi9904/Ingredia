import mongoose, { Schema, Document } from 'mongoose';

export interface IPantry extends Document {
  user_id: string;
  ingredients: (string | { name: string; [key: string]: any })[];
  created_at: Date;
  updated_at: Date;
}

const PantrySchema = new Schema<IPantry>(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    ingredients: { type: [Schema.Types.Mixed], default: [] },
  },
  {
    collection: 'pantries',
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

export const Pantry = mongoose.model<IPantry>('Pantry', PantrySchema);

