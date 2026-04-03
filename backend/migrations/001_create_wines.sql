CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS wines (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                VARCHAR(255) NOT NULL,
    appellation         VARCHAR(255) NOT NULL DEFAULT '',
    region              VARCHAR(255) NOT NULL DEFAULT '',
    country             VARCHAR(100) NOT NULL DEFAULT '',
    producer            VARCHAR(255) NOT NULL DEFAULT '',
    vintage             INTEGER,
    color               VARCHAR(20) NOT NULL DEFAULT 'red'
                        CHECK (color IN ('red','white','rosé','sparkling','dessert','orange')),
    grape_varieties     JSONB NOT NULL DEFAULT '[]',
    alcohol_content     DECIMAL(4,2),
    description         TEXT NOT NULL DEFAULT '',
    tasting_notes       JSONB NOT NULL DEFAULT '{}',
    food_pairings       JSONB NOT NULL DEFAULT '[]',
    peak_maturity_start INTEGER,
    peak_maturity_end   INTEGER,
    average_price       DECIMAL(10,2),
    ai_confidence       DECIMAL(3,2),
    ai_raw_response     JSONB,
    web_search_data     JSONB,
    image               BYTEA,
    image_thumbnail     BYTEA,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wines_color ON wines(color);
CREATE INDEX IF NOT EXISTS idx_wines_vintage ON wines(vintage);
CREATE INDEX IF NOT EXISTS idx_wines_country ON wines(country);
CREATE INDEX IF NOT EXISTS idx_wines_name ON wines USING gin(to_tsvector('english', name));
