import { useState, type FormEvent, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import Modal from '@/components/Modal';
import { OFFER_TYPES, PLATFORMS, getOfferLabel, getPlatformInfo } from '@/lib/platforms';
import { inputClass, primaryButtonClass, secondaryButtonClass } from '@/lib/styles';
import type { Movie, MovieInput, OfferType, PlatformAvailabilityInput } from '@/types/movie';

interface MovieFormModalProps {
  movie: Movie | null;
  defaultReleaseDate: string | null;
  onClose: () => void;
  onSave: (input: MovieInput, platforms: PlatformAvailabilityInput[]) => Promise<string | null>;
}

interface FormValues {
  title: string;
  year: string;
  release_date: string;
  director: string;
  runtime: string;
  poster_url: string;
  synopsis: string;
}

type FormErrors = Partial<Record<keyof FormValues | 'platform', string>>;

function toFormValues(movie: Movie | null, defaultReleaseDate: string | null): FormValues {
  return {
    title: movie?.title ?? '',
    year: movie?.year?.toString() ?? '',
    release_date: movie?.release_date ?? defaultReleaseDate ?? '',
    director: movie?.director ?? '',
    runtime: movie?.runtime_minutes?.toString() ?? '',
    poster_url: movie?.poster_url ?? '',
    synopsis: movie?.synopsis ?? '',
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isWholeNumberInRange(value: string, min: number, max: number): boolean {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.title.trim()) errors.title = 'Escribe el título de la película.';
  if (values.year && !isWholeNumberInRange(values.year, 1900, 2100)) {
    errors.year = 'Introduce un año válido entre 1900 y 2100.';
  }
  if (values.runtime && !isWholeNumberInRange(values.runtime, 1, 999)) {
    errors.runtime = 'Introduce una duración en minutos.';
  }
  if (values.poster_url && !isHttpUrl(values.poster_url.trim())) {
    errors.poster_url = 'El enlace del cartel debe empezar por http:// o https://';
  }
  return errors;
}

function nullIfEmpty(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toMovieInput(values: FormValues): MovieInput {
  return {
    title: values.title.trim(),
    year: values.year ? Number(values.year) : null,
    release_date: nullIfEmpty(values.release_date),
    director: nullIfEmpty(values.director),
    runtime_minutes: values.runtime ? Number(values.runtime) : null,
    poster_url: nullIfEmpty(values.poster_url),
    synopsis: nullIfEmpty(values.synopsis),
  };
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
      {error && <span className="text-xs font-medium text-ember-700">{error}</span>}
    </label>
  );
}

export default function MovieFormModal({ movie, defaultReleaseDate, onClose, onSave }: MovieFormModalProps) {
  const [values, setValues] = useState<FormValues>(() => toFormValues(movie, defaultReleaseDate));
  const [errors, setErrors] = useState<FormErrors>({});
  const [platforms, setPlatforms] = useState<PlatformAvailabilityInput[]>(() =>
    (movie?.movie_platforms ?? []).map((entry) => ({
      platform: entry.platform,
      offer_type: entry.offer_type,
      url: entry.url,
    }))
  );
  const [draftPlatform, setDraftPlatform] = useState(PLATFORMS[0].id);
  const [draftOffer, setDraftOffer] = useState<OfferType>('streaming');
  const [draftUrl, setDraftUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateField = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const addPlatform = () => {
    const url = draftUrl.trim();
    if (url && !isHttpUrl(url)) {
      setErrors((current) => ({ ...current, platform: 'El enlace de la plataforma debe empezar por http:// o https://' }));
      return;
    }
    if (platforms.some((entry) => entry.platform === draftPlatform && entry.offer_type === draftOffer)) {
      setErrors((current) => ({ ...current, platform: 'Esa plataforma ya está añadida con ese tipo de acceso.' }));
      return;
    }
    setPlatforms((current) => [...current, { platform: draftPlatform, offer_type: draftOffer, url: url || null }]);
    setDraftUrl('');
    setErrors((current) => ({ ...current, platform: undefined }));
  };

  const removePlatform = (index: number) => {
    setPlatforms((current) => current.filter((_, position) => position !== index));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    setSaveError(null);
    const error = await onSave(toMovieInput(values), platforms);
    setSaving(false);
    if (error) setSaveError(error);
  };

  const footer = (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>
        Cancelar
      </button>
      <button type="submit" form="movie-form" disabled={saving} className={primaryButtonClass}>
        {saving ? 'Guardando...' : movie ? 'Guardar cambios' : 'Añadir película'}
      </button>
    </div>
  );

  return (
    <Modal title={movie ? 'Editar película' : 'Nueva película'} onClose={onClose} footer={footer}>
      <form id="movie-form" onSubmit={handleSubmit} noValidate className="space-y-8">
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Título *" error={errors.title}>
              <input
                value={values.title}
                onChange={(event) => updateField('title', event.target.value)}
                className={inputClass}
                placeholder="Por ejemplo, Solo en casa"
                autoFocus
              />
            </Field>
          </div>
          <Field label="Fecha de estreno" error={errors.release_date}>
            <input
              type="date"
              value={values.release_date}
              onChange={(event) => updateField('release_date', event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Año" error={errors.year}>
            <input
              inputMode="numeric"
              value={values.year}
              onChange={(event) => updateField('year', event.target.value)}
              className={inputClass}
              placeholder="1990"
            />
          </Field>
          <Field label="Director" error={errors.director}>
            <input
              value={values.director}
              onChange={(event) => updateField('director', event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Duración (minutos)" error={errors.runtime}>
            <input
              inputMode="numeric"
              value={values.runtime}
              onChange={(event) => updateField('runtime', event.target.value)}
              className={inputClass}
              placeholder="103"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Enlace al cartel (opcional)" error={errors.poster_url}>
              <input
                type="url"
                value={values.poster_url}
                onChange={(event) => updateField('poster_url', event.target.value)}
                className={inputClass}
                placeholder="https://..."
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Sinopsis">
              <textarea
                rows={3}
                value={values.synopsis}
                onChange={(event) => updateField('synopsis', event.target.value)}
                className={`${inputClass} resize-y`}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">Dónde verla</h3>
            <p className="text-xs text-stone-500">Añade cada plataforma o forma de acceso disponible.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-stone-50 p-4 sm:grid-cols-[1fr_1fr]">
            <Field label="Plataforma">
              <select
                value={draftPlatform}
                onChange={(event) => setDraftPlatform(event.target.value)}
                className={inputClass}
              >
                {PLATFORMS.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo de acceso">
              <select
                value={draftOffer}
                onChange={(event) => setDraftOffer(event.target.value as OfferType)}
                className={inputClass}
              >
                {OFFER_TYPES.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Enlace directo (opcional)">
                <input
                  type="url"
                  value={draftUrl}
                  onChange={(event) => setDraftUrl(event.target.value)}
                  className={inputClass}
                  placeholder="https://..."
                />
              </Field>
            </div>
            {errors.platform && <p className="text-xs font-medium text-ember-700 sm:col-span-2">{errors.platform}</p>}
            <div className="sm:col-span-2">
              <button type="button" onClick={addPlatform} className={`${secondaryButtonClass} w-full sm:w-auto`}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Añadir a la lista
              </button>
            </div>
          </div>

          {platforms.length > 0 ? (
            <ul className="space-y-2">
              {platforms.map((entry, index) => {
                const info = getPlatformInfo(entry.platform);
                return (
                  <li
                    key={`${entry.platform}-${entry.offer_type}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${info.dotClass}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stone-900">{info.name}</p>
                        <p className="text-xs text-stone-500">
                          {getOfferLabel(entry.offer_type)}
                          {entry.url ? ' · con enlace' : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePlatform(index)}
                      aria-label={`Quitar ${info.name}`}
                      className="rounded-full p-2 text-stone-500 transition hover:bg-ember-50 hover:text-ember-700"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Todavía no hay plataformas añadidas.</p>
          )}
        </section>

        {saveError && (
          <p role="alert" className="rounded-xl bg-ember-50 px-4 py-3 text-sm text-ember-800">
            {saveError}
          </p>
        )}
      </form>
    </Modal>
  );
}
