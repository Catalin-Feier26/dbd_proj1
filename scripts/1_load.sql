/* ======================================================
   SCRIPT: 1_load.sql
   PURPOSE: Load the preprocessed JSONL file into the staging table.
   ====================================================== */

-- Clear the staging table first to make the job re-runnable
TRUNCATE TABLE staging.staging_events;

-- Use \COPY and specify the path DIRECTLY, without a variable.
-- This is more robust and avoids parsing issues.
\COPY staging.staging_events (content) FROM '/data/games.jsonl';

-- Analyze the table for better query performance
ANALYZE staging.staging_events;