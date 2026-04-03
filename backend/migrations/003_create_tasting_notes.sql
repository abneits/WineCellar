CREATE TABLE IF NOT EXISTS tasting_notes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wine_id    UUID NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT NOT NULL DEFAULT '',
    tasted_at  DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasting_notes_wine_id ON tasting_notes(wine_id);
