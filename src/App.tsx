import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search, Plus, Check, LogOut, Tv, Film, BookOpen, Book,
  PlayCircle, Loader2, Library, X, Minus, Edit2, Trash2, AlertTriangle, ChevronRight, Clock, EyeOff, User, FolderHeart, Sun, Moon, Flame,
  Link as LinkIcon, Bell, ExternalLink, Globe, Heart, Download, Share, Smartphone
} from 'lucide-react';

// ============================================================================
// STYLES GLOBAUX
// ============================================================================
const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    :root {
      --bg-base: #f0f2f5;
      --panel-bg: #ffffff;
      --panel-bg-alt: #f8fafc;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border-color: #cbd5e1;
      --primary: #4f000b;
      --primary-hover: #7a0011;
      --shadow-color: rgba(79, 0, 11, 0.15);
    }

    .dark {
      --bg-base: #2a2a2a;
      --panel-bg: #333333;
      --panel-bg-alt: #1a1a1a;
      --text-main: #ffffff;
      --text-muted: #a0a0a0;
      --border-color: #444444;
      --primary: #ce4257;
      --primary-hover: #e05268;
      --shadow-color: rgba(206, 66, 87, 0.25);
    }

    body {
      background-color: var(--bg-base);
      color: var(--text-main);
    }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-base); }
    ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
    * { scrollbar-width: thin; scrollbar-color: var(--border-color) var(--bg-base); }

    .custom-scrollbar::-webkit-scrollbar { height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; margin-inline: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--primary); }
  `}} />
);

// ============================================================================
// CONFIGURATION (SÉCURISÉE POUR VERCEL)
// ============================================================================
// REMPLACEMENT CRITIQUE : Utilisation des variables d'environnement.
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Erreur critique: Les variables d'environnement Supabase sont manquantes.");
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface MediaItem {
  id: string;
  source: 'tmdb' | 'anilist' | 'shikimori' | 'openlibrary';
  title: string;
  cover: string | null;
  type: 'movie' | 'tv' | 'anime' | 'manga' | 'webtoon' | 'book';
  year: string | number;
  description: string;
  totalEpisodes?: number | null;
  total_episodes?: number | null;
  isAiring?: boolean;
  genres?: string[];
  runtime?: number;
  prod_status?: string;
  isAdult?: boolean;
  creator?: string;
}

interface LibraryItem {
  id: string;
  user_id: string;
  media_id: string;
  source: string;
  title: string;
  cover_url: string | null;
  type: string;
  status: 'planning' | 'watching' | 'completed' | 'on_hold';
  progress: number;
  total_episodes: number | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  description?: string;
  year?: string;
  genres?: string[];
  runtime?: number;
  prod_status?: string;
  creator?: string;
  custom_link?: string;
  notes?: string;
  reminder_day?: string;
  reminder_time?: string;
  is_favorite?: boolean;
  isAiring?: boolean;
  isAdult?: boolean;
  totalEpisodes?: number | null;
}

interface UserData { id: string; email?: string; user_metadata?: { timezone?: string } }

interface SelectOption { value: string; label: string; disabled?: boolean; }

// ============================================================================
// CONFIGURATION DESIGN & STATUTS GLOBALE
// ============================================================================
const STATUS_CONFIG = {
  favorites: { label: 'Favoris', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-rose-500', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-rose-500 border-x border-rose-500', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-rose-500 border-t-2 border-transparent border-b border-b-rose-500' },
  watching: { label: 'En cours', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--primary)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-[var(--primary)] border-x border-[var(--primary)]', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-t-2 border-transparent border-b border-b-[var(--primary)]' },
  planning: { label: 'À voir', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--border-color)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-indigo-500 border-x border-[var(--border-color)]', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-t-2 border-transparent border-b border-b-[var(--border-color)]' },
  completed: { label: 'Terminé', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--border-color)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-emerald-500 border-x border-[var(--border-color)]', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-t-2 border-transparent border-b border-b-[var(--border-color)]' },
  on_hold: { label: 'En pause', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--border-color)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-amber-500 border-x border-[var(--border-color)]', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-t-2 border-transparent border-b border-b-[var(--border-color)]' },
};

const FORMAT_OPTIONS: SelectOption[] = [
  { value: "all", label: "Tous les formats" }, { value: "movie", label: "Films" }, { value: "tv", label: "Séries" },
  { value: "anime", label: "Animes" }, { value: "manga", label: "Mangas" }, { value: "webtoon", label: "Webtoons" }, { value: "book", label: "Livres" }
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "+ Ajouter à la liste...", disabled: true },
  { value: "watching", label: "En cours" }, { value: "planning", label: "À voir" },
  { value: "completed", label: "Terminé" }, { value: "on_hold", label: "En pause" }
];

const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: "1", label: "Toutes les semaines" }, { value: "2", label: "1 semaine sur 2" },
  { value: "3", label: "1 semaine sur 3" }, { value: "4", label: "1 semaine sur 4" }
];

const WEEK_DAYS = [
  { label: 'L', value: 'Lundi' }, { label: 'M', value: 'Mardi' }, { label: 'M', value: 'Mercredi' },
  { label: 'J', value: 'Jeudi' }, { label: 'V', value: 'Vendredi' }, { label: 'S', value: 'Samedi' }, { label: 'D', value: 'Dimanche' }
];

// ============================================================================
// UTILS & CACHE
// ============================================================================
const apiCache = new Map<string, MediaItem[]>();

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ============================================================================
// SERVICES API
// ============================================================================
const fetchTMDB = async (query: string): Promise<MediaItem[]> => {
  if (!TMDB_API_KEY) return [];
  const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR&include_adult=true`);
  if (!res.ok) throw new Error("Erreur TMDB");
  const data = await res.json();
  return data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').map((item: any) => ({
    id: item.id.toString(), source: 'tmdb', title: item.title || item.name,
    cover: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null, type: item.media_type,
    year: (item.release_date || item.first_air_date || '').split('-')[0], description: item.overview || 'Aucune description disponible.',
    totalEpisodes: item.media_type === 'movie' ? 1 : null, isAiring: false, isAdult: item.adult === true
  }));
};

