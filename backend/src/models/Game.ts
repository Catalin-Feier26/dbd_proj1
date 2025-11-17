import mongoose, { Schema, Document, Types } from "mongoose";

// TypeScript interfaces for collections
export interface IDeveloper extends Document {
  name: string;
  postgresId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPublisher extends Document {
  name: string;
  postgresId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGenre extends Document {
  name: string;
  postgresId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICategory extends Document {
  name: string;
  postgresId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITag extends Document {
  name: string;
  postgresId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Main Game interface with references
export interface IGame extends Document {
  appId: number;
  name: string;
  releaseDate?: Date;
  price: number;
  requiredAge: number;
  dlcCount: number;
  shortDescription?: string;
  headerImage?: string;
  website?: string;
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  metacriticScore: number;
  recommendations: number;
  ratings: {
    positive: number;
    negative: number;
  };
  averagePlaytimeForever: number;
  postgresId?: number;
  migratedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Junction table interfaces for many-to-many relationships
export interface IGameDeveloper extends Document {
  gameId: Types.ObjectId;
  developerId: Types.ObjectId;
}

export interface IGamePublisher extends Document {
  gameId: Types.ObjectId;
  publisherId: Types.ObjectId;
}

export interface IGameGenre extends Document {
  gameId: Types.ObjectId;
  genreId: Types.ObjectId;
}

export interface IGameCategory extends Document {
  gameId: Types.ObjectId;
  categoryId: Types.ObjectId;
}

export interface IGameTag extends Document {
  gameId: Types.ObjectId;
  tagId: Types.ObjectId;
  tagCount?: number;
}

// Developer Schema
const DeveloperSchema = new Schema<IDeveloper>(
  {
    name: { type: String, required: true, unique: true, index: true },
    postgresId: { type: Number, index: true },
  },
  { timestamps: true }
);

// Publisher Schema
const PublisherSchema = new Schema<IPublisher>(
  {
    name: { type: String, required: true, unique: true, index: true },
    postgresId: { type: Number, index: true },
  },
  { timestamps: true }
);

// Genre Schema
const GenreSchema = new Schema<IGenre>(
  {
    name: { type: String, required: true, unique: true, index: true },
    postgresId: { type: Number, index: true },
  },
  { timestamps: true }
);

// Category Schema
const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, index: true },
    postgresId: { type: Number, index: true },
  },
  { timestamps: true }
);

// Tag Schema
const TagSchema = new Schema<ITag>(
  {
    name: { type: String, required: true, unique: true, index: true },
    postgresId: { type: Number, index: true },
  },
  { timestamps: true }
);

// Main Game schema
const GameSchema = new Schema<IGame>(
  {
    appId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    releaseDate: {
      type: Date,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
      index: true,
    },
    requiredAge: {
      type: Number,
      default: 0,
    },
    dlcCount: {
      type: Number,
      default: 0,
    },
    shortDescription: {
      type: String,
    },
    headerImage: {
      type: String,
    },
    website: {
      type: String,
    },
    platforms: {
      windows: { type: Boolean, default: false },
      mac: { type: Boolean, default: false },
      linux: { type: Boolean, default: false },
    },
    metacriticScore: {
      type: Number,
      default: 0,
      index: true,
    },
    recommendations: {
      type: Number,
      default: 0,
    },
    ratings: {
      positive: { type: Number, default: 0 },
      negative: { type: Number, default: 0 },
    },
    averagePlaytimeForever: {
      type: Number,
      default: 0,
    },
    postgresId: {
      type: Number,
      index: true,
    },
    migratedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Junction table schemas
const GameDeveloperSchema = new Schema<IGameDeveloper>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },
    developerId: {
      type: Schema.Types.ObjectId,
      ref: "Developer",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const GamePublisherSchema = new Schema<IGamePublisher>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },
    publisherId: {
      type: Schema.Types.ObjectId,
      ref: "Publisher",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const GameGenreSchema = new Schema<IGameGenre>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },
    genreId: {
      type: Schema.Types.ObjectId,
      ref: "Genre",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const GameCategorySchema = new Schema<IGameCategory>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

const GameTagSchema = new Schema<IGameTag>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
      index: true,
    },
    tagId: {
      type: Schema.Types.ObjectId,
      ref: "Tag",
      required: true,
      index: true,
    },
    tagCount: { type: Number },
  },
  { timestamps: true }
);

// Text index for search
GameSchema.index({ name: "text" });

// Compound indexes for junction tables
GameDeveloperSchema.index({ gameId: 1, developerId: 1 }, { unique: true });
GamePublisherSchema.index({ gameId: 1, publisherId: 1 }, { unique: true });
GameGenreSchema.index({ gameId: 1, genreId: 1 }, { unique: true });
GameCategorySchema.index({ gameId: 1, categoryId: 1 }, { unique: true });
GameTagSchema.index({ gameId: 1, tagId: 1 }, { unique: true });

// Export models
export const Game = mongoose.model<IGame>("Game", GameSchema);
export const Developer = mongoose.model<IDeveloper>(
  "Developer",
  DeveloperSchema
);
export const Publisher = mongoose.model<IPublisher>(
  "Publisher",
  PublisherSchema
);
export const Genre = mongoose.model<IGenre>("Genre", GenreSchema);
export const Category = mongoose.model<ICategory>("Category", CategorySchema);
export const Tag = mongoose.model<ITag>("Tag", TagSchema);
export const GameDeveloper = mongoose.model<IGameDeveloper>(
  "GameDeveloper",
  GameDeveloperSchema
);
export const GamePublisher = mongoose.model<IGamePublisher>(
  "GamePublisher",
  GamePublisherSchema
);
export const GameGenre = mongoose.model<IGameGenre>(
  "GameGenre",
  GameGenreSchema
);
export const GameCategory = mongoose.model<IGameCategory>(
  "GameCategory",
  GameCategorySchema
);
export const GameTag = mongoose.model<IGameTag>("GameTag", GameTagSchema);
