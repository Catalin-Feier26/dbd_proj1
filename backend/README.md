# Steam Games MongoDB Backend

A TypeScript/Node.js backend API for migrating Steam Games data from PostgreSQL to MongoDB and providing CRUD operations.

## Architecture

```
PostgreSQL (steamdb)     →     Node.js Backend     →     MongoDB Atlas
   Star Schema                  ETL + API                 Document Store
   (normalized)                (TypeScript)               (embedded docs)
```

### Schema Design

**PostgreSQL (Source)**: Normalized star schema with junction tables
- `processed.game` - Main game table
- `processed.developer`, `processed.publisher`, `processed.genre`, `processed.category`, `processed.tag` - Dimension tables
- Junction tables: `game_developer`, `game_publisher`, `game_genre`, etc.

**MongoDB (Target)**: Embedded document model
- Single `games` collection with embedded arrays for developers, publishers, genres, categories, tags
- Rationale: Optimized for read-heavy workload, reduces JOINs, better performance for API queries

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL (running via docker-compose on port 5435)
- MongoDB Atlas account or local MongoDB instance

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# PostgreSQL (existing database)
POSTGRES_HOST=localhost
POSTGRES_PORT=5435
POSTGRES_DB=steamdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=root

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=steam_games

# Server
PORT=3000
```

3. Ensure PostgreSQL is running:
```bash
cd ..
docker-compose up -d db
```

## Migration

Run the ETL migration to copy data from PostgreSQL to MongoDB:

```bash
npm run migrate
```

**Migration with limit** (for testing):
```bash
npm run migrate -- --limit 100
```

The migration process:
1. **Extract**: Queries PostgreSQL with JOINs to get game data with all related entities
2. **Transform**: Converts normalized rows to embedded document structure
3. **Load**: Upserts documents into MongoDB (idempotent - safe to re-run)

## Running the API

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm run build
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Base URL: `/api/games`

#### GET /api/games
Get all games with pagination and filters

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `search` - Text search on game name
- `genre` - Filter by genre name
- `developer` - Filter by developer name
- `publisher` - Filter by publisher name
- `minPrice` - Minimum price
- `maxPrice` - Maximum price
- `minScore` - Minimum metacritic score
- `platform` - Filter by platform (windows, mac, linux)

**Example:**
```bash
curl "http://localhost:3000/api/games?page=1&limit=10&genre=Action&minPrice=0&maxPrice=20"
```

#### GET /api/games/:id
Get game by MongoDB ObjectId

**Example:**
```bash
curl http://localhost:3000/api/games/507f1f77bcf86cd799439011
```

#### GET /api/games/app/:appId
Get game by Steam appId

**Example:**
```bash
curl http://localhost:3000/api/games/app/620
```

#### GET /api/games/stats
Get database statistics

**Example:**
```bash
curl http://localhost:3000/api/games/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalGames": 50000,
    "totalDevelopers": 12000,
    "totalPublishers": 8000,
    "totalGenres": 30,
    "avgPrice": 15.99,
    "avgMetacriticScore": 72
  }
}
```

#### POST /api/games
Create a new game

**Example:**
```bash
curl -X POST http://localhost:3000/api/games \
  -H "Content-Type: application/json" \
  -d '{
    "appId": 999999,
    "name": "Test Game",
    "price": 19.99,
    "developers": [{"name": "Test Studio"}],
    "genres": [{"name": "Action"}]
  }'
```

#### PUT /api/games/:id
Update a game

**Example:**
```bash
curl -X PUT http://localhost:3000/api/games/507f1f77bcf86cd799439011 \
  -H "Content-Type: application/json" \
  -d '{"price": 9.99}'
```

#### DELETE /api/games/:id
Delete a game

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/games/507f1f77bcf86cd799439011
```

### Health Check

#### GET /health
Server health check

**Example:**
```bash
curl http://localhost:3000/health
```

## MongoDB Indexes

The following indexes are automatically created for optimal query performance:

- `appId` - Unique index
- `name` - Text index for search
- `developers.name` - For developer filtering
- `publishers.name` - For publisher filtering
- `genres.name` - For genre filtering
- `price` - For price range queries
- `metacriticScore` - For score filtering

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── postgres.ts      # PostgreSQL connection pool
│   │   └── mongodb.ts        # Mongoose MongoDB connection
│   ├── models/
│   │   └── Game.ts           # Game model with embedded schema
│   ├── controllers/
│   │   └── gameController.ts # CRUD business logic
│   ├── routes/
│   │   └── gameRoutes.ts     # Express route definitions
│   ├── services/
│   │   └── migrationService.ts # ETL migration logic
│   ├── migrate.ts            # Migration script entry point
│   └── server.ts             # Express server setup
├── .env.example              # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Build TypeScript:
```bash
npm run build
```

### Run tests (if implemented):
```bash
npm test
```

### Lint code:
```bash
npm run lint
```

### Format code:
```bash
npm run format
```

## Troubleshooting

### PostgreSQL connection issues
- Ensure docker-compose services are running: `docker-compose ps`
- Check port 5435 is available: `netstat -tuln | grep 5435`
- Verify credentials in `.env` match docker-compose.yml

### MongoDB connection issues
- Verify `MONGODB_URI` is not the placeholder value
- Check MongoDB Atlas network access whitelist
- Ensure database user credentials are correct

### Migration errors
- Check PostgreSQL has data: `docker-compose exec db psql -U postgres -d steamdb -c "SELECT COUNT(*) FROM processed.game;"`
- Verify schemas exist: `docker-compose exec etl bash /scripts/run_etl.sh`
- Run migration with limit first: `npm run migrate -- --limit 10`

## License

MIT
