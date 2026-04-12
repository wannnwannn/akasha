import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  Search, Plus, Check, LogOut, Tv, Film, BookOpen, Book,
  PlayCircle, Loader2, Library, X, Minus, Edit2, Trash2, AlertTriangle, ChevronRight, Clock, EyeOff, User, FolderHeart, Sun, Moon, Flame,
  Link as LinkIcon, Bell, ExternalLink, Globe, Heart, Download, Share, Smartphone
} from 'lucide-react';

// ============================================================================
// STYLES GLOBAUX (VARIABLES DE THÈME & SCROLLBARS)
// ============================================================================
const GlobalStyles = () => (
  <style>{`
    :root {
      /* THÈME CLAIR (Par défaut) */
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
      /* THÈME SOMBRE */
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

    /* Scrollbar globale */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: var(--bg-base);
    }
    ::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--text-muted);
    }
    * {
      scrollbar-width: thin;
      scrollbar-color: var(--border-color) var(--bg-base);
    }

    /* Scrollbar horizontale personnalisée */
    .custom-scrollbar::-webkit-scrollbar {
      height: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
      margin-inline: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: var(--primary);
    }
  `}</style>
);

// ============================================================================
// CONFIGURATION (PRODUCTION PURE)
// ============================================================================
const TMDB_API_KEY = '7dfd3c0011bfe4c3bd253da99abf4e4d';
const SUPABASE_URL = 'https://ewdtspjgcuvwvjnooytf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZHRzcGpnY3V2d3Zqbm9veXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MjMxMzgsImV4cCI6MjA5MTI5OTEzOH0.fHTGoA8OFOhk7VusZFgCg7GBn0cgp-UrYeJjV2gxl10';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
}

interface UserData { id: string; email?: string; user_metadata?: { timezone?: string } }

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// ============================================================================
// CONFIGURATION DESIGN & STATUTS GLOBALE
// ============================================================================
const STATUS_CONFIG = {
  favorites: {
    label: 'Favoris',
    containerBg: 'bg-[var(--panel-bg)]',
    containerBorder: 'border-rose-500',
    tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-rose-500 border-x border-rose-500',
    tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-rose-500 border-t-2 border-transparent border-b border-b-rose-500'
  },
  watching: {
    label: 'En cours',
    containerBg: 'bg-[var(--panel-bg)]',
    containerBorder: 'border-[var(--primary)]',
    tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-[var(--primary)] border-x border-[var(--primary)]',
    tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-t-2 border-transparent border-b border-b-[var(--primary)]'
  },
  planning: {
    label: 'À voir',
    containerBg: 'bg-[var(--panel-bg)]',
    containerBorder: 'border-[var(--border-color)]',
    tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-indigo-500 border-x border-[var(--border-color)]',
    tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-t-2 border-transparent border-b border-b-[var(--border-color)]'
  },
  completed: {
    label: 'Terminé',
    containerBg: 'bg-[var(--panel-bg)]',
    containerBorder: 'border-[var(--border-color)]',
    tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-emerald-500 border-x border-[var(--border-color)]',
    tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-t-2 border-transparent border-b border-b-[var(--border-color)]'
  },
  on_hold: {
    label: 'En pause',
    containerBg: 'bg-[var(--panel-bg)]',
    containerBorder: 'border-[var(--border-color)]',
    tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-amber-500 border-x border-[var(--border-color)]',
    tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-t-2 border-transparent border-b border-b-[var(--border-color)]'
  },
};

const FORMAT_OPTIONS: SelectOption[] = [
  { value: "all", label: "Tous les formats" },
  { value: "movie", label: "Films" },
  { value: "tv", label: "Séries" },
  { value: "anime", label: "Animes" },
  { value: "manga", label: "Mangas" },
  { value: "webtoon", label: "Webtoons" },
  { value: "book", label: "Livres" }
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "+ Ajouter à la liste...", disabled: true },
  { value: "watching", label: "En cours" },
  { value: "planning", label: "À voir" },
  { value: "completed", label: "Terminé" },
  { value: "on_hold", label: "En pause" }
];

const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: "1", label: "Toutes les semaines" },
  { value: "2", label: "1 semaine sur 2" },
  { value: "3", label: "1 semaine sur 3" },
  { value: "4", label: "1 semaine sur 4" }
];

const WEEK_DAYS = [
  { label: 'L', value: 'Lundi' },
  { label: 'M', value: 'Mardi' },
  { label: 'M', value: 'Mercredi' },
  { label: 'J', value: 'Jeudi' },
  { label: 'V', value: 'Vendredi' },
  { label: 'S', value: 'Samedi' },
  { label: 'D', value: 'Dimanche' }
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
  const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR&include_adult=true`);
  if (!res.ok) throw new Error("Erreur TMDB");
  const data = await res.json();
  return data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').map((item: any) => ({
    id: item.id.toString(),
    source: 'tmdb',
    title: item.title || item.name,
    cover: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    type: item.media_type,
    year: (item.release_date || item.first_air_date || '').split('-')[0],
    description: item.overview || 'Aucune description disponible.',
    totalEpisodes: item.media_type === 'movie' ? 1 : null,
    isAiring: false,
    isAdult: item.adult === true
  }));
};

const fetchAniList = async (query: string, isUpcoming = false): Promise<MediaItem[]> => {
  const statusFilter = isUpcoming ? ', status: NOT_YET_RELEASED' : '';
  const sortFilter = isUpcoming ? ', sort: POPULARITY_DESC' : '';
  const graphqlQuery = `
    query ($search: String) {
      Page(page: 1, perPage: 15) {
        media(search: $search, type: ANIME${statusFilter}${sortFilter}) {
          id title { romaji english native } coverImage { large } format startDate { year } description episodes status genres duration isAdult studios(isMain: true) { nodes { name } }
        }
      }
    }
  `;
  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query: graphqlQuery, variables: query ? { search: query } : undefined })
  });
  if (!res.ok) throw new Error("Erreur AniList");
  const data = await res.json();
  return data.data.Page.media.map((item: any) => ({
    id: item.id.toString(),
    source: 'anilist',
    title: item.title.english || item.title.romaji || item.title.native,
    cover: item.coverImage.large,
    type: 'anime',
    year: item.startDate.year || 'N/A',
    description: item.description?.replace(/<[^>]*>?/gm, '') || 'Aucune description disponible.',
    totalEpisodes: item.episodes || null,
    isAiring: item.status === 'RELEASING' || item.status === 'NOT_YET_RELEASED',
    genres: item.genres,
    runtime: item.duration,
    prod_status: item.status,
    isAdult: item.isAdult === true,
    creator: item.studios?.nodes?.[0]?.name || null
  }));
};

const fetchShikimori = async (query: string): Promise<MediaItem[]> => {
  const res = await fetch(`https://shikimori.one/api/mangas?search=${encodeURIComponent(query)}&limit=10`);
  if (!res.ok) throw new Error("Erreur Shikimori");
  const data = await res.json();
  return data.map((item: any) => ({
    id: item.id.toString(),
    source: 'shikimori',
    title: item.name || item.russian,
    cover: item.image?.original ? `https://shikimori.one${item.image.original}` : null,
    type: item.kind === 'manhwa' ? 'webtoon' : 'manga',
    year: item.aired_on ? item.aired_on.split('-')[0] : 'N/A',
    description: 'Recherche des détails en arrière-plan...',
    totalEpisodes: item.volumes || item.chapters || null,
    isAiring: item.status === 'ongoing',
    isAdult: false
  }));
};

const fetchOpenLibrary = async (query: string): Promise<MediaItem[]> => {
  const isISBN = /^[0-9-]+$/.test(query) && query.replace(/-/g, '').length >= 10;
  const searchQuery = isISBN ? `isbn=${query}` : `q=${encodeURIComponent(query)}`;

  const res = await fetch(`https://openlibrary.org/search.json?${searchQuery}&limit=10`);
  if (!res.ok) throw new Error("Erreur OpenLibrary");
  const data = await res.json();

  return data.docs.map((item: any) => ({
    id: item.key,
    source: 'openlibrary',
    title: item.title,
    cover: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
    type: 'book',
    year: item.first_publish_year || 'N/A',
    description: item.author_name ? `Auteur(s) : ${item.author_name.join(', ')}` : 'Aucune info.',
    totalEpisodes: item.number_of_pages_median || null,
    isAiring: false,
    genres: item.subject ? item.subject.slice(0, 3) : [],
    isAdult: false,
    creator: item.author_name ? item.author_name[0] : null
  }));
};

