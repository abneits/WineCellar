CREATE TABLE IF NOT EXISTS consumption_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cellar_entry_id UUID NOT NULL REFERENCES cellar_entries(id) ON DELETE CASCADE,
    wine_id         UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    consumed_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    occasion        VARCHAR(255) NOT NULL DEFAULT '',
    rated           BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_consumption_log_wine_id ON consumption_log(wine_id);
CREATE INDEX IF NOT EXISTS idx_consumption_log_rated ON consumption_log(rated) WHERE rated = false;
