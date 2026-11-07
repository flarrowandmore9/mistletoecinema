import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/account/Avatar';
import AccountPanel from '@/components/account/AccountPanel';
import AuthModal from '@/components/auth/AuthModal';
import AdminPanel from '@/components/admin/AdminPanel';
import { supabase } from '@/lib/supabase';
import {
  deleteMovie, fetchCatalogSync, fetchMovies, fetchPlatforms, runTmdbSync, saveMovie,
  type CatalogSyncState, type Movie, type MovieInput, type Platform,
} from '@/lib/catalog';
import PlatformColorsPanel from '@/components/admin/PlatformColorsPanel';
import { 
  Film, Calendar as CalendarIcon, Bookmark, Heart, Star, Shield, Settings, Plus, Search, 
  Tv, User, Check, Trash2, Edit3, MessageSquare, Sparkles, Snowflake,
  CheckCircle2, Users, Send, RefreshCw, Clock, Lock, ChevronRight, ChevronLeft, 
  Sun, Moon, Info, Mail, Instagram, Twitter, UserX, Gift, Bell, X, ExternalLink,
  ListFilter, Eye, Play, Sparkle, Tag, Download, Filter
} from 'lucide-react';

// --- EXPANDED TMDB CHRISTMAS CATALOG (CLASSICS, RECENT & UPCOMING PREMIERES) ---
export default function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [catalogError, setCatalogError] = useState('');

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('mc_sv_darkmode_v4');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const { session, profile, isAdmin } = useAuth();
  const user = session && profile ? profile : null;

  const [userLists, setUserLists] = useState<{ watched: string[]; watchlist: string[] }>(() => {
    const saved = localStorage.getItem('mc_sv_user_lists_v4');
    return saved ? JSON.parse(saved) : { watched: [], watchlist: [] };
  });

  const [catalogSync, setCatalogSync] = useState<CatalogSyncState>({ lastSyncedAt: null, lastStatus: '' });
  const [isSyncingTMDB, setIsSyncingTMDB] = useState(false);

  // VIEWS & FILTERS (Matches SerieVerse Header Tabs & Hero Bar)
  const [currentView, setCurrentView] = useState('catalog'); 
  const [heroSearch, setHeroSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todas'); // 'Todas', 'Clásicos', 'Más Populares', 'Recientes', 'Próximos Estrenos 2026'
  const [selectedPlatform, setSelectedPlatform] = useState('Todas');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [myListsTab, setMyListsTab] = useState('watchlist');

  // MODALS
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // ADMIN
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [isAddingMovie, setIsAddingMovie] = useState(false);

  // SUGGESTIONS FORM
  const [sugTitle, setSugTitle] = useState('');
  const [sugNotes, setSugNotes] = useState('');
  const [sugSent, setSugSent] = useState(false);
  const [sugError, setSugError] = useState('');

  // CALENDAR
  const [calDate, setCalDate] = useState(new Date(2026, 11, 1));

  // CONTACT FORM
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // PERSISTENCE
  const reloadCatalog = async () => {
    const [loadedMovies, loadedPlatforms, loadedSync] = await Promise.all([fetchMovies(), fetchPlatforms(), fetchCatalogSync()]);
    setMovies(loadedMovies);
    setPlatforms(loadedPlatforms);
    setCatalogSync(loadedSync);
  };

  useEffect(() => {
    reloadCatalog().catch((cause) => {
      console.error('catalog load failed', cause);
      setCatalogError('No hemos podido cargar el catálogo. Recarga la página para intentarlo de nuevo.');
    });
  }, []);
  useEffect(() => { localStorage.setItem('mc_sv_darkmode_v4', JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('mc_sv_user_lists_v4', JSON.stringify(userLists)); }, [userLists]);

  const toggleListStatus = (movieId: string, listType: 'watched' | 'watchlist') => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setUserLists(prev => {
      const currentList = prev[listType] || [];
      const exists = currentList.includes(movieId);
      const updated = exists ? currentList.filter(id => id !== movieId) : [...currentList, movieId];
      const next = { ...prev, [listType]: updated };
      if (!exists && listType === 'watched') {
        next.watchlist = (prev.watchlist || []).filter(id => id !== movieId);
      }
      return next;
    });
  };

  const handleSyncTMDB = async () => {
    setIsSyncingTMDB(true);
    try {
      await runTmdbSync();
      await reloadCatalog();
      setCatalogError('');
    } catch (cause) {
      console.error('tmdb sync failed', cause);
      setCatalogError('No hemos podido actualizar desde TMDB. Revisa que la clave esté configurada e inténtalo de nuevo.');
    } finally {
      setIsSyncingTMDB(false);
    }
  };

  const handleSaveMovie = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input: MovieInput = {
      titleEs: form.titleEs.value.trim(),
      titleEn: form.titleEn.value.trim(),
      platform: form.platform.value.trim(),
      releaseDate: form.releaseDate.value || '2026-12-01',
      synopsis: form.synopsis.value.trim(),
      cast: form.cast.value.trim() || 'Reparto principal',
      director: form.director.value.trim() || 'Director no especificado',
      duration: form.duration.value.trim() || '1h 30m',
      ageRating: form.ageRating.value.trim() || 'TP',
      genre: form.genre.value.trim() || 'Navideño',
      category: form.category.value.trim() || 'Recientes',
      poster: form.poster.value.trim() || 'https://images.unsplash.com/photo-1543589077-47d5199647ce?auto=format&fit=crop&w=800&q=80',
      imdbScore: form.imdbScore.value ? Number(form.imdbScore.value) : null,
      status: form.status.value.trim() || 'Estrenada',
    };
    try {
      await saveMovie(editingMovie ? editingMovie.id : null, input);
      await reloadCatalog();
    } catch (cause) {
      console.error('movie save failed', cause);
      setCatalogError('No hemos podido guardar la película. Revisa los datos e inténtalo de nuevo.');
      return;
    }
    setCatalogError('');
    setEditingMovie(null);
    setIsAddingMovie(false);
  };

  const handleDeleteMovie = async (id: string) => {
    if (!window.confirm('¿Eliminar esta película del catálogo?')) return;
    try {
      await deleteMovie(id);
      await reloadCatalog();
      setCatalogError('');
    } catch (cause) {
      console.error('movie delete failed', cause);
      setCatalogError('No hemos podido eliminar la película. Inténtalo de nuevo.');
    }
  };

  const handleSendSuggestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = sugTitle.trim();
    if (!title) return;
    setSugError('');
    const { error } = await supabase.from('suggestions').insert({
      submitter_name: user ? user.display_name : 'Invitado/a',
      movie_title: title,
      notes: sugNotes.trim(),
    });
    if (error) {
      console.error('suggestion insert failed', error);
      setSugError('No hemos podido enviar tu sugerencia. Inténtalo de nuevo.');
      return;
    }
    setSugTitle('');
    setSugNotes('');
    setSugSent(true);
    setTimeout(() => setSugSent(false), 4000);
  };

  const filteredMovies = useMemo(() => {
    return movies.filter(movie => {
      const query = heroSearch.toLowerCase();
      const matchesSearch = movie.titleEs.toLowerCase().includes(query) || 
                            movie.titleEn.toLowerCase().includes(query) ||
                            (movie.director && movie.director.toLowerCase().includes(query));
      
      const matchesPlatform = selectedPlatform === 'Todas' || movie.platform.includes(selectedPlatform);
      
      let matchesTab = true;
      if (activeTab === 'Clásicos') matchesTab = movie.category === 'Clásicos' || parseInt(movie.year) < 2010;
      if (activeTab === 'Más Populares') matchesTab = movie.category === 'Más Populares' || (movie.imdbScore !== null && movie.imdbScore >= 7.5);
      if (activeTab === 'Recientes') matchesTab = movie.category === 'Recientes' || (parseInt(movie.year) >= 2018 && parseInt(movie.year) <= 2024);
      if (activeTab === 'Próximos Estrenos 2026') matchesTab = movie.category === 'Próximos Estrenos 2026' || parseInt(movie.year) >= 2025;

      return matchesSearch && matchesPlatform && matchesTab;
    });
  }, [movies, heroSearch, selectedPlatform, activeTab]);

  const watchlistMovies = useMemo(() => movies.filter(m => userLists.watchlist.includes(m.id)), [movies, userLists.watchlist]);
  const watchedMovies = useMemo(() => movies.filter(m => userLists.watched.includes(m.id)), [movies, userLists.watched]);

  const calendarDays = useMemo(() => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayPremieres = movies.filter(m => m.releaseDate === dayStr);
      const dateObj = new Date(year, month, d);
      const isToday = dayStr === todayStr;
      const isPast = dateObj < new Date(new Date().setHours(0,0,0,0));

      days.push({
        dayNumber: d,
        dateStr: dayStr,
        premieres: dayPremieres,
        isToday,
        isPast
      });
    }

    return days;
  }, [calDate, movies]);

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      darkMode 
        ? 'dark bg-[#101713] text-[#EFECE6]' 
        : 'bg-[#F9F7F2] text-[#2C332E]'
    }`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-serif-title { font-family: 'Newsreader', serif; }
        .font-sans-body { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* ==========================================
          HEADER BAR (Exact SerieVerse Style Header)
      ========================================== */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        darkMode ? 'bg-[#141C17]/95 border-[#233128]' : 'bg-[#F9F7F2]/95 border-[#ECE8E0]'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* BRANDING LOGO */}
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => { setCurrentView('catalog'); setSelectedPlatform('Todas'); setActiveTab('Todas'); }}>
            <div className="w-10 h-10 rounded-2xl bg-[#184E3A] flex items-center justify-center text-[#E3D4A3] shadow-md relative overflow-hidden group">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6 stroke-[1.75]">
                <path d="M4 11v8a2 2 0 0 0 2 2 h12a2 2 0 0 0 2 -2 v-8" fill="currentColor" fillOpacity="0.1" />
                <path d="M4 11h16" />
                <path d="M4 6h16l-2 5H6L4 6z" />
                <circle cx="12" cy="17" r="1.5" fill="#DC2626" stroke="none" />
                <circle cx="9.5" cy="18.5" r="1.2" fill="#DC2626" stroke="none" />
                <circle cx="14.5" cy="18.5" r="1.2" fill="#DC2626" stroke="none" />
              </svg>
            </div>
            <div>
              <h1 className="font-serif-title text-xl sm:text-2xl font-bold tracking-tight text-[#184E3A] dark:text-[#E3D4A3] leading-none">
                Mistletoe Cinema
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Tu catálogo de cine navideño
              </p>
            </div>
          </div>

          {/* SERIEVERSE NAVIGATION TABS */}
          <nav className="hidden md:flex items-center gap-1 font-sans-body">
            <button 
              onClick={() => { setCurrentView('catalog'); setSelectedPlatform('Todas'); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                currentView === 'catalog'
                  ? 'bg-[#184E3A] text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Film className="w-3.5 h-3.5" /> Catálogo
            </button>

            <button 
              onClick={() => setCurrentView('calendar')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                currentView === 'calendar'
                  ? 'bg-[#184E3A] text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendario
            </button>

            <button 
              onClick={() => setCurrentView('platforms')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                currentView === 'platforms'
                  ? 'bg-[#184E3A] text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Tv className="w-3.5 h-3.5" /> Plataformas
            </button>

            <button 
              onClick={() => {
                if (!user) {
                  setShowAuthModal(true);
                } else {
                  setCurrentView('my-lists');
                }
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                currentView === 'my-lists'
                  ? 'bg-[#184E3A] text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-500" /> Mis Listas
            </button>

            <button 
              onClick={() => setCurrentView('suggestions')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                currentView === 'suggestions'
                  ? 'bg-[#184E3A] text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Sugerencias
            </button>
          </nav>

          {/* HEADER RIGHT ACTIONS */}
          <div className="flex items-center gap-2 font-sans-body">
            
            {isAdmin && (
              <button
                onClick={handleSyncTMDB}
                disabled={isSyncingTMDB}
                title="Actualizar el catálogo desde TMDB"
                className="hidden lg:flex items-center gap-1.5 bg-[#184E3A] hover:bg-[#123D2D] text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTMDB ? 'animate-spin' : ''}`} />
                {isSyncingTMDB ? 'Actualizando…' : 'Actualizar TMDB'}
              </button>
            )}

            {/* DESCARGAR APP BUTTON (Matching Screenshot Pill) */}
            <button 
              onClick={() => alert("Para instalar Mistletoe Cinema en tu móvil o PC, toca en el menú de tu navegador y selecciona 'Añadir a la pantalla de inicio'.")}
              className="hidden lg:flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all hover:bg-emerald-200"
            >
              <Download className="w-3.5 h-3.5" /> Descargar App
            </button>

            {/* ADMIN ACCESS BUTTON */}
            <button
              onClick={() => setCurrentView('admin')}
              title="Panel de Administradora"
              className={`p-2 rounded-full border transition-all ${
                currentView === 'admin' ? 'bg-[#184E3A] text-white' : darkMode ? 'bg-[#18201B] border-[#2B3B32] text-slate-300' : 'bg-[#EFECE6] border-[#E3DDD3] text-slate-700'
              }`}
            >
              <Shield className="w-4 h-4" />
            </button>

            {/* DAY/NIGHT TOGGLE */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full border transition-all ${
                darkMode ? 'bg-[#18201B] border-[#2B3B32] text-amber-300' : 'bg-[#EFECE6] border-[#E3DDD3] text-slate-700'
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* AUTH BUTTON */}
            {user ? (
              <button
                onClick={() => setShowAccountPanel(true)}
                className="flex items-center gap-2 pl-1 pr-3.5 py-1 rounded-full border border-[#184E3A]/40 bg-[#184E3A]/10 text-xs font-bold text-[#184E3A] dark:text-[#E3D4A3]"
              >
                <Avatar avatarKey={user.avatar_key} avatarUrl={user.avatar_url} name={user.display_name} size="sm" />
                <span className="hidden sm:inline">{user.display_name}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="bg-[#184E3A] hover:bg-[#123D2D] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <User className="w-3.5 h-3.5" /> Iniciar Sesión
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 font-sans-body space-y-6">
        {catalogError && <p role="alert" className="text-xs text-red-500 font-bold">{catalogError}</p>}
        
        {/* ==========================================
            SECTION 1: CATÁLOGO PRINCIPAL (SerieVerse Hero & Cards)
        ========================================== */}
        {currentView === 'catalog' && (
          <div className="space-y-6">
            
            {/* HERO BANNER CARD (Exact SerieVerse Layout from Screenshot) */}
            <div className={`p-6 sm:p-10 rounded-3xl border transition-all space-y-4 text-center sm:text-left ${
              darkMode ? 'bg-[#16211B] border-[#2B3C32]' : 'bg-[#F2ECE1] border-[#E5DFD3]'
            }`}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-white/70 dark:bg-black/30 text-emerald-800 dark:text-emerald-300 border border-emerald-800/20">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Tu radar de cine y películas navideñas en España, EE. UU. y el mundo</span>
              </div>

              <h2 className="font-serif-title text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1A241F] dark:text-[#FAF8F5] max-w-3xl leading-tight">
                Explora todas las películas navideñas, clásicos y próximos estrenos.
              </h2>

              {/* SERIEVERSE HERO SEARCH INPUT */}
              <div className="relative max-w-3xl pt-2">
                <Search className="w-4 h-4 absolute left-4 top-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar cualquier película navideña por título en inglés, español o director..."
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  className={`w-full border rounded-full pl-11 pr-4 py-3 text-xs sm:text-sm font-medium focus:outline-none shadow-sm transition-colors ${
                    darkMode 
                      ? 'bg-[#121815] border-[#2A3830] text-white placeholder-slate-500 focus:border-[#184E3A]' 
                      : 'bg-white border-[#E0D9CD] text-slate-900 placeholder-slate-400 focus:border-[#184E3A]'
                  }`}
                />
              </div>
            </div>

            {/* FILTER TOOLBAR & CATEGORY TABS (Matching Screenshot Pill Bar) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
              
              {/* LEFT CATEGORY TABS */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                {['Todas', 'Clásicos', 'Más Populares', 'Recientes', 'Próximos Estrenos 2026'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                      activeTab === tab
                        ? 'bg-[#184E3A] text-white shadow'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* RIGHT PLATFORM DROPDOWN SELECTOR */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className={`w-full md:w-auto px-4 py-1.5 rounded-full border text-xs font-bold transition-all focus:outline-none ${
                    darkMode ? 'bg-[#18201C] border-[#2A3830] text-white' : 'bg-white border-[#E8E3DA] text-slate-800'
                  }`}
                >
                  <option value="Todas">Todas las cadenas / plataformas</option>
                  <option value="Hallmark Channel">Hallmark Channel</option>
                  <option value="Great American Family">Great American Family</option>
                  <option value="Netflix">Netflix</option>
                  <option value="Prime Video">Prime Video</option>
                  <option value="Disney+">Disney+</option>
                  <option value="HBO Max">HBO Max</option>
                  <option value="Lifetime">Lifetime</option>
                  <option value="Apple TV+">Apple TV+</option>
                </select>
              </div>
            </div>

            {/* MOVIE GRID (Exact SerieVerse Poster Card Design) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 pt-2">
              {filteredMovies.map(movie => {
                const isWatched = userLists.watched.includes(movie.id);
                const isWatchlist = userLists.watchlist.includes(movie.id);

                return (
                  <div
                    key={movie.id}
                    onClick={() => setSelectedMovie(movie)}
                    className={`rounded-3xl overflow-hidden border cursor-pointer transition-all hover:-translate-y-1.5 shadow-sm hover:shadow-md flex flex-col justify-between group ${
                      darkMode ? 'bg-[#18201C] border-[#2A3830]' : 'bg-white border-[#E8E3DA]'
                    }`}
                  >
                    {/* TOP COVER AREA WITH BADGES DIRECTLY OVERLAYING THE POSTER */}
                    <div className="relative h-80 sm:h-96 bg-[#184E3A] overflow-hidden">
                      <img 
                        src={movie.poster} 
                        alt={movie.titleEn}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />

                      {/* TOP LEFT BADGE: PLATFORM OVERLAY (Exact SerieVerse Pill style) */}
                      <div className="absolute top-3 left-3 z-20">
                        <span className="bg-[#184E3A]/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider border border-white/20">
                          {movie.platform.split('•')[0]}
                        </span>
                      </div>

                      {/* TOP RIGHT BADGE: BOOKMARK ICON OVERLAY */}
                      <div className="absolute top-3 right-3 z-20 flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleListStatus(movie.id, 'watchlist'); }}
                          className={`p-2 rounded-full backdrop-blur-md transition-all shadow-md ${
                            isWatchlist 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-black/40 text-white hover:bg-black/70'
                          }`}
                          title="Añadir a mis listas"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isWatchlist ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* BOTTOM LEFT: TMDB SCORE BADGE */}
                      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-amber-300 font-bold px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1">
                        ★ {movie.imdbScore ?? '—'}
                      </div>

                      {/* BOTTOM RIGHT: STATUS BADGE */}
                      <div className="absolute bottom-3 right-3 z-20">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          movie.status === 'Próximo estreno' ? 'bg-amber-400 text-slate-950' : 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/30'
                        }`}>
                          {movie.status || 'Estrenada'}
                        </span>
                      </div>
                    </div>

                    {/* BOTTOM INFORMATION SECTION */}
                    <div className="p-4 space-y-1.5 bg-white dark:bg-[#18201C] text-[#2C332E] dark:text-[#ECEAE4]">
                      <h3 className="font-serif-title font-bold text-base sm:text-lg leading-snug line-clamp-1 group-hover:text-[#184E3A] dark:group-hover:text-[#E3D4A3] transition-colors">
                        {movie.titleEs || movie.titleEn}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-400 line-clamp-1">
                        {movie.genre} • {movie.year}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            SECTION 2: CALENDARIO DE ESTRENOS
        ========================================== */}
        {currentView === 'calendar' && (
          <div className="space-y-6">
            <div className={`p-6 sm:p-8 rounded-3xl border ${
              darkMode ? 'bg-[#18201C] border-[#2C3B33]' : 'bg-white border-[#E8E3DA]'
            }`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-serif-title text-3xl font-bold flex items-center gap-2">
                    <CalendarIcon className="w-7 h-7 text-[#184E3A]" />
                    Calendario de Estrenos Navideños
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Estrenos mes a mes. Haz clic en las fechas con estrenos para abrirlos.</p>
                </div>

                {/* MONTH SELECTOR CONTROLS */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1))}
                    className={`p-2 rounded-full border ${darkMode ? 'bg-[#121815] border-[#2C3B33]' : 'bg-[#F9F7F2] border-[#E8E3DA]'}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2">
                    <select 
                      value={calDate.getMonth()}
                      onChange={(e) => setCalDate(new Date(calDate.getFullYear(), parseInt(e.target.value), 1))}
                      className={`border rounded-full px-3 py-1.5 text-xs font-bold ${darkMode ? 'bg-[#121815] border-[#2C3B33]' : 'bg-[#F9F7F2] border-[#E8E3DA]'}`}
                    >
                      {monthNames.map((m, idx) => (
                        <option key={m} value={idx}>{m}</option>
                      ))}
                    </select>

                    <select 
                      value={calDate.getFullYear()}
                      onChange={(e) => setCalDate(new Date(parseInt(e.target.value), calDate.getMonth(), 1))}
                      className={`border rounded-full px-3 py-1.5 text-xs font-bold ${darkMode ? 'bg-[#121815] border-[#2C3B33]' : 'bg-[#F9F7F2] border-[#E8E3DA]'}`}
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                    </select>
                  </div>

                  <button 
                    onClick={() => setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + 1, 1))}
                    className={`p-2 rounded-full border ${darkMode ? 'bg-[#121815] border-[#2C3B33]' : 'bg-[#F9F7F2] border-[#E8E3DA]'}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* WEEK DAYS HEADER */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase mb-2 text-slate-500">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                  <div key={d} className="py-2">{d}</div>
                ))}
              </div>

              {/* MONTH CELLS */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((cell, i) => {
                  if (!cell) return <div key={`empty_${i}`} className="h-24 rounded-2xl bg-transparent" />;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => cell.premieres.length > 0 && setSelectedMovie(cell.premieres[0])}
                      className={`h-24 p-2 rounded-2xl border flex flex-col justify-between transition-all ${
                        cell.premieres.length > 0 ? 'cursor-pointer border-[#184E3A] ring-2 ring-[#184E3A]/20' : ''
                      } ${
                        cell.isToday 
                          ? 'bg-amber-400/20 border-amber-400 font-bold' 
                          : cell.isPast
                          ? 'opacity-40 bg-slate-100 dark:bg-slate-900 border-transparent'
                          : darkMode ? 'bg-[#121815] border-[#2A3830]' : 'bg-[#F9F7F2] border-[#E8E3DA]'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold">{cell.dayNumber}</span>
                        {cell.isToday && <span className="text-[9px] bg-amber-400 text-black px-1 rounded font-bold">HOY</span>}
                      </div>

                      <div className="space-y-1">
                        {cell.premieres.slice(0, 1).map(m => (
                          <div key={m.id} className="bg-[#184E3A] text-white text-[9px] font-bold p-1 rounded truncate">
                            {m.titleEn}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            SECTION 3: PLATAFORMAS Y CADENAS REDISEÑADA
        ========================================== */}
        {currentView === 'platforms' && (
          <div className="space-y-8">
            <div>
              <h2 className="font-serif-title text-4xl font-bold">Plataformas y Cadenas Navideñas</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Explora las principales productoras de cine festivo: Hallmark Channel, Great American Family, Netflix y más.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {platforms.map(plat => {
                const count = movies.filter(m => m.platform.includes(plat.id) || m.platform.includes(plat.name)).length;
                return (
                  <div
                    key={plat.id}
                    onClick={() => { setSelectedPlatform(plat.name); setCurrentView('catalog'); }}
                    className={`p-6 rounded-3xl border cursor-pointer transition-all hover:-translate-y-1.5 shadow-md flex items-center justify-between text-white`} style={{ backgroundImage: `linear-gradient(to bottom right, ${plat.colorFrom}, ${plat.colorTo})` }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{plat.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif-title font-bold text-xl">{plat.name}</h3>
                        </div>
                        <p className="text-xs opacity-90 font-medium mt-1">{count} películas en catálogo ({plat.listingLabel})</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-amber-200" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================
            SECTION 4: MIS LISTAS
        ========================================== */}
        {currentView === 'my-lists' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif-title text-4xl font-bold">Mis Listas Navideñas</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Tus películas pendientes por ver y tus películas navideñas ya disfrutadas.</p>
            </div>

            <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-3">
              <button
                onClick={() => setMyListsTab('watchlist')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                  myListsTab === 'watchlist' ? 'bg-[#184E3A] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" /> Pendientes por ver ({watchlistMovies.length})
              </button>

              <button
                onClick={() => setMyListsTab('watched')}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${
                  myListsTab === 'watched' ? 'bg-[#184E3A] text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Películas Vistas ({watchedMovies.length})
              </button>
            </div>

            {myListsTab === 'watchlist' && (
              watchlistMovies.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#18201C] rounded-3xl border p-8 space-y-3">
                  <Bookmark className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-sm">No tienes películas en tu lista de pendientes.</p>
                  <button onClick={() => setCurrentView('catalog')} className="px-4 py-2 bg-[#184E3A] text-white font-bold rounded-full text-xs">
                    Ir al Catálogo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {watchlistMovies.map(movie => (
                    <div key={movie.id} onClick={() => setSelectedMovie(movie)} className="rounded-3xl border overflow-hidden bg-white dark:bg-[#18201C] cursor-pointer">
                      <img src={movie.poster} alt="" className="h-64 w-full object-cover" />
                      <div className="p-4 space-y-2">
                        <h4 className="font-serif-title font-bold text-base">{movie.titleEs || movie.titleEn}</h4>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleListStatus(movie.id, 'watched'); }}
                          className="w-full py-1.5 bg-emerald-700 text-white text-[11px] font-bold rounded-full"
                        >
                          Marcar como Vista
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {myListsTab === 'watched' && (
              watchedMovies.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#18201C] rounded-3xl border p-8 space-y-3">
                  <Check className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-sm">Aún no has marcado ninguna película como vista.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {watchedMovies.map(movie => (
                    <div key={movie.id} onClick={() => setSelectedMovie(movie)} className="rounded-3xl border overflow-hidden bg-white dark:bg-[#18201C] cursor-pointer">
                      <img src={movie.poster} alt="" className="h-64 w-full object-cover" />
                      <div className="p-4 space-y-2">
                        <h4 className="font-serif-title font-bold text-base">{movie.titleEs || movie.titleEn}</h4>
                        <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">¡Vista!</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* ==========================================
            SECTION 5: SUGERENCIAS
        ========================================== */}
        {currentView === 'suggestions' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className={`p-8 rounded-3xl border ${darkMode ? 'bg-[#18201C] border-[#2C3B33]' : 'bg-white border-[#E8E3DA]'}`}>
              <h2 className="font-serif-title text-3xl font-bold flex items-center gap-2 text-[#184E3A] dark:text-[#E3D4A3]">
                <MessageSquare className="w-6 h-6" /> Buzón de Sugerencias
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">¿Falta alguna película navideña? Envíanos tu sugerencia para añadirla al catálogo.</p>

              {sugSent && (
                <div className="mt-4 p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold">
                  ¡Muchas gracias! Tu sugerencia ha sido enviada a la administradora.
                </div>
              )}

              {sugError && <p role="alert" className="mt-4 text-xs text-red-500 font-bold">{sugError}</p>}
              <form onSubmit={handleSendSuggestion} className="space-y-4 mt-6 text-xs font-bold">
                <div>
                  <label className="block mb-1 text-slate-500">Título de la Película</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej: A Royal Corgi Christmas" 
                    value={sugTitle} 
                    onChange={(e) => setSugTitle(e.target.value)}
                    className="w-full p-3 rounded-2xl border dark:bg-[#121815]" 
                  />
                </div>
                <div>
                  <label className="block mb-1 text-slate-500">Información adicional o Plataforma</label>
                  <textarea 
                    rows={3} 
                    placeholder="Año de estreno, cadena Hallmark / GAF / Netflix, etc." 
                    value={sugNotes} 
                    onChange={(e) => setSugNotes(e.target.value)}
                    className="w-full p-3 rounded-2xl border dark:bg-[#121815]" 
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-[#184E3A] text-white rounded-full font-bold text-xs shadow-md">
                  Enviar Sugerencia
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==========================================
            SECTION 6: PANEL ADMIN
        ========================================== */}
        {currentView === 'admin' && (
          <div className="space-y-6">
            {!isAdmin ? (
              <div className="max-w-md mx-auto p-8 rounded-3xl border bg-white dark:bg-[#18201C] text-center space-y-3">
                <Shield className="w-8 h-8 text-[#184E3A] mx-auto" />
                <h3 className="font-serif-title text-2xl font-bold">Zona restringida</h3>
                <p className="text-xs text-slate-500 font-medium">Esta sección es solo para la administradora de Mistletoe Cinema.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#184E3A] text-white">
                  <h3 className="font-serif-title font-bold text-xl">Panel de Administradora Activo</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsAddingMovie(true)} className="px-3 py-1 bg-amber-400 text-black rounded-full text-xs font-bold">+ Añadir Película</button>
                    
                  </div>
                </div>

                {/* EDIT/ADD MOVIE FORM */}
                {(isAddingMovie || editingMovie) && (
                  <form onSubmit={handleSaveMovie} className="p-6 rounded-3xl border bg-white dark:bg-[#18201C] space-y-3 text-xs font-bold">
                    <h4 className="font-serif-title text-lg font-bold">{editingMovie ? 'Editar Película' : 'Añadir Nueva Película'}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <input name="titleEn" placeholder="Título en Inglés" defaultValue={editingMovie?.titleEn || ''} required className="p-2 border rounded-full dark:bg-[#121815]" />
                      <input name="titleEs" placeholder="Título en Español" defaultValue={editingMovie?.titleEs || ''} required className="p-2 border rounded-full dark:bg-[#121815]" />
                      <input name="platform" placeholder="Plataforma" defaultValue={editingMovie?.platform || 'Hallmark Channel'} required className="p-2 border rounded-full dark:bg-[#121815]" />
                      <input name="releaseDate" type="date" defaultValue={editingMovie?.releaseDate || '2026-12-01'} required className="p-2 border rounded-full dark:bg-[#121815]" />
                      <input name="poster" placeholder="URL Póster" defaultValue={editingMovie?.poster || ''} className="p-2 border rounded-full dark:bg-[#121815]" />
                      <input name="imdbScore" type="number" step="0.1" placeholder="Nota IMDb" defaultValue={editingMovie?.imdbScore ?? ''} className="p-2 border rounded-full dark:bg-[#121815]" />
                      <input name="category" placeholder="Categoría (Clásicos, Recientes...)" defaultValue={editingMovie?.category || 'Recientes'} className="p-2 border rounded-full dark:bg-[#121815]" />
                      <input name="status" placeholder="Estado (Estrenada / Próximo estreno)" defaultValue={editingMovie?.status || 'Estrenada'} className="p-2 border rounded-full dark:bg-[#121815]" />
                    </div>
                    <textarea name="synopsis" placeholder="Sinopsis..." defaultValue={editingMovie?.synopsis || ''} className="w-full p-2 border rounded-xl dark:bg-[#121815]" />
                    <input type="hidden" name="cast" defaultValue={editingMovie?.cast || ''} />
                    <input type="hidden" name="director" defaultValue={editingMovie?.director || ''} />
                    <input type="hidden" name="duration" defaultValue={editingMovie?.duration || '1h 30m'} />
                    <input type="hidden" name="ageRating" defaultValue={editingMovie?.ageRating || 'TP'} />
                    <input type="hidden" name="genre" defaultValue={editingMovie?.genre || 'Navideño'} />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setIsAddingMovie(false); setEditingMovie(null); }} className="px-4 py-1.5 rounded-full border">Cancelar</button>
                      <button type="submit" className="px-4 py-1.5 rounded-full bg-[#184E3A] text-white">Guardar</button>
                    </div>
                  </form>
                )}

                <AdminPanel />

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {catalogSync.lastSyncedAt
                    ? `Última actualización desde TMDB: ${new Date(catalogSync.lastSyncedAt).toLocaleString('es-ES')}`
                    : 'Aún no se ha sincronizado con TMDB.'}
                </p>

                <PlatformColorsPanel platforms={platforms} onSaved={reloadCatalog} />

                {/* MOVIES ADMIN TABLE */}
                <div className="overflow-x-auto border rounded-3xl bg-white dark:bg-[#18201C]">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead className="bg-slate-100 dark:bg-slate-800 p-2">
                      <tr>
                        <th className="p-3">Película</th>
                        <th className="p-3">Plataforma</th>
                        <th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {movies.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-3 font-bold">{m.titleEn} <span className="font-normal text-slate-400">({m.titleEs})</span></td>
                          <td className="p-3">{m.platform}</td>
                          <td className="p-3 text-right space-x-2">
                            <button onClick={() => setEditingMovie(m)} className="p-1 text-blue-600"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteMovie(m.id)} className="p-1 text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ENHANCED MOVIE DETAIL MODAL */}
      {selectedMovie && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 font-sans-body">
          <div className="bg-white dark:bg-[#18201C] rounded-3xl max-w-2xl w-full overflow-hidden border shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setSelectedMovie(null)} 
              className="absolute top-4 right-4 bg-black/60 text-white w-9 h-9 rounded-full font-bold z-20 flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-5 h-72 md:h-full bg-slate-900 relative">
                <img src={selectedMovie.poster} alt="" className="w-full h-full object-cover" />
              </div>

              <div className="md:col-span-7 p-6 space-y-4 text-xs font-semibold flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {selectedMovie.genre || 'Película Navideña'}
                    </span>
                    <h3 className="font-serif-title text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-tight">
                      {selectedMovie.titleEs || selectedMovie.titleEn}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{selectedMovie.titleEn}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="bg-[#184E3A] text-white px-2.5 py-0.5 rounded-full font-bold">{selectedMovie.platform}</span>
                    <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-bold">★ IMDb {selectedMovie.imdbScore ?? '—'}</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{selectedMovie.year}</span>
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{selectedMovie.duration || '1h 30m'}</span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 font-normal leading-relaxed text-xs">
                    {selectedMovie.synopsis}
                  </p>

                  <div className="pt-2 border-t text-[11px] space-y-1 text-slate-500 dark:text-slate-400">
                    <p><strong>Reparto principal:</strong> {selectedMovie.cast || 'No especificado'}</p>
                    <p><strong>Director:</strong> {selectedMovie.director || 'No especificado'}</p>
                    <p><strong>Estreno:</strong> {selectedMovie.releaseDate}</p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2 border-t">
                  <button 
                    onClick={() => toggleListStatus(selectedMovie.id, 'watchlist')} 
                    className={`px-4 py-2 border rounded-full font-bold text-xs flex items-center gap-1.5 ${
                      userLists.watchlist.includes(selectedMovie.id) ? 'bg-amber-500 text-white border-amber-500' : ''
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" /> Pendientes
                  </button>

                  <button 
                    onClick={() => toggleListStatus(selectedMovie.id, 'watched')} 
                    className={`px-4 py-2 rounded-full font-bold text-xs text-white flex items-center gap-1.5 ${
                      userLists.watched.includes(selectedMovie.id) ? 'bg-emerald-700' : 'bg-[#184E3A]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Marcar Vista
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
      {showAccountPanel && <AccountPanel onClose={() => setShowAccountPanel(false)} />}

      {/* AVISO LEGAL MODAL */}
      {showLegalModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-lg space-y-5 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8">
            <button onClick={() => setShowLegalModal(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-pastel-accent">Información legal</h3>
            <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Aviso legal</p>
            <button onClick={() => setShowLegalModal(false)} aria-label="Cerrar aviso legal" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-pastel-rose/60 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
            <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              <p>Mistletoe Cinema es un proyecto informativo, sin ánimo de lucro, creado por Flarrow & More.</p>
              <p>Los datos de las películas proceden de la API de TMDB (The Movie Database), o han sido añadidos manualmente por Flarrow & More.</p>
              <p>Los títulos, carátulas, logotipos y marcas registradas pertenecen a sus respectivos dueños. Esta web no está afiliada ni avalada por ellos.</p>
              <p>Las plataformas y cadenas se mencionan únicamente como referencia informativa.</p>
            </div>
            <button
          onClick={(onClose) => setShowLegalModal(false)} className="w-full rounded-xl bg-pastel-accent px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pastel-accentHover"
        >
          Entendido
        </button>
          </div>
        </div>
      )}

      {/* CONTACTO Y REDES MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans-body">
          <div className="bg-white dark:bg-[#18201C] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-xs space-y-5">
            <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 text-slate-400">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-serif-title text-2xl font-bold text-[#184E3A] dark:text-[#E3D4A3]">Contacto y Redes</h3>
            <div className="space-y-3">
              <a href="mailto:flarrowandmoreweb@gmail.com" className="inline-flex items-center gap-1.5 font-bold text-[#184E3A] dark:text-emerald-300">
                <Mail className="w-4 h-4" /> flarrowandmoreweb@gmail.com
              </a>
              <div className="flex gap-2">
                <a href="https://twitter.com/FlarrowAndMore" target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full bg-sky-500/10 text-sky-600 font-bold flex items-center gap-1">
                  <Twitter className="w-3.5 h-3.5" /> Twitter
                </a>
                <a href="https://instagram.com/flarrowandmore" target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-600 font-bold flex items-center gap-1">
                  <Instagram className="w-3.5 h-3.5" /> Instagram
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className={`border-t py-8 transition-colors ${
        darkMode ? 'bg-[#101713] border-[#233128] text-slate-400' : 'bg-[#F9F7F2] border-[#ECE8E0] text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans-body">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowLegalModal(true)} className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-200/50">
              Aviso Legal
            </button>
            <button onClick={() => setShowContactModal(true)} className="px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-200/50">
              Contacto y Redes
            </button>
          </div>
          <div className="text-slate-400 font-medium text-[11px]">
            © {new Date().getFullYear()} Mistletoe Cinema — Desarrollado por Flarrow & More
          </div>
        </div>
      </footer>
    </div>
  );
}