const fetchTrendingTMDB = async (): Promise<MediaItem[]> => {
  const res = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}&language=fr-FR`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').map((item: any) => ({
    id: item.id.toString(), source: 'tmdb', title: item.title || item.name,
    cover: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    type: item.media_type, year: (item.release_date || item.first_air_date || '').split('-')[0],
    description: item.overview || '', totalEpisodes: item.media_type === 'movie' ? 1 : null,
    isAdult: item.adult === true
  }));
};

const mapStatusToLabel = (status: string | undefined) => {
  if (!status) return "Statut inconnu";
  const s = status.toLowerCase();

  if (s === 'completed' || s === 'finished' || s === 'ended' || s === 'released') return "Terminée";
  if (s === 'ongoing' || s === 'releasing' || s === 'returning series' || s === 'in production') return "En production";
  if (s === 'planned' || s === 'post production' || s === 'not_yet_released') return "À venir";
  if (s === 'canceled') return "Annulée";

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
      if (item.type === 'movie' && data.credits?.crew) {
        creator = data.credits.crew.find((c: any) => c.job === 'Director')?.name;
      } else if (item.type === 'tv' && data.created_by?.length > 0) {
        creator = data.created_by[0].name;
      }

      return {
        description: data.overview,
        total_episodes: item.type === 'tv' ? data.number_of_episodes : 1,
        genres: data.genres?.map((g: any) => g.name),
        runtime: item.type === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 0),
        prod_status: data.status,
        creator: creator || item.creator
      };
    }
    if (item.source === 'anilist') {
      const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query ($id: Int) { Media(id: $id) { description episodes status genres duration studios(isMain: true) { nodes { name } } } }`, variables: { id: parseInt(targetId) } }) });
      if (!res.ok) return null;
      const data = await res.json();
      return {
        description: data.data.Media.description?.replace(/<[^>]*>?/gm, ''),
        total_episodes: data.data.Media.episodes || (item as any).total_episodes || (item as any).totalEpisodes,
        genres: data.data.Media.genres,
        runtime: data.data.Media.duration,
        prod_status: data.data.Media.status,
        creator: data.data.Media.studios?.nodes?.[0]?.name || item.creator
      };
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

