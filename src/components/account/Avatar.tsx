import { getAvatarPreset } from '@/lib/avatars';

type AvatarProps = {
  avatarKey: string;
  avatarUrl: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-sm',
  md: 'w-10 h-10 text-lg',
  lg: 'w-20 h-20 text-3xl',
};

export default function Avatar({ avatarKey, avatarUrl, name, size = 'md' }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} rounded-full object-cover shrink-0`}
      />
    );
  }

  const preset = getAvatarPreset(avatarKey);
  return (
    <span
      aria-label={name}
      className={`${sizeClass} ${preset.bg} rounded-full flex items-center justify-center shrink-0`}
    >
      {preset.emoji}
    </span>
  );
}
