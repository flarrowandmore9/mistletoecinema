export type OfferType = 'streaming' | 'rent' | 'buy' | 'cinema';

export interface MoviePlatform {
  id: string;
  movie_id: string;
  platform: string;
  offer_type: OfferType;
  url: string | null;
}

export interface Movie {
  id: string;
  title: string;
  year: number | null;
  release_date: string | null;
  director: string | null;
  synopsis: string | null;
  poster_url: string | null;
  runtime_minutes: number | null;
  watched: boolean;
  created_at: string;
  movie_platforms: MoviePlatform[];
}

export type MovieInput = Pick<
  Movie,
  'title' | 'year' | 'release_date' | 'director' | 'synopsis' | 'poster_url' | 'runtime_minutes'
>;

export type PlatformAvailabilityInput = Pick<MoviePlatform, 'platform' | 'offer_type' | 'url'>;
