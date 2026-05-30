-- Full-text search index for doc pages
CREATE VIRTUAL TABLE IF NOT EXISTS doc_search USING fts5(
  slug UNINDEXED,
  version UNINDEXED,
  path UNINDEXED,
  title,
  body,
  tokenize = 'unicode61 remove_diacritics 1'
);

-- Per-project read token for sharing access to private docs
ALTER TABLE projects ADD COLUMN read_token TEXT;
