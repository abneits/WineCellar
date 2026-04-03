-- 005_add_wine_status.sql
ALTER TABLE wines
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'validated';

-- Existing wines get 'validated'; new scanned bottles will use 'pending_recognition'
CREATE INDEX IF NOT EXISTS idx_wines_status ON wines(status);
