import pool from "../config/postgres";
import {
  Game,
  Developer,
  Publisher,
  Genre,
  Category,
  Tag,
  GameDeveloper,
  GamePublisher,
  GameGenre,
  GameCategory,
  GameTag,
} from "../models/Game";
import { Types } from "mongoose";

export class MigrationService {
  async getRelatedEntityIds(gameIds: number[]) {
    if (gameIds.length === 0) {
      return {
        developerIds: [],
        publisherIds: [],
        genreIds: [],
        categoryIds: [],
        tagIds: [],
      };
    }

    const gameIdList = gameIds.join(",");

    const [devResult, pubResult, genreResult, catResult, tagResult] =
      await Promise.all([
        pool.query(`
        SELECT DISTINCT developer_id 
        FROM processed.game_developer 
        WHERE game_id IN (${gameIdList})
      `),
        pool.query(`
        SELECT DISTINCT publisher_id 
        FROM processed.game_publisher 
        WHERE game_id IN (${gameIdList})
      `),
        pool.query(`
        SELECT DISTINCT genre_id 
        FROM processed.game_genre 
        WHERE game_id IN (${gameIdList})
      `),
        pool.query(`
        SELECT DISTINCT category_id 
        FROM processed.game_category 
        WHERE game_id IN (${gameIdList})
      `),
        pool.query(`
        SELECT DISTINCT tag_id 
        FROM processed.game_tag 
        WHERE game_id IN (${gameIdList})
      `),
      ]);

    return {
      developerIds: devResult.rows.map((r) => r.developer_id),
      publisherIds: pubResult.rows.map((r) => r.publisher_id),
      genreIds: genreResult.rows.map((r) => r.genre_id),
      categoryIds: catResult.rows.map((r) => r.category_id),
      tagIds: tagResult.rows.map((r) => r.tag_id),
    };
  }

  async migrateDevelopers(
    limitToIds?: number[]
  ): Promise<Map<number, Types.ObjectId>> {
    const whereClause =
      limitToIds && limitToIds.length > 0
        ? `WHERE developer_id IN (${limitToIds.join(",")})`
        : "";

    const result = await pool.query(
      `SELECT developer_id, name FROM processed.developer ${whereClause}`
    );
    const idMap = new Map<number, Types.ObjectId>();

    for (const row of result.rows) {
      const dev = await Developer.findOneAndUpdate(
        { postgresId: row.developer_id },
        { name: row.name, postgresId: row.developer_id },
        { upsert: true, new: true }
      );
      idMap.set(row.developer_id, dev._id as Types.ObjectId);
    }

    return idMap;
  }

  async migratePublishers(
    limitToIds?: number[]
  ): Promise<Map<number, Types.ObjectId>> {
    const whereClause =
      limitToIds && limitToIds.length > 0
        ? `WHERE publisher_id IN (${limitToIds.join(",")})`
        : "";

    const result = await pool.query(
      `SELECT publisher_id, name FROM processed.publisher ${whereClause}`
    );
    const idMap = new Map<number, Types.ObjectId>();

    for (const row of result.rows) {
      const pub = await Publisher.findOneAndUpdate(
        { postgresId: row.publisher_id },
        { name: row.name, postgresId: row.publisher_id },
        { upsert: true, new: true }
      );
      idMap.set(row.publisher_id, pub._id as Types.ObjectId);
    }

    return idMap;
  }

  async migrateGenres(
    limitToIds?: number[]
  ): Promise<Map<number, Types.ObjectId>> {
    const whereClause =
      limitToIds && limitToIds.length > 0
        ? `WHERE genre_id IN (${limitToIds.join(",")})`
        : "";

    const result = await pool.query(
      `SELECT genre_id, name FROM processed.genre ${whereClause}`
    );
    const idMap = new Map<number, Types.ObjectId>();

    for (const row of result.rows) {
      const genre = await Genre.findOneAndUpdate(
        { postgresId: row.genre_id },
        { name: row.name, postgresId: row.genre_id },
        { upsert: true, new: true }
      );
      idMap.set(row.genre_id, genre._id as Types.ObjectId);
    }

    return idMap;
  }

