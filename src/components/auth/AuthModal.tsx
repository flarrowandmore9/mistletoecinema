import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type AuthModalProps = {
  onClose: () => void;
};

const GENERIC_ERROR = 'No hemos podido completar la operación. Revisa los datos e inténtalo de nuevo.';

export default function AuthModal({ onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    if (!email || password.length < 6) {
      setError('Introduce un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    setError('');
    const ok = tab === 'login' ? await signIn(email, password) : await signUp(email, password);
    setSubmitting(false);

    if (ok) {
      onClose();
    } else {
      setError(GENERIC_ERROR);
    }
  };

  const tabClass = (active: boolean) =>
    `font-serif-title text-lg font-bold pb-1 transition-colors ${
      active
        ? 'border-b-2 border-[#184E3A] text-[#184E3A] dark:text-[#E3D4A3]'
        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
    }`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 font-sans-body">
      <div className="bg-white dark:bg-[#18201C] rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-xs font-bold space-y-4">
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 text-slate-400">
          <X className="w-5 h-5" />
        </button>

        <div className="flex border-b pb-2 gap-4">
          <button type="button" onClick={() => { setTab('login'); setError(''); }} className={tabClass(tab === 'login')}>
            Iniciar Sesión
          </button>
          <button type="button" onClick={() => { setTab('register'); setError(''); }} className={tabClass(tab === 'register')}>
            Crear Cuenta
          </button>
        </div>

        {error && <p role="alert" className="text-red-500 text-xs">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="auth-email" className="block mb-1 text-slate-500">Correo Electrónico</label>
            <input id="auth-email" type="email" name="email" required autoComplete="email" placeholder="tu@email.com" className="w-full p-2.5 rounded-full border dark:bg-[#121815]" />
          </div>

          <div>
            <label htmlFor="auth-password" className="block mb-1 text-slate-500">Contraseña</label>
            <input id="auth-password" type="password" name="password" required minLength={6} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} placeholder="Mínimo 6 caracteres" className="w-full p-2.5 rounded-full border dark:bg-[#121815]" />
          </div>

          <button type="submit" disabled={submitting} className="w-full py-2.5 bg-[#184E3A] hover:bg-[#123D2D] disabled:opacity-60 text-white rounded-full font-bold text-xs mt-2 transition-colors">
            {submitting ? 'Un momento...' : tab === 'login' ? 'Entrar a Mistletoe Cinema' : 'Crear mi Cuenta Navideña'}
          </button>
        </form>
      </div>
    </div>
  );
}
