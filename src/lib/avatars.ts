export const AVATAR_PRESETS = [
  { key: 'tree', emoji: '🎄', bg: 'bg-emerald-700' },
  { key: 'santa', emoji: '🎅', bg: 'bg-red-600' },
  { key: 'snowman', emoji: '⛄', bg: 'bg-sky-500' },
  { key: 'reindeer', emoji: '🦌', bg: 'bg-amber-700' },
  { key: 'gift', emoji: '🎁', bg: 'bg-rose-500' },
  { key: 'bell', emoji: '🔔', bg: 'bg-yellow-500' },
] as const;

export type AvatarPresetKey = (typeof AVATAR_PRESETS)[number]['key'];

export function getAvatarPreset(key: string) {
  return AVATAR_PRESETS.find((preset) => preset.key === key) ?? AVATAR_PRESETS[0];
}
