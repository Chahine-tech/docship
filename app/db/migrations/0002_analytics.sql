CREATE TABLE IF NOT EXISTS page_views (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  path TEXT NOT NULL,
  viewed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS search_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  searched_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_page_views_project_viewed ON page_views(project_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_search_events_project ON search_events(project_id, searched_at);
