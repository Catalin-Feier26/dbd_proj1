# Steam Games ETL Pipeline with MongoDB Backend

A complete data pipeline that extracts Steam game data from PostgreSQL and provides a REST API backed by MongoDB.

## Project Overview

This project implements:

- **PostgreSQL ETL Pipeline**: Loads and transforms Steam game data using pg_cron scheduled jobs
- **MongoDB Migration**: Migrates normalized PostgreSQL data to MongoDB document store
- **REST API**: TypeScript/Node.js backend providing CRUD operations on game data

## Architecture

```
JSON Files → PostgreSQL (ETL) → Node.js Backend → MongoDB Atlas
                ↓                       ↓
         Star Schema (normalized)   Document Store (embedded)
                ↓
         pg_cron (daily 02:00)
```

### Services

- **PostgreSQL Database** (postgres:16): Stores raw and processed data with pg_cron
- **ETL Container**: Runs preprocessing scripts and SQL transformations
- **Backend API** (Node.js/TypeScript): REST API with MongoDB integration

## Project Structure

```
project/
├── docker-compose.yml         # Docker orchestration (db, etl, backend)
├── db.Dockerfile              # PostgreSQL with pg_cron
├── etl.Dockerfile             # ETL container with Python
├── backend.Dockerfile         # Node.js TypeScript backend
├── .env.example               # Environment variables template
├── data/                      # Source data directory
│   ├── games.json             # Raw games data
│   └── games.jsonl            # Preprocessed JSONL
├── preprocessing/             # Python preprocessing scripts
│   └── preprocess.py
├── scripts/                   # SQL and bash scripts
│   ├── 0_init_db.sql          # Database initialization
│   ├── 1_load.sql             # Load data to staging
│   ├── 2_transform.sql        # Transform and process data
│   ├── pg_cron_daily.sql      # pg_cron scheduled jobs
│   └── run_etl.sh             # ETL orchestration script
└── backend/                   # TypeScript backend
    ├── src/
    │   ├── config/            # Database connections
    │   ├── models/            # Mongoose schemas
    │   ├── controllers/       # CRUD logic
    │   ├── routes/            # Express routes
    │   ├── services/          # Migration service
    │   ├── server.ts          # Express server
    │   └── migrate.ts         # Migration script
    ├── package.json
    └── README.md              # Backend documentation
```

## Database Schema

### Schemas

- **staging**: Raw data staging area
- **processed**: Cleaned and normalized data
- **log**: ETL job execution logs

### Main Tables (processed schema)

- **game**: Main game information
- **developer**: Game developers
- **publisher**: Game publishers
- **genre**: Game genres
- **category**: Game categories
- **tag**: User-generated tags

### Junction Tables

- **game_developer**: Many-to-many relationship between games and developers
- **game_publisher**: Many-to-many relationship between games and publishers

### Commands

## Quick Start

1. **Configure MongoDB connection**:

```bash
cp .env.example .env
# Edit .env and add your MongoDB Atlas connection string
```

2. **Build and start all services**:

```bash
docker-compose up --build -d
```

This will start:

- PostgreSQL database on port 5435
- Backend API on port 3001
- ETL container (runs on demand)

3. **Run the PostgreSQL ETL** (populate the database):

```bash
docker exec steam-etl-cron bash /scripts/run_etl.sh
```

4. **Migrate data to MongoDB**:

```bash
docker exec steam-games-backend npm run migrate
```

5. **Access the API**:

```bash
curl http://localhost:3001/api/games?limit=5
```

## Detailed Commands

### Docker Management

- Build and start services (rebuild images if Dockerfile changed):

```bash
docker-compose build --no-cache
docker-compose up -d
```

- Stop and remove containers (keep volumes):

```bash
docker-compose down
```

- Destroy DB data and reinitialize (destructive):

```bash
docker-compose down -v
docker-compose up -d
```

- Run the full ETL manually (from host):

```bash
docker exec steam-etl-cron bash /scripts/run_etl.sh
```

- Trigger the DB-side ETL wrapper directly (same as cron):

```bash
docker-compose exec db psql -U postgres -d steamdb -c "SELECT public.run_daily_etl();"
```

- Check scheduled pg_cron jobs:

```bash
docker-compose exec db psql -U postgres -d steamdb -c "SELECT jobid, schedule, command FROM cron.job;"
```

- View recent ETL logs (DB):

```bash
docker-compose exec db psql -U postgres -d steamdb -c "SELECT * FROM log.logs ORDER BY start_date DESC LIMIT 20;"
```

### Backend API

- View backend logs:

```bash
docker logs -f steam-games-backend
```

- Run migration manually:

```bash
docker exec steam-games-backend npm run migrate
```

- Run migration with limit (for testing):

```bash
docker exec steam-games-backend npm run migrate -- --limit 100
```

- Access API endpoints:

```bash
# Get all games with pagination
curl "http://localhost:3100/api/games?page=1&limit=10"

# Get a specific game by ID
curl "http://localhost:3100/api/games/<game_id>"

# Search games
curl "http://localhost:3100/api/games?search=Portal"

# Filter by genre
curl "http://localhost:3100/api/games?genre=Action"

# Create a new game
curl -X POST "http://localhost:3100/api/games" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": 999999,
    "name": "My New Game",
    "releaseDate": "2024-01-15",
    "price": 29.99,
    "requiredAge": 12,
    "dlcCount": 2,
    "shortDescription": "Adventure puzzle game",
    "headerImage": "https://example.com/header.jpg",
    "website": "https://example.com",
    "platforms": {
      "windows": true,
      "mac": true,
      "linux": false
    },
    "metacriticScore": 85,
    "recommendations": 1500,
    "ratings": {
      "positive": 1200,
      "negative": 300
    },
    "averagePlaytimeForever": 240
  }'

# Update a game
curl -X PUT "http://localhost:3100/api/games/<game_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Game Name",
    "price": 19.99,
    "short_description": "Updated description"
  }'

# Delete a game
curl -X DELETE "http://localhost:3100/api/games/<game_id>"

# Get statistics
curl http://localhost:3100/api/games/stats

# Health check
curl http://localhost:3100/health
```

See `backend/README.md` for complete API documentation.

## Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB Atlas connection string (required for backend)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
```

The backend will use this environment variable. PostgreSQL credentials are configured in docker-compose.yml.

## Notes

- Data files live under `./data` (e.g. `games.json` / `games.jsonl`). The DB data is stored in the named Docker volume `postgres-data`.
- Back up the DB with `pg_dumpall` before removing volumes if you need to keep existing data.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.
