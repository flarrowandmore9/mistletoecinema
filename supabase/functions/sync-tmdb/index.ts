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
const CHRISTMAS_KEYWORD_ID = '207317';
const SYNC_ID = 'tmdb';
const AUTO_SYNC_INTERVAL_MS = 20 * 60 * 60 * 1000;
const DETAIL_BATCH_SIZE = 16;
const UPSERT_BATCH_SIZE = 50;
const CHRISTMAS_PATTERN = /navidad|navide|christmas|xmas/i;

type TmdbListMovie = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
};

type TmdbDetailMovie = TmdbListMovie & {
  runtime: number | null;
  genres: { name: string }[];
  vote_average: number;
  vote_count: number;
  credits?: { cast: { name: string }[]; crew: { name: string; job: string }[] };
  release_dates?: { results: { iso_3166_1: string; release_dates: { certification: string }[] }[] };
  'watch/providers'?: { results?: Record<string, { flatrate?: { provider_name: string }[] }> };
};

type TmdbPage<T> = { results: T[]; total_pages: number };

const tmdbGet = async <T>(apiKey: string, path: string, params: Record<string, string> = {}): Promise<T> => {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('language', 'es-ES');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey.startsWith('eyJ')) headers.Authorization = `Bearer ${apiKey}`;
  else url.searchParams.set('api_key', apiKey);
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers });
    if (response.status === 429 && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      continue;
    }
    if (!response.ok) throw new Error(`TMDB ${path} respondió ${response.status}`);
    return (await response.json()) as T;
  }
};

const collectPages = async (
  apiKey: string,
  path: string,
  params: Record<string, string>,
  maxPages: number,
  into: Map<number, TmdbListMovie>,
  accept: (movie: TmdbListMovie) => boolean = () => true,
) => {
  const first = await tmdbGet<TmdbPage<TmdbListMovie>>(apiKey, path, { ...params, page: '1' });
  const lastPage = Math.min(first.total_pages, maxPages);
  const pages = [first];
  for (let page = 2; page <= lastPage; page++) {
    pages.push(await tmdbGet<TmdbPage<TmdbListMovie>>(apiKey, path, { ...params, page: String(page) }));
  }
  for (const data of pages) {
    for (const movie of data.results) {
      if (movie.poster_path && movie.release_date && accept(movie) && !into.has(movie.id)) into.set(movie.id, movie);
    }
  }
};

const findChristmasMovies = async (apiKey: string): Promise<TmdbListMovie[]> => {
  const found = new Map<number, TmdbListMovie>();
  const today = new Date().toISOString().slice(0, 10);
  const keyword = { with_keywords: CHRISTMAS_KEYWORD_ID, include_adult: 'false' };

  await collectPages(apiKey, '/discover/movie', { ...keyword, sort_by: 'popularity.desc' }, 8, found);
  await collectPages(apiKey, '/discover/movie', { ...keyword, sort_by: 'primary_release_date.desc' }, 8, found);
  await collectPages(
    apiKey,
    '/discover/movie',
    { ...keyword, sort_by: 'primary_release_date.asc', 'primary_release_date.gte': today },
    5,
    found,
  );
  for (const term of ['navidad', 'christmas']) {
    await collectPages(apiKey, '/search/movie', { query: term }, 2, found, (movie) =>
      CHRISTMAS_PATTERN.test(`${movie.title} ${movie.overview}`),
    );
  }
  return [...found.values()];
};

const normalizeTitle = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const linkExistingRows = async (
  adminClient: ReturnType<typeof createClient>,
  details: TmdbDetailMovie[],
) => {
  const { data: unlinked, error } = await adminClient
    .from('movies')
    .select('id, title_en, title_es')
    .is('tmdb_id', null);
  if (error) throw new Error(`leer películas: ${error.message}`);

  const idByTitle = new Map<string, string>();
  for (const row of unlinked ?? []) {
    idByTitle.set(normalizeTitle(row.title_es), row.id);
    idByTitle.set(normalizeTitle(row.title_en), row.id);
  }

  for (const movie of details) {
    const rowId = idByTitle.get(normalizeTitle(movie.title)) ?? idByTitle.get(normalizeTitle(movie.original_title));
    if (!rowId) continue;
    const { error: linkError } = await adminClient.from('movies').update({ tmdb_id: movie.id }).eq('id', rowId);
    if (linkError) throw new Error(`vincular película: ${linkError.message}`);
    idByTitle.delete(normalizeTitle(movie.title));
    idByTitle.delete(normalizeTitle(movie.original_title));
  }
};

