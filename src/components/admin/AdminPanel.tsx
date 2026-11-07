import { useEffect, useState } from 'react';
import Avatar from '@/components/account/Avatar';
import { supabase } from '@/lib/supabase';

export const SUGGESTION_STATUSES = [
  { key: 'por_hacer', label: 'Por hacer' },
  { key: 'prioridad', label: 'Prioridad' },
  { key: 'en_proceso', label: 'En proceso' },
  { key: 'completada', label: 'Completada' },
] as const;

type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number]['key'];

type Suggestion = {
  id: string;
  submitter_name: string;
  movie_title: string;
  notes: string;
  status: SuggestionStatus;
  created_at: string;
};

type RegisteredUser = {
  id: string;
  display_name: string;
  avatar_key: string;
  avatar_url: string | null;
  created_at: string;
};

const LOAD_ERROR = 'No hemos podido cargar los datos. Recarga la página para intentarlo de nuevo.';

export default function AdminPanel() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [suggestionsRes, usersRes] = await Promise.all([
        supabase
          .from('suggestions')
          .select('id, submitter_name, movie_title, notes, status, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, display_name, avatar_key, avatar_url, created_at')
          .order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      if (suggestionsRes.error || usersRes.error) {
        console.error('admin load failed', suggestionsRes.error, usersRes.error);
        setLoadError(LOAD_ERROR);
        return;
      }
      setSuggestions((suggestionsRes.data ?? []) as Suggestion[]);
      setUsers((usersRes.data ?? []) as RegisteredUser[]);
    })();
    return () => { active = false; };
  }, []);

  const changeStatus = async (id: string, status: SuggestionStatus) => {
    setActionError('');
    const previous = suggestions;
    setSuggestions((current) => current.map((s) => (s.id === id ? { ...s, status } : s)));
    const { error } = await supabase.from('suggestions').update({ status }).eq('id', id);
    if (error) {
      console.error('status update failed', error);
      setSuggestions(previous);
      setActionError('No se pudo cambiar el estado. Inténtalo de nuevo.');
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loadError) {
    return <p role="alert" className="text-xs text-red-500 font-bold">{loadError}</p>;
  }

  return (
    <div className="space-y-6">
      <section className="p-6 rounded-3xl border bg-white dark:bg-[#18201C] space-y-4">
        <h4 className="font-serif-title font-bold text-lg">Sugerencias</h4>
        {actionError && <p role="alert" className="text-xs text-red-500 font-bold">{actionError}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {SUGGESTION_STATUSES.map((column) => {
            const items = suggestions.filter((s) => s.status === column.key);
            return (
              <div key={column.key} className="rounded-2xl bg-slate-50 dark:bg-[#121815] p-3 space-y-2 min-h-[120px]">
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  {column.label} <span className="text-slate-400">({items.length})</span>
                </p>
                {items.map((sug) => (
                  <div key={sug.id} className="p-3 rounded-xl bg-white dark:bg-[#18201C] border text-xs space-y-2">
                    <p className="font-bold">{sug.movie_title}</p>
                    <p className="text-slate-400 font-normal">por {sug.submitter_name} · {formatDate(sug.created_at)}</p>
                    {sug.notes && <p className="text-slate-500 font-normal">{sug.notes}</p>}
                    <select
                      value={sug.status}
                      onChange={(e) => changeStatus(sug.id, e.target.value as SuggestionStatus)}
                      className="w-full p-1.5 rounded-lg border text-[11px] font-bold dark:bg-[#121815]"
                    >
                      {SUGGESTION_STATUSES.map((option) => (
                        <option key={option.key} value={option.key}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <section className="p-6 rounded-3xl border bg-white dark:bg-[#18201C] space-y-4">
        <h4 className="font-serif-title font-bold text-lg">Usuarios registrados ({users.length})</h4>
        <ul className="divide-y text-xs font-semibold">
          {users.map((user) => (
            <li key={user.id} className="py-3 flex items-center gap-3">
              <Avatar avatarKey={user.avatar_key} avatarUrl={user.avatar_url} name={user.display_name} size="sm" />
              <span className="flex-1 font-bold">{user.display_name || 'Sin nombre'}</span>
              <span className="text-slate-400 font-normal">Registro: {formatDate(user.created_at)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