  async migrateCategories(
    limitToIds?: number[]
  ): Promise<Map<number, Types.ObjectId>> {
    const whereClause =
      limitToIds && limitToIds.length > 0
        ? `WHERE category_id IN (${limitToIds.join(",")})`
        : "";

    const result = await pool.query(
      `SELECT category_id, name FROM processed.category ${whereClause}`
    );
    const idMap = new Map<number, Types.ObjectId>();

    for (const row of result.rows) {
      const cat = await Category.findOneAndUpdate(
        { postgresId: row.category_id },
        { name: row.name, postgresId: row.category_id },
        { upsert: true, new: true }
      );
      idMap.set(row.category_id, cat._id as Types.ObjectId);
    }

    return idMap;
  }

  async migrateTags(
    limitToIds?: number[]
  ): Promise<Map<number, Types.ObjectId>> {
    const whereClause =
      limitToIds && limitToIds.length > 0
        ? `WHERE tag_id IN (${limitToIds.join(",")})`
        : "";

    const result = await pool.query(
      `SELECT tag_id, name FROM processed.tag ${whereClause}`
    );
    const idMap = new Map<number, Types.ObjectId>();

    for (const row of result.rows) {
      const tag = await Tag.findOneAndUpdate(
        { postgresId: row.tag_id },
        { name: row.name, postgresId: row.tag_id },
        { upsert: true, new: true }
      );
      idMap.set(row.tag_id, tag._id as Types.ObjectId);
    }

    return idMap;
  }

  async migrateGames(limit?: number): Promise<Map<number, Types.ObjectId>> {
    const limitClause = limit ? `LIMIT ${limit}` : "";

    const result = await pool.query(`
      SELECT 
        game_id,
        app_id,
        name,
        release_date,
        price,
        required_age,
        dlc_count,
        short_description,
        header_image,
        website,
        windows,
        mac,
        linux,
        metacritic_score,
        recommendations,
        positive_ratings,
        negative_ratings,
        average_playtime_forever
      FROM processed.game
      ORDER BY game_id
      ${limitClause}
    `);

    const idMap = new Map<number, Types.ObjectId>();

    for (const row of result.rows) {
      const game = await Game.findOneAndUpdate(
        { postgresId: row.game_id },
        {
          appId: row.app_id,
          name: row.name,
          releaseDate: row.release_date,
          price: row.price || 0,
          requiredAge: row.required_age || 0,
          dlcCount: row.dlc_count || 0,
          shortDescription: row.short_description,
          headerImage: row.header_image,
          website: row.website,
          platforms: {
            windows: row.windows || false,
            mac: row.mac || false,
            linux: row.linux || false,
          },
          metacriticScore: row.metacritic_score || 0,
          recommendations: row.recommendations || 0,
          ratings: {
            positive: row.positive_ratings || 0,
            negative: row.negative_ratings || 0,
          },
          averagePlaytimeForever: row.average_playtime_forever || 0,
          postgresId: row.game_id,
          migratedAt: new Date(),
        },
        { upsert: true, new: true }
      );
      idMap.set(row.game_id, game._id as Types.ObjectId);
    }

    return idMap;
  }

  async migrateGameDevelopers(
    gameIdMap: Map<number, Types.ObjectId>,
    developerIdMap: Map<number, Types.ObjectId>
  ): Promise<number> {
    const result = await pool.query(
      "SELECT game_id, developer_id FROM processed.game_developer"
    );
    let count = 0;

    for (const row of result.rows) {
      const gameId = gameIdMap.get(row.game_id);
      const developerId = developerIdMap.get(row.developer_id);

      if (gameId && developerId) {
        await GameDeveloper.findOneAndUpdate(
          { gameId, developerId },
          { gameId, developerId },
          { upsert: true }
        );
        count++;
      }
    }

    return count;
  }

