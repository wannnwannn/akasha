import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search, Plus, Check, LogOut, Tv, Film, BookOpen, Book,
  PlayCircle, Loader2, Library, X, Minus, Edit2, Trash2, ChevronRight, Clock, EyeOff, User, FolderHeart, Sun, Moon, Flame,
  Link as LinkIcon, Bell, ExternalLink, Globe, Heart, Download, Share, Smartphone, BellRing, Calendar as CalendarIcon, BellOff
} from 'lucide-react';

// ============================================================================
// STYLES GLOBAUX
// ============================================================================
const GlobalStyles = () => (
  <style>{`
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
    body { background-color: var(--bg-base); color: var(--text-main); }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-base); }
    ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }
    * { scrollbar-width: thin; scrollbar-color: var(--border-color) var(--bg-base); }
  `}</style>
);

// ============================================================================
// CONFIGURATION
// ============================================================================
const TMDB_API_KEY = String(import.meta.env.VITE_TMDB_API_KEY || '');
const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '');
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
const VAPID_PUBLIC_KEY = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || '');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
}

// ============================================================================
// TYPES
// ============================================================================
interface MediaItem {
  id: string; source: string; title: string; cover: string | null; type: 'movie' | 'tv' | 'anime' | 'manga' | 'webtoon' | 'book'; year: string | number; description: string; totalEpisodes?: number | null; isAiring?: boolean; genres?: string[]; runtime?: number; prod_status?: string; isAdult?: boolean; creator?: string;
}

interface LibraryItem {
  id: string; user_id: string; media_id: string; source: string; title: string; cover_url: string | null; type: string; status: 'planning' | 'watching' | 'completed' | 'on_hold'; progress: number; total_episodes: number | null; rating: number | null; created_at: string; updated_at: string; description?: string; year?: string; genres?: string[]; runtime?: number; prod_status?: string; creator?: string; custom_link?: string; notes?: string; reminder_day?: string | null; reminder_time?: string | null; is_favorite?: boolean;
}

interface UserData { id: string; email?: string; user_metadata?: { timezone?: string } }
interface SelectOption { value: string; label: string; disabled?: boolean; }

const STATUS_CONFIG = {
  favorites: { label: 'Favoris', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-rose-500', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-rose-500 border-x border-rose-500', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-rose-500 border-b border-b-[var(--border-color)]' },
  watching: { label: 'En cours', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--primary)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-[var(--primary)] border-x border-[var(--primary)]', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] border-b border-b-[var(--border-color)]' },
  planning: { label: 'À voir', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--border-color)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-indigo-500 border-x border-[var(--border-color)]', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] border-b border-b-[var(--border-color)]' },
  completed: { label: 'Terminé', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--border-color)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-emerald-500 border-x border-[var(--border-color)]', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] border-b border-b-[var(--border-color)]' },
  on_hold: { label: 'En pause', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--border-color)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-amber-500 border-x border-[var(--border-color)]', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] border-b border-b-[var(--border-color)]' },
  reminders: { label: 'Rappels', containerBg: 'bg-[var(--bg-base)]', containerBorder: 'border-transparent', tabActive: 'bg-amber-500/10 text-amber-600 border-t-2 border-amber-500 border-x border-amber-500/30', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] border-b border-b-[var(--border-color)]' },
};

const FORMAT_OPTIONS: SelectOption[] = [
  { value: "all", label: "Tous les formats" }, { value: "movie", label: "Films" }, { value: "tv", label: "Séries" },
  { value: "anime", label: "Animes" }, { value: "manga", label: "Mangas" }, { value: "webtoon", label: "Webtoons" }, { value: "book", label: "Livres" }
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "+ Ajouter à la liste...", disabled: true }, { value: "watching", label: "En cours" },
  { value: "planning", label: "À voir" }, { value: "completed", label: "Terminé" }, { value: "on_hold", label: "En pause" }
];

const WEEK_DAYS = [
  { label: 'L', value: 'Lundi', num: 1 }, { label: 'M', value: 'Mardi', num: 2 }, { label: 'M', value: 'Mercredi', num: 3 },
  { label: 'J', value: 'Jeudi', num: 4 }, { label: 'V', value: 'Vendredi', num: 5 }, { label: 'S', value: 'Samedi', num: 6 }, { label: 'D', value: 'Dimanche', num: 0 }
];

// ============================================================================
// UTILS
// ============================================================================
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => { const handler = setTimeout(() => setDebouncedValue(value), delay); return () => clearTimeout(handler); }, [value, delay]);
  return debouncedValue;
}

