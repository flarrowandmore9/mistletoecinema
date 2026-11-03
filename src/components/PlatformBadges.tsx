import { ExternalLink } from 'lucide-react';
import { getOfferLabel, getPlatformInfo } from '@/lib/platforms';
import type { MoviePlatform } from '@/types/movie';

interface PlatformBadgesProps {
  entries: MoviePlatform[];
}

const BADGE_CLASS =
  'inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700';

export default function PlatformBadges({ entries }: PlatformBadgesProps) {
  return (
    <ul className="flex flex-wrap gap-2">
      {entries.map((entry) => {
        const info = getPlatformInfo(entry.platform);
        const label =
          entry.offer_type === 'streaming' ? info.name : `${info.name} · ${getOfferLabel(entry.offer_type)}`;
        const content = (
          <>
            <span className={`h-2 w-2 rounded-full ${info.dotClass}`} aria-hidden="true" />
            <span>{label}</span>
            {entry.url && <ExternalLink className="h-3 w-3" aria-hidden="true" />}
          </>
        );

        return (
          <li key={entry.id}>
            {entry.url ? (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BADGE_CLASS} transition hover:bg-pine-100 hover:text-pine-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine-400`}
              >
                {content}
              </a>
            ) : (
              <span className={BADGE_CLASS}>{content}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
