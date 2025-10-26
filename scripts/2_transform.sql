CREATE SCHEMA IF NOT EXISTS processed;

CREATE OR REPLACE FUNCTION processed.is_valid_json(input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM input::jsonb;
    RETURN TRUE;
EXCEPTION
    WHEN others THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.try_to_date(date_text TEXT)
RETURNS DATE AS $$
DECLARE
    formats TEXT[] := ARRAY['Mon DD, YYYY', 'DD Mon, YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'];
    fmt TEXT;
    result DATE;
BEGIN
    IF date_text IS NULL OR TRIM(date_text) = '' THEN
        RETURN NULL;
    END IF;

    FOREACH fmt IN ARRAY formats
    LOOP
        BEGIN
            result := to_date(TRIM(date_text), fmt);
            RETURN result;
        EXCEPTION
            WHEN OTHERS THEN
                CONTINUE;
        END;
    END LOOP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION processed.usp_load_from_staging()
RETURNS VOID AS $$
DECLARE
    _cutoff_date TIMESTAMPTZ := COALESCE(
        (SELECT MAX(load_date) FROM processed.game),
        '1900-01-01'::timestamptz
    );
BEGIN
    CREATE TEMP TABLE temp_valid_json (
        data jsonb,
        load_date timestamptz
    ) ON COMMIT DROP;

    INSERT INTO temp_valid_json (data, load_date)
    SELECT
        s.content::jsonb,
        s.load_date
    FROM staging.staging_events s
    WHERE
        s.load_date > _cutoff_date
        AND s.content IS NOT NULL
        AND processed.is_valid_json(s.content);

    CREATE TEMP TABLE temp_clean_game (
        app_id bigint,
        name varchar(500),
        release_date date,
        price numeric(10,2),
        required_age int,
        dlc_count int,
        short_description text,
        header_image varchar(2048),
        website varchar(2048),
        windows boolean,
        mac boolean,
        linux boolean,
        metacritic_score int,
        recommendations int,
        positive_ratings int,
        negative_ratings int,
        average_playtime_forever int,
        load_date timestamptz
    ) ON COMMIT DROP;

    INSERT INTO temp_clean_game
    SELECT
        (data ->> 'app_id')::bigint AS app_id,
        data ->> 'name' AS name,
        public.try_to_date(data ->> 'release_date') AS release_date,
        (data ->> 'price')::numeric(10,2) AS price,
        COALESCE((data ->> 'required_age')::int, 0) AS required_age,
        COALESCE((data ->> 'dlc_count')::int, 0) AS dlc_count,
        data ->> 'short_description',
        data ->> 'header_image',
        data ->> 'website',
        COALESCE((data ->> 'windows')::boolean, false) AS windows,
        COALESCE((data ->> 'mac')::boolean, false) AS mac,
        COALESCE((data ->> 'linux')::boolean, false) AS linux,
        COALESCE((data ->> 'metacritic_score')::int, 0) AS metacritic_score,
        COALESCE((data ->> 'recommendations')::int, 0) AS recommendations,
        COALESCE((data ->> 'positive')::int, 0) AS positive_ratings,
        COALESCE((data ->> 'negative')::int, 0) AS negative_ratings,
        COALESCE((data ->> 'average_playtime_forever')::int, 0) AS average_playtime_forever,
        load_date
    FROM temp_valid_json
    WHERE (data ->> 'app_id') IS NOT NULL
      AND (data ->> 'name') IS NOT NULL;

    INSERT INTO processed.game (
        app_id, name, release_date, price, required_age, dlc_count,
        short_description, header_image, website, windows, mac, linux,
        metacritic_score, recommendations, positive_ratings, negative_ratings,
        average_playtime_forever, load_date
    )
    SELECT * FROM temp_clean_game
    ON CONFLICT (app_id) DO UPDATE SET
        name = EXCLUDED.name,
        release_date = EXCLUDED.release_date,
        price = EXCLUDED.price,
        required_age = EXCLUDED.required_age,
        dlc_count = EXCLUDED.dlc_count,
        short_description = EXCLUDED.short_description,
        header_image = EXCLUDED.header_image,
        website = EXCLUDED.website,
        windows = EXCLUDED.windows,
        mac = EXCLUDED.mac,
        linux = EXCLUDED.linux,
        metacritic_score = EXCLUDED.metacritic_score,
        recommendations = EXCLUDED.recommendations,
        positive_ratings = EXCLUDED.positive_ratings,
        negative_ratings = EXCLUDED.negative_ratings,
        average_playtime_forever = EXCLUDED.average_playtime_forever,
        load_date = EXCLUDED.load_date;

    INSERT INTO processed.developer (name)
    SELECT DISTINCT LEFT(TRIM(d.name), 255)
    FROM temp_valid_json
    CROSS JOIN LATERAL jsonb_array_elements_text(data -> 'developers') AS d(name)
    WHERE jsonb_typeof(data -> 'developers') = 'array'
      AND NULLIF(TRIM(d.name), '') IS NOT NULL
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO processed.game_developer (game_id, developer_id)
    SELECT DISTINCT g.game_id, d.developer_id
    FROM temp_valid_json
    CROSS JOIN LATERAL jsonb_array_elements_text(data -> 'developers') AS dev_name(name)
    JOIN processed.game g ON (temp_valid_json.data ->> 'app_id')::bigint = g.app_id
    JOIN processed.developer d ON LEFT(TRIM(dev_name.name), 255) = d.name
    WHERE jsonb_typeof(temp_valid_json.data -> 'developers') = 'array'
    ON CONFLICT (game_id, developer_id) DO NOTHING;

    INSERT INTO processed.publisher (name)
    SELECT DISTINCT TRIM(p.name)
    FROM temp_valid_json
    CROSS JOIN LATERAL jsonb_array_elements_text(data -> 'publishers') AS p(name)
    WHERE jsonb_typeof(data -> 'publishers') = 'array'
      AND NULLIF(TRIM(p.name), '') IS NOT NULL
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO processed.game_publisher (game_id, publisher_id)
    SELECT DISTINCT g.game_id, p.publisher_id
    FROM temp_valid_json
    CROSS JOIN LATERAL jsonb_array_elements_text(data -> 'publishers') AS pub_name(name)
    JOIN processed.game g ON (temp_valid_json.data ->> 'app_id')::bigint = g.app_id
    JOIN processed.publisher p ON TRIM(pub_name.name) = p.name
    WHERE jsonb_typeof(temp_valid_json.data -> 'publishers') = 'array'
    ON CONFLICT (game_id, publisher_id) DO NOTHING;

    INSERT INTO processed.genre (name)
    SELECT DISTINCT TRIM(g.name)
    FROM temp_valid_json
    CROSS JOIN LATERAL jsonb_array_elements_text(data -> 'genres') AS g(name)
    WHERE jsonb_typeof(data -> 'genres') = 'array'
      AND NULLIF(TRIM(g.name), '') IS NOT NULL
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO processed.game_genre (game_id, genre_id)
    SELECT DISTINCT g.game_id, gen.genre_id
    FROM temp_valid_json
    CROSS JOIN LATERAL jsonb_array_elements_text(data -> 'genres') AS genre_name(name)
    JOIN processed.game g ON (temp_valid_json.data ->> 'app_id')::bigint = g.app_id
    JOIN processed.genre gen ON TRIM(genre_name.name) = gen.name
    WHERE jsonb_typeof(temp_valid_json.data -> 'genres') = 'array'
    ON CONFLICT (game_id, genre_id) DO NOTHING;

    INSERT INTO processed.category (name)
    SELECT DISTINCT TRIM(c.name)
    FROM temp_valid_json
    CROSS JOIN LATERAL jsonb_array_elements_text(data -> 'categories') AS c(name)
    WHERE jsonb_typeof(data -> 'categories') = 'array'
      AND NULLIF(TRIM(c.name), '') IS NOT NULL
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO processed.game_category (game_id, category_id)
    SELECT DISTINCT g.game_id, c.category_id
    FROM temp_valid_json
    CROSS JOIN LATERAL jsonb_array_elements_text(data -> 'categories') AS cat_name(name)
    JOIN processed.game g ON (temp_valid_json.data ->> 'app_id')::bigint = g.app_id
    JOIN processed.category c ON TRIM(cat_name.name) = c.name
    WHERE jsonb_typeof(temp_valid_json.data -> 'categories') = 'array'
    ON CONFLICT (game_id, category_id) DO NOTHING;

    INSERT INTO processed.tag (name)
    SELECT DISTINCT TRIM(t.key)
    FROM temp_valid_json
    CROSS JOIN LATERAL jsonb_object_keys(data -> 'tags') AS t(key)
    WHERE jsonb_typeof(data -> 'tags') = 'object'
      AND NULLIF(TRIM(t.key), '') IS NOT NULL
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO processed.game_tag (game_id, tag_id, tag_count)
    SELECT DISTINCT g.game_id, t.tag_id, (tag_data.value)::int AS tag_count
    FROM temp_valid_json
    CROSS JOIN LATERAL jsonb_each_text(data -> 'tags') AS tag_data(key, value)
    JOIN processed.game g ON (temp_valid_json.data ->> 'app_id')::bigint = g.app_id
    JOIN processed.tag t ON TRIM(tag_data.key) = t.name
    WHERE jsonb_typeof(temp_valid_json.data -> 'tags') = 'object'
    ON CONFLICT (game_id, tag_id) DO UPDATE SET
        tag_count = EXCLUDED.tag_count;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Transform Function Failed: %, %', SQLSTATE, SQLERRM;
        RAISE;
END;
$$ LANGUAGE plpgsql;

SELECT processed.usp_load_from_staging();