ALTER TABLE wines
    ADD COLUMN IF NOT EXISTS enrichment_confidence DECIMAL(3,2);