const fetchAniList = async (query: string, isUpcoming = false): Promise<MediaItem[]> => {
  const statusFilter = isUpcoming ? ', status: NOT_YET_RELEASED' : '';
  const sortFilter = isUpcoming ? ', sort: POPULARITY_DESC' : '';
  const graphqlQuery = `query ($search: String) { Page(page: 1, perPage: 15) { media(search: $search, type: ANIME${statusFilter}${sortFilter}) { id title { romaji english native } coverImage { large } format startDate { year } description episodes status genres duration isAdult studios(isMain: true) { nodes { name } } } } }`;
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query: graphqlQuery, variables: query ? { search: query } : undefined })
  });
  if (!res.ok) throw new Error("Erreur AniList");
  const data = await res.json();
  return data.data.Page.media.map((item: any) => ({
    id: item.id.toString(), source: 'anilist', title: item.title.english || item.title.romaji || item.title.native,
    cover: item.coverImage.large, type: 'anime', year: item.startDate.year || 'N/A',
    description: item.description?.replace(/<[^>]*>?/gm, '') || 'Aucune description disponible.',
    totalEpisodes: item.episodes || null, isAiring: item.status === 'RELEASING' || item.status === 'NOT_YET_RELEASED',
    genres: item.genres, runtime: item.duration, prod_status: item.status, isAdult: item.isAdult === true,
    creator: item.studios?.nodes?.[0]?.name || null
  }));
};

const fetchShikimori = async (query: string): Promise<MediaItem[]> => {
  const res = await fetch(`https://shikimori.one/api/mangas?search=${encodeURIComponent(query)}&limit=10`);
  if (!res.ok) throw new Error("Erreur Shikimori");
  const data = await res.json();
  return data.map((item: any) => ({
    id: item.id.toString(), source: 'shikimori', title: item.name || item.russian,
    cover: item.image?.original ? `https://shikimori.one${item.image.original}` : null,
    type: item.kind === 'manhwa' ? 'webtoon' : 'manga', year: item.aired_on ? item.aired_on.split('-')[0] : 'N/A',
    description: 'Recherche des détails en arrière-plan...', totalEpisodes: item.volumes || item.chapters || null,
    isAiring: item.status === 'ongoing', isAdult: false
  }));
};

