import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Movie, MovieInput, PlatformAvailabilityInput } from '@/types/movie';

const MOVIES_QUERY = '*, movie_platforms(*)';
const LOAD_ERROR = 'No se pudieron cargar las películas. Revisa tu conexión e inténtalo de nuevo.';
const SAVE_ERROR = 'No se pudo guardar la película. Inténtalo de nuevo.';
const UPDATE_ERROR = 'No se pudo actualizar la película. Inténtalo de nuevo.';
const DELETE_ERROR = 'No se pudo eliminar la película. Inténtalo de nuevo.';

export function useMovies() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('movies')
      .select(MOVIES_QUERY)
      .order('release_date', { ascending: true, nullsFirst: false })
      .order('title', { ascending: true });

    if (queryError || !Array.isArray(data)) {
      setError(LOAD_ERROR);
    } else {
      setMovies(data as Movie[]);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const writePlatforms = async (movieId: string, platforms: PlatformAvailabilityInput[]): Promise<boolean> => {
    let keptIds: string[] = [];

    if (platforms.length > 0) {
      const rows = platforms.map((entry) => ({
        movie_id: movieId,
        platform: entry.platform,
        offer_type: entry.offer_type,
        url: entry.url,
      }));
      const { data, error: upsertError } = await supabase
        .from('movie_platforms')
        .upsert(rows, { onConflict: 'movie_id,platform,offer_type' })
        .select('id');
      if (upsertError || !Array.isArray(data)) return false;
      keptIds = data.map((row) => row.id);
    }

    let removal = supabase.from('movie_platforms').delete().eq('movie_id', movieId);
    if (keptIds.length > 0) {
      removal = removal.not('id', 'in', `(${keptIds.join(',')})`);
    }
    const { error: removeError } = await removal;
    return !removeError;
  };

  const saveMovie = async (
    input: MovieInput,
    platforms: PlatformAvailabilityInput[],
    movieId: string | null
  ): Promise<string | null> => {
    let id: string;

    if (movieId) {
      const { error: updateError } = await supabase.from('movies').update(input).eq('id', movieId);
      if (updateError) return SAVE_ERROR;
      id = movieId;
    } else {
      const { data, error: insertError } = await supabase
        .from('movies')
        .insert(input)
        .select('id')
        .single();
      if (insertError || !data) return SAVE_ERROR;
      id = data.id;
    }

    const platformsSaved = await writePlatforms(id, platforms);
    await reload();
    return platformsSaved ? null : SAVE_ERROR;
  };

  const toggleWatched = async (movie: Movie): Promise<string | null> => {
    const { error: updateError } = await supabase
      .from('movies')
      .update({ watched: !movie.watched })
      .eq('id', movie.id);
    if (updateError) return UPDATE_ERROR;
    await reload();
    return null;
  };

  const deleteMovie = async (movie: Movie): Promise<string | null> => {
    const { error: deleteError } = await supabase.from('movies').delete().eq('id', movie.id);
    if (deleteError) return DELETE_ERROR;
    await reload();
    return null;
  };

  return { movies, loading, error, reload, saveMovie, toggleWatched, deleteMovie };
}
