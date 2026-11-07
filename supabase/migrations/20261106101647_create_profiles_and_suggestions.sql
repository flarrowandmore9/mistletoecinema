/*
# Create profiles and suggestions, with admin role

1. New Tables
- `profiles`: one row per account. Holds display name, chosen profile picture (preset key), Christmas emoji, role (user or admin) and registration date.
- `suggestions`: movie suggestions sent by visitors. Holds title, notes, submitter name, and moderation status.

2. Functions and triggers
- `is_admin()`: returns true when the signed-in account has the admin role. Used by policies.
- `handle_new_user()`: runs after a new account is created and creates its profile. The account using the admin email receives the admin role.

3. Security
- RLS enabled on both tables.
- Profiles: each person can read and edit only their own profile. Editing is limited to name, picture and emoji, so nobody can change their own role. Admins can read all profiles.
- Suggestions: anyone (including visitors) can insert a suggestion. Only admins can read suggestions and change their status. Nobody can delete through the app.
- Trigger and helper functions cannot be called by anonymous visitors.

4. Notes
- The admin role is granted only to the account registered with the admin email. Register that account first.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 60),
  avatar_key text NOT NULL DEFAULT 'tree' CHECK (char_length(avatar_key) <= 40),
  christmas_emoji text NOT NULL DEFAULT '🎄' CHECK (char_length(christmas_emoji) <= 16),
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON profiles FROM anon, authenticated;
GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (display_name, avatar_key, christmas_emoji) ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "select_all_profiles_admin" ON profiles;
CREATE POLICY "select_all_profiles_admin" ON profiles FOR SELECT
TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(split_part(NEW.email, '@', 1), ''),
    CASE WHEN lower(NEW.email) = 'flarrowandmoreweb@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO profiles (id, display_name, role)
SELECT u.id, split_part(u.email, '@', 1), 'user'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

UPDATE profiles SET role = 'admin'
WHERE id IN (SELECT id FROM auth.users WHERE lower(email) = 'flarrowandmoreweb@gmail.com');

CREATE TABLE IF NOT EXISTS suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_name text NOT NULL CHECK (char_length(submitter_name) BETWEEN 1 AND 60),
  movie_title text NOT NULL CHECK (char_length(movie_title) BETWEEN 1 AND 200),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'por_hacer' CHECK (status IN ('por_hacer', 'prioridad', 'en_proceso', 'completada')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suggestions_status_idx ON suggestions (status);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON suggestions FROM anon, authenticated;
GRANT INSERT (submitter_name, movie_title, notes) ON suggestions TO anon, authenticated;
GRANT SELECT ON suggestions TO authenticated;
GRANT UPDATE (status) ON suggestions TO authenticated;

DROP POLICY IF EXISTS "insert_suggestion" ON suggestions;
CREATE POLICY "insert_suggestion" ON suggestions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_suggestions_admin" ON suggestions;
CREATE POLICY "select_suggestions_admin" ON suggestions FOR SELECT
TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "update_suggestions_admin" ON suggestions;
CREATE POLICY "update_suggestions_admin" ON suggestions FOR UPDATE
TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
