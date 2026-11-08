import { Bookmark, Star } from 'lucide-react';
import type { Movie } from '@/lib/catalog';

type MovieCardProps = {
  movie: Movie;
  darkMode: boolean;
  isWatchlist: boolean;
  onOpen: () => void;
  onToggleWatchlist: () => void;
};

export default function MovieCard({ movie, darkMode, isWatchlist, onOpen, onToggleWatchlist }: MovieCardProps) {
  const upcoming = movie.status === 'Próximo estreno';
  const cardTone = darkMode
    ? 'bg-[#18201C] border-[#2A3830] text-[#ECEAE4] hover:border-[#3E5A4B]'
    : 'bg-white border-[#E8E3DA] text-[#2C332E] hover:border-[#B9CDBF]';
  const mutedTone = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <article
      onClick={onOpen}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardTone}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[#184E3A]">
        <img
          src={movie.poster}
          alt={movie.titleEs || movie.titleEn}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-md ${
            upcoming ? 'bg-amber-400 text-slate-950' : 'bg-black/60 text-white backdrop-blur-sm'
          }`}
        >
          {upcoming ? 'Próximo estreno' : 'Ya en cartelera'}
        </span>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleWatchlist();
          }}
          title={isWatchlist ? 'Quitar de mi lista' : 'Añadir a mi lista'}
          aria-pressed={isWatchlist}
          className={`absolute right-3 top-3 rounded-full p-2 shadow-md backdrop-blur-sm transition-colors ${
            isWatchlist ? 'bg-amber-400 text-slate-950' : 'bg-black/50 text-white hover:bg-black/70'
          }`}
        >
          <Bookmark className={`h-3.5 w-3.5 ${isWatchlist ? 'fill-current' : ''}`} />
        </button>

        {movie.imdbScore !== null && (
          <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold text-amber-300">
            <Star className="h-3 w-3 fill-current" />
            {movie.imdbScore.toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-1 font-serif-title text-lg font-bold leading-snug transition-colors group-hover:text-[#184E3A] dark:group-hover:text-[#E3D4A3]">
          {movie.titleEs || movie.titleEn}
        </h3>
        <p className={`text-xs ${mutedTone}`}>
          {movie.year}
          {movie.genre && ` · ${movie.genre}`}
        </p>
        <p className="mt-auto line-clamp-1 pt-2 text-[11px] font-semibold text-[#184E3A] dark:text-emerald-400">
          {movie.platform}
        </p>
      </div>
    </article>
  );
}
