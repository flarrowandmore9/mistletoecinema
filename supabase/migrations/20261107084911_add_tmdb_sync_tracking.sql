/*
# Add TMDB sync tracking to the catalog

1. Modified tables
- `movies`: adds `tmdb_id` (integer, unique, nullable) to match each film with its TMDB record, and `last_synced_at` (timestamptz, nullable) to record when TMDB last refreshed it.

2. New tables
- `catalog_sync`: one row per external source (id `tmdb`) storing the time of the last successful sync and a short status message shown in the app.

3. Security
- `catalog_sync` has RLS enabled. Anyone (anon and signed-in users) can read it so the app can show the last update time. Only the server function (service role) writes to it.
- `movies` keeps its existing policies. The service role is granted write access so the sync function can upsert films.

4. Notes
- Existing films (m_101 to m_114) keep their ids and get no tmdb_id until they are matched by a sync.
- Every statement is idempotent.
*/

ALTER TABLE movies ADD COLUMN IF NOT EXISTS tmdb_id integer;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS movies_tmdb_id_key ON movies (tmdb_id);
GRANT INSERT, UPDATE ON movies TO service_role;

CREATE TABLE IF NOT EXISTS catalog_sync (
  id text PRIMARY KEY,
  last_synced_at timestamptz,
  last_status text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalog_sync ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON catalog_sync TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON catalog_sync TO service_role;

DROP POLICY IF EXISTS "select_catalog_sync" ON catalog_sync;
CREATE POLICY "select_catalog_sync" ON catalog_sync FOR SELECT
  TO anon, authenticated USING (true);
