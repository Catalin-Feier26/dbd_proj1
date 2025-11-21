import {
  Game,
  GameDeveloper,
  GamePublisher,
  GameGenre,
  GameCategory,
  GameTag,
  Developer,
  Publisher,
  Genre,
  Category,
  Tag,
} from "../models/Game";
import { Types } from "mongoose";

export interface GameWithRelations {
  _id: Types.ObjectId;
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
  developers?: Array<{ _id: Types.ObjectId; name: string }>;
  publishers?: Array<{ _id: Types.ObjectId; name: string }>;
  genres?: Array<{ _id: Types.ObjectId; name: string }>;
  categories?: Array<{ _id: Types.ObjectId; name: string }>;
  tags?: Array<{ _id: Types.ObjectId; name: string; count?: number }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export class GameQueryService {
  async populateGameRelations(
    gameId: Types.ObjectId
  ): Promise<GameWithRelations | null> {
    const game = await Game.findById(gameId).lean();
    if (!game) return null;

    const [developers, publishers, genres, categories, tags] =
      await Promise.all([
        this.getGameDevelopers(gameId),
        this.getGamePublishers(gameId),
        this.getGameGenres(gameId),
        this.getGameCategories(gameId),
        this.getGameTags(gameId),
      ]);

    return {
      ...game,
      developers,
      publishers,
      genres,
      categories,
      tags,
    } as GameWithRelations;
  }

  async getGameDevelopers(gameId: Types.ObjectId) {
    const links = await GameDeveloper.find({ gameId }).lean();
    const developerIds = links.map((l) => l.developerId);
    const developers = await Developer.find({ _id: { $in: developerIds } })
      .select("name")
      .lean();
    return developers;
  }

  async getGamePublishers(gameId: Types.ObjectId) {
    const links = await GamePublisher.find({ gameId }).lean();
    const publisherIds = links.map((l) => l.publisherId);
    const publishers = await Publisher.find({ _id: { $in: publisherIds } })
      .select("name")
      .lean();
    return publishers;
  }

  async getGameGenres(gameId: Types.ObjectId) {
    const links = await GameGenre.find({ gameId }).lean();
    const genreIds = links.map((l) => l.genreId);
    const genres = await Genre.find({ _id: { $in: genreIds } })
      .select("name")
      .lean();
    return genres;
  }

  async getGameCategories(gameId: Types.ObjectId) {
    const links = await GameCategory.find({ gameId }).lean();
    const categoryIds = links.map((l) => l.categoryId);
    const categories = await Category.find({ _id: { $in: categoryIds } })
      .select("name")
      .lean();
    return categories;
  }

  async getGameTags(gameId: Types.ObjectId) {
    const links = await GameTag.find({ gameId }).lean();
    const tagIds = links.map((l) => l.tagId);
    const tags = await Tag.find({ _id: { $in: tagIds } })
      .select("name")
      .lean();

    return tags.map((tag) => {
      const link = links.find((l) => l.tagId.toString() === tag._id.toString());
      return {
        _id: tag._id,
        name: tag.name,
        count: link?.tagCount,
      };
    });
  }

  async findGamesWithRelations(filter: any, skip: number, limit: number) {
    const games = await Game.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ name: 1 })
      .lean();

    const gamesWithRelations = await Promise.all(
      games.map(async (game) => {
        const [developers, publishers, genres, categories, tags] =
          await Promise.all([
            this.getGameDevelopers(game._id),
            this.getGamePublishers(game._id),
            this.getGameGenres(game._id),
            this.getGameCategories(game._id),
            this.getGameTags(game._id),
          ]);

        return {
          ...game,
          developers,
          publishers,
          genres,
          categories,
          tags,
        };
      })
    );

    return gamesWithRelations;
  }

  async buildGameFilter(query: any): Promise<any> {
    const filter: any = {};

    if (query.search) {
      filter.$text = { $search: query.search };
    }

    if (query.developer) {
      const developer = await Developer.findOne({ name: query.developer });
      if (developer) {
        const links = await GameDeveloper.find({ developerId: developer._id });
        const gameIds = links.map((l) => l.gameId);
        filter._id = { $in: gameIds };
      }
    }

    if (query.publisher) {
      const publisher = await Publisher.findOne({ name: query.publisher });
      if (publisher) {
        const links = await GamePublisher.find({ publisherId: publisher._id });
        const gameIds = links.map((l) => l.gameId);
        filter._id = filter._id
          ? {
              $in: filter._id.$in.filter((id: Types.ObjectId) =>
                gameIds.includes(id)
              ),
            }
          : { $in: gameIds };
      }
    }

    if (query.genre) {
      const genre = await Genre.findOne({ name: query.genre });
      if (genre) {
        const links = await GameGenre.find({ genreId: genre._id });
        const gameIds = links.map((l) => l.gameId);
        filter._id = filter._id
          ? {
              $in: filter._id.$in.filter((id: Types.ObjectId) =>
                gameIds.includes(id)
              ),
            }
          : { $in: gameIds };
      }
    }

    if (query.minPrice || query.maxPrice) {
      filter.price = {};
      if (query.minPrice) {
        filter.price.$gte = parseFloat(query.minPrice);
      }
      if (query.maxPrice) {
        filter.price.$lte = parseFloat(query.maxPrice);
      }
    }

    if (query.minScore) {
      filter.metacriticScore = { $gte: parseInt(query.minScore) };
    }

    if (query.platform) {
      filter[`platforms.${query.platform}`] = true;
    }

    return filter;
  }
}

export default new GameQueryService();
