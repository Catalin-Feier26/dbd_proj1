CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE OR REPLACE FUNCTION public.run_load_dataset_job()
RETURNS VOID AS $$
BEGIN
    INSERT INTO log.logs(jobname, "status", start_date)
    VALUES ('ETL: Load to Staging', 'STARTED', NOW());

    TRUNCATE TABLE staging.staging_events;
    COPY staging.staging_events (content) FROM '/data/games.jsonl';
    ANALYZE staging.staging_events;

    UPDATE log.logs
    SET "status" = 'SUCCESS', end_date = NOW()
    WHERE jobname = 'ETL: Load to Staging' AND "status" = 'STARTED';
EXCEPTION
    WHEN OTHERS THEN
        UPDATE log.logs
        SET "status" = 'FAILED', error_message = SQLERRM, end_date = NOW()
    WHERE jobname = 'ETL: Load to Staging' AND "status" = 'STARTED';
        RAISE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.load_production_data()
RETURNS VOID AS $$
BEGIN
    INSERT INTO log.logs(jobname, "status", start_date)
    VALUES ('ETL: Transform to Processed', 'STARTED', NOW());

    PERFORM processed.usp_load_from_staging();

    UPDATE log.logs
    SET "status" = 'SUCCESS', end_date = NOW()
    WHERE jobname = 'ETL: Transform to Processed' AND "status" = 'STARTED';
EXCEPTION
    WHEN OTHERS THEN
        UPDATE log.logs
        SET "status" = 'FAILED', error_message = SQLERRM, end_date = NOW()
    WHERE jobname = 'ETL: Transform to Processed' AND "status" = 'STARTED';
        RAISE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.run_daily_etl()
RETURNS VOID AS $$
BEGIN
    PERFORM public.run_load_dataset_job();
    PERFORM public.load_production_data();
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule(
    'daily-etl',
    '0 2 * * *',
    $$ SELECT public.run_daily_etl(); $$
);

