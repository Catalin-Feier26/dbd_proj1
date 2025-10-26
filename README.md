# Steam Games ETL Pipeline

A PostgreSQL-based ETL (Extract, Transform, Load) pipeline for processing Steam game data using Docker containers.

## Project Overview

This project implements a complete ETL pipeline that:

- Loads Steam game data from JSON files into a staging area
- Validates and transforms the data using PostgreSQL functions
- Stores processed data in a normalized star schema database
- Tracks all ETL operations with comprehensive logging

## Architecture

The project uses a Docker-based architecture with two main services:

- **PostgreSQL Database** (postgres:16): Stores raw and processed data
- **ETL Container**: Runs preprocessing scripts and SQL transformations

## Project Structure

```
project/
├── docker-compose.yml         # Docker orchestration configuration
├── etl.Dockerfile             # ETL container definition
├── db.Dockerfile              # DB container definition
├── data/                      # Source data directory
│   ├── games.json             # Games json data
│   └── games.jsonl            # Games json preprocessed
├── preprocessing/             # Python preprocessing scripts
│   └── preprocess.py
├── scripts/                   # SQL and bash scripts
│   ├── 0_init_db.sql          # Database initialization
│   ├── 1_load.sql             # Load data to staging
│   ├── 2_transform.sql        # Transform and process data
│   └── run_etl.sh             # Main ETL orchestration script
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

## Notes

- Data files live under `./data` (e.g. `games.json` / `games.jsonl`). The DB data is stored in the named Docker volume `postgres-data`.
- Back up the DB with `pg_dumpall` before removing volumes if you need to keep existing data.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.
