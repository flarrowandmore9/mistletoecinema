import { supabase } from '@/lib/supabase';

export type Movie = {
  id: string;
  titleEn: string;
  titleEs: string;
  platform: string;
  releaseDate: string;
  year: string;
  synopsis: string;
  cast: string;
  director: string;
  duration: string;
  ageRating: string;
  genre: string;
  category: string;
  poster: string;
  imdbScore: number | null;
  status: string;
};

export type MovieInput = Omit<Movie, 'id' | 'year'>;

export type Platform = {
  id: string;
  name: string;
  icon: string;
  badge: string;
  listingLabel: string;
  colorFrom: string;
  colorTo: string;
};

type MovieRow = {
  id: string;
  title_en: string;
  title_es: string;
  platform: string;
  release_date: string;
  synopsis: string;
  cast_list: string;
  director: string;
  duration: string;
  age_rating: string;
  genre: string;
  category: string;
  poster_url: string;
  imdb_score: number | string | null;
  status: string;
};

type PlatformRow = {
  id: string;
  name: string;
  icon: string;
  badge: string;
  listing_label: string;
  color_from: string;
  color_to: string;
};

const MOVIE_COLUMNS = 'id, title_en, title_es, platform, release_date, synopsis, cast_list, director, duration, age_rating, genre, category, poster_url, imdb_score, status';

const fromMovieRow = (row: MovieRow): Movie => ({
  id: row.id,
  titleEn: row.title_en,
  titleEs: row.title_es,
  platform: row.platform,
  releaseDate: row.release_date,
  year: row.release_date.slice(0, 4),
  synopsis: row.synopsis,
  cast: row.cast_list,
  director: row.director,
  duration: row.duration,
  ageRating: row.age_rating,
  genre: row.genre,
  category: row.category,
  poster: row.poster_url,
  imdbScore: row.imdb_score === null ? null : Number(row.imdb_score),
  status: row.status,
});

const toMovieColumns = (input: MovieInput) => ({
  title_en: input.titleEn,
  title_es: input.titleEs,
  platform: input.platform,
  release_date: input.releaseDate,
  synopsis: input.synopsis,
  cast_list: input.cast,
  director: input.director,
  duration: input.duration,
  age_rating: input.ageRating,
  genre: input.genre,
  category: input.category,
  poster_url: input.poster,
  imdb_score: input.imdbScore,
  status: input.status,
});

const fromPlatformRow = (row: PlatformRow): Platform => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  badge: row.badge,
  listingLabel: row.listing_label,
  colorFrom: row.color_from,
  colorTo: row.color_to,
});

export async function fetchMovies(): Promise<Movie[]> {
  const { data, error } = await supabase
    .from('movies')
    .select(MOVIE_COLUMNS)
    .order('release_date', { ascending: false });
  if (error) throw error;
  return (data as MovieRow[]).map(fromMovieRow);
}

export async function fetchPlatforms(): Promise<Platform[]> {
  const { data, error } = await supabase
    .from('platforms')
    .select('id, name, icon, badge, listing_label, color_from, color_to')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data as PlatformRow[]).map(fromPlatformRow);
}

export async function saveMovie(id: string | null, input: MovieInput): Promise<void> {
  const columns = toMovieColumns(input);
  const request = id
    ? supabase.from('movies').update(columns).eq('id', id)
    : supabase.from('movies').insert(columns);
  const { error } = await request;
  if (error) throw error;
}

export async function deleteMovie(id: string): Promise<void> {
  const { error } = await supabase.from('movies').delete().eq('id', id);
  if (error) throw error;
}

export type CatalogSyncState = { lastSyncedAt: string | null; lastStatus: string };

export async function fetchCatalogSync(): Promise<CatalogSyncState> {
  const { data, error } = await supabase
    .from('catalog_sync')
    .select('last_synced_at, last_status')
    .eq('id', 'tmdb')
    .maybeSingle();
  if (error) throw error;
  return { lastSyncedAt: data?.last_synced_at ?? null, lastStatus: data?.last_status ?? '' };
}

export async function runTmdbSync(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('sync-tmdb', { body: {} });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? 'Sincronización fallida');
}

export async function savePlatformColors(id: string, colorFrom: string, colorTo: string): Promise<void> {
  const { error } = await supabase
    .from('platforms')
    .update({ color_from: colorFrom, color_to: colorTo })
    .eq('id', id);
  if (error) throw error;
}