const CustomSelect: React.FC<{
  value: string,
  onChange: (val: string) => void,
  options: SelectOption[],
  className?: string,
  placement?: 'bottom' | 'top'
}> = ({ value, onChange, options, className = "", placement = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative w-full" ref={selectRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full rounded-xl px-4 py-3.5 cursor-pointer font-bold text-sm transition-all select-none border border-[var(--border-color)] bg-[var(--panel-bg-alt)] ${className}`}
      >
        <span className="truncate pr-2 text-[var(--text-main)]">{selectedOption?.label || value}</span>
        <ChevronRight size={16} className={`text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
      </div>

      {isOpen && (
        <div className={`absolute z-50 left-0 right-0 ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
          <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {options.map((opt) => {
              if (opt.disabled) return null;
              return (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors mx-1 rounded-lg ${
                    value === opt.value
                      ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                      : 'text-[var(--text-muted)] hover:bg-[var(--border-color)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AkashaLogo: React.FC<{ size?: number, className?: string }> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 107 111" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M20.6191 13.4407C20.3294 13.4257 20.0549 13.4116 19.7988 13.3984L20.6191 13.4407Z" fill="var(--primary)"/>
    <path d="M64.0889 37.3545C59.4132 37.4488 54.2832 37.9057 49.8428 38.7197C44.8726 39.6466 40.3385 40.823 36.2393 42.2451C31.077 44.0779 26.2942 46.5335 21.8867 49.6104C17.4699 52.6938 13.6012 56.2309 10.2764 60.2207C7.03841 64.2085 4.51665 68.3892 2.70117 72.7627C0.894753 77.1145 5.69075e-05 81.4855 0 85.8838C0 90.4072 0.823939 93.968 2.3623 96.6602C3.9344 99.4112 5.98127 101.362 8.49805 102.582C11.1025 103.845 13.9074 104.479 16.9316 104.479C22.238 104.479 28.3831 102.197 33.7773 99.873C33.1668 97.5887 32.5668 95.1245 31.9795 92.4814C31.6882 91.1496 31.3178 89.0877 30.9229 86.6426C27.5019 88.1681 24.5392 88.664 21.7959 88.6641C19.7172 88.664 17.8467 88.1479 16.667 86.7061C15.5964 85.3975 15.1758 83.6385 15.1758 81.6602C15.1758 79.0155 16.1021 76.1182 17.79 73.0088C19.5011 69.8569 21.9122 66.8318 24.9912 63.9287C28.0902 60.9216 31.6686 58.407 35.7168 56.3828L35.7324 56.375C38.8195 54.8756 42.6579 53.483 47.2256 52.1895C51.5253 50.9155 54.3004 49.964 59.7432 49.8389C61.2294 46.5057 62.4059 43.4048 63.1104 41.04L63.1172 41.0166L63.125 40.9932C63.4329 40.0693 63.8415 38.7321 64.0889 37.3545Z" fill="var(--primary)"/>
    <path d="M45.1455 55.9434C41.9701 56.9465 39.2719 57.9906 37.043 59.0732C34.9322 60.1297 32.9658 61.3247 31.1426 62.6572C31.228 65.9508 31.8317 71.5978 32.5771 77.2246C33.3795 83.2807 34.325 89.163 34.9082 91.8311L35.3555 93.7969C36.2603 97.6882 37.1859 101.131 38.1318 104.127L53.0469 99.7275C51.7638 95.7181 50.5492 91.574 49.4033 87.2959C48.1043 82.4462 47.0681 77.1339 46.293 71.3633L46.292 71.3516L46.29 71.3389C45.6692 66.0619 45.2237 62.2125 45.1455 55.9434Z" fill="var(--primary)"/>
    <path d="M83.8955 42.3135C83.3896 43.9991 82.9628 45.3621 82.6182 46.3975C81.7958 49.0113 80.9011 51.5471 79.9375 54.0049C83.0948 55.5128 85.1916 57.1411 87.0322 59.8184C89.0867 62.8068 90.1122 66.177 90.1123 69.8838C90.1123 73.6057 88.9937 77.3977 86.8496 81.2393C84.715 85.2165 81.0651 88.6317 76.0518 91.5342C71.5628 94.1785 66.5456 96.4664 59.0381 97.5811L66.3643 110.482C73.9027 109.29 80.1353 107.38 85.0996 104.779L85.1123 104.772L85.125 104.767C90.4488 102.105 94.6298 98.9739 97.7168 95.3994C100.837 91.7862 103.034 87.9103 104.333 83.7705C105.654 79.4752 106.312 75.1464 106.312 70.7803C106.312 63.9861 104.476 58.161 100.845 53.2383C97.3661 48.5229 92.1053 43.8364 84.3291 41.0879C84.1852 41.494 84.0395 41.9023 83.8955 42.3135Z" fill="var(--primary)"/>
    <path d="M34.9424 2.89062C34.9962 1.86881 35.0163 0.904683 35.0039 0L51.4248 0.420898C51.2093 1.16203 51.0069 1.86508 50.8174 2.52832L50.8037 2.57617L50.793 2.62598C50.6684 3.20727 50.3624 4.93605 50.0507 6.69621L49.9688 7.15918C49.6203 9.12653 49.2876 10.9941 49.1709 11.5L48.7246 13.4307L50.7041 13.3359C57.8101 12.9935 66.5227 12.3274 73.0635 11.4668C79.0283 10.6819 85.166 9.5383 91.4766 8.04102L91.582 22.6738C87.6642 23.3544 83.2914 24.0036 78.4619 24.6172C73.1069 25.2122 67.4923 25.723 61.6221 26.1484L60.548 26.2275C55.5408 26.5964 53.3926 26.7546 48.0645 26.9932L46.8135 27.0488L46.6455 28.29C46.5666 28.8716 46.4983 29.3723 46.4383 29.8111C46.0168 32.8974 46.0137 32.92 45.7266 36.4932C41.9943 37.3125 38.5029 38.2846 35.2559 39.4111L35.2461 39.4141C33.902 39.891 32.5813 40.4079 31.2852 40.9658C31.532 37.0755 31.8498 32.3695 32.127 29.0439L32.2627 27.4199H30.6318C28.1692 27.4199 23.5884 27.3812 20.707 27.2969C17.8976 27.1269 15.0879 26.9996 12.2783 26.9141C10.1217 26.7793 8.14805 26.6717 6.3584 26.5898L5.9375 12.0537C7.22339 12.205 8.77804 12.3922 10.6016 12.6201L10.6523 12.626C13.4749 12.8826 16.5103 13.1391 19.7578 13.3955L19.7783 13.3965L19.7988 13.3984L20.6191 13.4407C24.0638 13.6185 29.6758 13.9082 32.4766 13.9082H33.7939L33.9648 12.6016C34.2933 10.0833 34.3054 9.93468 34.358 9.29052C34.3673 9.17691 34.3778 9.04787 34.3916 8.8877L34.5527 7.18555C34.7261 5.87436 34.8564 4.43869 34.9424 2.89062Z" fill="var(--primary)"/>
    <path d="M67.8232 32.8584C67.96 31.9469 68.0721 31.1244 68.1621 30.3936L83.6582 34.083C83.4178 34.7384 83.1464 35.4997 82.8438 36.3643C82.2463 37.9862 81.6488 39.6506 81.0518 41.3564L81.041 41.3887L81.0312 41.4209C80.5212 43.1209 80.0991 44.4702 79.7646 45.4736L79.7607 45.4854L79.7568 45.498C77.3968 52.9996 74.4519 59.8102 70.9277 65.9355L70.9053 65.9746L70.8857 66.0146C68.1843 71.433 64.2338 76.2123 60.4082 80.2451C58.5537 82.2001 56.7434 83.9649 55.1253 85.5424L54.9805 85.6836L54.9362 85.7268C54.136 86.5069 53.3758 87.2481 52.6865 87.9434C52.5573 87.4706 52.4283 86.9957 52.3008 86.5195C51.0988 82.0319 50.1256 77.1105 49.3779 71.7539C52.8296 68.5854 56.2866 63.2672 59.1611 57.8701C62.0414 52.4621 64.4389 46.782 65.7402 42.6924L65.9854 41.8965C66.3307 40.8571 66.8301 39.23 67.1035 37.5283C67.3287 36.4529 67.4672 35.4204 67.6007 34.4246C67.6716 33.8964 67.741 33.3785 67.8213 32.8701L67.8232 32.8584Z" fill="var(--primary)"/>
  </svg>
);

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const config: Record<string, { color: string, icon: any, label: string }> = {
    movie: { color: 'bg-rose-500/20 text-rose-500 border border-rose-500/20', icon: Film, label: 'Film' },
    tv: { color: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20', icon: Tv, label: 'Série' },
    anime: { color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20', icon: PlayCircle, label: 'Anime' },
    manga: { color: 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20', icon: BookOpen, label: 'Manga' },
    webtoon: { color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20', icon: Flame, label: 'Webtoon' },
    book: { color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20', icon: Book, label: 'Livre' }
  };
  const current = config[type] || config.movie;
  const Icon = current.icon;
  return <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold backdrop-blur-md ${current.color}`}><Icon size={12} strokeWidth={3} /> {current.label}</span>;
};

const InlineEpisodeEdit: React.FC<{ item: LibraryItem, onSave: (id: string, total: number | null) => void }> = ({ item, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(item.total_episodes?.toString() || '');

  if (!isEditing) {
    return (
      <div
        className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] cursor-pointer hover:text-[var(--primary)] group py-1"
        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        title="Modifier le total d'épisodes"
      >
        <span>{item.progress} / {item.total_episodes ? item.total_episodes : '?'}</span>
        <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 py-1" onClick={e => e.stopPropagation()}>
      <span className="text-xs font-mono text-[var(--text-muted)]">{item.progress} /</span>
      <input
        autoFocus
        type="number"
        min={item.progress}
        className="w-12 bg-[var(--bg-base)] text-xs text-[var(--text-main)] border border-[var(--primary)] rounded px-1 outline-none text-center"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => {
          setIsEditing(false);
          const parsed = parseInt(value, 10);
          onSave(item.id, isNaN(parsed) ? null : parsed);
        }}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </div>
  );
};

// ============================================================================
// MODAL DE DÉTAILS (REFONTE VERTICALE SELON MAQUETTE)
// ============================================================================
const DetailModal: React.FC<{
  item: MediaItem | LibraryItem, onClose: () => void, trackedItem: LibraryItem | undefined,
  onLibraryUpdate?: (id: string, updates: Partial<LibraryItem>) => void, user?: UserData, fetchLibrary?: () => void
}> = ({ item, onClose, trackedItem, onLibraryUpdate, user, fetchLibrary }) => {

  const [localData, setLocalData] = useState(item as LibraryItem);
  const [isActing, setIsActing] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Parsing intelligent du format JSON dans reminder_day pour gérer plusieurs jours + fréquence
  const getInitialReminderState = () => {
    if (!trackedItem?.reminder_day) return { days: [] as string[], freq: "1" };
    try {
      const parsed = JSON.parse(trackedItem.reminder_day);
      return { days: parsed.days || [], freq: parsed.frequency?.toString() || "1" };
    } catch(e) {
      // Fallback si c'est encore l'ancien format texte simple ("Lundi")
      return { days: [trackedItem.reminder_day], freq: "1" };
    }
  };

  const initialReminder = getInitialReminderState();

  const [notes, setNotes] = useState(trackedItem?.notes || '');
  const [customLink, setCustomLink] = useState(trackedItem?.custom_link || '');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  // Nouveaux états locaux complexes pour le rappel
  const [reminderDays, setReminderDays] = useState<string[]>(initialReminder.days);
  const [reminderFreq, setReminderFreq] = useState<string>(initialReminder.freq);
  const [reminderTime, setReminderTime] = useState(trackedItem?.reminder_time || '18:00');

  const normalizedTotal = (localData as any).total_episodes || (localData as any).totalEpisodes;

  useEffect(() => {
    const checkAndRevalidate = async () => {
      // Force le chargement des détails profonds même si ce n'est pas dans la liste (pour choper le cast/statut)
      if (trackedItem && trackedItem.updated_at) {
        const lastUpdated = new Date(trackedItem.updated_at).getTime();
        if (Date.now() - lastUpdated < 24 * 60 * 60 * 1000) return;
      }

      const freshData = await revalidateMediaDetails(item);
      if (freshData) {
        setLocalData(prev => ({ ...prev, ...freshData }));
        if (trackedItem) {
          await supabase.from('user_media').update(freshData).match({ id: trackedItem.id });
          if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, freshData);
        }
      }
    };
    checkAndRevalidate();
  }, [item.id, trackedItem?.id]); // Utiliser des IDs stables comme dépendances

  // Gestion du multi-sélection des jours
  const toggleDay = (day: string) => {
    setReminderDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  // Sauvegarde silencieuse des notes, liens et configuration complexe de rappel
  const saveExtras = async () => {
    if (!trackedItem) return;

    // Sérialisation de l'objet complexe en JSON pour la base de données
    const reminderData = JSON.stringify({ days: reminderDays, frequency: parseInt(reminderFreq) });

    const updates = {
      notes,
      custom_link: customLink,
      reminder_day: reminderData, // On enregistre la string JSON
      reminder_time: reminderTime
    };

    await supabase.from('user_media').update(updates).match({ id: trackedItem.id });
    if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, updates);
  };

  const handleAddOrUpdate = async (status: string) => {
    if (!user || !fetchLibrary) return;
    setIsActing(true);
    if (trackedItem) {
      await supabase.from('user_media').update({ status, updated_at: new Date().toISOString() }).match({ id: trackedItem.id });
      if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, { status: status as any, updated_at: new Date().toISOString() });
    } else {
      await supabase.from('user_media').insert([{
        user_id: user.id, media_id: item.id, source: item.source, title: item.title,
        cover_url: 'cover' in item ? item.cover : item.cover_url, type: item.type,
        status: status, description: item.description, year: item.year?.toString(),
        total_episodes: (item as any).totalEpisodes || null
      }]);
    }
    fetchLibrary();
    setIsActing(false);
    if (!trackedItem) onClose();
  };

  const handleRemove = async () => {
    if (!trackedItem || !fetchLibrary) return;
    setIsActing(true);
    await supabase.from('user_media').delete().match({ id: trackedItem.id });
    fetchLibrary();
    onClose();
  };

  const toggleFavoriteModal = async () => {
    if (!trackedItem) return;
    const newFav = !trackedItem.is_favorite;
    if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, { is_favorite: newFav });
    await supabase.from('user_media').update({ is_favorite: newFav }).match({ id: trackedItem.id });
  };

  const title = localData.title;
  const cover = ('cover' in localData) ? localData.cover : localData.cover_url;
  const description = localData.description || 'Description en cours de chargement...';
  const year = localData.year || 'Année inconnue';
  const prodStatusLabel = mapStatusToLabel(localData.prod_status);

  const statusColor = prodStatusLabel === "Statut inconnu" ? "bg-[var(--border-color)] text-[var(--text-main)]"
    : prodStatusLabel.includes("cours") || prodStatusLabel.includes("production") ? "bg-[var(--primary)] text-white"
    : prodStatusLabel.includes("venir") ? "bg-amber-500 text-black" : "bg-emerald-600 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-6 transition-all overflow-y-auto" onClick={onClose}>
      <div className="bg-[var(--panel-bg)] sm:border border-[var(--border-color)] rounded-t-3xl sm:rounded-3xl w-full max-w-xl shadow-2xl relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 my-auto" onClick={e => e.stopPropagation()}>

        {/* Bouton de fermeture absolu */}
        <button onClick={onClose} className="absolute top-4 left-4 z-20 bg-[var(--bg-base)]/80 backdrop-blur-md p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-color)]">
          <X size={20} strokeWidth={3} />
        </button>

        <div className="flex flex-col p-6 sm:p-8 overflow-y-auto max-h-[90vh] custom-scrollbar">

          {/* Cover centrée (style maquette) */}
          <div className="flex justify-center mb-6 mt-4">
             <div className="w-48 aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-[var(--border-color)]">
              {cover ? <img src={cover} alt={title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[var(--bg-base)] flex items-center justify-center"><BookOpen size={48} className="text-[var(--text-muted)]"/></div>}
              <div className="absolute top-2 left-2"><TypeBadge type={localData.type} /></div>
             </div>
          </div>

          {/* Titre et Badges */}
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] mb-3 leading-tight tracking-tight">{title}</h2>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              {localData.type !== 'book' && (
                <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md ${statusColor}`}>
                  {prodStatusLabel}
                </span>
              )}
              {normalizedTotal && (
                <span className="text-xs font-bold text-[var(--text-main)] bg-[var(--bg-base)] px-3 py-1 rounded-md flex items-center gap-1.5 border border-[var(--border-color)]">
                  {normalizedTotal} {localData.type === 'book' ? 'pages' : 'ép'} {localData.runtime ? <span className="flex items-center gap-1 text-[var(--text-muted)] ml-1 border-l border-[var(--border-color)] pl-2"><Clock size={12}/> {localData.runtime}m</span> : ''}
                </span>
              )}
              <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-base)] px-3 py-1 rounded-md border border-[var(--border-color)]">
                {year} • {localData.source.toUpperCase()}
              </span>
            </div>

            {/* Studio / Réalisateur / Auteur */}
            {localData.creator && (
              <p className="text-sm font-bold text-[var(--primary)] mb-4">Par {localData.creator}</p>
            )}

            {localData.genres && localData.genres.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {localData.genres.map(genre => (
                  <span key={genre} className="text-[10px] uppercase tracking-wider bg-[var(--panel-bg-alt)] text-[var(--text-main)] border border-[var(--border-color)] px-3 py-1 rounded-full font-bold">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description avec bouton "Voir plus" */}
          <div className="mb-6 bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)]">
            <div className={`text-sm text-[var(--text-muted)] leading-relaxed ${!showFullDesc && 'line-clamp-3'}`}>
              {description}
            </div>
            {description.length > 150 && (
              <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] mt-2 transition-colors">
                {showFullDesc ? 'Voir moins' : '... Voir plus'}
              </button>
            )}
          </div>

          {/* Actions (Si non tracké) */}
          {!trackedItem && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider text-center">Ajouter à ma liste</p>
              {isActing ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-[var(--primary)]" /></div>
              ) : (
                <CustomSelect
                  value=""
                  onChange={handleAddOrUpdate}
                  options={STATUS_OPTIONS}
                  className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] !text-white border border-transparent shadow-lg shadow-[var(--shadow-color)] text-center justify-center"
                />
              )}
            </div>
          )}

          {/* Section Suivi (Si tracké) */}
          {trackedItem && (
            <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Statut de la série</p>

              <div className="flex gap-2 w-full items-center">
                <div className="flex-1">
                  <CustomSelect
                    value={trackedItem.status}
                    onChange={handleAddOrUpdate}
                    options={STATUS_OPTIONS.filter(o => o.value !== "")} // Retirer le placeholder
                    className="bg-[var(--panel-bg-alt)] border border-[var(--border-color)]"
                  />
                </div>
                <Button variant="ghost" className={`!p-3.5 shrink-0 rounded-xl h-full border ${trackedItem.is_favorite ? 'border-rose-500 bg-rose-500/10 text-rose-500' : 'border-[var(--border-color)] bg-[var(--panel-bg-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} onClick={toggleFavoriteModal} title="Favori">
                  <Heart size={20} className={trackedItem.is_favorite ? "fill-rose-500 text-rose-500" : ""} />
                </Button>
                <Button variant="danger" className="!p-3.5 shrink-0 rounded-xl h-full" onClick={handleRemove} title="Supprimer de la liste">
                  <Trash2 size={20} />
                </Button>
              </div>

              {/* Ligne Lien et Rappel */}
              <div className="flex gap-2 items-center pt-2">
                <div className="flex-1 flex items-center gap-2">
                  {isEditingLink ? (
                    <div className="relative flex-1 flex items-center">
                      <LinkIcon className="absolute left-3 text-[var(--text-muted)]" size={16} />
                      <input
                        autoFocus
                        type="text"
                        placeholder="https://exemple.com/serie"
                        value={customLink}
                        onChange={(e) => setCustomLink(e.target.value)}
                        onBlur={() => { setIsEditingLink(false); saveExtras(); }}
                        className="w-full bg-[var(--bg-base)] border border-[var(--primary)] text-[var(--text-main)] text-sm rounded-xl py-3 pl-10 pr-4 focus:outline-none transition-all placeholder:text-[var(--primary)]/50 font-medium"
                        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      {customLink ? (
                        <a href={customLink.startsWith('http') ? customLink : `https://${customLink}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-[var(--shadow-color)]">
                          <ExternalLink size={16} /> Ouvrir le lien
                        </a>
                      ) : (
                        <button onClick={() => setIsEditingLink(true)} className="flex-1 flex items-center justify-center gap-2 bg-[var(--panel-bg-alt)] border border-[var(--border-color)] hover:border-[var(--primary)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm font-bold py-3 px-4 rounded-xl transition-all">
                          <Plus size={16} /> Ajouter un lien
                        </button>
                      )}
                      <button onClick={() => setIsEditingLink(true)} className="p-3 bg-[var(--panel-bg-alt)] border border-[var(--border-color)] hover:border-[var(--primary)] text-[var(--text-muted)] hover:text-[var(--primary)] rounded-xl transition-colors" title="Modifier le lien">
                        <Edit2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowReminder(!showReminder)}
                  className={`p-3 rounded-xl border transition-colors flex items-center justify-center shrink-0 ${showReminder || reminderDays.length > 0 ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-[var(--panel-bg-alt)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                  title="Configurer un rappel"
                >
                  <Bell size={20} />
                </button>
              </div>

              {/* Panneau de Rappel (MULTI-JOURS ET FRÉQUENCE) */}
              {showReminder && (
                <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-xs font-bold text-amber-500 mb-3 flex items-center gap-1.5">
                    <AlertTriangle size={14}/> {reminderDays.length > 0 ? 'Planifié. (Nécessite MAJ Backend pour JSON)' : 'Sélectionnez vos jours'}
                  </p>

                  <div className="flex flex-col gap-3">
                    {/* Pilules de Jours Multiples */}
                    <div className="flex justify-between items-center gap-2 w-full">
                      {WEEK_DAYS.map(day => {
                        const isSelected = reminderDays.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            onClick={() => { toggleDay(day.value); saveExtras(); }}
                            className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all border ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg shadow-[var(--shadow-color)] scale-110' : 'bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-[var(--primary)]'}`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Fréquence et Heure */}
                    <div className="flex gap-2">
                       <div className="flex-1">
                         <CustomSelect
                            value={reminderFreq}
                            onChange={(val) => { setReminderFreq(val); saveExtras(); }}
                            options={FREQUENCY_OPTIONS}
                            placement="top"
                            className="bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-main)]"
                          />
                       </div>
                       <div className="relative shrink-0 w-28">
                         <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                         <input
                            type="time"
                            value={reminderTime}
                            onChange={e => setReminderTime(e.target.value)}
                            onBlur={saveExtras}
                            className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-xl py-3 pl-10 pr-2 outline-none focus:border-[var(--primary)] transition-colors"
                         />
                       </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bloc-note */}
              <div className="pt-2">
                <textarea
                  placeholder="Bloc note (Enregistré automatiquement)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={saveExtras}
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-xl p-4 min-h-[120px] focus:outline-none focus:border-[var(--primary)] transition-all resize-y placeholder:text-[var(--text-muted)] font-medium custom-scrollbar"
                />
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT EXPLORER (SEARCH)
// ============================================================================
const DiscoverySearch: React.FC<{
  userLibrary: LibraryItem[], setSelectedMedia: (m: MediaItem | LibraryItem) => void, onToggleFavorite: (id: string, currentFav: boolean) => void
}> = ({ userLibrary, setSelectedMedia, onToggleFavorite }) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 600);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [localShowNSFW, setLocalShowNSFW] = useState<boolean>(false);

  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [upcoming, setUpcoming] = useState<MediaItem[]>([]);
  const [community, setCommunity] = useState<LibraryItem[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(true);

  useEffect(() => {
    if (debouncedQuery) return;
    const loadFeeds = async () => {
      setLoadingFeeds(true);
      try {
        const tmdbs = await fetchTrendingTMDB(); setTrending(tmdbs);
        const upcs = await fetchAniList('', true); setUpcoming(upcs);
        const { data } = await supabase.from('user_media').select('*').order('created_at', { ascending: false }).limit(15);
        if (data) {
          const unique = data.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => (t.media_id === v.media_id)) === i);
          setCommunity(unique);
        }
      } catch (e) { console.error(e); }
      finally { setLoadingFeeds(false); }
    };
    loadFeeds();
  }, [debouncedQuery]);

  useEffect(() => {
    if (!debouncedQuery) { setResults([]); return; }
    const searchAll = async () => {
      setLoading(true);
      if (apiCache.has(debouncedQuery)) { setResults(apiCache.get(debouncedQuery)!); setLoading(false); return; }
      try {
        const [tmdbRes, aniRes, shikiRes, olRes] = await Promise.allSettled([
          fetchTMDB(debouncedQuery), fetchAniList(debouncedQuery), fetchShikimori(debouncedQuery), fetchOpenLibrary(debouncedQuery)
        ]);
        let combined: MediaItem[] = [];
        if (tmdbRes.status === 'fulfilled') combined.push(...tmdbRes.value);
        if (aniRes.status === 'fulfilled') combined.push(...aniRes.value);
        if (shikiRes.status === 'fulfilled') combined.push(...shikiRes.value);
        if (olRes.status === 'fulfilled') combined.push(...olRes.value);
        combined.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
        apiCache.set(debouncedQuery, combined);
        setResults(combined);
      } finally { setLoading(false); }
    };
    searchAll();
  }, [debouncedQuery]);

  const renderCarousel = (title: string, items: (MediaItem | LibraryItem)[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-10">
        <h2 className="text-xl font-black text-[var(--text-main)] mb-5 flex items-center gap-2">{title} <ChevronRight size={20} className="text-[var(--primary)]"/></h2>
        <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar snap-x snap-mandatory">
          {items.map(media => {
            const cover = 'cover' in media ? media.cover : media.cover_url;
            const isExplicit = ('isAdult' in media && media.isAdult) || media.source === 'shikimori';
            const needsBlur = !localShowNSFW && isExplicit;
            const tracked = userLibrary.find(item => item.media_id === media.id && item.source === media.source);

            return (
              <div key={`${media.source}-${media.id}`} onClick={() => setSelectedMedia(media)} className="snap-start shrink-0 w-36 sm:w-44 group cursor-pointer flex flex-col bg-[var(--panel-bg)] rounded-2xl overflow-hidden border border-[var(--border-color)] hover:border-[var(--primary)] transition-all shadow-lg">
                <div className="aspect-[2/3] w-full bg-[var(--bg-base)] relative overflow-hidden">
                  {cover ? (
                    <img src={cover} className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${needsBlur ? 'blur-2xl scale-125 opacity-40' : 'group-hover:scale-105'}`} />
                  ) : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={40} />}
                  <div className="absolute top-2 left-2"><TypeBadge type={media.type} /></div>

                  {/* Bouton Favori dans le carousel (Seulement si tracké) */}
                  {tracked && (
                    <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(tracked.id, !!tracked.is_favorite); }} className="absolute top-2 right-2 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all border border-white/10">
                      <Heart size={16} className={tracked.is_favorite ? "fill-rose-500 text-rose-500" : "text-white"} />
                    </button>
                  )}

                  {media.isAiring && <span className="absolute bottom-2 left-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">En prod</span>}
                  {needsBlur && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-[var(--panel-bg)]/80 backdrop-blur-md p-3 rounded-full border border-[var(--border-color)]"><EyeOff size={24} className="text-[var(--text-main)]" /></div>
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <h3 className="font-bold text-[var(--text-main)] text-sm line-clamp-1">{media.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] font-medium mt-1">{'year' in media ? media.year : '?'}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const filteredResults = results.filter(item => filter === 'all' || item.type === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="sticky top-0 z-10 bg-[var(--bg-base)]/90 backdrop-blur-xl pb-4 pt-4 flex flex-col sm:flex-row gap-3 border-b border-[var(--border-color)] -mx-4 px-4 sm:mx-0 sm:px-0 sm:top-2">
        <div className="flex-grow">
          <Input icon={Search} placeholder="Films, Animes, Livres..." value={query} onChange={e => setQuery(e.target.value)} autoFocus />
        </div>

        <div className="flex gap-3">
          <div className="shrink-0 flex-1 sm:w-48">
             <CustomSelect
                value={filter}
                onChange={setFilter}
                options={FORMAT_OPTIONS}
                className="bg-[var(--panel-bg)] border border-[var(--border-color)] hover:border-[var(--primary)]"
              />
          </div>

          <div
            onClick={() => setLocalShowNSFW(!localShowNSFW)}
            className="flex items-center justify-center gap-3 shrink-0 bg-[var(--panel-bg)] border border-[var(--border-color)] px-4 rounded-xl cursor-pointer hover:bg-[var(--bg-base)] transition-colors"
            title="Afficher le contenu pour adultes"
          >
            <EyeOff size={20} className={localShowNSFW ? "text-rose-500" : "text-[var(--text-muted)]"} />
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${localShowNSFW ? 'bg-rose-500' : 'bg-[var(--text-muted)]'}`}>
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${localShowNSFW ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--primary)]" size={40} /></div>}
      {!debouncedQuery && loadingFeeds && <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--primary)]" size={40} /></div>}

      {!debouncedQuery && !loadingFeeds && (
        <div className="animate-in fade-in pt-4">
          {renderCarousel("Tendances Actuelles", trending)}
          {renderCarousel("Prochaines Sorties", upcoming)}
          {community.length > 0 && renderCarousel("Découvertes Communautaires", community)}
        </div>
      )}

      {debouncedQuery && filteredResults.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-4">
          {filteredResults.map(media => {
            const tracked = userLibrary.find(item => item.media_id === media.id && item.source === media.source);
            const isExplicit = media.isAdult || media.source === 'shikimori';
            const needsBlur = !localShowNSFW && isExplicit;

            return (
              <div key={`${media.source}-${media.id}`} onClick={() => setSelectedMedia(media)} className="group cursor-pointer flex flex-col bg-[var(--panel-bg)] rounded-2xl overflow-hidden border border-[var(--border-color)] hover:border-[var(--primary)] transition-all shadow-lg">
                <div className="aspect-[2/3] w-full bg-[var(--bg-base)] relative overflow-hidden">
                  {media.cover ? (
                    <img src={media.cover} className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${needsBlur ? 'blur-2xl scale-125 opacity-40' : 'group-hover:scale-105'}`} />
                  ) : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={40} />}
                  <div className="absolute top-2 left-2"><TypeBadge type={media.type} /></div>

                  {/* Bouton Favori dans la recherche (Seulement si tracké) */}
                  {tracked && (
                    <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(tracked.id, !!tracked.is_favorite); }} className="absolute top-2 right-2 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all border border-white/10">
                      <Heart size={16} className={tracked.is_favorite ? "fill-rose-500 text-rose-500" : "text-white"} />
                    </button>
                  )}

                  {media.isAiring && <span className="absolute bottom-2 left-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">En prod</span>}
                  {needsBlur && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-[var(--panel-bg)]/80 backdrop-blur-md p-3 rounded-full border border-[var(--border-color)]"><EyeOff size={24} className="text-[var(--text-main)]" /></div>
                    </div>
                  )}
                </div>
                <div className="p-3.5 flex flex-col flex-grow justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--text-main)] text-sm line-clamp-1">{media.title}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-1">{media.year}</p>
                  </div>
                  {tracked && (
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)] py-2 rounded-lg border border-[var(--primary)]/20">
                      <Check size={14} strokeWidth={3}/> Suivi
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {debouncedQuery && filteredResults.length === 0 && !loading && (
        <div className="text-center py-20 text-[var(--text-muted)]">
          <BookOpen className="mx-auto mb-6 opacity-30" size={64} />
          <p className="text-lg font-medium">Aucun résultat pour "{debouncedQuery}"</p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPOSANT LECTEUR PERSISTANT
// ============================================================================
const PersistentPlayer: React.FC<{ item: LibraryItem | null, onUpdate: (item: LibraryItem, i: number) => void }> = ({ item, onUpdate }) => {
  if (!item) return null;
  const progressPercent = item.total_episodes ? Math.min(100, (item.progress / item.total_episodes) * 100) : 0;

  return (
    <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-[var(--panel-bg)]/95 backdrop-blur-xl border border-[var(--border-color)] shadow-2xl shadow-[var(--shadow-color)] rounded-2xl overflow-hidden flex items-center p-3 gap-4 relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `linear-gradient(90deg, var(--primary) ${progressPercent}%, transparent ${progressPercent}%)`}} />

        <div className="w-12 h-16 shrink-0 rounded-lg overflow-hidden bg-[var(--bg-base)] shadow-md z-10 border border-[var(--border-color)]">
          {item.cover_url ? <img src={item.cover_url} className="w-full h-full object-cover" /> : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={20} />}
        </div>

        <div className="flex-1 min-w-0 z-10">
          <p className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
            <PlayCircle size={10} /> Reprendre
          </p>
          <h4 className="font-bold text-[var(--text-main)] text-sm line-clamp-1 truncate">{item.title}</h4>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-mono font-bold text-[var(--text-muted)]">{item.progress} / {item.total_episodes || '?'}</span>
            <div className="flex-1 h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border-color)]">
              <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 z-10">
          <button onClick={() => onUpdate(item, -1)} disabled={item.progress <= 0} className="w-10 h-10 flex items-center justify-center bg-[var(--bg-base)] hover:bg-[var(--border-color)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl disabled:opacity-50 transition-colors"><Minus size={18} strokeWidth={3}/></button>
          <button onClick={() => onUpdate(item, 1)} disabled={item.total_episodes !== null && item.progress >= item.total_episodes} className="w-12 h-12 flex items-center justify-center bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-lg shadow-[var(--shadow-color)] disabled:opacity-50 transition-transform active:scale-95"><Plus size={24} strokeWidth={3}/></button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT PROFIL / STATISTIQUES ET PWA
// ============================================================================
const ProfileScreen: React.FC<{
  user: UserData, library: LibraryItem[], onLogout: () => void, onDelete: () => void,
  theme: string, toggleTheme: () => void
}> = ({ user, library, onLogout, onDelete, theme, toggleTheme }) => {

  const totalAdded = library.length;
  const totalCompleted = library.filter(i => i.status === 'completed').length;
  const totalEpisodesWatched = library.reduce((acc, item) => acc + (item.progress || 0), 0);

  const watchableItems = library.filter(i => i.type === 'tv' || i.type === 'movie' || i.type === 'anime');
  const watchTimeMinutes = watchableItems.reduce((acc, item) => {
    const runtime = item.runtime || (item.type === 'movie' ? 120 : 24);
    return acc + ((item.progress || 0) * runtime);
  }, 0);
  const watchTimeHours = (watchTimeMinutes / 60).toFixed(1);

  const completionRate = totalAdded > 0 ? Math.round((totalCompleted / totalAdded) * 100) : 0;

  const readableTypes = ['manga', 'webtoon', 'book'];
  const watchProgress = watchableItems.reduce((acc, item) => acc + (item.progress || 0), 0);
  const readProgress = library.filter(i => readableTypes.includes(i.type)).reduce((acc, item) => acc + (item.progress || 0), 0);
  const totalInteractions = watchProgress + readProgress;

  const watchRatio = totalInteractions > 0 ? Math.round((watchProgress / totalInteractions) * 100) : 0;
  const readRatio = totalInteractions > 0 ? 100 - watchRatio : 0;

  // SÉLECTEUR DE FUSEAU HORAIRE
  const timezones = useMemo(() => {
    try {
      // @ts-ignore: Pris en charge par les navigateurs modernes
      if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
        // @ts-ignore
        return Intl.supportedValuesOf('timeZone').map((tz: string) => ({ value: tz, label: tz.replace(/_/g, ' ') }));
      }
    } catch (e) {}
    // Fallback si non supporté
    return [
      { value: 'Europe/Paris', label: 'Europe/Paris' },
      { value: 'America/New_York', label: 'America/New York' },
      { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
      { value: 'UTC', label: 'UTC' }
    ];
  }, []);

  const [userTz, setUserTz] = useState(user.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris');

  const handleTzChange = async (val: string) => {
    setUserTz(val);
    await supabase.auth.updateUser({ data: { timezone: val } });
  };

  // LOGIQUE PWA (AJOUTER À L'ÉCRAN D'ACCUEIL)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Vérifie si on est déjà en mode "App"
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Détection stricte d'iOS pour l'affichage du tutoriel manuel
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 sm:pb-0 pt-6">
      <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[var(--bg-base)] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[var(--border-color)] shadow-xl text-[var(--primary)]">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-black text-[var(--text-main)]">Profil</h2>
          <p className="text-[var(--text-muted)] font-medium mt-1">{user.email}</p>
        </div>

        {/* SECTION PWA (APPLICATION MOBILE) */}
        {!isStandalone && (
          <div className="mb-8 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Smartphone className="text-blue-500" size={24} />
              <h3 className="font-bold text-[var(--text-main)] text-lg">Application Mobile</h3>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Installez Akasha sur votre écran d'accueil pour une expérience en plein écran et préparer l'arrivée des notifications Push.
            </p>

            {deferredPrompt ? (
              <Button onClick={handleInstallClick} className="w-full !py-3 bg-blue-600 hover:bg-blue-700">
                <Download size={18} /> Installer l'application
              </Button>
            ) : isIOS ? (
              <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] text-sm text-[var(--text-main)]">
                <p className="font-bold mb-2">Sur iPhone / iPad :</p>
                <ol className="list-decimal pl-5 space-y-2 text-[var(--text-muted)]">
                  <li>Appuyez sur l'icône Partager <Share size={14} className="inline mx-1" /> dans la barre de Safari.</li>
                  <li>Faites défiler et choisissez <strong>"Sur l'écran d'accueil"</strong> <Plus size={14} className="inline mx-1 border border-current rounded-sm" />.</li>
                </ol>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)] italic text-center">Votre navigateur ne supporte pas l'installation web ou vous l'avez déjà fait.</p>
            )}
          </div>
        )}

        {/* CONTROLE DU THÈME (MOBILE UNIQUEMENT, VISIBLE AUSSI SUR PC MAIS PRATIQUE ICI) */}
        <div className="sm:hidden flex items-center justify-between p-4 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-color)] mb-8">
          <span className="font-bold text-[var(--text-main)]">Thème de l'application</span>
          <button onClick={toggleTheme} className="p-2.5 bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl text-[var(--primary)] shadow-sm">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="bg-[var(--bg-base)] rounded-2xl p-6 mb-8 border border-[var(--border-color)]">

          {/* Taux de complétion */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Taux de complétion</h3>
              <span className="text-3xl font-black text-emerald-500 leading-none">{completionRate}%</span>
            </div>
            <div className="h-3 w-full bg-[var(--panel-bg)] rounded-full overflow-hidden border border-[var(--border-color)]">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${completionRate}%` }} />
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">{totalCompleted} œuvres terminées sur {totalAdded} ajoutées</p>
          </div>

          {/* Binge vs Lecture */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">Écrans vs Lecture</h3>
            </div>
            <div className="flex h-4 w-full bg-[var(--panel-bg)] rounded-full overflow-hidden border border-[var(--border-color)] mb-3">
              {totalInteractions === 0 ? (
                <div className="h-full w-full bg-[var(--border-color)]" />
              ) : (
                <>
                  <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${watchRatio}%` }} />
                  <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${readRatio}%` }} />
                </>
              )}
            </div>
            <div className="flex justify-between text-xs font-bold">
              <div className="flex items-center gap-1.5 text-blue-500">
                <Tv size={14} /> {watchRatio}% Binge-watching
              </div>
              <div className="flex items-center gap-1.5 text-purple-500">
                 {readRatio}% Lecture <BookOpen size={14} />
              </div>
            </div>
            <p className="text-center text-[10px] text-[var(--text-muted)] mt-4 font-medium italic">Basé sur vos {totalInteractions} interactions d'épisodes/pages.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-blue-500 text-white rounded-xl"><FolderHeart size={24}/></div>
            <div>
              <p className="text-2xl font-black text-[var(--text-main)] leading-none">{totalAdded}</p>
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mt-1">Ajoutés</p>
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500 text-white rounded-xl"><Check size={24}/></div>
            <div>
              <p className="text-2xl font-black text-[var(--text-main)] leading-none">{totalCompleted}</p>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mt-1">Terminés</p>
            </div>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-rose-500 text-white rounded-xl"><Clock size={24}/></div>
            <div>
              <p className="text-2xl font-black text-[var(--text-main)] leading-none">{watchTimeHours}<span className="text-sm">h</span></p>
              <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mt-1">Visionnage</p>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-xl"><PlayCircle size={24}/></div>
            <div>
              <p className="text-2xl font-black text-[var(--text-main)] leading-none">{totalEpisodesWatched}</p>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mt-1">Ép./Chap.</p>
            </div>
          </div>
        </div>

        {/* FUSEAU HORAIRE ET PARAMETRES */}
        <div className="mb-6">
           <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block flex items-center gap-2"><Globe size={14}/> Fuseau Horaire (Rappels)</label>
           <CustomSelect
              value={userTz}
              onChange={handleTzChange}
              options={timezones}
              placement="top"
              className="bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-main)]"
           />
           <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">Définit l'heure d'envoi matinale de vos emails de rappels.</p>
        </div>

        <div className="space-y-3 pt-6 border-t border-[var(--border-color)]">
          <Button variant="secondary" className="w-full !py-3" onClick={onLogout}>
            <LogOut size={18} /> Déconnexion
          </Button>
          <button onClick={onDelete} className="w-full py-3 text-xs font-bold text-[var(--text-muted)] hover:text-red-500 transition-colors">
            Supprimer mon compte (Action irréversible)
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT AUTHENTIFICATION
// ============================================================================
const AuthScreen: React.FC<{ onLogin: (u: UserData) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (type: 'login' | 'register') => {
    setLoading(true); setError('');
    try {
      const { data, error: err } = type === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (err) setError(err.message);
      else if (data.user) onLogin(data.user);
    } catch (e: any) { setError(e.message || "Erreur critique de connexion"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-[var(--primary)] to-amber-500" />
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <AkashaLogo size={48} />
          </div>
          <h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight uppercase">Akasha</h1>
          <p className="text-[var(--text-muted)] font-medium mt-2">Votre mémoire culturelle.</p>
        </div>
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl mb-6 text-sm font-bold">{error}</div>}
        <div className="space-y-4">
          <Input type="email" placeholder="Adresse email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} />
          <div className="pt-6 flex flex-col gap-3">
            <Button className="w-full !py-3.5 text-base" onClick={() => handleAuth('login')} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Se connecter'}
            </Button>
            <Button variant="ghost" className="w-full border border-[var(--border-color)]" onClick={() => handleAuth('register')} disabled={loading}>Créer un compte</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

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

  // ÉTAT DU THÈME SOMBRE/CLAIR
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

  const updateProgress = async (item: LibraryItem, increment: number) => {
    const newProgress = Math.max(0, item.progress + increment);
    if (item.total_episodes && newProgress > item.total_episodes) return;

    setLastInteractedId(item.id);
    const newDate = new Date().toISOString();

    setUserLibrary(prev => prev.map(libItem => libItem.id === item.id ? { ...libItem, progress: newProgress, updated_at: newDate } : libItem));
    await supabase.from('user_media').update({ progress: newProgress, updated_at: newDate }).match({ id: item.id });
  };

  const handleSWRUpdate = (id: string, updates: Partial<LibraryItem>) => {
    setUserLibrary(prev => prev.map(libItem => libItem.id === id ? { ...libItem, ...updates } : libItem));
  };

  const handleToggleFavorite = async (id: string, currentFav: boolean) => {
    const newFav = !currentFav;
    handleSWRUpdate(id, { is_favorite: newFav });
    await supabase.from('user_media').update({ is_favorite: newFav }).match({ id });
  };

  const handleDeleteAccount = async () => {
    const confirm1 = window.confirm("ATTENTION: Cette action détruira toutes vos données.");
    if (!confirm1) return;
    const { error } = await supabase.rpc('delete_user');
    if (error) alert("Créez le RPC 'delete_user' dans Supabase d'abord.");
    else await supabase.auth.signOut();
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  if (authLoading) return <div className={`min-h-screen ${theme} bg-[var(--bg-base)] flex items-center justify-center`}><GlobalStyles/><Loader2 className="animate-spin text-[var(--primary)]" size={48} /></div>;
  if (!user) return <div className={theme}><GlobalStyles/><AuthScreen onLogin={setUser} /></div>;

  const activeStatusConf = STATUS_CONFIG[activeFilter as keyof typeof STATUS_CONFIG];

  return (
    <div className={`${theme} min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] font-sans pb-28 sm:pb-12 flex flex-col relative transition-colors duration-300`}>
      <GlobalStyles />

      {/* NAVBAR AKASHA */}
      <nav className="fixed bottom-4 inset-x-6 mx-auto sm:mx-0 max-w-[250px] sm:max-w-none sm:top-6 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 z-50 sm:w-auto px-6 py-3 sm:py-3 bg-[var(--panel-bg)]/95 backdrop-blur-xl border sm:border border-[var(--border-color)] rounded-3xl sm:rounded-full flex justify-between sm:justify-center items-center sm:gap-12 shadow-2xl">

        <div className="hidden sm:flex items-center gap-2 pr-4 border-r border-[var(--border-color)]">
           <AkashaLogo size={24} />
           <span className="font-black tracking-widest text-[var(--text-main)] mt-0.5">AKASHA</span>
        </div>

        <button onClick={() => setCurrentTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${currentTab === 'dashboard' ? 'text-[var(--primary)] scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
          <Library size={24} strokeWidth={currentTab === 'dashboard' ? 3 : 2} />
        </button>
        <button onClick={() => setCurrentTab('search')} className={`flex flex-col items-center gap-1 transition-all ${currentTab === 'search' ? 'text-[var(--primary)] scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
          <Search size={24} strokeWidth={currentTab === 'search' ? 3 : 2} />
        </button>
        <button onClick={() => setCurrentTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${currentTab === 'profile' ? 'text-[var(--primary)] scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
          <User size={24} strokeWidth={currentTab === 'profile' ? 3 : 2} />
        </button>
        <div className="hidden sm:block w-px h-6 bg-[var(--border-color)] mx-2"></div>
        <button onClick={toggleTheme} className="hidden sm:flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all" title="Changer le thème">
          {theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:pt-28 flex-grow w-full">
        {currentTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500">

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <div className="flex gap-1 overflow-x-auto w-full sm:w-auto custom-scrollbar px-1 pt-1">
                {[
                  { id: 'favorites', label: 'Favoris' },
                  { id: 'watching', label: 'En cours' }, { id: 'planning', label: 'À voir' },
                  { id: 'completed', label: 'Terminés' }, { id: 'on_hold', label: 'En pause' }
                ].map(f => {
                  const isActive = activeFilter === f.id;
                  const count = userLibrary.filter(i => {
                    const formatMatch = formatFilter === 'all' || i.type === formatFilter;
                    if (f.id === 'favorites') return i.is_favorite === true && formatMatch;
                    return i.status === f.id && formatMatch;
                  }).length;
                  const config = STATUS_CONFIG[f.id as keyof typeof STATUS_CONFIG];

                  return (
                    <button key={f.id} onClick={() => setActiveFilter(f.id as any)}
                      className={`whitespace-nowrap px-5 py-2.5 rounded-t-xl text-sm font-bold transition-all relative ${isActive ? config.tabActive : config.tabInactive}`}
                    >
                      {f.id === 'favorites' && <Heart size={14} className={`inline mr-1 ${isActive ? "fill-[var(--text-main)]" : ""}`} />}
                      {f.label} <span className="ml-1.5 opacity-50 font-medium">({count})</span>
                      {isActive && <div className={`absolute -bottom-[2px] left-0 right-0 h-[2px] ${config.containerBg}`} />}
                    </button>
                  );
                })}
              </div>

              <div className="shrink-0 w-full sm:w-48 z-10">
                 <CustomSelect
                    value={formatFilter}
                    onChange={setFormatFilter}
                    options={FORMAT_OPTIONS}
                    className="bg-[var(--panel-bg)] border border-[var(--border-color)] hover:border-[var(--primary)] shadow-sm"
                  />
              </div>
            </div>

            <div className={`p-4 sm:p-6 rounded-b-2xl rounded-tr-2xl border ${activeStatusConf.containerBg} ${activeStatusConf.containerBorder} transition-colors duration-300`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {filteredLibrary.map(item => {
                  const progressPercent = item.total_episodes ? Math.min(100, (item.progress / item.total_episodes) * 100) : 0;

                  return (
                    <div key={item.id} onClick={() => setSelectedMedia(item)} className="cursor-pointer bg-[var(--bg-base)]/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-[var(--border-color)] group hover:border-[var(--primary)] transition-all flex flex-row sm:flex-col relative h-[140px] sm:h-auto shadow-md">

                      <div className="w-28 sm:w-full shrink-0 relative bg-[var(--bg-base)] sm:aspect-[2/3] overflow-hidden border-r sm:border-b sm:border-r-0 border-[var(--border-color)]">
                        {item.cover_url ? (
                          <img src={item.cover_url} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={40} />}
                        <div className="absolute top-2 left-2 hidden sm:block z-10"><TypeBadge type={item.type} /></div>

                        <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item.id, !!item.is_favorite); }} className="absolute top-2 right-2 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all border border-white/10">
                          <Heart size={16} className={item.is_favorite ? "fill-rose-500 text-rose-500" : "text-white"} />
                        </button>

                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-transparent to-transparent opacity-80 sm:hidden" />
                      </div>

                      <div className="p-3.5 sm:p-4 flex flex-col flex-1 min-w-0 justify-between gap-3 bg-[var(--bg-base)]/80 z-10">
                        <div className="flex flex-col">
                          <h3 className="font-bold text-[var(--text-main)] text-sm sm:text-base line-clamp-2 leading-tight mb-1">{item.title}</h3>
                          <div className="w-fit" onClick={e => e.stopPropagation()}>
                            <InlineEpisodeEdit item={item} onSave={async (id, newTotal) => {
                              setUserLibrary(prev => prev.map(libItem => libItem.id === id ? { ...libItem, total_episodes: newTotal } : libItem));
                              await supabase.from('user_media').update({ total_episodes: newTotal }).match({ id });
                            }}/>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full mt-auto" onClick={e => e.stopPropagation()}>
                          <div className="flex-1 h-1.5 sm:h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                          </div>
                          <div className="flex flex-row gap-1.5 items-center shrink-0">
                            <button onClick={() => updateProgress(item, -1)} disabled={item.progress <= 0} className="p-2 sm:p-2 bg-[var(--panel-bg)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><Minus size={18} strokeWidth={3}/></button>
                            <button onClick={() => updateProgress(item, 1)} disabled={item.total_episodes !== null && item.progress >= item.total_episodes} className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl text-white transition-transform active:scale-95 shadow-lg shadow-[var(--shadow-color)]"><Plus size={20} strokeWidth={3}/></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {filteredLibrary.length === 0 && <div className="col-span-full py-20 text-center text-[var(--text-muted)] font-medium">Aucun média trouvé avec ces filtres.</div>}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'search' && (
          <DiscoverySearch userLibrary={userLibrary} setSelectedMedia={setSelectedMedia} onToggleFavorite={handleToggleFavorite} />
        )}

        {currentTab === 'profile' && (
          <ProfileScreen user={user} library={userLibrary} onLogout={async () => await supabase.auth.signOut()} onDelete={handleDeleteAccount} theme={theme} toggleTheme={toggleTheme} />
        )}
      </main>

      {/* LECTEUR PERSISTANT */}
      {currentTab !== 'profile' && activePlayerItem && (
        <PersistentPlayer item={activePlayerItem} onUpdate={updateProgress} />
      )}

      {selectedMedia && (
        <DetailModal
          item={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          trackedItem={
            'status' in selectedMedia
              ? userLibrary.find(i => i.id === selectedMedia.id)
              : userLibrary.find(i => i.media_id === selectedMedia.id && i.source === selectedMedia.source)
          }
          onLibraryUpdate={handleSWRUpdate}
          user={user}
          fetchLibrary={fetchLibrary}
        />
      )}
    </div>
  );
}
