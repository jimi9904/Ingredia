import mongoose, { Schema, Document } from 'mongoose';

export interface IIngredient extends Document {
  canonical_name: string;
  aliases: string[];
  category?: string;
  created_at: Date;
  updated_at: Date;
}

const IngredientSchema = new Schema<IIngredient>(
  {
    canonical_name: { type: String, required: true, trim: true, index: true },
    aliases: { type: [String], default: [], index: true },
    category: { type: String, default: '' },
  },
  {
    collection: 'ingredients',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const Ingredient = mongoose.model<IIngredient>('Ingredient', IngredientSchema);

