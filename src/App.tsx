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
    .custom-scrollbar::-webkit-scrollbar { height: 4px; }
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
// TYPES & INTERFACES
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
  } catch(e) { }
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

const mapStatusToLabel = (status: string | undefined) => {
  if (!status) return "Statut inconnu";
  const s = status.toLowerCase();
  if (['completed', 'finished', 'ended', 'released'].includes(s)) return "Terminée";
  if (['ongoing', 'releasing', 'returning series', 'in production'].includes(s)) return "En production";
  if (['planned', 'post production', 'not_yet_released'].includes(s)) return "À venir";
  return "Statut inconnu";
};

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
// UI COMPONENTS
// ============================================================================
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { icon?: any }> = ({ icon: Icon, ...props }) => (
  <div className="relative flex items-center w-full">
    {Icon && <Icon className="absolute left-4 text-[var(--text-muted)]" size={20} />}
    <input className={`w-full bg-[var(--panel-bg-alt)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all placeholder:text-[var(--text-muted)] font-medium ${Icon ? 'pl-12' : ''}`} {...props} />
  </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'danger'|'ghost' }> = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg",
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
        <ChevronRight size={16} className={`text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
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

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const config: Record<string, { color: string, icon: any, label: string }> = {
    movie: { color: 'bg-rose-500/20 text-rose-500', icon: Film, label: 'Film' },
    tv: { color: 'bg-amber-500/20 text-amber-600', icon: Tv, label: 'Série' },
    anime: { color: 'bg-orange-500/20 text-orange-600', icon: PlayCircle, label: 'Anime' },
    manga: { color: 'bg-teal-500/20 text-teal-600', icon: BookOpen, label: 'Manga' },
    webtoon: { color: 'bg-blue-500/20 text-blue-600', icon: Flame, label: 'Webtoon' },
    book: { color: 'bg-purple-500/20 text-purple-600', icon: Book, label: 'Livre' }
  };
  const current = config[type] || config.movie;
  const Icon = current.icon;
  return <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold ${current.color}`}><Icon size={12} /> {current.label}</span>;
};