function getNextOccurrence(reminderJsonStr: string | null | undefined, timeStr: string | null | undefined): Date | null {
  if (!reminderJsonStr || !timeStr) return null;
  try {
    const parsed = JSON.parse(reminderJsonStr);
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    if (parsed.date) {
      const specificDate = new Date(`${parsed.date}T00:00:00`);
      specificDate.setHours(hours, minutes, 0, 0);
      return specificDate;
    }
    if (parsed.days && Array.isArray(parsed.days) && parsed.days.length > 0) {
      const currentDayNum = now.getDay();
      let minDiff = 14;
      parsed.days.forEach((dayName: string) => {
        const targetDayConf = WEEK_DAYS.find(d => d.value === dayName);
        if (targetDayConf) {
          let diff = targetDayConf.num - currentDayNum;
          if (diff < 0 || (diff === 0 && (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)))) diff += 7;
          if (diff < minDiff) minDiff = diff;
        }
      });
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + minDiff);
      nextDate.setHours(hours, minutes, 0, 0);
      return nextDate;
    }
  } catch(e) { /* ignore parse error */ }
  return null;
}

// ============================================================================
// SERVICES API
// ============================================================================
const fetchTMDB = async (query: string): Promise<MediaItem[]> => {
  if (!TMDB_API_KEY) return [];
  const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR&include_adult=true`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').map((item: any) => ({
    id: item.id.toString(), source: 'tmdb', title: item.title || item.name, cover: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    type: item.media_type, year: (item.release_date || item.first_air_date || '').split('-')[0], description: item.overview || 'Aucune description disponible.',
    totalEpisodes: item.media_type === 'movie' ? 1 : null, isAiring: false, isAdult: item.adult === true
  }));
};

const fetchAniList = async (query: string, isUpcoming = false): Promise<MediaItem[]> => {
  const statusFilter = isUpcoming ? ', status: NOT_YET_RELEASED' : '';
  const sortFilter = isUpcoming ? ', sort: POPULARITY_DESC' : '';
  const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query ($search: String) { Page(page: 1, perPage: 15) { media(search: $search, type: ANIME${statusFilter}${sortFilter}) { id title { romaji english native } coverImage { large } format startDate { year } description episodes status genres duration isAdult studios(isMain: true) { nodes { name } } } } }`, variables: query ? { search: query } : {} }) });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data.Page.media.map((item: any) => ({
    id: item.id.toString(), source: 'anilist', title: item.title.english || item.title.romaji || item.title.native, cover: item.coverImage.large,
    type: 'anime', year: item.startDate.year || 'N/A', description: item.description?.replace(/<[^>]*>?/gm, '') || 'Aucune description disponible.',
    totalEpisodes: item.episodes || null, isAiring: item.status === 'RELEASING' || item.status === 'NOT_YET_RELEASED', genres: item.genres, runtime: item.duration, prod_status: item.status, isAdult: item.isAdult === true, creator: item.studios?.nodes?.[0]?.name || null
  }));
};

// ... Les autres fonctions fetch (Shikimori, OpenLibrary, Trending) restent identiques mais attention au typage MediaItem

const revalidateMediaDetails = async (item: MediaItem | LibraryItem): Promise<Partial<LibraryItem> | null> => {
  const targetId = 'media_id' in item ? item.media_id : item.id;
  try {
    if (item.source === 'tmdb') {
      const res = await fetch(`https://api.themoviedb.org/3/${item.type}/${targetId}?api_key=${TMDB_API_KEY}&language=fr-FR&append_to_response=credits`);
      if (!res.ok) return null;
      const data = await res.json();
      let creator = null;
      if (item.type === 'movie' && data.credits?.crew) creator = data.credits.crew.find((c: any) => c.job === 'Director')?.name;
      else if (item.type === 'tv' && data.created_by?.length > 0) creator = data.created_by[0].name;
      return { description: data.overview, total_episodes: item.type === 'tv' ? data.number_of_episodes : 1, genres: data.genres?.map((g: any) => g.name), runtime: item.type === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 0), prod_status: data.status, creator: creator || undefined };
    }
  } catch (e) {} return null;
};

