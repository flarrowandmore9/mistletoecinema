import { useState, type FormEvent } from 'react';
import { Camera, LogOut, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { AVATAR_PRESETS } from '@/lib/avatars';
import Avatar from '@/components/account/Avatar';

type AccountPanelProps = {
  onClose: () => void;
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CHRISTMAS_EMOJIS = ['🎄', '🎅', '⛄', '🦌', '🎁', '🔔', '❄️', '⭐'];
const GENERIC_ERROR = 'No hemos podido guardar los cambios. Inténtalo de nuevo.';

type Notice = { kind: 'ok' | 'error'; text: string } | null;

export default function AccountPanel({ onClose }: AccountPanelProps) {
  const { session, profile, signOut, refreshProfile } = useAuth();
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [emoji, setEmoji] = useState(profile?.christmas_emoji ?? '🎄');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!session || !profile) return null;

  const userId = session.user.id;

  const saveProfile = async (changes: Partial<{ display_name: string; christmas_emoji: string; avatar_key: string; avatar_url: string | null }>) => {
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.from('profiles').update(changes).eq('id', userId);
    setBusy(false);
    if (error) {
      console.error('profile update failed', error);
      setNotice({ kind: 'error', text: GENERIC_ERROR });
      return;
    }
    await refreshProfile();
    setNotice({ kind: 'ok', text: 'Cambios guardados.' });
  };

  const handleNameSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNotice({ kind: 'error', text: 'El nombre no puede estar vacío.' });
      return;
    }
    saveProfile({ display_name: trimmed });
  };

  const handlePreset = (key: string) => {
    saveProfile({ avatar_key: key, avatar_url: null });
  };

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type) || file.size > MAX_AVATAR_BYTES) {
      setNotice({ kind: 'error', text: 'Usa una imagen JPG, PNG o WebP de hasta 2 MB.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    const extension = file.type.split('/')[1];
    const path = `${userId}/${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type });
    if (uploadError) {
      console.error('avatar upload failed', uploadError);
      setBusy(false);
      setNotice({ kind: 'error', text: GENERIC_ERROR });
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setBusy(false);
    await saveProfile({ avatar_url: data.publicUrl });
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (!email) return;
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.auth.updateUser({ email });
    setBusy(false);
    if (error) {
      console.error('email update failed', error);
      setNotice({ kind: 'error', text: GENERIC_ERROR });
      return;
    }
    setNewEmail('');
    setNotice({ kind: 'ok', text: 'Te hemos enviado un enlace para confirmar el nuevo correo.' });
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setNotice({ kind: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) {
      console.error('password update failed', error);
      setNotice({ kind: 'error', text: GENERIC_ERROR });
      return;
    }
    setNewPassword('');
    setNotice({ kind: 'ok', text: 'Contraseña actualizada.' });
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const handleDeleteAccount = async () => {
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      console.error('account delete failed', error);
      setBusy(false);
      setNotice({ kind: 'error', text: 'No hemos podido eliminar la cuenta. Inténtalo de nuevo.' });
      return;
    }
    await signOut();
    onClose();
  };

  const sectionClass = 'space-y-3 pt-4 border-t';
  const labelClass = 'block mb-1 text-slate-500';
  const inputClass = 'w-full p-2.5 rounded-full border dark:bg-[#121815]';
  const buttonClass = 'px-4 py-2 rounded-full bg-[#184E3A] hover:bg-[#123D2D] disabled:opacity-60 text-white font-bold text-xs transition-colors';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 font-sans-body">
      <div className="bg-white dark:bg-[#18201C] rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative text-xs font-bold space-y-2">
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 text-slate-400">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 pb-2">
          <Avatar avatarKey={profile.avatar_key} avatarUrl={profile.avatar_url} name={profile.display_name} size="lg" />
          <div>
            <h3 className="font-serif-title text-2xl font-bold text-[#184E3A] dark:text-[#E3D4A3]">Mi cuenta</h3>
            <p className="text-slate-500 font-medium">{session.user.email}</p>
          </div>
        </div>

        {notice && (
          <p role="status" className={`text-xs ${notice.kind === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
            {notice.text}
          </p>
        )}

        <form onSubmit={handleNameSubmit} className={sectionClass}>
          <label htmlFor="account-name" className={labelClass}>Nombre</label>
          <div className="flex gap-2">
            <input id="account-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
            <button type="submit" disabled={busy} className={buttonClass}>Guardar</button>
          </div>
        </form>

        <div className={sectionClass}>
          <p className={labelClass}>Emoji navideño</p>
          <div className="flex flex-wrap gap-2">
            {CHRISTMAS_EMOJIS.map((item) => (
              <button
                key={item}
                type="button"
                disabled={busy}
                onClick={() => { setEmoji(item); saveProfile({ christmas_emoji: item }); }}
                className={`w-9 h-9 rounded-full text-lg border transition-transform hover:scale-110 ${emoji === item ? 'ring-2 ring-[#184E3A]' : ''}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className={sectionClass}>
          <p className={labelClass}>Foto de perfil</p>
          <div className="grid grid-cols-6 gap-2">
            {AVATAR_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                disabled={busy}
                onClick={() => handlePreset(preset.key)}
                aria-label={`Avatar ${preset.key}`}
                className={`rounded-full ${!profile.avatar_url && profile.avatar_key === preset.key ? 'ring-2 ring-[#184E3A]' : ''}`}
              >
                <Avatar avatarKey={preset.key} avatarUrl={null} name={preset.key} size="sm" />
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
            <Camera className="w-3.5 h-3.5" /> Subir foto
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => handleUpload(e.target.files?.[0])} />
          </label>
        </div>

        <form onSubmit={handleEmailSubmit} className={sectionClass}>
          <label htmlFor="account-email" className={labelClass}>Cambiar correo electrónico</label>
          <div className="flex gap-2">
            <input id="account-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nuevo@email.com" className={inputClass} />
            <button type="submit" disabled={busy || !newEmail.trim()} className={buttonClass}>Cambiar</button>
          </div>
        </form>

        <form onSubmit={handlePasswordSubmit} className={sectionClass}>
          <label htmlFor="account-password" className={labelClass}>Nueva contraseña</label>
          <div className="flex gap-2">
            <input id="account-password" type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={inputClass} />
            <button type="submit" disabled={busy || !newPassword} className={buttonClass}>Cambiar</button>
          </div>
        </form>

        <div className={`${sectionClass} flex flex-col gap-2`}>
          <button onClick={handleSignOut} className="w-full py-2.5 rounded-full border flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800">
            <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="w-full py-2.5 rounded-full text-red-600 flex items-center justify-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar cuenta
            </button>
          ) : (
            <div className="p-3 rounded-2xl border border-red-300 space-y-2 text-center">
              <p className="text-red-600">Se borrarán tu cuenta, tu perfil y tus fotos. Esta acción no se puede deshacer.</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-full border">Cancelar</button>
                <button onClick={handleDeleteAccount} disabled={busy} className="px-4 py-2 rounded-full bg-red-600 disabled:opacity-60 text-white">Sí, eliminar</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
