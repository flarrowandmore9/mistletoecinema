/*
# Movie catalogue and platform colours in the database

1. New Tables
- `movies`: one row per film. Holds English and Spanish titles, platform, release date, synopsis, cast, director, duration, age rating, genre, category, poster URL, optional IMDb score and status (released or upcoming).
- `platforms`: one row per platform shown on the site. Holds its name, icon, badge, listing label and the two colours of its gradient.

2. Seed data
- Inserts the 14 films and 9 platforms that the app used to keep in its code. Re-running this migration does not duplicate rows.

3. Security
- RLS enabled on both tables.
- Anyone (including visitors) can read movies and platforms, because the catalogue is public.
- Only the admin account (checked with the existing is_admin() helper) can add, edit or delete movies and platform colours.
- Grants: SELECT to anon and authenticated; INSERT, UPDATE and DELETE to authenticated only.

4. Notes
- Movie ids keep their original values (m_101 to m_114), so saved watchlists and watched lists keep working.
- New movies receive a generated id by default.
- Colour values must be 6-digit hex codes such as #0F382C.
*/

CREATE TABLE IF NOT EXISTS movies (
  id text PRIMARY KEY DEFAULT ('m_' || gen_random_uuid()::text),
  title_en text NOT NULL CHECK (char_length(title_en) BETWEEN 1 AND 200),
  title_es text NOT NULL CHECK (char_length(title_es) BETWEEN 1 AND 200),
  platform text NOT NULL CHECK (char_length(platform) BETWEEN 1 AND 120),
  release_date date NOT NULL,
  synopsis text NOT NULL DEFAULT '' CHECK (char_length(synopsis) <= 2000),
  cast_list text NOT NULL DEFAULT '' CHECK (char_length(cast_list) <= 500),
  director text NOT NULL DEFAULT '' CHECK (char_length(director) <= 120),
  duration text NOT NULL DEFAULT '' CHECK (char_length(duration) <= 30),
  age_rating text NOT NULL DEFAULT 'TP' CHECK (char_length(age_rating) <= 10),
  genre text NOT NULL DEFAULT '' CHECK (char_length(genre) <= 80),
  category text NOT NULL DEFAULT '' CHECK (char_length(category) <= 80),
  poster_url text NOT NULL DEFAULT '' CHECK (char_length(poster_url) <= 500),
  imdb_score numeric(3,1) CHECK (imdb_score IS NULL OR (imdb_score >= 0 AND imdb_score <= 10)),
  status text NOT NULL DEFAULT 'Estrenada' CHECK (status IN ('Estrenada', 'Próximo estreno')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS movies_release_date_idx ON movies (release_date);

CREATE TABLE IF NOT EXISTS platforms (
  id text PRIMARY KEY CHECK (char_length(id) BETWEEN 1 AND 120),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  icon text NOT NULL DEFAULT '' CHECK (char_length(icon) <= 16),
  badge text NOT NULL DEFAULT '' CHECK (char_length(badge) <= 40),
  listing_label text NOT NULL DEFAULT '' CHECK (char_length(listing_label) <= 60),
  color_from text NOT NULL CHECK (color_from ~ '^#[0-9A-Fa-f]{6}$'),
  color_to text NOT NULL CHECK (color_to ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON movies, platforms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON movies, platforms TO authenticated;

DROP POLICY IF EXISTS "select_movies_public" ON movies;
CREATE POLICY "select_movies_public" ON movies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_movies_admin" ON movies;
CREATE POLICY "insert_movies_admin" ON movies FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_movies_admin" ON movies;
CREATE POLICY "update_movies_admin" ON movies FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_movies_admin" ON movies;
CREATE POLICY "delete_movies_admin" ON movies FOR DELETE
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "select_platforms_public" ON platforms;
CREATE POLICY "select_platforms_public" ON platforms FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_platforms_admin" ON platforms;
CREATE POLICY "insert_platforms_admin" ON platforms FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "update_platforms_admin" ON platforms;
CREATE POLICY "update_platforms_admin" ON platforms FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "delete_platforms_admin" ON platforms;
CREATE POLICY "delete_platforms_admin" ON platforms FOR DELETE
  TO authenticated USING (public.is_admin());

INSERT INTO movies (id, title_en, title_es, platform, release_date, synopsis, cast_list, director, duration, age_rating, genre, category, poster_url, imdb_score, status) VALUES
('m_101', 'It''s a Wonderful Life', '¡Qué bello es vivir!', 'Prime Video', '1946-12-20', 'Un ángel en formación ayuda a un compasivo pero desesperado hombre de negocios mostrándole cómo habría sido la vida si él nunca hubiera existido.', 'James Stewart, Donna Reed, Lionel Barrymore', 'Frank Capra', '2h 10m', 'TP', 'Clásico Navideño', 'Clásicos', 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=800&q=80', NULL, 'Estrenada'),
('m_102', 'Home Alone', 'Solo en Casa', 'Disney+', '1990-11-16', 'Un niño de ocho años debe defender su hogar familiar de dos ladrones torpes después de que sus padres lo olvidan accidentalmente antes de viajar a París por Navidad.', 'Macaulay Culkin, Joe Pesci, Daniel Stern, Catherine O''Hara', 'Chris Columbus', '1h 43m', 'TP', 'Comedia Familiar', 'Clásicos', 'https://images.unsplash.com/photo-1543589077-47d5199647ce?auto=format&fit=crop&w=800&q=80', NULL, 'Estrenada'),
('m_103', 'Miracle on 34th Street', 'De Ilusión También se Vive', 'Disney+', '1947-06-04', 'Un anciano amable contratado para hacer de Santa Claus en unos grandes almacenes afirma ser el auténtico Papá Noel, desencadenando un juicio extraordinario.', 'Edmund Gwenn, Maureen O''Hara, John Payne', 'George Seaton', '1h 36m', 'TP', 'Clásico Navideño', 'Clásicos', 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80', 7.9, 'Estrenada'),
('m_104', 'How the Grinch Stole Christmas', 'El Grinch (2000)', 'Netflix • Prime Video', '2000-11-17', 'En las afueras de Villa Quién, un huraño ser verde planea arruinar la Navidad a todos los aldeanos hasta que conoce a la dulce Cindy Lou Quién.', 'Jim Carrey, Taylor Momsen, Jeffrey Tambor', 'Ron Howard', '1h 44m', 'TP', 'Fantasía / Comedia', 'Más Populares', 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80', 6.3, 'Estrenada'),
('m_105', 'Elf', 'Elf', 'HBO Max', '2003-11-07', 'Criado entre duendes en el Polo Norte, Buddy viaja a Nueva York para encontrar a su verdadero padre biológico y difundir el espíritu navideño.', 'Will Ferrell, Zooey Deschanel, James Caan', 'Jon Favreau', '1h 37m', 'TP', 'Comedia', 'Más Populares', 'https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?auto=format&fit=crop&w=800&q=80', 7.1, 'Estrenada'),
('m_106', 'Klaus', 'Klaus', 'Netflix', '2019-11-15', 'Un cartero egoísta y un solitario fabricante de juguetes forjan una improbable amistad en un pueblo gélido y enfrentado, dando origen a la leyenda.', 'Jason Schwartzman, J.K. Simmons, Rashida Jones', 'Sergio Pablos', '1h 36m', 'TP', 'Animación Obra Maestra', 'Más Populares', 'https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?auto=format&fit=crop&w=800&q=80', 8.2, 'Estrenada'),
('m_107', 'The Christmas Chronicles', 'Las Crónicas de Navidad', 'Netflix', '2018-11-22', 'Dos hermanos intentan grabar a Papá Noel en la noche de Nochebuena. Cuando el plan sale mal, deben unirse a Santa para salvar la Navidad.', 'Kurt Russell, Darby Camp, Judah Lewis', 'Clay Kaytis', '1h 44m', 'TP', 'Aventura / Fantasía', 'Recientes', 'https://images.unsplash.com/photo-1543255006-d6395b6f1171?auto=format&fit=crop&w=800&q=80', 7.0, 'Estrenada'),
('m_108', 'A Boy Called Christmas', 'El Chico que Salvó la Navidad', 'Netflix • Sky', '2021-11-24', 'Un joven ordinario emprende un viaje épico al lejano norte para hallar a su padre y descubrir el mágico reino de las elfas.', 'Henry Lawfull, Toby Jones, Sally Hawkins, Maggie Smith', 'Gil Kenan', '1h 46m', 'TP', 'Fantasía Familiar', 'Recientes', 'https://images.unsplash.com/photo-1511268559489-34b624fbfcf5?auto=format&fit=crop&w=800&q=80', 6.7, 'Estrenada'),
('m_109', 'Violent Night', 'Noche de Paz (Violent Night)', 'Prime Video', '2022-12-02', 'Un grupo de mercenarios irrumpe en una mansión adinerada en Nochebuena, pero no contaban con enfrentarse a un Papá Noel curtido en batallas.', 'David Harbour, John Leguizamo, Beverly D''Angelo', 'Tommy Wirkola', '1h 52m', '+16', 'Acción Navideña', 'Recientes', 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?auto=format&fit=crop&w=800&q=80', 6.7, 'Estrenada'),
('m_110', 'Three Wise Men and a Baby', 'Tres Reyes Magos y un Bebé', 'Hallmark Channel • Hallmark+', '2022-11-19', 'Tres hermanos deben unirse inesperadamente durante las fiestas navideñas para cuidar de un bebé abandonado en su parque de bomberos local.', 'Paul Campbell, Tyler Hynes, Andrew Walker', 'Terry Ingram', '1h 24m', 'TP', 'Comedia Hallmark', 'Más Populares', 'https://images.unsplash.com/photo-1543589077-47d5199647ce?auto=format&fit=crop&w=800&q=80', 7.6, 'Estrenada'),
('m_111', 'A Royal Icing Christmas', 'Glaseado Real para Navidad', 'Great American Family', '2026-11-20', 'Una talentosa repostera artesanal es seleccionada para diseñar el pastel del Gran Baile Navideño del Principado de Liechtenstein.', 'Danica McKellar, Trevor Donovan', 'Michael Damian', '1h 28m', 'TP', 'Romance Real', 'Próximos Estrenos 2026', 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80', 7.2, 'Próximo estreno'),
('m_112', 'A Second Chance Christmas', 'Segunda Oportunidad Navideña', 'Netflix', '2026-12-05', 'Una pareja cuya boda está en juego queda bloqueada en un pintoresco hotel de montaña durante una intensa nevada de Nochebuena.', 'Vanessa Hudgens, Alexander Ludwig', 'Stefanie Black', '1h 35m', 'TP', 'Romance Festivo', 'Próximos Estrenos 2026', 'https://images.unsplash.com/photo-1576919228236-a097c32a5cd4?auto=format&fit=crop&w=800&q=80', 7.0, 'Próximo estreno'),
('m_113', 'A Sweet Christmas Anniversary', 'Aniversario Dulce Navidad', 'Lifetime', '2026-12-12', 'Para conmemorar sus diez años, una pareja regresa a la chocolatería donde se conocieron, descubriendo una carta secreta de Santa Claus.', 'Tiya Sircar, George Young', 'Kelli Williams', '1h 27m', 'TP', 'Drama Romántico', 'Próximos Estrenos 2026', 'https://images.unsplash.com/photo-1543255006-d6395b6f1171?auto=format&fit=crop&w=800&q=80', 6.5, 'Próximo estreno'),
('m_114', 'Mystery on Mistletoe Lane', 'Misterio en la Calle del Muérdago', 'Hallmark Channel • Hallmark+', '2026-11-28', 'Una mujer recién mudada a una casona histórica descubre pistas escondidas de una búsqueda del tesoro navideña creada hace 70 años.', 'Erica Cerra, Victor Webster', 'Allan Harmon', '1h 26m', 'TP', 'Misterio Navideño', 'Próximos Estrenos 2026', 'https://images.unsplash.com/photo-1511268559489-34b624fbfcf5?auto=format&fit=crop&w=800&q=80', 7.4, 'Próximo estreno')
ON CONFLICT (id) DO NOTHING;

INSERT INTO platforms (id, name, icon, badge, listing_label, color_from, color_to) VALUES
('Hallmark Channel • Hallmark+', 'Hallmark Channel', '👑', 'Hallmark+', '45+ Películas', '#0F382C', '#16503E'),
('Great American Family', 'Great American Family', '⭐', 'GA Family', '28+ Películas', '#174536', '#1D5947'),
('Netflix', 'Netflix', '🍿', 'Originals', '60+ Películas', '#6B0F1A', '#991B24'),
('Prime Video', 'Prime Video', '📦', 'Prime', '38+ Películas', '#0D2433', '#173D54'),
('Disney+', 'Disney+', '✨', 'Disney', '50+ Películas', '#141638', '#252861'),
('Apple TV+', 'Apple TV+', '🍎', 'Apple', '12+ Películas', '#2A2B2E', '#3D3E42'),
('Lifetime', 'Lifetime', '💖', 'Lifetime', '30+ Películas', '#471228', '#732043'),
('HBO Max', 'HBO Max', '🎬', 'Max', '22+ Películas', '#240C33', '#44185E'),
('UPtv', 'UPtv', '🎄', 'UPtv', '18+ Películas', '#1E3B2F', '#295241')
ON CONFLICT (id) DO NOTHING;