// ============================================================================
// MODAL DE DÉTAILS
// ============================================================================
const DetailModal: React.FC<{
  item: MediaItem | LibraryItem, onClose: () => void, trackedItem: LibraryItem | undefined,
  onLibraryUpdate?: (id: string, updates: Partial<LibraryItem>) => void, user?: UserData, fetchLibrary?: () => void
}> = ({ item, onClose, trackedItem, onLibraryUpdate, user, fetchLibrary }) => {

  const [localData, setLocalData] = useState(item as LibraryItem);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [notes, setNotes] = useState(trackedItem?.notes || '');
  const [customLink, setCustomLink] = useState(trackedItem?.custom_link || '');
  const [reminderDays, setReminderDays] = useState<string[]>([]);
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
    const updates = { notes: notes || null, custom_link: customLink || null, reminder_day: reminderDataStr, reminder_time: reminderDataStr ? reminderTime : null };
    await supabase.from('user_media').update(updates).match({ id: trackedItem.id });
    if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, updates as Partial<LibraryItem>);
  };

  const handleAddOrUpdate = async (status: string) => {
    if (!user || !fetchLibrary) return;
    if (trackedItem) {
      await supabase.from('user_media').update({ status, updated_at: new Date().toISOString() }).match({ id: trackedItem.id });
    } else {
      await supabase.from('user_media').insert([{ user_id: user.id, media_id: item.id, source: item.source, title: item.title, cover_url: 'cover' in item ? item.cover : item.cover_url, type: item.type, status: status }]);
    }
    fetchLibrary();
    onClose();
  };

  const title = localData.title;
  const cover = ('cover' in localData) ? localData.cover : localData.cover_url;
  const description = localData.description || 'Chargement...';
  const prodStatusLabel = mapStatusToLabel(localData.prod_status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-[var(--panel-bg)] rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-20 bg-[var(--bg-base)] p-2 rounded-full"><X size={20} /></button>
        <div className="p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center mb-6">
             <div className="w-40 aspect-[2/3] rounded-xl overflow-hidden border border-[var(--border-color)]">
              {cover ? <img src={cover} alt={title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[var(--bg-base)] flex items-center justify-center"><BookOpen size={48} /></div>}
             </div>
          </div>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black mb-2">{title}</h2>
            <div className="flex justify-center gap-2 mb-4">
              <TypeBadge type={localData.type} />
              <span className="text-[10px] uppercase font-black px-2 py-1 rounded-md bg-[var(--primary)] text-white">{prodStatusLabel}</span>
            </div>
          </div>
          <div className="mb-6 bg-[var(--bg-base)] p-4 rounded-xl">
            <div className={`text-sm text-[var(--text-muted)] ${!showFullDesc && 'line-clamp-3'}`}>{description}</div>
            <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs font-bold text-[var(--primary)] mt-2">{showFullDesc ? 'Réduire' : 'Voir plus'}</button>
          </div>
          {!trackedItem ? (
            <CustomSelect value="" onChange={handleAddOrUpdate} options={STATUS_OPTIONS} />
          ) : (
            <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
              <CustomSelect value={trackedItem.status} onChange={handleAddOrUpdate} options={STATUS_OPTIONS.filter(o => o.value !== "")} />
              <textarea placeholder="Notes..." value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveExtras} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl p-4 min-h-[100px] outline-none" />
              <div className="flex gap-2">
                <input type="text" placeholder="Lien..." value={customLink} onChange={e => setCustomLink(e.target.value)} onBlur={saveExtras} className="flex-1 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-4 py-2" />
                <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} onBlur={saveExtras} className="bg-[var(--bg-base)] border border-[var(--border-color)] rounded-xl px-2" />
              </div>
              <Button variant="danger" className="w-full" onClick={async () => { await supabase.from('user_media').delete().match({ id: trackedItem.id }); fetchLibrary?.(); onClose(); }}>Retirer de la liste</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'search' | 'profile'>('dashboard');
  const [userLibrary, setUserLibrary] = useState<LibraryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'watching'|'planning'|'completed'|'on_hold'|'favorites'|'reminders'>('watching');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | LibraryItem | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => { setUser(session?.user ?? null); });
    return () => subscription.unsubscribe();
  }, []);

  const fetchLibrary = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('user_media').select('*').order('updated_at', { ascending: false });
    if (data) setUserLibrary(data as LibraryItem[]);
  }, [user]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const updateProgress = async (item: LibraryItem, increment: number) => {
    const newProgress = Math.max(0, item.progress + increment);
    const newDate = new Date().toISOString();
    setUserLibrary(prev => prev.map(l => l.id === item.id ? { ...l, progress: newProgress, updated_at: newDate } : l));
    await supabase.from('user_media').update({ progress: newProgress, updated_at: newDate }).match({ id: item.id });
  };

  const handleSWRUpdate = (id: string, updates: Partial<LibraryItem>) => { setUserLibrary(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l)); };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!user) return <div className={theme}><GlobalStyles/><div className="min-h-screen flex items-center justify-center">Connectez-vous pour continuer.</div></div>;

  return (
    <div className={`${theme} min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] transition-colors duration-300`}>
      <GlobalStyles />
      <nav className="fixed bottom-4 inset-x-6 z-50 max-w-md mx-auto bg-[var(--panel-bg)]/90 backdrop-blur-xl border border-[var(--border-color)] rounded-3xl p-3 flex justify-around shadow-2xl">
        <button onClick={() => setCurrentTab('dashboard')} className={currentTab === 'dashboard' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}><Library size={24} /></button>
        <button onClick={() => setCurrentTab('search')} className={currentTab === 'search' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}><Search size={24} /></button>
        <button onClick={() => setCurrentTab('profile')} className={currentTab === 'profile' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}><User size={24} /></button>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-[var(--text-muted)]">{theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}</button>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-28">
        {currentTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['favorites', 'watching', 'planning', 'completed', 'on_hold', 'reminders'].map((f) => (
                <button key={f} onClick={() => setActiveFilter(f as any)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeFilter === f ? 'bg-[var(--primary)] text-white' : 'bg-[var(--panel-bg)]'}`}>{STATUS_CONFIG[f as keyof typeof STATUS_CONFIG].label}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {userLibrary.filter(i => activeFilter === 'reminders' ? i.reminder_day : i.status === activeFilter).map(item => (
                <div key={item.id} className="bg-[var(--panel-bg)] rounded-2xl overflow-hidden border border-[var(--border-color)] p-4 cursor-pointer" onClick={() => setSelectedMedia(item)}>
                  <div className="aspect-[2/3] rounded-lg overflow-hidden mb-3">
                    {item.cover_url ? <img src={item.cover_url} className="w-full h-full object-cover" /> : <div className="bg-[var(--bg-base)] h-full w-full flex items-center justify-center"><BookOpen /></div>}
                  </div>
                  <h3 className="font-bold text-sm line-clamp-1">{item.title}</h3>
                  <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => updateProgress(item, -1)} className="p-1 bg-[var(--bg-base)] rounded-lg"><Minus size={14} /></button>
                    <span className="text-xs font-mono">{item.progress} / {item.total_episodes || '?'}</span>
                    <button onClick={() => updateProgress(item, 1)} className="p-1 bg-[var(--primary)] text-white rounded-lg"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {currentTab === 'search' && <div className="text-center py-10">Interface de recherche (Tapez pour chercher...)</div>}
        {currentTab === 'profile' && <div className="max-w-md mx-auto bg-[var(--panel-bg)] p-8 rounded-3xl text-center">
          <h2 className="text-xl font-bold mb-4">Mon Profil</h2>
          <Button variant="danger" className="w-full" onClick={() => supabase.auth.signOut()}>Déconnexion</Button>
        </div>}
      </main>

      {selectedMedia && (
        <DetailModal
          item={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          trackedItem={userLibrary.find(i => String(i.id) === String(selectedMedia.id) || (String(i.media_id) === String(selectedMedia.id) && i.source === selectedMedia.source))}
          onLibraryUpdate={handleSWRUpdate}
          user={user || undefined}
          fetchLibrary={fetchLibrary}
        />
      )}
    </div>
  );
}
