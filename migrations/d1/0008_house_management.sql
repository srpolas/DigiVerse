ALTER TABLE sections ADD COLUMN house_code TEXT;
ALTER TABLE sections ADD COLUMN nickname TEXT;
ALTER TABLE sections ADD COLUMN teacher_id TEXT;
ALTER TABLE sections ADD COLUMN shift TEXT NOT NULL DEFAULT '';
ALTER TABLE sections ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sections ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY school_id ORDER BY created_at, id) AS row_number
  FROM sections
)
UPDATE sections SET house_code = (
  SELECT 'H' || printf('%05d', numbered.row_number)
  FROM numbered WHERE numbered.id = sections.id
) WHERE house_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sections_school_house_code_idx ON sections (school_id, house_code);
CREATE INDEX IF NOT EXISTS sections_school_class_order_idx ON sections (school_id, class_id, status, sort_order);
