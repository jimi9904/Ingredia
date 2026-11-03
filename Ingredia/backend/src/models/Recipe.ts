import mongoose, { Schema, Document } from 'mongoose';

export interface IRecipeIngredient {
  name: string;
  normalized?: string;
  quantity?: string | number;
  unit?: string;
}

export interface IRecipeNutrition {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  [key: string]: any;
}

export interface IRecipe extends Document {
  title: string;
  slug: string;
  description: string;
  ingredients: (IRecipeIngredient | string)[];
  instructions: string[];
  cuisine: string;
  tags: string[];
  nutrition?: IRecipeNutrition;
  cook_time: number;
  prep_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  image_url?: string;
  has_real_image: boolean;
  avg_rating: number;
  rating_count: number;
  source: string;
  status: 'published' | 'pending' | 'rejected';
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

const RecipeSchema = new Schema<IRecipe>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },
    ingredients: { type: [Schema.Types.Mixed], default: [] },
    instructions: { type: [String], default: [] },
    cuisine: { type: String, default: '', index: true },
    tags: { type: [String], default: [], index: true },
    nutrition: { type: Schema.Types.Mixed, default: {} },
    cook_time: { type: Number, default: 0 },
    prep_time: { type: Number, default: 0 },
    servings: { type: Number, default: 1 },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    image_url: { type: String, default: '' },
    has_real_image: { type: Boolean, default: false, index: true },
    avg_rating: { type: Number, default: 0, index: true },
    rating_count: { type: Number, default: 0 },
    source: { type: String, default: 'admin' },
    status: {
      type: String,
      enum: ['published', 'pending', 'rejected'],
      default: 'published',
      index: true,
    },
    created_by: { type: String, default: null },
  },
  {
    collection: 'recipes',
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

// Compound indexes matching Laravel performance optimizations
RecipeSchema.index({ status: 1, has_real_image: -1, created_at: -1 });
RecipeSchema.index({ status: 1, avg_rating: -1, rating_count: -1 });

export const Recipe = mongoose.model<IRecipe>('Recipe', RecipeSchema);

