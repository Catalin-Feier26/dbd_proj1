
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS processed;
CREATE SCHEMA IF NOT EXISTS log;
COMMENT ON SCHEMA staging IS 'Schema for raw, unprocessed data loaded from source files.';
COMMENT ON SCHEMA processed IS 'Schema for cleaned, normalized, and production-ready data.';
COMMENT ON SCHEMA log IS 'Schema for logging ELT job executions, status, and errors.';

CREATE TABLE IF NOT EXISTS log.logs (
    log_id      BIGSERIAL PRIMARY KEY,
    jobname     VARCHAR(200) NOT NULL,
    "status"    VARCHAR(20) NOT NULL 
        CHECK ("status" IN ('STARTED', 'SUCCESS', 'FAILED')),
    error_message TEXT NULL,
    start_date  TIMESTAMPTZ NOT NULL DEFAULT (NOW()),
    end_date    TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS IX_logs_jobname ON log.logs(jobname);
CREATE INDEX IF NOT EXISTS IX_logs_status ON log.logs("status");
COMMENT ON TABLE log.logs IS 'Tracks the execution history and status of all ELT jobs.';

CREATE TABLE IF NOT EXISTS staging.staging_events (
    stag_event_id BIGSERIAL PRIMARY KEY,
    content       TEXT NULL,
    load_date     TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);
COMMENT ON TABLE staging.staging_events IS 'Staging table for raw JSONL data from the games dataset.';
COMMENT ON COLUMN staging.staging_events.content IS 'The raw, unprocessed JSON object for a single game.';

CREATE TABLE IF NOT EXISTS processed.game (
    game_id         BIGSERIAL PRIMARY KEY,
    app_id          BIGINT NOT NULL UNIQUE, 
    name            VARCHAR(500) NOT NULL,
    release_date    DATE NULL,
    price           NUMERIC(10, 2) DEFAULT 0.00,
    required_age    INT DEFAULT 0,
    dlc_count       INT DEFAULT 0,
    short_description TEXT NULL,
    header_image    VARCHAR(2048) NULL,
    website         VARCHAR(2048) NULL,
    windows         BOOLEAN DEFAULT false,
    mac             BOOLEAN DEFAULT false,
    linux           BOOLEAN DEFAULT false,
    metacritic_score INT DEFAULT 0,
    recommendations INT DEFAULT 0,
    positive_ratings INT DEFAULT 0,
    negative_ratings INT DEFAULT 0,
    average_playtime_forever INT DEFAULT 0,
    load_date       TIMESTAMPTZ NOT NULL DEFAULT (NOW())
);
CREATE INDEX IF NOT EXISTS IX_game_app_id ON processed.game(app_id);
CREATE INDEX IF NOT EXISTS IX_game_name ON processed.game(name);
COMMENT ON TABLE processed.game IS 'Main table for individual game details.';
COMMENT ON COLUMN processed.game.app_id IS 'The unique Steam App ID.';
CREATE TABLE IF NOT EXISTS processed.developer (
    developer_id BIGSERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL UNIQUE
);
COMMENT ON TABLE processed.developer IS 'Dimension table for game developers.';
CREATE TABLE IF NOT EXISTS processed.publisher (
    publisher_id BIGSERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL UNIQUE
);
COMMENT ON TABLE processed.publisher IS 'Dimension table for game publishers.';
CREATE TABLE IF NOT EXISTS processed.genre (
    genre_id BIGSERIAL PRIMARY KEY,
    name     VARCHAR(255) NOT NULL UNIQUE
);
COMMENT ON TABLE processed.genre IS 'Dimension table for game genres.';
CREATE TABLE IF NOT EXISTS processed.category (
    category_id BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE
);
COMMENT ON TABLE processed.category IS 'Dimension table for game categories (e.g., Single-player).';
CREATE TABLE IF NOT EXISTS processed.tag (
    tag_id BIGSERIAL PRIMARY KEY,
    name   VARCHAR(255) NOT NULL UNIQUE
);
COMMENT ON TABLE processed.tag IS 'Dimension table for user-defined tags.';
CREATE TABLE IF NOT EXISTS processed.game_developer (
    game_developer_id BIGSERIAL PRIMARY KEY,
    game_id      BIGINT NOT NULL,
    developer_id BIGINT NOT NULL,
    CONSTRAINT FK_game_dev_game FOREIGN KEY(game_id) REFERENCES processed.game(game_id) ON DELETE CASCADE,
    CONSTRAINT FK_game_dev_dev FOREIGN KEY(developer_id) REFERENCES processed.developer(developer_id) ON DELETE CASCADE,
    CONSTRAINT UQ_game_developer UNIQUE (game_id, developer_id)
);
CREATE INDEX IF NOT EXISTS IX_game_developer_game_id ON processed.game_developer(game_id);
CREATE INDEX IF NOT EXISTS IX_game_developer_dev_id ON processed.game_developer(developer_id);
CREATE TABLE IF NOT EXISTS processed.game_publisher (
    game_publisher_id BIGSERIAL PRIMARY KEY,
    game_id      BIGINT NOT NULL,
    publisher_id BIGINT NOT NULL,
    CONSTRAINT FK_game_pub_game FOREIGN KEY(game_id) REFERENCES processed.game(game_id) ON DELETE CASCADE,
    CONSTRAINT FK_game_pub_pub FOREIGN KEY(publisher_id) REFERENCES processed.publisher(publisher_id) ON DELETE CASCADE,
    CONSTRAINT UQ_game_publisher UNIQUE (game_id, publisher_id)
);
CREATE INDEX IF NOT EXISTS IX_game_publisher_game_id ON processed.game_publisher(game_id);
CREATE INDEX IF NOT EXISTS IX_game_publisher_pub_id ON processed.game_publisher(publisher_id);
CREATE TABLE IF NOT EXISTS processed.game_genre (
    game_genre_id BIGSERIAL PRIMARY KEY,
    game_id  BIGINT NOT NULL,
    genre_id BIGINT NOT NULL,
    CONSTRAINT FK_game_gen_game FOREIGN KEY(game_id) REFERENCES processed.game(game_id) ON DELETE CASCADE,
    CONSTRAINT FK_game_gen_gen FOREIGN KEY(genre_id) REFERENCES processed.genre(genre_id) ON DELETE CASCADE,
    CONSTRAINT UQ_game_genre UNIQUE (game_id, genre_id)
);
CREATE INDEX IF NOT EXISTS IX_game_genre_game_id ON processed.game_genre(game_id);
CREATE INDEX IF NOT EXISTS IX_game_genre_gen_id ON processed.game_genre(genre_id);
CREATE TABLE IF NOT EXISTS processed.game_category (
    game_category_id BIGSERIAL PRIMARY KEY,
    game_id     BIGINT NOT NULL,
    category_id BIGINT NOT NULL,
    CONSTRAINT FK_game_cat_game FOREIGN KEY(game_id) REFERENCES processed.game(game_id) ON DELETE CASCADE,
    CONSTRAINT FK_game_cat_cat FOREIGN KEY(category_id) REFERENCES processed.category(category_id) ON DELETE CASCADE,
    CONSTRAINT UQ_game_category UNIQUE (game_id, category_id)
);
CREATE INDEX IF NOT EXISTS IX_game_category_game_id ON processed.game_category(game_id);
CREATE INDEX IF NOT EXISTS IX_game_category_cat_id ON processed.game_category(category_id);
CREATE TABLE IF NOT EXISTS processed.game_tag (
    game_tag_id BIGSERIAL PRIMARY KEY,
    game_id BIGINT NOT NULL,
    tag_id  BIGINT NOT NULL,
    tag_count INT NOT NULL, 
    CONSTRAINT FK_game_tag_game FOREIGN KEY(game_id) REFERENCES processed.game(game_id) ON DELETE CASCADE,
    CONSTRAINT FK_game_tag_tag FOREIGN KEY(tag_id) REFERENCES processed.tag(tag_id) ON DELETE CASCADE,
    CONSTRAINT UQ_game_tag UNIQUE (game_id, tag_id)
);
CREATE INDEX IF NOT EXISTS IX_game_tag_game_id ON processed.game_tag(game_id);
CREATE INDEX IF NOT EXISTS IX_game_tag_tag_id ON processed.game_tag(tag_id);
