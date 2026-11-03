import { Check } from 'lucide-react';
import MoviePoster from '@/components/MoviePoster';
import { formatReleaseDate } from '@/lib/dates';
import { getPlatformInfo } from '@/lib/platforms';
import type { Movie } from '@/types/movie';

interface MovieCardProps {
  movie: Movie;
  onOpen: (movie: Movie) => void;
}

export default function MovieCard({ movie, onOpen }: MovieCardProps) {
  const platformNames = [...new Set(movie.movie_platforms.map((entry) => getPlatformInfo(entry.platform).name))];

  return (
    <button
      type="button"
      onClick={() => onOpen(movie)}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-stone-200/80 transition duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-pine-500"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        <MoviePoster
          title={movie.title}
          posterUrl={movie.poster_url}
          className="transition duration-500 group-hover:scale-105"
        />
        {movie.watched && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-pine-800 shadow">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Vista
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <h3 className="font-display text-base font-semibold leading-snug text-stone-900 line-clamp-2 sm:text-lg">
          {movie.title}
        </h3>
        <p className="text-xs text-stone-500 sm:text-sm">
          {movie.year ?? 'Año desconocido'}
          {movie.release_date && ` · ${formatReleaseDate(movie.release_date)}`}
        </p>
        <p className="mt-auto line-clamp-1 text-xs font-medium text-pine-700">
          {platformNames.length > 0 ? platformNames.join(' · ') : 'Sin plataforma asignada'}
        </p>
      </div>
    </button>
  );
}
