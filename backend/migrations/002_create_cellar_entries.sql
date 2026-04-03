CREATE TABLE IF NOT EXISTS cellar_entries (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wine_id        UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    location       VARCHAR(100) NOT NULL DEFAULT '',
    purchase_date  DATE,
    purchase_price DECIMAL(10,2),
    added_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cellar_entries_wine_id ON cellar_entries(wine_id);
