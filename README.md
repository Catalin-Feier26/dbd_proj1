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
- **PostgreSQL Database** (postgres:15-alpine): Stores raw and processed data
- **ETL Container**: Runs preprocessing scripts and SQL transformations

## Project Structure

```
HUMUHUM project/
├── docker-compose.yml          # Docker orchestration configuration
├── etl.Dockerfile             # ETL container definition
├── data/                      # Source data directory
│   ├── games.json
│   └── games.jsonl
├── preprocessing/             # Python preprocessing scripts
│   └── preprocess.py
├── scripts/                   # SQL and bash scripts
│   ├── 0_init_db.sql         # Database initialization
│   ├── 1_load.sql            # Load data to staging
│   ├── 2_transform.sql       # Transform and process data
│   └── run_etl.sh            # Main ETL orchestration script
└── cron/                      # Cron job configurations
    └── etl-cron
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
- **game_genre**: Many-to-many relationship between games and genres
- **game_category**: Many-to-many relationship between games and categories
- **game_tag**: Many-to-many relationship between games and tags (includes tag count)

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose
- At least 2GB of free disk space
- Port 5435 available on your host machine

## Setup and Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "HUMUHUM project"
```

### 2. Prepare Data Files

Place your Steam game data files in the `data/` directory:
- `games.json` or `games.jsonl`

### 3. Start the Services

```bash
docker-compose up -d
```

This command will:
- Build the ETL container
- Start the PostgreSQL database
- Initialize the database schema using `0_init_db.sql`
- Mount necessary volumes
- Wait for database health check

### 4. Verify Services are Running

```bash
docker-compose ps
```

You should see both `steam-etl-db` and `steam-etl-cron` containers running.

## Running the ETL Pipeline

### Full Pipeline Execution

To run the complete ETL pipeline:

```bash
docker exec steam-etl-cron bash /scripts/run_etl.sh
```

### Individual Steps

#### Step 1: Preprocessing (Python)
Currently commented out in the main script. To run manually:

```bash
docker exec steam-etl-cron python3 /scripts/preprocessing/preprocess.py
```

#### Step 2: Load to Staging
Load raw JSON data into the staging schema:

```bash
docker exec steam-etl-cron psql -v ON_ERROR_STOP=1 -f /scripts/1_load.sql
```

#### Step 3: Transform Data
Process and normalize data into the final schema:

```bash
docker exec steam-etl-cron psql -v ON_ERROR_STOP=1 -f /scripts/2_transform.sql
```

## Database Access

### Connect via Docker

```bash
docker exec -it steam-etl-db psql -U postgres -d steamdb
```

### Connect from Host Machine

```bash
psql -h localhost -p 5435 -U postgres -d steamdb
```

**Password**: `root`

### Useful SQL Queries

Check ETL job logs:
```sql
SELECT * FROM log.logs ORDER BY start_date DESC LIMIT 10;
```

View game count:
```sql
SELECT COUNT(*) FROM processed.game;
```

View games with developers:
```sql
SELECT g.name, d.name as developer
FROM processed.game g
JOIN processed.game_developer gd ON g.game_id = gd.game_id
JOIN processed.developer d ON gd.developer_id = d.developer_id
LIMIT 10;
```

Check staging data:
```sql
SELECT COUNT(*) FROM staging.staging_events;
```

## Key Features

### Data Validation
- JSON validation before processing
- Date parsing with multiple format support
- Automatic data type coercion with defaults
- String truncation to prevent overflow errors

### Incremental Loading
The pipeline supports incremental loads by tracking the `load_date` timestamp. Only new data since the last successful load is processed.

### Error Handling
- Comprehensive error logging in the `log.logs` table
- Transaction rollback on failures
- Detailed error messages with line numbers

### Data Normalization
- Proper normalization to avoid data redundancy
- Junction tables for many-to-many relationships
- Unique constraints to prevent duplicates

## Monitoring and Logs

### View ETL Container Logs

```bash
docker logs steam-etl-cron
```

### View Database Container Logs

```bash
docker logs steam-etl-db
```

### Check Job Status

```sql
SELECT 
    log_id,
    jobname,
    status,
    start_date,
    end_date,
    EXTRACT(EPOCH FROM (COALESCE(end_date, NOW()) - start_date)) as duration_seconds,
    error_message
FROM log.logs
ORDER BY start_date DESC;
```

## Stopping and Cleanup

### Stop Services

```bash
docker-compose down
```

### Stop and Remove Volumes (⚠️ This will delete all data)

```bash
docker-compose down -v
```

### Restart Services

```bash
docker-compose restart
```

## Troubleshooting

### Database Connection Issues

If you can't connect to the database:
1. Check if the container is running: `docker-compose ps`
2. Check database logs: `docker logs steam-etl-db`
3. Verify port 5435 is not in use: `netstat -an | findstr 5435` (Windows) or `lsof -i :5435` (Mac/Linux)

### ETL Script Failures

1. Check the logs table for error messages
2. View container logs: `docker logs steam-etl-cron`
3. Connect to the database and manually run problematic SQL statements
4. Check data format in the source JSON files

### Out of Memory Errors

If processing large datasets:
1. Increase Docker memory allocation in Docker Desktop settings
2. Process data in smaller batches
3. Add indexes to improve query performance

### Permission Issues (Linux/Mac)

If you encounter permission errors:
```bash
chmod +x scripts/run_etl.sh
```

## Configuration

### Database Credentials

Edit `docker-compose.yml` to change database credentials:

```yaml
environment:
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: root
  POSTGRES_DB: steamdb
```

### Port Mapping

To change the database port, edit `docker-compose.yml`:

```yaml
ports:
  - "5435:5432"  # Change 5435 to your desired port
```

## Development

### Modifying SQL Scripts

After modifying SQL scripts, you don't need to rebuild containers. Changes are reflected immediately due to volume mounts.

### Rebuilding Containers

If you modify the Dockerfile:

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Adding New Transformations

1. Edit `scripts/2_transform.sql`
2. Add new tables in `scripts/0_init_db.sql` if needed
3. Test the changes:
   ```bash
   docker exec steam-etl-cron bash /scripts/run_etl.sh
   ```

## Performance Considerations

- The pipeline uses temporary tables for efficient processing
- Indexes are created on foreign keys for join performance
- UNIQUE constraints enable fast conflict detection
- The incremental load mechanism reduces processing time for updates

## License

[Add your license information here]

## Contributors

[Add contributor information here]

## Support

For issues and questions, please [create an issue](link-to-issues) in the repository.
