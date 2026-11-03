import type { ReactNode } from 'react';
import { CalendarDays, Film, Plus, Snowflake, Tv, type LucideIcon } from 'lucide-react';
import { primaryButtonClass } from '@/lib/styles';

export type TabId = 'catalog' | 'calendar' | 'platforms';

interface TabConfig {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  { id: 'catalog', label: 'Catálogo', icon: Film },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'platforms', label: 'Plataformas', icon: Tv },
];

interface AppShellProps {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  onAddMovie: () => void;
  children: ReactNode;
}

export default function AppShell({ tab, onTabChange, onAddMovie, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pine-700 shadow-sm">
              <Snowflake className="h-5 w-5 text-gold-200" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-lg font-semibold text-stone-900">Cine de Navidad</p>
              <p className="hidden text-xs text-stone-500 sm:block">Tu colección de películas navideñas</p>
            </div>
          </div>

          <nav aria-label="Secciones" className="hidden md:flex md:items-center md:gap-1 md:rounded-full md:bg-stone-100 md:p-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onTabChange(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pine-400 ${
                    active ? 'bg-white text-pine-800 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onAddMovie}
            aria-label="Añadir película"
            className={`${primaryButtonClass} px-3 sm:px-5`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Añadir película</span>
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-8">
        <div key={tab} className="animate-fade-up">
          {children}
        </div>
      </main>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="grid grid-cols-3">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition focus:outline-none ${
                  active ? 'text-pine-700' : 'text-stone-500'
                }`}
              >
                <span className={`rounded-full px-4 py-1 transition ${active ? 'bg-pine-100' : ''}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
