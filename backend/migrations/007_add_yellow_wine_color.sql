ALTER TABLE wines DROP CONSTRAINT IF EXISTS wines_color_check;
ALTER TABLE wines ADD CONSTRAINT wines_color_check
    CHECK (color IN ('red','white','rosé','sparkling','dessert','orange','yellow'));
