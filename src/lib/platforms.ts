import type { OfferType } from '@/types/movie';

export interface PlatformInfo {
  id: string;
  name: string;
  dotClass: string;
}

export const PLATFORMS: PlatformInfo[] = [
  { id: 'netflix', name: 'Netflix', dotClass: 'bg-red-600' },
  { id: 'prime-video', name: 'Prime Video', dotClass: 'bg-sky-500' },
  { id: 'disney-plus', name: 'Disney+', dotClass: 'bg-blue-700' },
  { id: 'hbo-max', name: 'HBO Max', dotClass: 'bg-slate-700' },
  { id: 'apple-tv', name: 'Apple TV+', dotClass: 'bg-stone-800' },
  { id: 'movistar-plus', name: 'Movistar Plus+', dotClass: 'bg-cyan-600' },
  { id: 'filmin', name: 'Filmin', dotClass: 'bg-gold-500' },
  { id: 'skyshowtime', name: 'SkyShowtime', dotClass: 'bg-teal-600' },
  { id: 'other', name: 'Otra plataforma', dotClass: 'bg-stone-400' },
];

export const OFFER_TYPES: { id: OfferType; label: string }[] = [
  { id: 'streaming', label: 'Suscripción' },
  { id: 'rent', label: 'Alquiler' },
  { id: 'buy', label: 'Compra' },
  { id: 'cinema', label: 'Cines' },
];

export function getPlatformInfo(id: string): PlatformInfo {
  return PLATFORMS.find((platform) => platform.id === id) ?? { id, name: id, dotClass: 'bg-stone-400' };
}

export function getOfferLabel(offer: OfferType): string {
  return OFFER_TYPES.find((option) => option.id === offer)?.label ?? offer;
}
