import { Request, Response } from "express";
import { Game, IGame } from "../models/Game";

export class GameController {
  async createGame(req: Request, res: Response): Promise<void> {
    try {
      const gameData: Partial<IGame> = req.body;
      const game = new Game(gameData);
      await game.save();

      res.status(201).json({
        success: true,
        data: game,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res.status(400).json({
          success: false,
          error: "Game with this appId already exists",
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message,
        });
      }
    }
  }

  async getAllGames(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const filter: any = {};

      if (req.query.search) {
        filter.$text = { $search: req.query.search as string };
      }

      if (req.query.genre) {
        filter["genres.name"] = req.query.genre;
      }

      if (req.query.developer) {
        filter["developers.name"] = req.query.developer;
      }

      if (req.query.publisher) {
        filter["publishers.name"] = req.query.publisher;
      }

      if (req.query.minPrice || req.query.maxPrice) {
        filter.price = {};
        if (req.query.minPrice) {
          filter.price.$gte = parseFloat(req.query.minPrice as string);
        }
        if (req.query.maxPrice) {
          filter.price.$lte = parseFloat(req.query.maxPrice as string);
        }
      }

      if (req.query.minScore) {
        filter.metacriticScore = {
          $gte: parseInt(req.query.minScore as string),
        };
      }

      if (req.query.platform) {
        const platform = req.query.platform as string;
        filter[`platforms.${platform}`] = true;
      }

      const [games, total] = await Promise.all([
        Game.find(filter).skip(skip).limit(limit).sort({ name: 1 }).lean(),
        Game.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: games,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getGameById(req: Request, res: Response): Promise<void> {
    try {
      const game = await Game.findById(req.params.id);

      if (!game) {
        res.status(404).json({
          success: false,
          error: "Game not found",
        });
        return;
      }

      res.json({
        success: true,
        data: game,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getGameByAppId(req: Request, res: Response): Promise<void> {
    try {
      const appId = parseInt(req.params.appId);
      const game = await Game.findOne({ appId });

      if (!game) {
        res.status(404).json({
          success: false,
          error: "Game not found",
        });
        return;
      }

      res.json({
        success: true,
        data: game,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async updateGame(req: Request, res: Response): Promise<void> {
    try {
      const game = await Game.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );

      if (!game) {
        res.status(404).json({
          success: false,
          error: "Game not found",
        });
        return;
      }

      res.json({
        success: true,
        data: game,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  async deleteGame(req: Request, res: Response): Promise<void> {
    try {
      const game = await Game.findByIdAndDelete(req.params.id);

      if (!game) {
        res.status(404).json({
          success: false,
          error: "Game not found",
        });
        return;
      }

      res.json({
        success: true,
        message: "Game deleted successfully",
        data: game,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const [
        totalGames,
        totalDevelopers,
        totalPublishers,
        totalGenres,
        avgPrice,
        avgMetacriticScore,
      ] = await Promise.all([
        Game.countDocuments(),
        Game.distinct("developers.name").then((d) => d.length),
        Game.distinct("publishers.name").then((p) => p.length),
        Game.distinct("genres.name").then((g) => g.length),
        Game.aggregate([
          { $group: { _id: null, avgPrice: { $avg: "$price" } } },
        ]).then((r: any) => r[0]?.avgPrice || 0),
        Game.aggregate([
          { $match: { metacriticScore: { $gt: 0 } } },
          { $group: { _id: null, avgScore: { $avg: "$metacriticScore" } } },
        ]).then((r: any) => r[0]?.avgScore || 0),
      ]);

      res.json({
        success: true,
        data: {
          totalGames,
          totalDevelopers,
          totalPublishers,
          totalGenres,
          avgPrice: Math.round(avgPrice * 100) / 100,
          avgMetacriticScore: Math.round(avgMetacriticScore),
        },
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export default new GameController();
