import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w780';
const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1543589077-47d5199647ce?auto=format&fit=crop&w=800&q=80';
const SYNC_ID = 'tmdb';
const AUTO_SYNC_INTERVAL_MS = 20 * 60 * 60 * 1000;
const MAX_MOVIES = 40;
const SEARCH_TERMS = ['navidad', 'christmas'];
const CHRISTMAS_PATTERN = /navidad|navide|christmas|xmas|holiday/i;

type TmdbSearchMovie = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
};

type TmdbDetailMovie = TmdbSearchMovie & {
  runtime: number | null;
  genres: { name: string }[];
  credits?: { cast: { name: string }[]; crew: { name: string; job: string }[] };
  release_dates?: { results: { iso_3166_1: string; release_dates: { certification: string }[] }[] };
  'watch/providers'?: { results?: Record<string, { flatrate?: { provider_name: string }[] }> };
};

const tmdbGet = async <T>(apiKey: string, path: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('language', 'es-ES');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey.startsWith('eyJ')) headers.Authorization = `Bearer ${apiKey}`;
  else url.searchParams.set('api_key', apiKey);
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`TMDB ${path} respondió ${response.status}`);
  return (await response.json()) as T;
};

const findChristmasMovies = async (apiKey: string): Promise<TmdbSearchMovie[]> => {
  const found = new Map<number, TmdbSearchMovie>();
  for (const term of SEARCH_TERMS) {
    for (const page of ['1', '2']) {
      const data = await tmdbGet<{ results: TmdbSearchMovie[] }>(apiKey, '/search/movie', { query: term, page });
      for (const movie of data.results) {
        if (CHRISTMAS_PATTERN.test(`${movie.title} ${movie.overview}`) && !found.has(movie.id)) {
          found.set(movie.id, movie);
        }
      }
    }
  }
  return [...found.values()].slice(0, MAX_MOVIES);
};

const toMovieRow = (movie: TmdbDetailMovie, nowIso: string) => {
  const year = movie.release_date.slice(0, 4);
  const upcoming = movie.release_date > nowIso.slice(0, 10);
  const providers = movie['watch/providers']?.results?.ES?.flatrate?.map((p) => p.provider_name) ?? [];
  const certification =
    movie.release_dates?.results
      .find((r) => r.iso_3166_1 === 'ES')
      ?.release_dates.map((r) => r.certification)
      .find((c) => c) || 'TP';

  return {
    tmdb_id: movie.id,
    title_en: movie.original_title || movie.title,
    title_es: movie.title,
    platform: [...new Set(providers)].join(' • ') || 'Sin plataforma confirmada',
    release_date: movie.release_date,
    synopsis: movie.overview || 'Sinopsis no disponible.',
    cast_list: movie.credits?.cast.slice(0, 4).map((p) => p.name).join(', ') || 'Reparto no disponible',
    director: movie.credits?.crew.find((p) => p.job === 'Director')?.name || 'Director no especificado',
    duration: movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'Duración no disponible',
    age_rating: certification,
    genre: movie.genres.map((g) => g.name).join(' / ') || 'Navideño',
    category: upcoming ? 'Próximos Estrenos 2026' : Number(year) < 2010 ? 'Clásicos' : 'Recientes',
    poster_url: movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : FALLBACK_POSTER,
    imdb_score: movie.vote_count > 0 ? movie.vote_average : null,
    status: upcoming ? 'Próximo estreno' : 'Estrenada',
    last_synced_at: nowIso,
  };
};

const callerIsAdmin = async (
  authorization: string | null,
  supabaseUrl: string,
  anonKey: string,
  adminClient: ReturnType<typeof createClient>,
) => {
  if (!authorization) return false;
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) return false;
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();
  return profile?.role === 'admin';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('TMDB_API_KEY');
    const adminClient = createClient(supabaseUrl, serviceKey);

    const isAdmin = await callerIsAdmin(req.headers.get('Authorization'), supabaseUrl, anonKey, adminClient);
    const { data: state } = await adminClient
      .from('catalog_sync')
      .select('last_synced_at')
      .eq('id', SYNC_ID)
      .maybeSingle();
    const lastSyncedAt: string | null = state?.last_synced_at ?? null;
    const recentlySynced = lastSyncedAt !== null && Date.now() - new Date(lastSyncedAt).getTime() < AUTO_SYNC_INTERVAL_MS;
    if (!isAdmin && recentlySynced) return json({ ok: true, skipped: true, lastSyncedAt }, 200);

    if (!apiKey) return json({ error: 'La clave de TMDB no está configurada en el servidor.' }, 503);

    try {
      const found = await findChristmasMovies(apiKey);
      const details = await Promise.all(
        found.map((movie) =>
          tmdbGet<TmdbDetailMovie>(apiKey, `/movie/${movie.id}`, {
            append_to_response: 'credits,release_dates,watch/providers',
          }),
        ),
      );
      const nowIso = new Date().toISOString();
      const rows = details.filter((movie) => movie.release_date).map((movie) => toMovieRow(movie, nowIso));

      if (rows.length > 0) {
        const { error } = await adminClient.from('movies').upsert(rows, { onConflict: 'tmdb_id' });
        if (error) throw error;
      }

      const { error: stateError } = await adminClient.from('catalog_sync').upsert({
        id: SYNC_ID,
        last_synced_at: nowIso,
        last_status: `Sincronizado: ${rows.length} películas desde TMDB`,
      });
      if (stateError) throw stateError;

      return json({ ok: true, synced: rows.length, lastSyncedAt: nowIso }, 200);
    } catch (cause) {
      console.error('tmdb sync failed', cause);
      await adminClient.from('catalog_sync').upsert({ id: SYNC_ID, last_status: 'Error al sincronizar con TMDB' });
      return json({ error: 'No se pudo sincronizar con TMDB. Inténtalo más tarde.' }, 502);
    }
  } catch (cause) {
    console.error('sync-tmdb failed', cause);
    return json({ error: 'No se pudo completar la sincronización.' }, 500);
  }
});