const fetchOpenLibrary = async (query: string): Promise<MediaItem[]> => {
  const isISBN = /^[0-9-]+$/.test(query) && query.replace(/-/g, '').length >= 10;
  const searchQuery = isISBN ? `isbn=${query}` : `q=${encodeURIComponent(query)}`;
  const res = await fetch(`https://openlibrary.org/search.json?${searchQuery}&limit=10`);
  if (!res.ok) throw new Error("Erreur OpenLibrary");
  const data = await res.json();
  return data.docs.map((item: any) => ({
    id: item.key, source: 'openlibrary', title: item.title,
    cover: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
    type: 'book', year: item.first_publish_year || 'N/A',
    description: item.author_name ? `Auteur(s) : ${item.author_name.join(', ')}` : 'Aucune info.',
    totalEpisodes: item.number_of_pages_median || null, isAiring: false, genres: item.subject ? item.subject.slice(0, 3) : [],
    isAdult: false, creator: item.author_name ? item.author_name[0] : null
  }));
};

const fetchTrendingTMDB = async (): Promise<MediaItem[]> => {
  if (!TMDB_API_KEY) return [];
  const res = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}&language=fr-FR`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').map((item: any) => ({
    id: item.id.toString(), source: 'tmdb', title: item.title || item.name,
    cover: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    type: item.media_type, year: (item.release_date || item.first_air_date || '').split('-')[0],
    description: item.overview || '', totalEpisodes: item.media_type === 'movie' ? 1 : null, isAdult: item.adult === true
  }));
};

const mapStatusToLabel = (status: string | undefined) => {
  if (!status) return "Statut inconnu";
  const s = status.toLowerCase();
  if (['completed', 'finished', 'ended', 'released'].includes(s)) return "Terminée";
  if (['ongoing', 'releasing', 'returning series', 'in production'].includes(s)) return "En production";
  if (['planned', 'post production', 'not_yet_released'].includes(s)) return "À venir";
  if (s === 'canceled') return "Annulée";
  return "Statut inconnu";
};

const revalidateMediaDetails = async (item: MediaItem | LibraryItem): Promise<Partial<LibraryItem> | null> => {
  const targetId = 'media_id' in item ? item.media_id : item.id;
  try {
    if (item.source === 'tmdb' && TMDB_API_KEY) {
      const res = await fetch(`https://api.themoviedb.org/3/${item.type}/${targetId}?api_key=${TMDB_API_KEY}&language=fr-FR&append_to_response=credits`);
      if (!res.ok) return null;
      const data = await res.json();
      let creator = null;
      if (item.type === 'movie' && data.credits?.crew) {
        creator = data.credits.crew.find((c: any) => c.job === 'Director')?.name;
      } else if (item.type === 'tv' && data.created_by?.length > 0) {
        creator = data.created_by[0].name;
      }
      return { description: data.overview, total_episodes: item.type === 'tv' ? data.number_of_episodes : 1, genres: data.genres?.map((g: any) => g.name), runtime: item.type === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 0), prod_status: data.status, creator: creator || item.creator };
    }
    if (item.source === 'anilist') {
      const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query ($id: Int) { Media(id: $id) { description episodes status genres duration studios(isMain: true) { nodes { name } } } }`, variables: { id: parseInt(targetId) } }) });
      if (!res.ok) return null;
      const data = await res.json();
      return { description: data.data.Media.description?.replace(/<[^>]*>?/gm, ''), total_episodes: data.data.Media.episodes || (item as any).total_episodes || (item as any).totalEpisodes, genres: data.data.Media.genres, runtime: data.data.Media.duration, prod_status: data.data.Media.status, creator: data.data.Media.studios?.nodes?.[0]?.name || item.creator };
    }
  } catch (e) {} return null;
};

// ============================================================================
// COMPOSANTS UI ATOMIQUES
// ============================================================================
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { icon?: any }> = ({ icon: Icon, ...props }) => (
  <div className="relative flex items-center w-full">
    {Icon && <Icon className="absolute left-4 text-[var(--text-muted)]" size={20} />}
    <input className={`w-full bg-[var(--panel-bg-alt)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all placeholder:text-[var(--text-muted)] font-medium ${Icon ? 'pl-12' : ''}`} {...props} />
  </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'danger'|'ghost' }> = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-[var(--shadow-color)]",
    secondary: "bg-[var(--bg-base)] hover:bg-[var(--border-color)] text-[var(--text-main)] border border-[var(--border-color)]",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30",
    ghost: "hover:bg-[var(--panel-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
  };
  return <button className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const CustomSelect: React.FC<{ value: string, onChange: (val: string) => void, options: SelectOption[], className?: string, placement?: 'bottom' | 'top' }> = ({ value, onChange, options, className = "", placement = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { if (selectRef.current && !selectRef.current.contains(event.target as Node)) setIsOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative w-full" ref={selectRef}>
      <div onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between w-full rounded-xl px-4 py-3.5 cursor-pointer font-bold text-sm transition-all select-none border border-[var(--border-color)] bg-[var(--panel-bg-alt)] ${className}`}>
        <span className="truncate pr-2 text-[var(--text-main)]">{selectedOption?.label || String(value)}</span>
        <ChevronRight size={16} className={`text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
      </div>
      {isOpen && (
        <div className={`absolute z-50 left-0 right-0 ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
          <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {options.map((opt) => opt.disabled ? null : (
              <div key={opt.value} onClick={() => { onChange(String(opt.value)); setIsOpen(false); }} className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors mx-1 rounded-lg ${value === opt.value ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:bg-[var(--border-color)] hover:text-[var(--text-main)]'}`}>{opt.label}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ... [Les composants visuels comme AkashaLogo, TypeBadge, InlineEpisodeEdit restent identiques pour ne pas saturer la réponse, ils ne bloquent pas le build Vercel. Veillez simplement à bien injecter leurs SVG ou JSX basiques ici] ...

const DetailModal: React.FC<{ item: MediaItem | LibraryItem, onClose: () => void, trackedItem: LibraryItem | undefined, onLibraryUpdate?: (id: string, updates: Partial<LibraryItem>) => void, user?: UserData, fetchLibrary?: () => void }> = ({ item, onClose, trackedItem, onLibraryUpdate, user, fetchLibrary }) => {
  // [Le contenu du modal reste structurellement identique. La logique des interactions de base est valide pour Vercel].
  return <div>Modal Content (Truncated for brevity, paste your previous Modal implementation here)</div>;
};

// ============================================================================
// COMPOSANT EXPLORER (SEARCH)
// ============================================================================
// [Logique de recherche conservée, elle est clean et n'impacte pas le build Vercel tant que les env vars sont présentes au dessus]

const DiscoverySearch: React.FC<any> = () => { return <div>Discovery Search Content (Paste existing)</div> }
const PersistentPlayer: React.FC<any> = () => { return <div>Persistent Player Content (Paste existing)</div> }
const ProfileScreen: React.FC<any> = () => { return <div>Profile Screen Content (Paste existing)</div> }
const AuthScreen: React.FC<any> = () => { return <div>Auth Screen Content (Paste existing)</div> }

// ============================================================================
// APPLICATION PRINCIPALE
// ============================================================================
export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'search' | 'profile'>('dashboard');
  const [userLibrary, setUserLibrary] = useState<LibraryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'watching' | 'planning' | 'completed' | 'on_hold' | 'favorites'>('watching');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | LibraryItem | null>(null);
  const [lastInteractedId, setLastInteractedId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const filteredLibrary = userLibrary.filter(item => {
    const formatMatch = formatFilter === 'all' || item.type === formatFilter;
    if (activeFilter === 'favorites') return item.is_favorite === true && formatMatch;
    return item.status === activeFilter && formatMatch;
  });

  const activePlayerItem = useMemo(() => userLibrary.find(i => i.id === lastInteractedId) || null, [userLibrary, lastInteractedId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchLibrary = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('user_media').select('*').order('updated_at', { ascending: false });
    if (error) console.error("Erreur DB:", error);
    if (data) {
      setUserLibrary(data as LibraryItem[]);
      if (data.length > 0 && !lastInteractedId) setLastInteractedId(data[0].id);
    }
  }, [user, lastInteractedId]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  if (authLoading) return <div className={`min-h-screen ${theme} bg-[var(--bg-base)] flex items-center justify-center`}><Loader2 className="animate-spin text-[var(--primary)]" size={48} /></div>;
  if (!user) return <div className={theme}><GlobalStyles/><AuthScreen onLogin={setUser} /></div>;

  // Rendu de l'application principale (Copiez l'UI de votre return statement d'origine ici, l'infrastructure est maintenant solide)
  return <div>App Structure (Paste your main return here)</div>;
}
