import mongoose, { Schema, Document } from 'mongoose';

export interface ISearchLog extends Document {
  user_id?: string | null;
  query?: string;
  ingredients_searched: string[];
  filters: Record<string, any>;
  results_count: number;
  created_at: Date;
  updated_at: Date;
}

const SearchLogSchema = new Schema<ISearchLog>(
  {
    user_id: { type: String, default: null, index: true },
    query: { type: String, default: '' },
    ingredients_searched: { type: [String], default: [] },
    filters: { type: Schema.Types.Mixed, default: {} },
    results_count: { type: Number, default: 0 },
  },
  {
    collection: 'search_logs',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

SearchLogSchema.index({ created_at: -1 });

export const SearchLog = mongoose.model<ISearchLog>('SearchLog', SearchLogSchema);

