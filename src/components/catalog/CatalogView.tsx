import { useMemo, useState } from 'react';
import { Film, Plus, Search } from 'lucide-react';
import MovieCard from '@/components/catalog/MovieCard';
import { normalizeText } from '@/lib/text';
import { inputClass, primaryButtonClass } from '@/lib/styles';
import type { Movie } from '@/types/movie';

type StatusFilter = 'all' | 'pending' | 'watched';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'watched', label: 'Vistas' },
];

interface CatalogViewProps {
  movies: Movie[];
  onOpenMovie: (movie: Movie) => void;
  onAddMovie: () => void;
}

export default function CatalogView({ movies, onOpenMovie, onAddMovie }: CatalogViewProps) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const watchedCount = movies.filter((movie) => movie.watched).length;

  const visibleMovies = useMemo(() => {
    const normalizedQuery = normalizeText(query.trim());
    return movies.filter((movie) => {
      if (status === 'watched' && !movie.watched) return false;
      if (status === 'pending' && movie.watched) return false;
      if (!normalizedQuery) return true;
      return (
        normalizeText(movie.title).includes(normalizedQuery) ||
        normalizeText(movie.director ?? '').includes(normalizedQuery)
      );
    });
  }, [movies, query, status]);

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pine-50">
          <Film className="h-8 w-8 text-pine-700" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold text-stone-900">Tu colección está vacía</h2>
          <p className="mx-auto max-w-md text-sm text-stone-600">
            Empieza añadiendo tus películas navideñas favoritas. Podrás guardar su fecha de estreno y dónde verlas.
          </p>
        </div>
        <button type="button" onClick={onAddMovie} className={primaryButtonClass}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Añadir la primera película
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-900 sm:text-4xl">Catálogo</h1>
          <p className="mt-1 text-sm text-stone-600">
            {movies.length} {movies.length === 1 ? 'película' : 'películas'} · {watchedCount} vistas
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título o director"
              aria-label="Buscar película"
              className={`${inputClass} pl-10`}
            />
          </div>
          <div role="group" aria-label="Filtrar por estado" className="flex rounded-full bg-stone-100 p-1">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatus(filter.id)}
                aria-pressed={status === filter.id}
                className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pine-400 sm:flex-none ${
                  status === filter.id ? 'bg-white text-pine-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {visibleMovies.length === 0 ? (
        <p className="rounded-2xl bg-white px-6 py-12 text-center text-sm text-stone-600 ring-1 ring-stone-200">
          Ninguna película coincide con los filtros actuales.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4 xl:grid-cols-5">
          {visibleMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onOpen={onOpenMovie} />
          ))}
        </div>
      )}
    </section>
  );
}