  async migrateGamePublishers(
    gameIdMap: Map<number, Types.ObjectId>,
    publisherIdMap: Map<number, Types.ObjectId>
  ): Promise<number> {
    const result = await pool.query(
      "SELECT game_id, publisher_id FROM processed.game_publisher"
    );
    let count = 0;

    for (const row of result.rows) {
      const gameId = gameIdMap.get(row.game_id);
      const publisherId = publisherIdMap.get(row.publisher_id);

      if (gameId && publisherId) {
        await GamePublisher.findOneAndUpdate(
          { gameId, publisherId },
          { gameId, publisherId },
          { upsert: true }
        );
        count++;
      }
    }

    return count;
  }

  async migrateGameGenres(
    gameIdMap: Map<number, Types.ObjectId>,
    genreIdMap: Map<number, Types.ObjectId>
  ): Promise<number> {
    const result = await pool.query(
      "SELECT game_id, genre_id FROM processed.game_genre"
    );
    let count = 0;

    for (const row of result.rows) {
      const gameId = gameIdMap.get(row.game_id);
      const genreId = genreIdMap.get(row.genre_id);

      if (gameId && genreId) {
        await GameGenre.findOneAndUpdate(
          { gameId, genreId },
          { gameId, genreId },
          { upsert: true }
        );
        count++;
      }
    }

    return count;
  }

  async migrateGameCategories(
    gameIdMap: Map<number, Types.ObjectId>,
    categoryIdMap: Map<number, Types.ObjectId>
  ): Promise<number> {
    const result = await pool.query(
      "SELECT game_id, category_id FROM processed.game_category"
    );
    let count = 0;

    for (const row of result.rows) {
      const gameId = gameIdMap.get(row.game_id);
      const categoryId = categoryIdMap.get(row.category_id);

      if (gameId && categoryId) {
        await GameCategory.findOneAndUpdate(
          { gameId, categoryId },
          { gameId, categoryId },
          { upsert: true }
        );
        count++;
      }
    }

    return count;
  }

  async migrateGameTags(
    gameIdMap: Map<number, Types.ObjectId>,
    tagIdMap: Map<number, Types.ObjectId>
  ): Promise<number> {
    const result = await pool.query(
      "SELECT game_id, tag_id, tag_count FROM processed.game_tag"
    );
    let count = 0;

    for (const row of result.rows) {
      const gameId = gameIdMap.get(row.game_id);
      const tagId = tagIdMap.get(row.tag_id);

      if (gameId && tagId) {
        await GameTag.findOneAndUpdate(
          { gameId, tagId },
          { gameId, tagId, tagCount: row.tag_count },
          { upsert: true }
        );
        count++;
      }
    }

    return count;
  }

