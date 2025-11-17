import { Router } from 'express';
import gameController from '../controllers/gameController';

const router = Router();

/**
 * @route   GET /api/games/stats
 * @desc    Get database statistics
 * @access  Public
 */
router.get('/stats', gameController.getStatistics.bind(gameController));

/**
 * @route   GET /api/games/app/:appId
 * @desc    Get game by Steam appId
 * @access  Public
 */
router.get('/app/:appId', gameController.getGameByAppId.bind(gameController));

/**
 * @route   GET /api/games/:id
 * @desc    Get game by MongoDB ID
 * @access  Public
 */
router.get('/:id', gameController.getGameById.bind(gameController));

/**
 * @route   GET /api/games
 * @desc    Get all games with pagination and filters
 * @query   page, limit, search, genre, developer, publisher, minPrice, maxPrice, minScore, platform
 * @access  Public
 */
router.get('/', gameController.getAllGames.bind(gameController));

/**
 * @route   POST /api/games
 * @desc    Create a new game
 * @access  Public
 */
router.post('/', gameController.createGame.bind(gameController));

/**
 * @route   PUT /api/games/:id
 * @desc    Update a game
 * @access  Public
 */
router.put('/:id', gameController.updateGame.bind(gameController));

/**
 * @route   DELETE /api/games/:id
 * @desc    Delete a game
 * @access  Public
 */
router.delete('/:id', gameController.deleteGame.bind(gameController));

export default router;
