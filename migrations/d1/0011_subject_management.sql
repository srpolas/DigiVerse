CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  numerical_number INTEGER,
  amount INTEGER NOT NULL DEFAULT 0 CHECK (amount >= 0),
  group_names TEXT NOT NULL DEFAULT '[]',
  bind_subject_id TEXT,
  teacher_id TEXT,
  marking_types TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, id),
  UNIQUE (school_id, name),
  FOREIGN KEY (school_id, bind_subject_id) REFERENCES subjects(school_id, id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS subjects_school_code_idx
  ON subjects (school_id, code) WHERE code IS NOT NULL AND code <> '';

CREATE TABLE IF NOT EXISTS subject_classes (
  id TEXT PRIMARY KEY,
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  teacher_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, class_id, subject_id),
  FOREIGN KEY (school_id, class_id) REFERENCES classes(school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (school_id, subject_id) REFERENCES subjects(school_id, id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

CREATE TABLE IF NOT EXISTS student_subject_profiles (
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  customized INTEGER NOT NULL DEFAULT 0 CHECK (customized IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (school_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_subjects (
  school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (school_id, student_id, subject_id),
  FOREIGN KEY (school_id, subject_id) REFERENCES subjects(school_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS subject_classes_class_idx ON subject_classes (school_id, class_id, subject_id);
CREATE INDEX IF NOT EXISTS student_subjects_student_idx ON student_subjects (school_id, student_id);
