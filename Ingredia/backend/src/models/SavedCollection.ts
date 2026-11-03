import mongoose, { Schema, Document } from 'mongoose';

export interface ISavedCollection extends Document {
  user_id: string;
  name: string;
  recipe_ids: string[];
  created_at: Date;
  updated_at: Date;
}

const SavedCollectionSchema = new Schema<ISavedCollection>(
  {
    user_id: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    recipe_ids: { type: [String], default: [] },
  },
  {
    collection: 'saved_collections',
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

SavedCollectionSchema.index({ user_id: 1, name: 1 });

export const SavedCollection = mongoose.model<ISavedCollection>(
  'SavedCollection',
  SavedCollectionSchema
);