  async migrate(limit?: number): Promise<void> {
    console.log("Starting migration from PostgreSQL to MongoDB...\n");
    console.log("Migration Strategy: Normalized collections with references\n");

    try {
      console.log("Step 1: Migrating games...");
      const gameIdMap = await this.migrateGames(limit);
      console.log(`Migrated ${gameIdMap.size} games\n`);

      let relatedIds;
      if (limit) {
        console.log("Identifying related entities for limited games...");
        relatedIds = await this.getRelatedEntityIds(
          Array.from(gameIdMap.keys())
        );
        console.log(
          `   - Found ${relatedIds.developerIds.length} related developers`
        );
        console.log(
          `   - Found ${relatedIds.publisherIds.length} related publishers`
        );
        console.log(`   - Found ${relatedIds.genreIds.length} related genres`);
        console.log(
          `   - Found ${relatedIds.categoryIds.length} related categories`
        );
        console.log(`   - Found ${relatedIds.tagIds.length} related tags\n`);
      }

      console.log("Step 2: Migrating dimension tables...");

      console.log("   - Migrating developers...");
      const developerIdMap = await this.migrateDevelopers(
        relatedIds?.developerIds
      );
      console.log(`   - Migrated ${developerIdMap.size} developers`);

      console.log("   - Migrating publishers...");
      const publisherIdMap = await this.migratePublishers(
        relatedIds?.publisherIds
      );
      console.log(`   - Migrated ${publisherIdMap.size} publishers`);

      console.log("   - Migrating genres...");
      const genreIdMap = await this.migrateGenres(relatedIds?.genreIds);
      console.log(`   - Migrated ${genreIdMap.size} genres`);

      console.log("   - Migrating categories...");
      const categoryIdMap = await this.migrateCategories(
        relatedIds?.categoryIds
      );
      console.log(`   - Migrated ${categoryIdMap.size} categories`);

      console.log("   - Migrating tags...");
      const tagIdMap = await this.migrateTags(relatedIds?.tagIds);
      console.log(`   - Migrated ${tagIdMap.size} tags\n`);

      console.log("Step 3: Migrating relationships (junction tables)...");

      console.log("   - Migrating game-developer relationships...");
      const gameDeveloperCount = await this.migrateGameDevelopers(
        gameIdMap,
        developerIdMap
      );
      console.log(`   - Migrated ${gameDeveloperCount} game-developer links`);

      console.log("   - Migrating game-publisher relationships...");
      const gamePublisherCount = await this.migrateGamePublishers(
        gameIdMap,
        publisherIdMap
      );
      console.log(`   - Migrated ${gamePublisherCount} game-publisher links`);

      console.log("   - Migrating game-genre relationships...");
      const gameGenreCount = await this.migrateGameGenres(
        gameIdMap,
        genreIdMap
      );
      console.log(`   - Migrated ${gameGenreCount} game-genre links`);

      console.log("   - Migrating game-category relationships...");
      const gameCategoryCount = await this.migrateGameCategories(
        gameIdMap,
        categoryIdMap
      );
      console.log(`   - Migrated ${gameCategoryCount} game-category links`);

      console.log("   - Migrating game-tag relationships...");
      const gameTagCount = await this.migrateGameTags(gameIdMap, tagIdMap);
      console.log(`   - Migrated ${gameTagCount} game-tag links\n`);

      console.log("Migration Summary:");
      console.log(`   Collections created: 11`);
      console.log(`   - Games: ${gameIdMap.size}`);
      console.log(`   - Developers: ${developerIdMap.size}`);
      console.log(`   - Publishers: ${publisherIdMap.size}`);
      console.log(`   - Genres: ${genreIdMap.size}`);
      console.log(`   - Categories: ${categoryIdMap.size}`);
      console.log(`   - Tags: ${tagIdMap.size}`);
      console.log(`   - GameDevelopers: ${gameDeveloperCount}`);
      console.log(`   - GamePublishers: ${gamePublisherCount}`);
      console.log(`   - GameGenres: ${gameGenreCount}`);
      console.log(`   - GameCategories: ${gameCategoryCount}`);
      console.log(`   - GameTags: ${gameTagCount}`);
      console.log("\nMigration completed successfully!");
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  }
  async getStatistics(): Promise<any> {
    const [games, developers, publishers, genres, categories, tags] =
      await Promise.all([
        Game.countDocuments(),
        Developer.countDocuments(),
        Publisher.countDocuments(),
        Genre.countDocuments(),
        Category.countDocuments(),
        Tag.countDocuments(),
      ]);

    const [
      gameDevelopers,
      gamePublishers,
      gameGenres,
      gameCategories,
      gameTags,
    ] = await Promise.all([
      GameDeveloper.countDocuments(),
      GamePublisher.countDocuments(),
      GameGenre.countDocuments(),
      GameCategory.countDocuments(),
      GameTag.countDocuments(),
    ]);

    return {
      collections: {
        games,
        developers,
        publishers,
        genres,
        categories,
        tags,
      },
      relationships: {
        gameDevelopers,
        gamePublishers,
        gameGenres,
        gameCategories,
        gameTags,
      },
      total: {
        collections: 11,
        documents:
          games +
          developers +
          publishers +
          genres +
          categories +
          tags +
          gameDevelopers +
          gamePublishers +
          gameGenres +
          gameCategories +
          gameTags,
      },
    };
  }
}

export default new MigrationService();
