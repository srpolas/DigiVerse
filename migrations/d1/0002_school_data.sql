PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  eiin TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS school_memberships (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('school_admin', 'teacher', 'office_clerk', 'student', 'guardian')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, user_id)
);

CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (ends_on >= starts_on),
  UNIQUE (school_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_current_academic_year_per_school
  ON academic_years (school_id) WHERE is_current = 1;

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, name),
  UNIQUE (school_id, id)
);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (class_id, name),
  UNIQUE (school_id, id),
  FOREIGN KEY (school_id, class_id) REFERENCES classes(school_id, id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  section_id TEXT,
  student_code TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  full_name_bn TEXT,
  date_of_birth TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  photo_object_key TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'transferred')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, student_code),
  FOREIGN KEY (school_id, class_id) REFERENCES classes(school_id, id),
  FOREIGN KEY (school_id, section_id) REFERENCES sections(school_id, id)
);

CREATE INDEX IF NOT EXISTS students_school_class_idx ON students (school_id, class_id, status);
CREATE INDEX IF NOT EXISTS school_memberships_user_idx ON school_memberships (user_id, school_id);
CREATE UNIQUE INDEX IF NOT EXISTS students_unique_roll_idx
  ON students (school_id, class_id, COALESCE(section_id, ''), roll_number);
