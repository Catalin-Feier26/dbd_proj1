TRUNCATE TABLE staging.staging_events;
\COPY staging.staging_events (content) FROM '/data/games.jsonl';
ANALYZE staging.staging_events;
