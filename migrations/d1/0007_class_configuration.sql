ALTER TABLE classes ADD COLUMN class_type TEXT NOT NULL DEFAULT 'standard' CHECK (class_type IN ('standard', 'individual', 'common'));
ALTER TABLE classes ADD COLUMN auto_attendance INTEGER NOT NULL DEFAULT 0 CHECK (auto_attendance IN (0, 1));
ALTER TABLE classes ADD COLUMN id_card_file TEXT;
ALTER TABLE classes ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

CREATE INDEX IF NOT EXISTS classes_school_status_order_idx ON classes (school_id, status, sort_order, name);
