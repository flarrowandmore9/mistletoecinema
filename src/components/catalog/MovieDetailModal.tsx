import { useState } from 'react';
import { Calendar, Clock, Eye, EyeOff, Pencil, Trash2, User } from 'lucide-react';
import Modal from '@/components/Modal';
import MoviePoster from '@/components/MoviePoster';
import PlatformBadges from '@/components/PlatformBadges';
import { formatReleaseDate } from '@/lib/dates';
import { dangerButtonClass, primaryButtonClass, secondaryButtonClass } from '@/lib/styles';
import type { Movie } from '@/types/movie';

interface MovieDetailModalProps {
  movie: Movie;
  onClose: () => void;
  onEdit: (movie: Movie) => void;
  onToggleWatched: (movie: Movie) => Promise<string | null>;
  onDelete: (movie: Movie) => Promise<string | null>;
}

export default function MovieDetailModal({
  movie,
  onClose,
  onEdit,
  onToggleWatched,
  onDelete,
}: MovieDetailModalProps) {
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (action: () => Promise<string | null>) => {
    setBusy(true);
    setActionError(null);
    const error = await action();
    setBusy(false);
    if (error) setActionError(error);
  };

  const details = [
    { icon: Calendar, label: 'Estreno', value: formatReleaseDate(movie.release_date) },
    { icon: Clock, label: 'Duración', value: movie.runtime_minutes ? `${movie.runtime_minutes} min` : 'Sin dato' },
    { icon: User, label: 'Director', value: movie.director || 'Sin dato' },
  ];

  const footer = confirmingDelete ? (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-stone-700">¿Eliminar esta película del catálogo?</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => setConfirmingDelete(false)} disabled={busy} className={secondaryButtonClass}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void runAction(() => onDelete(movie))}
          disabled={busy}
          className={dangerButtonClass}
        >
          Sí, eliminar
        </button>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ember-700 transition hover:bg-ember-50 disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Eliminar
      </button>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void runAction(() => onToggleWatched(movie))}
          disabled={busy}
          className={secondaryButtonClass}
        >
          {movie.watched ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          {movie.watched ? 'Marcar como pendiente' : 'Marcar como vista'}
        </button>
        <button type="button" onClick={() => onEdit(movie)} disabled={busy} className={primaryButtonClass}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Editar
        </button>
      </div>
    </div>
  );

  return (
    <Modal title={movie.title} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="aspect-[2/3] w-40 shrink-0 self-center overflow-hidden rounded-2xl shadow-md sm:w-48 sm:self-start">
          <MoviePoster title={movie.title} posterUrl={movie.poster_url} />
        </div>

        <div className="flex flex-1 flex-col gap-5">
          <div>
            <p className="text-sm text-stone-500">{movie.year ?? 'Año desconocido'}</p>
            {movie.watched && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-pine-100 px-2.5 py-1 text-xs font-semibold text-pine-800">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                Ya la has visto
              </span>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {details.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl bg-stone-50 p-3">
                <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-stone-500">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-stone-900">{value}</dd>
              </div>
            ))}
          </dl>

          {movie.synopsis && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-stone-900">Sinopsis</h3>
              <p className="text-sm leading-relaxed text-stone-700">{movie.synopsis}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-stone-900">Dónde verla</h3>
            {movie.movie_platforms.length > 0 ? (
              <PlatformBadges entries={movie.movie_platforms} />
            ) : (
              <p className="text-sm text-stone-500">Todavía no has indicado ninguna plataforma.</p>
            )}
          </div>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mt-5 rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-800">
          {actionError}
        </p>
      )}
    </Modal>
  );
}
