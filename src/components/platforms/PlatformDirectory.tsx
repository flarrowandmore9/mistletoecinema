import { ChevronRight, Tv } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { Movie, Platform } from '@/lib/catalog';

type PlatformDirectoryProps = {
  platforms: Platform[];
  movies: Movie[];
  darkMode: boolean;
  onSelectPlatform: (platformName: string) => void;
};

const moviesOnPlatform = (movies: Movie[], platform: Platform) =>
  movies.filter((movie) => movie.platform.includes(platform.id) || movie.platform.includes(platform.name));

const iconStyle = (platform: Platform): CSSProperties => ({
  backgroundImage: `linear-gradient(135deg, ${platform.colorFrom}, ${platform.colorTo})`,
});

export default function PlatformDirectory({ platforms, movies, darkMode, onSelectPlatform }: PlatformDirectoryProps) {
  const cardTone = darkMode
    ? 'bg-[#18201C] border-[#2A3830] text-white hover:border-[#3E5A4B]'
    : 'bg-white border-[#E8E3DA] text-slate-800 hover:border-[#B9CDBF]';
  const mutedTone = darkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#184E3A] dark:text-emerald-400">Plataformas</p>
        <h2 className="font-serif-title text-4xl font-bold leading-[1.2]">Dónde ver la Navidad</h2>
        <p className={`text-sm leading-[1.5] ${mutedTone}`}>
          Elige una plataforma para ver sus títulos navideños. Cada una muestra una vista previa de su catálogo.
        </p>
      </header>

      {platforms.length === 0 ? (
        <p className={`text-sm ${mutedTone}`}>Todavía no hay plataformas disponibles.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {platforms.map((platform) => {
            const onPlatform = moviesOnPlatform(movies, platform);
            const previews = onPlatform.slice(0, 4);
            return (
              <li key={platform.id}>
                <button
                  type="button"
                  onClick={() => onSelectPlatform(platform.name)}
                  className={`group flex w-full items-center gap-5 rounded-2xl border p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#184E3A] ${cardTone}`}
                >
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-inner"
                    style={iconStyle(platform)}
                  >
                    <Tv className="h-6 w-6" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-serif-title text-xl font-bold">{platform.name}</span>
                    <span className={`block truncate text-xs ${mutedTone}`}>{platform.listingLabel}</span>
                    <span className="mt-1 block text-xs font-semibold text-[#184E3A] dark:text-emerald-400">
                      {onPlatform.length} {onPlatform.length === 1 ? 'título' : 'títulos'}
                    </span>
                  </span>

                  <span className="hidden shrink-0 items-center sm:flex">
                    {previews.length === 0 && <span className={`text-xs ${mutedTone}`}>Sin títulos</span>}
                    {previews.map((movie, index) => (
                      <img
                        key={movie.id}
                        src={movie.poster}
                        alt=""
                        loading="lazy"
                        className={`h-20 w-14 rounded-md object-cover shadow-md ring-2 transition-transform duration-300 group-hover:-translate-y-1 ${
                          darkMode ? 'ring-[#18201C]' : 'ring-white'
                        } ${index > 0 ? '-ml-5' : ''}`}
                        style={{ transitionDelay: `${index * 40}ms` }}
                      />
                    ))}
                  </span>

                  <ChevronRight className={`h-5 w-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${mutedTone}`} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
