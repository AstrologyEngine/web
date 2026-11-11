-- CMS schema. See docs/designs/cms.md §6.1. Migrations are additive-only.

CREATE TABLE locales (
  code        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  is_default  INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  fallback    TEXT REFERENCES locales (code) ON DELETE SET NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX locales_single_default ON locales (is_default) WHERE is_default = 1;

CREATE TABLE translations (
  collection  TEXT NOT NULL,
  key         TEXT NOT NULL,
  locale      TEXT NOT NULL REFERENCES locales (code) ON DELETE CASCADE,
  fields      TEXT NOT NULL CHECK (json_valid(fields)),
  revision    INTEGER NOT NULL DEFAULT 1,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (collection, key, locale)
);
CREATE INDEX translations_locale ON translations (locale);

CREATE TABLE revisions (
  id          INTEGER PRIMARY KEY,
  subject     TEXT NOT NULL CHECK (subject IN ('translation', 'locale')),
  action      TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  collection  TEXT,
  key         TEXT,
  locale      TEXT,
  before      TEXT,
  after       TEXT,
  actor       TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX revisions_lookup ON revisions (collection, key, locale, id);

CREATE TABLE meta (
  key    TEXT PRIMARY KEY,
  value  INTEGER NOT NULL
);

INSERT INTO meta (key, value) VALUES ('content_version', 1);
INSERT INTO locales (code, name, enabled, is_default, fallback, created_at, updated_at)
VALUES ('en', 'English', 1, 1, NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
