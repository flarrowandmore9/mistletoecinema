/*
# Create Christmas movies catalog

1. New Tables
- `movies`: one row per Christmas movie. Holds title, year, release date (used by the calendar), director, synopsis, optional poster image link, runtime, and a "watched" flag.
- `movie_platforms`: where a movie can be watched. Each row links a movie to a platform (e.g. Netflix) with the offer type (streaming, rent, buy, cinema) and an optional link.

2. Security
- RLS enabled on both tables.
- The app has no sign-in, so the shared catalog is readable and writable by `anon` and `authenticated`.
- Grants limited to the verbs the app uses (select, insert, update, delete).

3. Notes
- Deleting a movie automatically deletes its platform entries (cascade).
- Each movie can be linked to a given platform and offer type only once.
*/

CREATE TABLE IF NOT EXISTS movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  year integer,
  release_date date,
  director text,
  synopsis text,
  poster_url text,
  runtime_minutes integer,
  watched boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS movies_release_date_idx ON movies (release_date);

CREATE TABLE IF NOT EXISTS movie_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  platform text NOT NULL,
  offer_type text NOT NULL DEFAULT 'streaming' CHECK (offer_type IN ('streaming', 'rent', 'buy', 'cinema')),
  url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movie_id, platform, offer_type)
);

CREATE INDEX IF NOT EXISTS movie_platforms_movie_id_idx ON movie_platforms (movie_id);
CREATE INDEX IF NOT EXISTS movie_platforms_platform_idx ON movie_platforms (platform);

ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE movie_platforms ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON movies TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON movie_platforms TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_movies" ON movies;
CREATE POLICY "anon_select_movies" ON movies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_movies" ON movies;
CREATE POLICY "anon_insert_movies" ON movies FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_movies" ON movies;
CREATE POLICY "anon_update_movies" ON movies FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_movies" ON movies;
CREATE POLICY "anon_delete_movies" ON movies FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_movie_platforms" ON movie_platforms;
CREATE POLICY "anon_select_movie_platforms" ON movie_platforms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_movie_platforms" ON movie_platforms;
CREATE POLICY "anon_insert_movie_platforms" ON movie_platforms FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_movie_platforms" ON movie_platforms;
CREATE POLICY "anon_update_movie_platforms" ON movie_platforms FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_movie_platforms" ON movie_platforms;
CREATE POLICY "anon_delete_movie_platforms" ON movie_platforms FOR DELETE
  TO anon, authenticated USING (true);
