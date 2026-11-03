import { useState } from 'react';
import AppShell, { type TabId } from '@/components/AppShell';
import CatalogView from '@/components/catalog/CatalogView';
import MovieDetailModal from '@/components/catalog/MovieDetailModal';
import MovieFormModal from '@/components/catalog/MovieFormModal';
import { ErrorBanner, LoadingState } from '@/components/StatusMessage';
import { useMovies } from '@/hooks/useMovies';
import type { Movie, MovieInput, PlatformAvailabilityInput } from '@/types/movie';

interface EditorState {
  movie: Movie | null;
}

function App() {
  const [tab, setTab] = useState<TabId>('catalog');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const { movies, loading, error, reload, saveMovie, toggleWatched, deleteMovie } = useMovies();

  const detailMovie = movies.find((movie) => movie.id === detailId) ?? null;

  const handleSave = async (input: MovieInput, platforms: PlatformAvailabilityInput[]) => {
    const saveError = await saveMovie(input, platforms, editor?.movie?.id ?? null);
    if (!saveError) setEditor(null);
    return saveError;
  };

  const handleDelete = async (movie: Movie) => {
    const deleteError = await deleteMovie(movie);
    if (!deleteError) setDetailId(null);
    return deleteError;
  };

  return (
    <AppShell tab={tab} onTabChange={setTab} onAddMovie={() => setEditor({ movie: null })}>
      {error && <ErrorBanner message={error} onRetry={() => void reload()} />}

      {loading && movies.length === 0 ? (
        <LoadingState />
      ) : tab === 'catalog' ? (
        <CatalogView
          movies={movies}
          onOpenMovie={(movie) => setDetailId(movie.id)}
          onAddMovie={() => setEditor({ movie: null })}
        />
      ) : (
        <p className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-stone-600 ring-1 ring-stone-200">
          Esta sección estará disponible próximamente.
        </p>
      )}

      {detailMovie && (
        <MovieDetailModal
          movie={detailMovie}
          onClose={() => setDetailId(null)}
          onEdit={(movie) => {
            setDetailId(null);
            setEditor({ movie });
          }}
          onToggleWatched={toggleWatched}
          onDelete={handleDelete}
        />
      )}

      {editor && (
        <MovieFormModal
          key={editor.movie?.id ?? 'new'}
          movie={editor.movie}
          defaultReleaseDate={null}
          onClose={() => setEditor(null)}
          onSave={handleSave}
        />
      )}
    </AppShell>
  );
}

export default App;
