import { useState } from 'react';
import { savePlatformColors, type Platform } from '@/lib/catalog';

type PlatformColorsPanelProps = {
  platforms: Platform[];
  onSaved: () => Promise<void>;
};

type ColorDraft = { from: string; to: string };

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export default function PlatformColorsPanel({ platforms, onSaved }: PlatformColorsPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, ColorDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const draftFor = (platform: Platform): ColorDraft =>
    drafts[platform.id] ?? { from: platform.colorFrom, to: platform.colorTo };

  const updateDraft = (platform: Platform, field: keyof ColorDraft, value: string) => {
    setDrafts((current) => ({ ...current, [platform.id]: { ...draftFor(platform), [field]: value } }));
  };

  const handleSave = async (platform: Platform) => {
    const draft = draftFor(platform);
    if (!HEX_COLOR.test(draft.from) || !HEX_COLOR.test(draft.to)) {
      setError('Los colores no son válidos. Elige un color para cada casilla.');
      return;
    }
    setSavingId(platform.id);
    setError('');
    try {
      await savePlatformColors(platform.id, draft.from, draft.to);
      await onSaved();
      setDrafts((current) => {
        const next = { ...current };
        delete next[platform.id];
        return next;
      });
    } catch (cause) {
      console.error('platform colour save failed', cause);
      setError('No hemos podido guardar los colores. Inténtalo de nuevo.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="p-6 rounded-3xl border bg-white dark:bg-[#18201C] space-y-4">
      <h4 className="font-serif-title font-bold text-lg">Colores de plataformas</h4>
      {error && <p role="alert" className="text-xs text-red-500 font-bold">{error}</p>}
      <ul className="divide-y text-xs font-semibold">
        {platforms.map((platform) => {
          const draft = draftFor(platform);
          const changed = draft.from !== platform.colorFrom || draft.to !== platform.colorTo;
          return (
            <li key={platform.id} className="py-3 flex flex-wrap items-center gap-3">
              <span
                className="w-10 h-10 rounded-xl shrink-0"
                style={{ backgroundImage: `linear-gradient(to bottom right, ${draft.from}, ${draft.to})` }}
              />
              <span className="flex-1 min-w-[140px] font-bold">{platform.name}</span>
              <label className="flex items-center gap-1.5 text-slate-500">
                Inicio
                <input type="color" value={draft.from} onChange={(e) => updateDraft(platform, 'from', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              </label>
              <label className="flex items-center gap-1.5 text-slate-500">
                Fin
                <input type="color" value={draft.to} onChange={(e) => updateDraft(platform, 'to', e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              </label>
              <button
                type="button"
                disabled={!changed || savingId === platform.id}
                onClick={() => handleSave(platform)}
                className="px-3 py-1.5 rounded-full bg-[#184E3A] hover:bg-[#123D2D] disabled:opacity-40 text-white transition-colors"
              >
                {savingId === platform.id ? 'Guardando...' : 'Guardar'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
