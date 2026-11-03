import { useState } from 'react';
import { Snowflake } from 'lucide-react';

interface MoviePosterProps {
  title: string;
  posterUrl: string | null;
  showTitle?: boolean;
  className?: string;
}

export default function MoviePoster({ title, posterUrl, showTitle = true, className = '' }: MoviePosterProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (posterUrl && failedUrl !== posterUrl) {
    return (
      <img
        src={posterUrl}
        alt={`Cartel de ${title}`}
        loading="lazy"
        onError={() => setFailedUrl(posterUrl)}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-pine-600 via-pine-800 to-pine-900 p-3 text-center ${className}`}
    >
      <Snowflake className="absolute -right-3 -top-3 h-20 w-20 text-pine-500/30" aria-hidden="true" />
      <Snowflake className="absolute -bottom-4 -left-4 h-16 w-16 text-gold-300/20" aria-hidden="true" />
      {showTitle ? (
        <span className="relative font-display text-lg font-semibold leading-tight text-pine-50 line-clamp-4">
          {title}
        </span>
      ) : (
        <Snowflake className="relative h-5 w-5 text-gold-200" aria-hidden="true" />
      )}
    </div>
  );
}