const PLATFORM_TEXT_LIMIT = 120;

const joinWithinLimit = (items: string[], separator: string, limit: number) => {
  let result = '';
  for (const item of items) {
    const next = result ? `${result}${separator}${item}` : item;
    if (next.length > limit) break;
    result = next;
  }
  return result;
};

const truncate = (value: string, limit: number) => (value.length > limit ? `${value.slice(0, limit - 1)}…` : value);

const toMovieRow = (movie: TmdbDetailMovie, nowIso: string) => {
  const year = Number(movie.release_date.slice(0, 4));
  const upcoming = movie.release_date > nowIso.slice(0, 10);
  const providers = movie['watch/providers']?.results?.ES?.flatrate?.map((p) => p.provider_name) ?? [];
  const certification =
    movie.release_dates?.results
      .find((r) => r.iso_3166_1 === 'ES')
      ?.release_dates.map((r) => r.certification)
      .find((c) => c) || 'TP';

  return {
    tmdb_id: movie.id,
    title_en: truncate(movie.original_title || movie.title, 200),
    title_es: truncate(movie.title, 200),
    platform: joinWithinLimit([...new Set(providers)], ' • ', PLATFORM_TEXT_LIMIT) || 'Sin plataforma confirmada',
    release_date: movie.release_date,
    synopsis: truncate(movie.overview || 'Sinopsis no disponible.', 2000),
    cast_list: joinWithinLimit(movie.credits?.cast.slice(0, 4).map((p) => p.name) ?? [], ', ', 500) || 'Reparto no disponible',
    director: truncate(movie.credits?.crew.find((p) => p.job === 'Director')?.name || 'Director no especificado', 120),
    duration: movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'Duración no disponible',
    age_rating: certification,
    genre: joinWithinLimit(movie.genres.map((g) => g.name), ' / ', 80) || 'Navideño',
    category: upcoming ? 'Próximos Estrenos 2026' : year < 2010 ? 'Clásicos' : 'Recientes',
    poster_url: `${POSTER_BASE}${movie.poster_path}`,
    imdb_score: movie.vote_count > 0 ? movie.vote_average : null,
    status: upcoming ? 'Próximo estreno' : 'Estrenada',
    last_synced_at: nowIso,
  };
};

const fetchDetails = async (apiKey: string, movies: TmdbListMovie[]): Promise<TmdbDetailMovie[]> => {
  const details: TmdbDetailMovie[] = [];
  for (let i = 0; i < movies.length; i += DETAIL_BATCH_SIZE) {
    const batch = movies.slice(i, i + DETAIL_BATCH_SIZE);
    const loaded = await Promise.all(
      batch.map((movie) =>
        tmdbGet<TmdbDetailMovie>(apiKey, `/movie/${movie.id}`, {
          append_to_response: 'credits,release_dates,watch/providers',
        }),
      ),
    );
    details.push(...loaded);
  }
  return details;
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
      await adminClient.from('catalog_sync').upsert({ id: SYNC_ID, last_status: `Sincronizando ${found.length} películas desde TMDB...` });
      const details = await fetchDetails(apiKey, found);
      const nowIso = new Date().toISOString();

      await linkExistingRows(adminClient, details);
      const rows = details.map((movie) => toMovieRow(movie, nowIso));
      for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
        const { error } = await adminClient
          .from('movies')
          .upsert(rows.slice(i, i + UPSERT_BATCH_SIZE), { onConflict: 'tmdb_id' });
        if (error) throw new Error(`guardar películas: ${error.message}`);
      }

      const { error: stateError } = await adminClient.from('catalog_sync').upsert({
        id: SYNC_ID,
        last_synced_at: nowIso,
        last_status: `Sincronizado: ${rows.length} películas desde TMDB`,
      });
      if (stateError) throw new Error(`guardar estado: ${stateError.message}`);

      return json({ ok: true, synced: rows.length, lastSyncedAt: nowIso }, 200);
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      console.error('tmdb sync failed', reason);
      await adminClient.from('catalog_sync').upsert({
        id: SYNC_ID,
        last_status: `Error al sincronizar con TMDB: ${reason.slice(0, 200)}`,
      });
      return json({ error: 'No se pudo sincronizar con TMDB. Inténtalo más tarde.' }, 502);
    }
  } catch (cause) {
    console.error('sync-tmdb failed', cause);
    return json({ error: 'No se pudo completar la sincronización.' }, 500);
  }
});
