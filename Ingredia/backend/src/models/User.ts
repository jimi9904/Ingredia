import mongoose, { Schema, Document } from 'mongoose';

export interface IUserPreferences {
  dietary?: string[];
  allergies?: string[];
  cuisine_preference?: string[];
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'user' | 'admin';
  email_verified_at?: Date | null;
  preferences: IUserPreferences;
  provider?: string | null;
  provider_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    email_verified_at: { type: Date, default: null },
    preferences: {
      dietary: { type: [String], default: [] },
      allergies: { type: [String], default: [] },
      cuisine_preference: { type: [String], default: [] },
    },
    provider: { type: String, default: null },
    provider_id: { type: String, default: null },
  },
  {
    collection: 'users',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        ret.verified = !!ret.email_verified_at;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);