// ============================================================================
// UI ATOMIQUES
// ============================================================================
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { icon?: any }> = ({ icon: Icon, ...props }) => (
  <div className="relative flex items-center w-full">
    {Icon && <Icon className="absolute left-4 text-[var(--text-muted)]" size={20} />}
    <input className={`w-full bg-[var(--panel-bg-alt)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all ${Icon ? 'pl-12' : ''}`} {...props} />
  </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'danger'|'ghost' }> = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: "bg-[var(--primary)] text-white shadow-lg",
    secondary: "bg-[var(--bg-base)] text-[var(--text-main)] border border-[var(--border-color)]",
    danger: "bg-red-500/10 text-red-500 border border-red-500/30",
    ghost: "text-[var(--text-muted)] hover:text-[var(--text-main)]"
  };
  return <button className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const CustomSelect: React.FC<{ value: string, onChange: (val: string) => void, options: SelectOption[], className?: string, placement?: 'bottom' | 'top' }> = ({ value, onChange, options, className = "", placement = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative w-full" ref={selectRef}>
      <div onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between w-full rounded-xl px-4 py-3.5 cursor-pointer font-bold text-sm border border-[var(--border-color)] bg-[var(--panel-bg-alt)] ${className}`}>
        <span className="truncate pr-2 text-[var(--text-main)]">{selectedOption?.label}</span>
        <ChevronRight size={16} className={`text-[var(--text-muted)] transition-transform ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
      </div>
      {isOpen && (
        <div className={`absolute z-50 left-0 right-0 ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden`}>
          <div className="max-h-60 overflow-y-auto py-1">
            {options.map((opt) => !opt.disabled && (
              <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors ${value === opt.value ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:bg-[var(--border-color)]'}`}>{opt.label}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ... AkashaLogo et TypeBadge restent identiques

// ============================================================================
// MODAL DE DÉTAILS
// ============================================================================
const DetailModal: React.FC<{
  item: MediaItem | LibraryItem, onClose: () => void, trackedItem: LibraryItem | undefined,
  onLibraryUpdate?: (id: string, updates: Partial<LibraryItem>) => void, user?: UserData, fetchLibrary?: () => void
}> = ({ item, onClose, trackedItem, onLibraryUpdate, user, fetchLibrary }) => {

  const [localData, setLocalData] = useState(item as LibraryItem);
  const [isActing, setIsActing] = useState(false);

  const initialReminder = useMemo(() => {
    if (!trackedItem?.reminder_day) return { type: 'weekly' as const, days: [] as string[], freq: "1", exactDate: '' };
    try {
      const parsed = JSON.parse(trackedItem.reminder_day as string);
      if (parsed.date) return { type: 'exact' as const, days: [], freq: "1", exactDate: parsed.date };
      return { type: 'weekly' as const, days: parsed.days || [], freq: parsed.frequency?.toString() || "1", exactDate: '' };
    } catch(e) { return { type: 'weekly' as const, days: [], freq: "1", exactDate: '' }; }
  }, [trackedItem]);

  const [notes, setNotes] = useState(trackedItem?.notes || '');
  const [customLink, setCustomLink] = useState(trackedItem?.custom_link || '');
  const [reminderDays, setReminderDays] = useState<string[]>(initialReminder.days);
  const [reminderTime, setReminderTime] = useState(trackedItem?.reminder_time || '18:00');

  useEffect(() => {
    const revalidate = async () => {
      const fresh = await revalidateMediaDetails(item);
      if (fresh && trackedItem && onLibraryUpdate) {
        setLocalData(prev => ({ ...prev, ...fresh }));
        onLibraryUpdate(trackedItem.id, fresh);
        await supabase.from('user_media').update(fresh).match({ id: trackedItem.id });
      }
    };
    revalidate();
  }, [item.id, trackedItem, onLibraryUpdate]);

  const saveExtras = async () => {
    if (!trackedItem) return;
    const reminderDataStr = reminderDays.length > 0 ? JSON.stringify({ days: reminderDays, frequency: 1 }) : null;
    const updates = {
      notes: notes || null,
      custom_link: customLink || null,
      reminder_day: reminderDataStr,
      reminder_time: reminderDataStr ? reminderTime : null
    };
    await supabase.from('user_media').update(updates).match({ id: trackedItem.id });
    if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, updates as Partial<LibraryItem>);
  };

  const handleAddOrUpdate = async (status: string) => {
    if (!user || !fetchLibrary) return;
    setIsActing(true);
    if (trackedItem) {
      await supabase.from('user_media').update({ status, updated_at: new Date().toISOString() }).match({ id: trackedItem.id });
    } else {
      await supabase.from('user_media').insert([{ user_id: user.id, media_id: item.id, source: item.source, title: item.title, cover_url: 'cover' in item ? item.cover : item.cover_url, type: item.type, status: status }]);
    }
    fetchLibrary();
    setIsActing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-[var(--panel-bg)] rounded-3xl w-full max-w-xl p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black mb-4">{localData.title}</h2>
        {!trackedItem ? (
           <CustomSelect value="" onChange={handleAddOrUpdate} options={STATUS_OPTIONS} />
        ) : (
          <div className="space-y-4">
             <textarea
                className="w-full p-4 bg-[var(--bg-base)] rounded-xl"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={saveExtras}
             />
             <Button variant="danger" onClick={async () => { await supabase.from('user_media').delete().match({ id: trackedItem.id }); fetchLibrary?.(); onClose(); }}>Supprimer</Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ... DiscoverySearch, RemindersList, PersistentPlayer, ProfileScreen et AuthScreen
// Applique les mêmes principes : supprimer les variables inutilisées dans les map/useEffect

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'search' | 'profile'>('dashboard');
  const [userLibrary, setUserLibrary] = useState<LibraryItem[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, []);

  const fetchLibrary = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_media').select('*').order('updated_at', { ascending: false });
    if (data) setUserLibrary(data as LibraryItem[]);
  }, [user]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  return (
    <div className={`${theme} min-h-screen bg-[var(--bg-base)]`}>
      <GlobalStyles />
      {/* Ton JSX de Navigation et Main Content ici en utilisant les composants corrigés */}
      {/* Assure-toi que toutes les fonctions de mise à jour utilisent LibraryItem correctement */}
    </div>
  );
}
