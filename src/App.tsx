import MistletoeCinema from '@/components/mistletoe_cinema_tracker_navide_o';
import { AuthProvider } from '@/context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <MistletoeCinema />
    </AuthProvider>
  );
}
