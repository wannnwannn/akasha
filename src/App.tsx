import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
// IMPORT POUR VERCEL/LOCAL : Décommentez ces lignes dans votre vrai projet et supprimez celles avec "esm.sh"
import { createClient } from '@supabase/supabase-js';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
//import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3?bundle';
//import HCaptcha from 'https://esm.sh/@hcaptcha/react-hcaptcha@1.11.0?bundle';

import {
  Search, Plus, Check, LogOut, Tv, Film, BookOpen, Book, Trophy,
  PlayCircle, Loader2, Library, X, Minus, Edit2, Trash2, ChevronRight, Clock, EyeOff, User, FolderHeart, Sun, Moon, Flame, ChevronLeft,
  Link as LinkIcon, Bell, ExternalLink, Globe, Heart, Download, Share, Smartphone, BellRing, Calendar as CalendarIcon, BellOff, ChevronUp, ChevronDown, PenTool, Languages, Video
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
      --primary: #ce4257;
      --primary-hover: #e05268;
      --shadow-color: rgba(252, 11, 43, 0.15);
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
    /* L'overflow-x est sur le body pour ne pas casser tes barres de recherche Sticky */
    body { background-color: var(--bg-base); color: var(--text-main); overflow-x: hidden; }

    /* MOTEUR D'ANIMATION DE PAGE NATIF (GPU ACCÉLÉRÉ) */
    @keyframes pageSlideRight {
      from { transform: translateX(80px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes pageSlideLeft {
      from { transform: translateX(-80px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    /* Le 'will-change' élimine le temps d'attente au clic */
    .animate-page-right { 
      animation: pageSlideRight 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; 
      will-change: transform, opacity;
    }
    .animate-page-left { 
      animation: pageSlideLeft 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; 
      will-change: transform, opacity;
    }

    /* ------------------------------------------------ */
    /* ANIMATION MODALE (BOTTOM SHEET & DESKTOP) */
    /* ------------------------------------------------ */
    @keyframes bottomSheetUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    @keyframes modalZoomIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    /* Sur mobile : Glissement pur depuis le bas */
    .animate-modal {
      animation: bottomSheetUp 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      will-change: transform;
    }
    
    /* Sur grand écran (sm) : Élévation centrale rapide */
    @media (min-width: 640px) {
      .animate-modal {
        animation: modalZoomIn 0.2s ease-out forwards;
        will-change: transform, opacity;
      }
    }

    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-base); }
    ::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
    * { scrollbar-width: thin; scrollbar-color: var(--border-color) var(--bg-base); }
    .custom-scrollbar::-webkit-scrollbar { height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; margin-inline: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }

    @keyframes breathe {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.35; }
    }
    .animate-breathe {
      animation: breathe 0.5s ease-in-out infinite;
    }

    @keyframes bottomSheetDown {
      from { transform: translateY(0); }
      to { transform: translateY(100%); }
    }
    @keyframes modalZoomOut {
      from { transform: scale(1); opacity: 1; }
      to { transform: scale(0.95); opacity: 0; }
    }
    
    /* Animations de fermeture */
    .animate-modal-out {
      animation: bottomSheetDown 0.3s cubic-bezier(0.8, 0, 0.8, 0.2) forwards;
      will-change: transform;
    }
    
    @media (min-width: 640px) {
      .animate-modal-out {
        animation: modalZoomOut 0.2s ease-in forwards;
        will-change: transform, opacity;
      }
    }

    /* Réparation du flou sur mobile (Forçage WebKit et opacité réduite) */
    .mobile-blur-fix {
      background-color: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
  `}</style>
);

// ============================================================================
// CONFIGURATION ENVIRONNEMENT
// ============================================================================
//const getEnv = (key: string) => { try { return import.meta.env[key] || ''; } catch { return ''; } };

const TMDB_API_KEY = String(import.meta.env.VITE_TMDB_API_KEY || '');
const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '');
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
const VAPID_PUBLIC_KEY = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || '');
const HCAPTCHA_SITE_KEY = String(import.meta.env.VITE_HCAPTCHA_SITE_KEY || '');
const YOUTUBE_API_KEY = String(import.meta.env.VITE_YOUTUBE_API_KEY || '');

if (!SUPABASE_URL || SUPABASE_URL === 'VOTRE_VRAIE_URL_SUPABASE') {
  console.error("ARRÊT CRITIQUE : Tu n'as pas entré tes vraies clés Supabase.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
}

// ============================================================================
// SYSTÈME DE TRADUCTION (i18n Dictionnaire Local)
// ============================================================================
type Lang = 'fr' | 'en';
const LangContext = createContext<{ lang: Lang, setLang: (l: Lang) => void, t: (key: string) => string }>({ lang: 'fr', setLang: () => {}, t: () => '' });


// ============================================================================
// TYPES & INTERFACES
// ============================================================================
interface MediaItem {
  id: string; source: 'tmdb' | 'anilist' | 'shikimori' | 'openlibrary' | 'manual'; title: string; cover: string | null; type: 'movie' | 'tv' | 'anime' | 'manga' | 'webtoon' | 'book'; year: string | number; description: string; totalEpisodes?: number | null; total_episodes?: number | null; isAiring?: boolean; genres?: string[]; runtime?: number; prod_status?: string; isAdult?: boolean; creator?: string;
}
interface LibraryItem {
  id: string; user_id: string; media_id: string; source: string; title: string; cover_url: string | null; type: string; status: 'planning' | 'watching' | 'completed' | 'on_hold'; progress: number; total_episodes: number | null; rating: number | null; created_at: string; updated_at: string; description?: string; year?: string; genres?: string[]; tags?: string[]; runtime?: number; prod_status?: string; creator?: string; custom_link?: string | null; notes?: string | null; reminder_day?: string | null; reminder_time?: string | null; is_favorite?: boolean; isAiring?: boolean; isAdult?: boolean; totalEpisodes?: number | null; rewatch_count?: number;
}
interface UserData { id: string; email?: string; user_metadata?: { timezone?: string } }
interface SelectOption { value: string; label?: string; disabled?: boolean; labelKey?: string; }

// ============================================================================
// CONFIGURATION DESIGN & STATUTS GLOBALE
// ============================================================================
const STATUS_CONFIG = {
  favorites: { labelKey: 'status_favorites', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-rose-500', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-rose-500 border-x border-rose-500', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-rose-500 border-t-2 border-transparent border-b border-b-[var(--border-color)]' },
  watching: { labelKey: 'status_watching', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--primary)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-[var(--primary)] border-x border-[var(--primary)]', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-t-2 border-transparent border-b border-b-[var(--border-color)]' },
  planning: { labelKey: 'status_planning', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--border-color)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-indigo-500 border-x border-[var(--border-color)]', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] border-t-2 border-transparent border-b border-b-[var(--border-color)]' },
  completed: { labelKey: 'status_completed', containerBg: 'bg-[var(--panel-bg)]', containerBorder: 'border-[var(--border-color)]', tabActive: 'bg-[var(--panel-bg)] text-[var(--text-main)] border-t-2 border-emerald-500 border-x border-[var(--border-color)]', tabInactive: 'bg-[var(--bg-base)] text_[var(--text-muted)] hover:text_[var(--text-main)] border-t-2 border-transparent border-b border-b_[var(--border-color)]' },
  on_hold: { labelKey: 'status_on_hold', containerBg: 'bg_[var(--panel-bg)]', containerBorder: 'border_[var(--border-color}]', tabActive: 'bg_[var(--panel-bg)_ text_[var(--text-main)_ border-t-2 border-amber-500 border-x	border_[ var(-border-color)_]', tabInactive: 'bg_[ var(-bg-base)_ text_[ var(-text-muted)_ hover:text_[ var(-text-main)_	border-t-2	border-transparent	border-b	border-b_[ var(-border-color)_]' },
  reminders: { labelKey: 'status_reminders', containerBg: 'bg-[var(--bg-base)]', containerBorder: 'border-transparent', tabActive: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-t-2 border-amber-500 border-x border-amber-500/30', tabInactive: 'bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-amber-500 border-t-2 border-transparent border-b border-b-[var(--border-color)]' },
};

const FORMAT_OPTIONS: SelectOption[] = [
  { value: "all", labelKey: "type_all" }, { value: "movie", labelKey: "type_movie" }, { value: "tv", labelKey: "type_tv" },
  { value: "anime", labelKey: "type_anime" }, { value: "manga", labelKey: "type_manga" }, { value: "webtoon", labelKey: "type_webtoon" }, { value: "book", labelKey: "type_book" },
  { value: "youtube", label: "YouTube" }
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", labelKey: "status_add_to_list", disabled: true }, { value: "watching", labelKey: "status_watching" },
  { value: "planning", labelKey: "status_planning" }, { value: "completed", labelKey: "status_completed" }, { value: "on_hold", labelKey: "status_on_hold" }
];

const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: "1", labelKey: "toutes-les-semaines" }, { value: "2", labelKey: "1-semaine-sur-2" },
  { value: "3", labelKey: "1-semaine-sur-3" }, { value: "4", labelKey: "1-semaine-sur-4" }
];

const WEEK_DAYS = [
  { label: 'L', value: 'Lundi', num: 1 }, { label: 'M', value: 'Mardi', num: 2 }, { label: 'M', value: 'Mercredi', num: 3 },
  { label: 'J', value: 'Jeudi', num: 4 }, { label: 'V', value: 'Vendredi', num: 5 }, { label: 'S', value: 'Samedi', num: 6 }, { label: 'D', value: 'Dimanche', num: 0 }
];

// ============================================================================
// UTILS & CACHE
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => { const handler = setTimeout(() => setDebouncedValue(value), delay); return () => clearTimeout(handler); }, [value, delay]);
  return debouncedValue;
}

// Moteur de calcul de la prochaine occurrence d'un rappel
function getNextOccurrence(reminderJsonStr: string | undefined | null, timeStr: string | undefined | null): Date | null {
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
          if (diff < 0 || (diff === 0 && (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)))) {
            diff += 7;
          }
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

// Aide pour récupérer en toute sécurité le localStorage (pour iframe/canvas)
const getSavedFilter = (key: string, defaultValue: string) => {
  try { return localStorage.getItem(key) || defaultValue; } catch { return defaultValue; }
};

// Fonctions de copie et d'encodage pour le partage de média
const fallbackCopyTextToClipboard = (text: string) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "2em";
  textArea.style.height = "2em";
  textArea.style.padding = "0";
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";
  textArea.style.background = "transparent";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try { document.execCommand('copy'); } catch (err) { console.error('Fallback: Oops, unable to copy', err); }
  document.body.removeChild(textArea);
};

const encodeMediaForShare = (item: any) => {
  const minimalData = {
    id: ('media_id' in item) ? item.media_id : item.id,
    source: item.source,
    title: item.title,
    cover: ('cover' in item) ? item.cover : item.cover_url,
    type: item.type,
    year: item.year,
    description: item.description,
    totalEpisodes: ('total_episodes' in item) ? item.total_episodes : item.totalEpisodes,
    runtime: item.runtime
  };
  return btoa(encodeURIComponent(JSON.stringify(minimalData)));
};

// ============================================================================
// SERVICES API
// ============================================================================
const fetchTMDB = async (query: string, lang: Lang): Promise<MediaItem[]> => {
  
  if (!TMDB_API_KEY || TMDB_API_KEY === 'VOTRE_TMDB_API_KEY_ICI') return [];
  const apiLang = lang === 'fr' ? 'fr-FR' : 'en-US';
  const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=${apiLang}&include_adult=true`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').map((item: any) => ({
    id: String(item.id), source: 'tmdb', title: String(item.title || item.name), cover: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    type: item.media_type, year: String(item.release_date || item.first_air_date || '').split('-')[0], description: String(item.overview || 'Aucune description disponible.'),
    totalEpisodes: item.media_type === 'movie' ? 1 : null, isAiring: false, isAdult: item.adult === true
  }));
};

const fetchAniList = async (query: string, isUpcoming = false): Promise<MediaItem[]> => {
  
  const statusFilter = isUpcoming ? ', status_in: [NOT_YET_RELEASED, RELEASING]' : '';
  const sortFilter = isUpcoming ? ', sort: POPULARITY_DESC' : '';
  const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ query: `query ($search: String) { Page(page: 1, perPage: 15) { media(search: $search, type: ANIME${statusFilter}${sortFilter}) { id title { romaji english native } coverImage { large } format startDate { year } description episodes status genres duration isAdult studios(isMain: true) { nodes { name } } } } }`, variables: query ? { search: query } : {} }) });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data.Page.media.map((item: any) => ({
    id: String(item.id), source: 'anilist', title: String(item.title.english || item.title.romaji || item.title.native), cover: item.coverImage.large,
    type: 'anime', year: String(item.startDate.year || 'N/A'), description: String(item.description?.replace(/<[^>]*>?/gm, '') || 'Aucune description disponible.'),
    totalEpisodes: item.episodes || null, isAiring: item.status === 'RELEASING' || item.status === 'NOT_YET_RELEASED', genres: item.genres, runtime: item.duration, prod_status: String(item.status), isAdult: item.isAdult === true, creator: item.studios?.nodes?.[0]?.name || null
  }));
};

const fetchShikimori = async (query: string): Promise<MediaItem[]> => {
  
  const res = await fetch(`https://shikimori.one/api/mangas?search=${encodeURIComponent(query)}&limit=10`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: any) => ({
    id: String(item.id), source: 'shikimori', title: String(item.name || item.russian), cover: item.image?.original ? `https://shikimori.one${item.image.original}` : null,
    type: item.kind === 'manhwa' ? 'webtoon' : 'manga', year: item.aired_on ? String(item.aired_on).split('-')[0] : 'N/A', description: 'Aucune description disponible.',
    totalEpisodes: item.volumes || item.chapters || null, isAiring: item.status === 'ongoing', isAdult: false
  }));
};

const fetchOpenLibrary = async (query: string): Promise<MediaItem[]> => {

  if (query.length < 4) return [];

  const isISBN = /^[0-9-]+$/.test(query) && query.replace(/-/g, '').length >= 10;
  const searchQuery = isISBN ? `isbn=${query}` : `q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(`https://openlibrary.org/search.json?${searchQuery}&limit=10`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();

    return data.docs.map((item: any) => ({
      id: String(item.key), source: 'openlibrary', title: String(item.title), cover: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
      type: 'book', year: String(item.first_publish_year || 'N/A'), description: item.author_name ? `Auteur(s) : ${item.author_name.join(', ')}` : 'Aucune description disponible.',
      totalEpisodes: item.number_of_pages_median || null, isAiring: false, genres: item.subject ? item.subject.slice(0, 3) : [], isAdult: false, creator: item.author_name ? item.author_name[0] : null
    }));
  } catch (error) {
    clearTimeout(timeoutId);
    return [];
  }
};

const fetchTrendingTMDB = async (lang: Lang): Promise<MediaItem[]> => {
  if (!TMDB_API_KEY || TMDB_API_KEY === 'VOTRE_TMDB_API_KEY_ICI') return [];
  const apiLang = lang === 'fr' ? 'fr-FR' : 'en-US';
  const res = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}&language=${apiLang}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').map((item: any) => ({
    id: String(item.id), source: 'tmdb', title: String(item.title || item.name), cover: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    type: item.media_type, year: String(item.release_date || item.first_air_date || '').split('-')[0], description: String(item.overview || ''), totalEpisodes: item.media_type === 'movie' ? 1 : null, isAdult: item.adult === true
  }));
};

const mapStatusToLabel = (status: string | undefined) => {
  const { t } = useTranslation();
  if (!status) return t('statut-inconnu');
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'finished' || s === 'ended' || s === 'released') return t('termine');
  if (s === 'ongoing' || s === 'releasing' || s === 'returning series' || s === 'in production') return t('statut-en-production');
  if (s === 'planned' || s === 'post production' || s === 'not_yet_released') return t('a-venir');
  if (s === 'canceled') return t('statut-annulee');
  return t('statut-inconnu');
};

const revalidateMediaDetails = async (item: MediaItem | LibraryItem, lang: Lang): Promise<Partial<LibraryItem> | null> => {
  if (item.source === 'manual') return null;
  const targetId = 'media_id' in item ? item.media_id : item.id;
  const apiLang = lang === 'fr' ? 'fr-FR' : 'en-US';

  try {
    if (item.source === 'tmdb') {
      const res = await fetch(`https://api.themoviedb.org/3/${item.type}/${targetId}?api_key=${TMDB_API_KEY}&language=${apiLang}&append_to_response=credits`);
      if (!res.ok) return null;
      const data = await res.json();
      let creator = null;
      if (item.type === 'movie' && data.credits?.crew) creator = data.credits.crew.find((c: any) => c.job === 'Director')?.name;
      else if (item.type === 'tv' && data.created_by?.length > 0) creator = data.created_by[0].name;
      return { description: String(data.overview), total_episodes: item.type === 'tv' ? data.number_of_episodes : 1, genres: data.genres?.map((g: any) => String(g.name)), runtime: item.type === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 0), prod_status: String(data.status), creator: creator ? String(creator) : String(item.creator || '') };
    }
    if (item.source === 'anilist') {
      const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query ($id: Int) { Media(id: $id) { description episodes status genres duration studios(isMain: true) { nodes { name } } } }`, variables: { id: parseInt(targetId) } }) });
      if (!res.ok) return null;
      const data = await res.json();
      return { description: String(data.data.Media.description?.replace(/<[^>]*>?/gm, '')), total_episodes: data.data.Media.episodes || item.total_episodes, genres: data.data.Media.genres, runtime: data.data.Media.duration, prod_status: String(data.data.Media.status), creator: data.data.Media.studios?.nodes?.[0]?.name ? String(data.data.Media.studios?.nodes?.[0]?.name) : String(item.creator || '') };
    }
  } catch (e) {} return null;
};

// ============================================================================
// COMPOSANTS UI ATOMIQUES
// ============================================================================
//Image avec fondu au chargement
const FadeInImage: React.FC<{ src: string, alt?: string, className?: string }> = ({ src, alt, className = '' }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt || ''}
      onLoad={() => setIsLoaded(true)}
      // transition-all gère l'opacité ET le zoom (scale) au survol
      className={`${className} transition-all duration-500 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
};
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

  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];

  return (
    <div className="relative w-full" ref={selectRef}>
      <div onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between w-full rounded-xl px-4 py-3.5 cursor-pointer font-bold text-sm transition-all select-none border border-[var(--border-color)] bg-[var(--panel-bg-alt)] ${className}`}>
        <span className="truncate pr-2 text-[var(--text-main)]">{selectedOption?.label || String(value)}</span>
        <ChevronRight size={16} className={`text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${isOpen ? '-rotate-90' : 'rotate-90'}`} />
      </div>
      {isOpen && (
        <div className={`absolute z-50 left-0 right-0 ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
          <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {options.map((opt) => {
              if (opt.disabled) return null;
              return <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors mx-1 rounded-lg ${String(value) === String(opt.value) ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:bg-[var(--border-color)] hover:text-[var(--text-main)]'}`}>{opt.label}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AkashaLogo: React.FC<{ size?: number, className?: string }> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 107 111" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M20.6191 13.4407C20.3294 13.4257 20.0549 13.4116 19.7988 13.3984L20.6191 13.4407Z" fill="currentColor"/>
    <path d="M64.0889 37.3545C59.4132 37.4488 54.2832 37.9057 49.8428 38.7197C44.8726 39.6466 40.3385 40.823 36.2393 42.2451C31.077 44.0779 26.2942 46.5335 21.8867 49.6104C17.4699 52.6938 13.6012 56.2309 10.2764 60.2207C7.03841 64.2085 4.51665 68.3892 2.70117 72.7627C0.894753 77.1145 5.69075e-05 81.4855 0 85.8838C0 90.4072 0.823939 93.968 2.3623 96.6602C3.9344 99.4112 5.98127 101.362 8.49805 102.582C11.1025 103.845 13.9074 104.479 16.9316 104.479C22.238 104.479 28.3831 102.197 33.7773 99.873C33.1668 97.5887 32.5668 95.1245 31.9795 92.4814C31.6882 91.1496 31.3178 89.0877 30.9229 86.6426C27.5019 88.1681 24.5392 88.664 21.7959 88.6641C19.7172 88.664 17.8467 88.1479 16.667 86.7061C15.5964 85.3975 15.1758 83.6385 15.1758 81.6602C15.1758 79.0155 16.1021 76.1182 17.79 73.0088C19.5011 69.8569 21.9122 66.8318 24.9912 63.9287C28.0902 60.9216 31.6686 58.407 35.7168 56.3828L35.7324 56.375C38.8195 54.8756 42.6579 53.483 47.2256 52.1895C51.5253 50.9155 54.3004 49.964 59.7432 49.8389C61.2294 46.5057 62.4059 43.4048 63.1104 41.04L63.1172 41.0166L63.125 40.9932C63.4329 40.0693 63.8415 38.7321 64.0889 37.3545Z" fill="currentColor"/>
    <path d="M45.1455 55.9434C41.9701 56.9465 39.2719 57.9906 37.043 59.0732C34.9322 60.1297 32.9658 61.3247 31.1426 62.6572C31.228 65.9508 31.8317 71.5978 32.5771 77.2246C33.3795 83.2807 34.325 89.163 34.9082 91.8311L35.3555 93.7969C36.2603 97.6882 37.1859 101.131 38.1318 104.127L53.0469 99.7275C51.7638 95.7181 50.5492 91.574 49.4033 87.2959C48.1043 82.4462 47.0681 77.1339 46.293 71.3633L46.292 71.3516L46.29 71.3389C45.6692 66.0619 45.2237 62.2125 45.1455 55.9434Z" fill="currentColor"/>
    <path d="M83.8955 42.3135C83.3896 43.9991 82.9628 45.3621 82.6182 46.3975C81.7958 49.0113 80.9011 51.5471 79.9375 54.0049C83.0948 55.5128 85.1916 57.1411 87.0322 59.8184C89.0867 62.8068 90.1122 66.177 90.1123 69.8838C90.1123 73.6057 88.9937 77.3977 86.8496 81.2393C84.715 85.2165 81.0651 88.6317 76.0518 91.5342C71.5628 94.1785 66.5456 96.4664 59.0381 97.5811L66.3643 110.482C73.9027 109.29 80.1353 107.38 85.0996 104.779L85.1123 104.772L85.125 104.767C90.4488 102.105 94.6298 98.9739 97.7168 95.3994C100.837 91.7862 103.034 87.9103 104.333 83.7705C105.654 79.4752 106.312 75.1464 106.312 70.7803C106.312 63.9861 104.476 58.161 100.845 53.2383C97.3661 48.5229 92.1053 43.8364 84.3291 41.0879C84.1852 41.494 84.0395 41.9023 83.8955 42.3135Z" fill="currentColor"/>
    <path d="M34.9424 2.89062C34.9962 1.86881 35.0163 0.904683 35.0039 0L51.4248 0.420898C51.2093 1.16203 51.0069 1.86508 50.8174 2.52832L50.8037 2.57617L50.793 2.62598C50.6684 3.20727 50.3624 4.93605 50.0507 6.69621L49.9688 7.15918C49.6203 9.12653 49.2876 10.9941 49.1709 11.5L48.7246 13.4307L50.7041 13.3359C57.8101 12.9935 66.5227 12.3274 73.0635 11.4668C79.0283 10.6819 85.166 9.5383 91.4766 8.04102L91.582 22.6738C87.6642 23.3544 83.2914 24.0036 78.4619 24.6172C73.1069 25.2122 67.4923 25.723 61.6221 26.1484L60.548 26.2275C55.5408 26.5964 53.3926 26.7546 48.0645 26.9932L46.8135 27.0488L46.6455 28.29C46.5666 28.8716 46.4983 29.3723 46.4383 29.8111C46.0168 32.8974 46.0137 32.92 45.7266 36.4932C41.9943 37.3125 38.5029 38.2846 35.2559 39.4111L35.2461 39.4141C33.902 39.891 32.5813 40.4079 31.2852 40.9658C31.532 37.0755 31.8498 32.3695 32.127 29.0439L32.2627 27.4199H30.6318C28.1692 27.4199 23.5884 27.3812 20.707 27.2969C17.8976 27.1269 15.0879 26.9996 12.2783 26.9141C10.1217 26.7793 8.14805 26.6717 6.3584 26.5898L5.9375 12.0537C7.22339 12.205 8.77804 12.3922 10.6016 12.6201L10.6523 12.626C13.4749 12.8826 16.5103 13.1391 19.7578 13.3955L19.7783 13.3965L19.7988 13.3984L20.6191 13.4407C24.0638 13.6185 29.6758 13.9082 32.4766 13.9082H33.7939L33.9648 12.6016C34.2933 10.0833 34.3054 9.93468 34.358 9.29052C34.3673 9.17691 34.3778 9.04787 34.3916 8.8877L34.5527 7.18555C34.7261 5.87436 34.8564 4.43869 34.9424 2.89062Z" fill="currentColor"/>
    <path d="M67.8232 32.8584C67.96 31.9469 68.0721 31.1244 68.1621 30.3936L83.6582 34.083C83.4178 34.7384 83.1464 35.4997 82.8438 36.3643C82.2463 37.9862 81.6488 39.6506 81.0518 41.3564L81.041 41.3887L81.0312 41.4209C80.5212 43.1209 80.0991 44.4702 79.7646 45.4736L79.7607 45.4854L79.7568 45.498C77.3968 52.9996 74.4519 59.8102 70.9277 65.9355L70.9053 65.9746L70.8857 66.0146C68.1843 71.433 64.2338 76.2123 60.4082 80.2451C58.5537 82.2001 56.7434 83.9649 55.1253 85.5424L54.9805 85.6836L54.9362 85.7268C54.136 86.5069 53.3758 87.2481 52.6865 87.9434C52.5573 87.4706 52.4283 86.9957 52.3008 86.5195C51.0988 82.0319 50.1256 77.1105 49.3779 71.7539C52.8296 68.5854 56.2866 63.2672 59.1611 57.8701C62.0414 52.4621 64.4389 46.782 65.7402 42.6924L65.9854 41.8965C66.3307 40.8571 66.8301 39.23 67.1035 37.5283C67.3287 36.4529 67.4672 35.4204 67.6007 34.4246C67.6716 33.8964 67.741 33.3785 67.8213 32.8701L67.8232 32.8584Z" fill="currentColor"/>
  </svg>
);

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const { t } = useContext(LangContext);
  const config: Record<string, { color: string, icon: any, label: string }> = {
    movie: { color: 'bg-rose-500/20 text-rose-500 border border-rose-500/20', icon: Film, label: t('type_movie') },
    tv: { color: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20', icon: Tv, label: t('type_tv') },
    anime: { color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20', icon: PlayCircle, label: t('type_anime') },
    manga: { color: 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20', icon: BookOpen, label: t('type_manga') },
    webtoon: { color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20', icon: Flame, label: t('type_webtoon') },
    book: { color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20', icon: Book, label: t('type_book') },
    youtube: { color: 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20', icon: Video, label: 'YouTube' },
    manual: { color: 'bg-gray-500/20 text-gray-500 border border-gray-500/20', icon: PenTool, label: t('manual') }
  };
  const current = config[type] || config.movie;
  const Icon = current.icon;
  return <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold backdrop-blur-md ${String(current.color)}`}><Icon size={12} strokeWidth={3} /> {current.label}</span>;
};

const InlineEpisodeEdit: React.FC<{ item: LibraryItem, onSave: (id: string, total: number | null) => void }> = ({ item, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(item.total_episodes?.toString() || '');
  const { t } = useTranslation();

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] cursor-pointer hover:text-[var(--primary)] group py-1" onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} title={t('modifier-le-total-depisodes')}>
        <span>{item.progress} / {item.total_episodes ? item.total_episodes : '?'}</span>
        <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 py-1" onClick={e => e.stopPropagation()}>
      <span className="text-xs font-mono text-[var(--text-muted)]">{item.progress} /</span>
      <input autoFocus type="number" min={item.progress} className="w-12 bg-[var(--bg-base)] text-xs text-[var(--text-main)] border border-[var(--primary)] rounded px-1 outline-none text-center" value={String(value)} onChange={e => setValue(e.target.value)} onBlur={() => { setIsEditing(false); onSave(item.id, isNaN(parseInt(String(value), 10)) ? null : parseInt(String(value), 10)); }} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
    </div>
  );
};

const InlineRuntimeEdit: React.FC<{ item: LibraryItem, localRuntime: number | undefined, onSave: (val: number) => void }> = ({ item, localRuntime, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const defaultVal = localRuntime || (item.type === 'movie' ? 90 : item.type === 'tv' ? 60 : 20);
  const [value, setValue] = useState(defaultVal.toString());
  const { t } = useTranslation();

  if (!isEditing) {
    return (
      <span
        className="flex items-center gap-1 text-[var(--text-muted)] ml-1 border-l border-[var(--border-color)] pl-2 cursor-pointer hover:text-[var(--primary)] group"
        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
        title={t('modifier-la-duree')}
      >
        <Clock size={12}/> {defaultVal}m
        <Edit2 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-[var(--text-muted)] ml-1 border-l border-[var(--border-color)] pl-2" onClick={e => e.stopPropagation()}>
      <Clock size={12}/>
      <input
        autoFocus
        type="number"
        className="w-10 bg-[var(--bg-base)] text-xs text-[var(--text-main)] border border-[var(--primary)] rounded px-1 outline-none text-center"
        value={String(value)}
        onChange={e => setValue(e.target.value)}
        onBlur={() => { setIsEditing(false); const parsed = parseInt(String(value), 10); if(!isNaN(parsed)) onSave(parsed); }}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      />
      m
    </span>
  );
};

// ============================================================================
// COMPOSANT D'ÉDITION DE TAGS INTELLIGENT
// ============================================================================
const TagEditor: React.FC<{ currentTags: string[], allTags: string[], onTagsChange: (tags: string[]) => void }> = ({ currentTags, allTags, onTagsChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const availableTags = allTags.filter(t => !currentTags.includes(t) && t.toLowerCase().includes(inputValue.toLowerCase()));

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !currentTags.includes(trimmed)) onTagsChange([...currentTags, trimmed]);
    setInputValue('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex flex-col gap-2">
      {currentTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {currentTags.map(tag => (
            <span key={tag} className="flex items-center gap-1 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-2 py-1 rounded-md text-xs font-bold">
              {tag} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => onTagsChange(currentTags.filter(t => t !== tag))} />
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          ref={inputRef} type="text" placeholder={t('ajouter-ou-chercher-un-tag')} value={inputValue}
          onChange={e => { setInputValue(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(inputValue); } }}
          className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-muted)]"
        />
        {showDropdown && (inputValue || availableTags.length > 0) && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden max-h-40 overflow-y-auto custom-scrollbar">
            {inputValue && !allTags.includes(inputValue.trim()) && !currentTags.includes(inputValue.trim()) && (
              <div className="px-4 py-2 text-sm text-[var(--primary)] hover:bg-[var(--primary)]/10 cursor-pointer font-bold border-b border-[var(--border-color)]" onMouseDown={() => addTag(inputValue)}>
                <Plus size={14} className="inline mr-1" /> {t('creer-le-tag')}: {inputValue}
              </div>
            )}
            {availableTags.map(tag => (
              <div key={tag} className="px-4 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--border-color)] cursor-pointer" onMouseDown={() => addTag(tag)}>
                {tag}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT D'AJOUT MANUEL (INTÉGRÉ À LA PAGE)
// ============================================================================
const ManualAddForm: React.FC<{ user: UserData; fetchLibrary: () => void; userLibrary?: LibraryItem[]; }> = ({ user, fetchLibrary, userLibrary = [] }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('movie');
  const [status, setStatus] = useState('watching');
  const [totalEpisodes, setTotalEpisodes] = useState('');
  const [runtime, setRuntime] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const allTags = useMemo(() => {
    const t = new Set<string>();
    userLibrary.forEach(item => { if (item.tags) item.tags.forEach(tag => t.add(tag)); });
    return Array.from(t).sort();
  }, [userLibrary]);
  const [youtubeUrl, setYoutubeUrl] = useState(''); // État pour le lien YT
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingYT, setIsFetchingYT] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fonction de parsing de la durée ISO 8601 de YouTube
  const parseYtDuration = (duration: string) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    return (hours * 60) + minutes;
  };

  const handleYoutubeExtract = async (url: string) => {
    if (!url) return;
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(ytRegex);
    
    if (match && match[1]) {
      const videoId = match[1];
      // 1. On attribue la miniature haute qualité d'office (marche sans API Key)
      setCoverUrl(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
      
      // 2. Si on a une clé API, on va chercher Titre + Durée
      if (YOUTUBE_API_KEY) {
        setIsFetchingYT(true);
        try {
          const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${YOUTUBE_API_KEY}`);
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const video = data.items[0];
            setTitle(video.snippet.title);
            const durationMins = parseYtDuration(video.contentDetails.duration);
            if (durationMins > 0) setRuntime(durationMins.toString());
            setType('youtube'); // Souvent une vidéo correspond mieux au format série ou "autre" selon ta logique
          }
        } catch (e) {
          console.error("Erreur API YouTube", e);
        } finally {
          setIsFetchingYT(false);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError(t('le-titre-est-obligatoire'));
    
    setIsSubmitting(true);
    setError('');
    
    
    const payload = {
      user_id: user.id,
      media_id: `manual_${Date.now()}`,
      source: 'manual',
      title: title.trim(),
      type: type,
      status: status,
      cover_url: coverUrl.trim() || null,
      total_episodes: parseInt(totalEpisodes, 10) || null,
      runtime: parseInt(runtime, 10) || null,
      progress: 0,
      description: t('ajoute-manuellement'),
      year: new Date().getFullYear().toString(),
      tags: tags,
      custom_link: youtubeUrl.trim() || null // On stocke le lien YT dans custom_link pour y accéder plus tard
    };

    const { error: dbError } = await supabase.from('user_media').insert([payload]);
    setIsSubmitting(false);

    if (dbError) setError(dbError.message);
    else {
      fetchLibrary();
      setTitle(''); setTotalEpisodes(''); setRuntime(''); setCoverUrl(''); setTags([]); setYoutubeUrl('');
      setSuccess(t('serie-ajoutee-a-votre-liste'));
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  return (
    <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-xl mt-8 mx-auto w-full max-w-2xl text-left">
      <h2 className="text-xl font-black text-[var(--text-main)] mb-2 flex items-center gap-2">
        <PenTool className="text-[var(--primary)]" /> {t('vous-ne-trouvez-pas-votre-bonheur')}
      </h2>
      <p className="text-sm text-[var(--text-muted)] mb-6">{t('ajoutez-manuellement-loeuvre-a-votre-bibliotheque-si-elle-nexiste-pas-dans-nos-bases-de-donnees')}</p>

      {error && <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm font-bold rounded-xl border border-red-500/30">{error}</div>}
      {success && <div className="mb-4 p-3 bg-emerald-500/10 text-emerald-500 text-sm font-bold rounded-xl border border-emerald-500/30 text-center">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* NOUVEAU CHAMP YOUTUBE */}
        <div className="p-4 border border-[var(--border-color)] bg-[var(--panel-bg-alt)] rounded-xl relative">
          {isFetchingYT && <div className="absolute top-4 right-4"><Loader2 className="animate-spin text-red-500" size={16}/></div>}
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">{t('import-rapide-youtube')}</label>
          <Input type="url" placeholder={t('coller-une-url-youtube')} value={youtubeUrl} onChange={e => { setYoutubeUrl(e.target.value); handleYoutubeExtract(e.target.value); }} />
          <p className="text-[10px] text-[var(--text-muted)] mt-1">{t('genere-automatiquement-la-miniature-le-titre-et-la-duree')}</p>
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">{t('titre-de-loeuvre')}</label>
          <Input required type="text" placeholder={t('ex-le-seigneur-des-anneaux')} value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">{t('type')}</label>
            <CustomSelect value={type} onChange={setType} options={FORMAT_OPTIONS.filter(o => o.value !== 'all').map(o => ({...o, label: o.labelKey ? t(o.labelKey) : o.label}))} className="bg-[var(--bg-base)]" />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">{t('statut')}</label>
            <CustomSelect value={status} onChange={setStatus} options={STATUS_OPTIONS.filter(o => o.value !== '').map(o => ({...o, label: o.labelKey ? t(o.labelKey) : o.label}))} className="bg-[var(--bg-base)]" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">{t('total-episodes-pages')}</label>
            <Input type="number" min="1" placeholder={t('optionnel')} value={totalEpisodes} onChange={e => setTotalEpisodes(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">{t('duree-minutes')}</label>
            <Input type="number" min="1" placeholder={t('optionnel')} value={runtime} onChange={e => setRuntime(e.target.value)} />
          </div>
        </div>

        {/* NOUVEAU CHAMP TAGS */}
        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">{t('tags-listes-personnalisees')}</label>
          <TagEditor currentTags={tags} allTags={allTags} onTagsChange={setTags} />
        </div>

        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">{t('lien-de-limage-cover-url')}</label>
          <Input type="url" placeholder="https://..." value={coverUrl} onChange={e => setCoverUrl(e.target.value)} />
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full !py-3.5" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : t('ajouter-manuellement')}
          </Button>
        </div>
      </form>
    </div>
  );
};


// ============================================================================
// MODAL DE DÉTAILS
// ============================================================================
const DetailModal: React.FC<{
  item: MediaItem | LibraryItem, onClose: () => void, trackedItem: LibraryItem | undefined,
  onLibraryUpdate?: (id: string, updates: Partial<LibraryItem>) => void, user?: UserData, fetchLibrary?: () => void, userLibrary?: LibraryItem[]
}> = ({ item, onClose, trackedItem, onLibraryUpdate, user, fetchLibrary, userLibrary = [] }) => {
  const { lang } = useContext(LangContext);
  const [localData, setLocalData] = useState(item as LibraryItem);
  const [isActing, setIsActing] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // SCROLL AUTOMATIQUE
  const modalContentRef = useRef<HTMLDivElement>(null);
  const wasTracked = useRef(!!trackedItem);

  useEffect(() => {
    // Si l'élément n'était pas dans la liste, et qu'il vient d'y être ajouté
    if (!wasTracked.current && trackedItem) {
      // Un délai de 100ms permet au DOM d'injecter les nouveaux boutons avant de scroller
      setTimeout(() => {
        modalContentRef.current?.scrollTo({ 
          top: modalContentRef.current.scrollHeight, 
          behavior: 'smooth' 
        });
      }, 100);
    }
    wasTracked.current = !!trackedItem;
  }, [trackedItem]);

  const [isEditingCover, setIsEditingCover] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [isEditingType, setIsEditingType] = useState(false);
  
  const [tags, setTags] = useState<string[]>(trackedItem?.tags || []);
  const allUserTags = useMemo(() => {
    const t = new Set<string>();
    userLibrary?.forEach(item => { if (item.tags) item.tags.forEach(tag => t.add(tag)); });
    return Array.from(t).sort();
  }, [userLibrary]);

  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const { t } = useTranslation();

  const getInitialReminderState = () => {
    if (!trackedItem?.reminder_day) return { type: 'weekly' as 'weekly'|'exact', days: [] as string[], freq: "1", exactDate: '' };
    try {
      const parsed = JSON.parse(trackedItem.reminder_day);
      if (parsed.date) return { type: 'exact' as const, days: [], freq: "1", exactDate: String(parsed.date) };
      return { type: 'weekly' as const, days: parsed.days || [], freq: parsed.frequency?.toString() || "1", exactDate: '' };
    } catch(e) {
      return { type: 'weekly' as const, days: [String(trackedItem.reminder_day || '')], freq: "1", exactDate: '' };
    }
  };

  const initialReminder = getInitialReminderState();

  const [notes, setNotes] = useState(trackedItem?.notes || '');
  const initialNotes = useRef(trackedItem?.notes || '');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  const [customLink, setCustomLink] = useState(trackedItem?.custom_link || '');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  //État et Fetch pour les plateformes de streaming
  const [streamingProviders, setStreamingProviders] = useState<{name: string, url: string, icon: string}[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  useEffect(() => {
    const fetchProviders = async () => {
      if (!localData.source) return;
      setIsLoadingProviders(true);
      try {
        const results: {name: string, url: string, icon: string}[] = [];

        // 1. Logique ANILIST (GraphQL)
        if (localData.source === 'anilist') {
          const mediaId = (localData as any).media_id || (localData as any).id || item.id;
          const query = `query ($id: Int) { Media(id: $id) { externalLinks { site url icon } } }`;
          const res = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query, variables: { id: mediaId } })
          });
          const { data } = await res.json();
          // On filtre pour ne garder que les vraies plateformes de streaming (Crunchyroll, Netflix, ADN...)
          const validSites = ['Crunchyroll', 'Netflix', 'Animation Digital Network', 'Amazon Prime Video', 'Disney Plus'];
          data?.Media?.externalLinks?.forEach((link: any) => {
            if (validSites.includes(link.site)) {
              results.push({ name: link.site, url: link.url, icon: link.icon || '' });
            }
          });
        } 
        // 2. Logique TMDB (REST)
        else if (localData.source === 'tmdb') {
          const mediaId = (localData as any).media_id || (localData as any).id || item.id;
          const tmdbType = localData.type === 'movie' ? 'movie' : 'tv';
          // ATTENTION : Remplace VITE_TMDB_API_KEY par ta vraie variable d'environnement
          const res = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${mediaId}/watch/providers?api_key=${import.meta.env.VITE_TMDB_API_KEY}`);
          const data = await res.json();
          const frProviders = data.results?.FR?.flatrate || [];
          frProviders.forEach((prov: any) => {
            results.push({
              name: prov.provider_name,
              // TMDB ne donne pas d'URL directe par épisode, on renvoie vers la page JustWatch générale
              url: data.results?.FR?.link || '#',
              icon: `https://image.tmdb.org/t/p/original${prov.logo_path}`
            });
          });
        }
        setStreamingProviders(results);
      } catch (e) {
        console.error("Erreur récupération streaming", e);
      } finally {
        setIsLoadingProviders(false);
      }
    };
    fetchProviders();
  }, [localData.source, localData.id]);

  const [reminderType, setReminderType] = useState<'weekly'|'exact'>(initialReminder.type);
  const [reminderDays, setReminderDays] = useState<string[]>(initialReminder.days);
  const [reminderFreq, setReminderFreq] = useState<string>(initialReminder.freq);
  const [reminderExactDate, setReminderExactDate] = useState<string>(initialReminder.exactDate);
  const [reminderTime, setReminderTime] = useState(trackedItem?.reminder_time || '18:00');

 // --- AUTO-SAVE DU BLOC-NOTE ---
  useEffect(() => {
    if (notes === initialNotes.current) return;
    
    setSyncStatus('syncing');
    const timer = setTimeout(() => {
      saveExtras({ notesStr: notes });
      initialNotes.current = notes;
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    }, 800); // S'active 800ms après ta dernière frappe
    
    return () => clearTimeout(timer);
  }, [notes]);

  // --- FERMETURE SÉCURISÉE (ANTI-PERTE DE DONNÉES) ---
  const safeClose = useCallback(() => {
    if (notes !== initialNotes.current) {
      saveExtras({ notesStr: notes });
    }
    setIsExiting(true); // Déclenche l'animation
    setTimeout(() => {
      onClose(); // Tue le composant après 300ms
    }, 300);
  }, [notes, onClose]);

  const onCloseRef = useRef(safeClose);
  useEffect(() => { onCloseRef.current = safeClose; }, [safeClose]);

  useEffect(() => {
    window.history.pushState({ modal: 'detail' }, '', window.location.pathname + window.location.search + '#modal');
    const handlePopState = () => onCloseRef.current();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.location.hash === '#modal') window.history.back();
    };
  }, []);
  
  //BLOQUER LE SCROLL DE L'ARRIÈRE-PLAN
  useEffect(() => {
    // On sauvegarde la propriété d'origine
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // On coupe littéralement le défilement de la page principale
    document.body.style.overflow = 'hidden';
    
    // Cleanup : React exécutera cette fonction quand la modale se fermera
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  // -----------------------------------------------------

  const normalizedTotal = ('total_episodes' in localData) ? localData.total_episodes : (localData as any).totalEpisodes;

  useEffect(() => {
    const checkAndRevalidate = async () => {
      const freshData = await revalidateMediaDetails(item, lang);
      if (freshData) {
        if (trackedItem && trackedItem.runtime) delete freshData.runtime;
        if (trackedItem && trackedItem.total_episodes) delete freshData.total_episodes;

        setLocalData(prev => ({ ...prev, ...freshData }));
      }
    };
    checkAndRevalidate();
  }, [item.id, trackedItem?.id, lang]);

  const saveExtras = async (overrides: { type?: 'weekly'|'exact', days?: string[], freq?: string, date?: string, time?: string, notesStr?: string, link?: string } = {}) => {
    if (!trackedItem) return;

    const currentType = overrides.type ?? reminderType;
    const currentDays = overrides.days ?? reminderDays;
    const currentFreq = overrides.freq ?? reminderFreq;
    const currentDate = overrides.date ?? reminderExactDate;
    const currentTime = overrides.time ?? reminderTime;
    const currentNotes = overrides.notesStr ?? notes;
    const currentLink = overrides.link ?? customLink;

    let reminderDataStr = '';
    if (currentType === 'exact' && currentDate) {
      reminderDataStr = JSON.stringify({ date: currentDate });
    } else if (currentType === 'weekly' && currentDays.length > 0) {
      reminderDataStr = JSON.stringify({ days: currentDays, frequency: parseInt(currentFreq) });
    }

    const updates: Partial<LibraryItem> = {
      notes: currentNotes,
      custom_link: currentLink,
      reminder_day: reminderDataStr || null,
      reminder_time: reminderDataStr ? currentTime : null
    };

    await supabase.from('user_media').update(updates).match({ id: trackedItem.id });
    if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, updates);
  };

  const handleAddOrUpdate = async (status: string) => {
    if (!user || !fetchLibrary) return;
    setIsActing(true);

    let progressToSet: number | undefined = undefined;
    if (status === 'completed' && normalizedTotal) {
      progressToSet = normalizedTotal;
    }

    if (trackedItem) {
      const updates: Partial<LibraryItem> = {
        status: status as any,
        updated_at: new Date().toISOString()
      };

      if (progressToSet !== undefined) {
        updates.progress = progressToSet;
      }

      await supabase.from('user_media').update(updates).match({ id: trackedItem.id });
      if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, updates);
    } else {
      await supabase.from('user_media').insert([{
        user_id: user.id,
        media_id: ('media_id' in localData) ? localData.media_id : item.id,
        source: item.source,
        title: localData.title,
        cover_url: 'cover' in localData ? localData.cover : localData.cover_url,
        type: localData.type,
        status: status,
        progress: progressToSet || 0,
        description: localData.description,
        year: localData.year?.toString(),
        total_episodes: normalizedTotal || null,
        runtime: localData.runtime || null
      }]);
    }
    fetchLibrary();
    setIsActing(false);
    
  };

  const handleRemove = async () => {
    if (!trackedItem || !user) return;
    setIsActing(true);
    
    try {
      await supabase.from('user_media').delete().match({ id: trackedItem.id });
      // On recharge la base de données globale
      if (fetchLibrary) fetchLibrary();
    } catch (error) {
      console.error(error);
    } finally {
      setIsActing(false);
    }
  };

  const toggleFavoriteModal = async () => {
    if (!trackedItem) return;
    const newFav = !trackedItem.is_favorite;
    if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, { is_favorite: newFav });
    await supabase.from('user_media').update({ is_favorite: newFav }).match({ id: trackedItem.id });
  };

  const handleAddToRanking = async () => {
    if (!trackedItem || !onLibraryUpdate) return;
    const sameTypeItems = userLibrary.filter(i => i.type === trackedItem.type && i.rating !== null);
    const maxRank = sameTypeItems.length > 0 ? Math.max(...sameTypeItems.map(i => i.rating || 0)) : 0;
    const newRank = maxRank + 1;

    onLibraryUpdate(trackedItem.id, { rating: newRank });
    await supabase.from('user_media').update({ rating: newRank }).match({ id: trackedItem.id });
  };

  const handleRemoveFromRanking = async () => {
    if (!trackedItem || !onLibraryUpdate) return;
    onLibraryUpdate(trackedItem.id, { rating: null });
    await supabase.from('user_media').update({ rating: null }).match({ id: trackedItem.id });
  };

  const handleSaveCover = async () => {
    setIsEditingCover(false);
    const newUrl = editCoverUrl.trim() || null;
    setLocalData(prev => ({ ...prev, cover_url: newUrl, cover: newUrl } as LibraryItem));
    if (trackedItem) {
      if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, { cover_url: newUrl });
      await supabase.from('user_media').update({ cover_url: newUrl }).match({ id: trackedItem.id });
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    const encoded = encodeMediaForShare(localData);
    const originalUrl = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    let finalUrl = originalUrl;

    try {
      // Utilisation de l'API TinyURL avec un fallback propre en mode 'cors'
      const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(originalUrl)}`, {
        method: 'GET',
        headers: { 'Accept': 'text/plain' }
      });
      
      if (res.ok) {
        const text = await res.text();
        if (text && text.startsWith('http')) {
          finalUrl = text.trim();
        }
      }
    } catch (err) {
      console.warn("L'API de TinyURL a échoué. Fallback sur l'URL complète.", err);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(finalUrl).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 3000);
      }).catch(() => fallbackCopyTextToClipboard(finalUrl));
    } else {
      fallbackCopyTextToClipboard(finalUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    }
    setIsSharing(false);
  };

  const title = String(localData.title || "");
  const cover = ('cover' in localData) ? localData.cover : localData.cover_url;
  const description = String(localData.description || t('description-en-cours-de-chargement'));
  const year = String(localData.year || t('annee-inconnue'));
  const prodStatusLabel = String(mapStatusToLabel(localData.prod_status));
  const statusColor = prodStatusLabel === "Statut inconnu" ? "bg-[var(--border-color)] text-[var(--text-main)]" : prodStatusLabel.includes("cours") || prodStatusLabel.includes("production") ? "bg-[var(--primary)] text-white" : prodStatusLabel.includes("venir") ? "bg-amber-500 text-black" : "bg-emerald-600 text-white";

  return (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center mobile-blur-fix p-0 sm:p-6 overflow-hidden transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`} onClick={safeClose}>
      {/* Flex Column pour séparer le contenu du footer fixe */}
      <div className={`bg-[var(--panel-bg)] sm:border border-[var(--border-color)] rounded-t-3xl sm:rounded-3xl w-full max-w-xl shadow-2xl relative mt-auto mb-0 sm:my-auto flex flex-col h-[92dvh] sm:h-auto sm:max-h-[85vh] ${isExiting ? 'animate-modal-out' : 'animate-modal'}`} onClick={e => e.stopPropagation()}>
        <button onClick={safeClose} className="absolute top-4 left-4 z-30 bg-[var(--bg-base)]/80 backdrop-blur-md p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-color)] shadow-sm"><X size={20} strokeWidth={3} /></button>

        {/* CORPS CENTRAL SCROLLABLE (flex-1) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
          <div className="flex justify-center mb-6 mt-4">
             <div className="w-48 aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-[var(--border-color)] group">

              {isEditingCover ? (
                <div className="absolute inset-0 bg-[var(--panel-bg)] flex flex-col items-center justify-center p-3 z-30">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase mb-2">{t('url-de-limage')}</label>
                  <textarea
                    autoFocus
                    className="w-full flex-1 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-xs rounded p-2 mb-2 resize-none outline-none focus:border-[var(--primary)] custom-scrollbar"
                    value={editCoverUrl}
                    onChange={e => setEditCoverUrl(e.target.value)}
                  />
                  <div className="flex gap-2 w-full">
                    <button onClick={() => { setIsEditingCover(false); setEditCoverUrl(String(cover || '')); }} className="flex-1 bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-red-500 rounded py-1.5 text-xs font-bold transition-colors">{t('annuler')}</button>
                    <button onClick={handleSaveCover} className="flex-1 bg-[var(--primary)] text-white rounded py-1.5 text-xs font-bold shadow-md">{t('sauver')}</button>
                  </div>
                </div>
              ) : (
                <>
                  {cover ? <img src={String(cover)} alt={title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[var(--bg-base)] flex items-center justify-center"><BookOpen size={48} className="text-[var(--text-muted)]"/></div>}
                  <div className="absolute top-2 left-2 z-20 cursor-pointer" onClick={(e) => { e.stopPropagation(); if (trackedItem) setIsEditingType(!isEditingType); }}>
                    {isEditingType ? (
                    <div className="bg-[var(--bg-base)] rounded shadow-lg p-1" onClick={e => e.stopPropagation()}>
                        <CustomSelect 
                          value={String(localData.type)} 
                          onChange={async (newType) => {
                          setLocalData(prev => ({ ...prev, type: newType }));
                          setIsEditingType(false);
                          if (trackedItem) {
                            if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, { type: newType as any });
                            await supabase.from('user_media').update({ type: newType }).match({ id: trackedItem.id });
                            }
                      }} 
                        /* C'EST ICI LA CORRECTION DE TEXTE INVISIBLE (Le .map avec la traduction) */
                      options={FORMAT_OPTIONS.filter(o => o.value !== 'all').map(o => ({...o, label: o.labelKey ? t(o.labelKey) : o.label}))} 
                      className="w-32 py-1 px-2 text-xs" 
                    />
                    </div>
                    ) : (
                      <div title={t('modifier-le-type')} className="group/type relative flex items-center">
                        <TypeBadge type={String(localData.type)} />
                      {trackedItem && (
                        <div className="absolute -top-1.5 -right-1.5 bg-[var(--bg-base)] text-[var(--text-main)] p-1 rounded-full shadow-md border border-[var(--border-color)] opacity-100 sm:opacity-0 sm:group-hover/type:opacity-100 transition-opacity">
                        <Edit2 size={10} />
                        </div>
                      )}
                      </div>
                  )}
                </div>

                  {/* BOUTON D'ÉDITION MANUELLE DE L'AFFICHE (UNIQUEMENT SI SOURCE MANUAL) */}
                  {localData.source === 'manual' && trackedItem && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditCoverUrl(String(cover || '')); setIsEditingCover(true); }}
                      className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white p-2 rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 hover:bg-black/80 shadow-lg"
                      title={t('modifier-limage')}
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </>
              )}

             </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] mb-3 leading-tight tracking-tight">{title}</h2>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              {localData.type !== 'book' && <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md ${String(statusColor)}`}>{prodStatusLabel}</span>}

              {(normalizedTotal || localData.type !== 'book') && (
                <span className="text-xs font-bold text-[var(--text-main)] bg-[var(--bg-base)] px-3 py-1 rounded-md flex items-center gap-1.5 border border-[var(--border-color)]">
                  {normalizedTotal ? `${String(normalizedTotal)} ${localData.type === 'book' ? 'pages' : 'ép'}` : '? ép'}
                  {localData.type !== 'book' && (
                    <InlineRuntimeEdit
                      item={localData}
                      localRuntime={localData.runtime}
                      onSave={async (newRuntime) => {
                        setLocalData(prev => ({ ...prev, runtime: newRuntime }));
                        if (trackedItem) {
                          if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, { runtime: newRuntime });
                          await supabase.from('user_media').update({ runtime: newRuntime }).match({ id: trackedItem.id });
                        }
                      }}
                    />
                  )}
                </span>
              )}

              <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-base)] px-3 py-1 rounded-md border border-[var(--border-color)]">{year} • {String(localData.source).toUpperCase()}</span>
            </div>
            {localData.creator && <p className="text-sm font-bold text-[var(--primary)] mb-4">{t('par')} {String(localData.creator)}</p>}
            {localData.genres && localData.genres.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {localData.genres.map(genre => <span key={String(genre)} className="text-[10px] uppercase tracking-wider bg-[var(--panel-bg-alt)] text-[var(--text-main)] border border-[var(--border-color)] px-3 py-1 rounded-full font-bold">{String(genre)}</span>)}
              </div>
            )}

            {/* BOUTONS DE RACCOURCI GOOGLE RECHERCHE ET PARTAGE */}
            <div className="flex flex-wrap justify-center gap-2 mb-2">
              <button
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(title + ' trailer')}`, '_blank')}
                className="flex items-center gap-1.5 text-xs font-bold bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-[var(--text-main)] px-3 py-2 rounded-lg transition-colors shadow-sm"
              >
                <PlayCircle size={14} /> {t('bande-annonce')}
              </button>
              <button
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(title + ' date de sortie')}`, '_blank')}
                className="flex items-center gap-1.5 text-xs font-bold bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-[var(--text-main)] px-3 py-2 rounded-lg transition-colors shadow-sm"
              >
                <CalendarIcon size={14} /> {t('date-de-sortie')}
              </button>
              <button
                onClick={handleShare}
                disabled={isSharing}
                className={`flex items-center gap-1.5 text-xs font-bold bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--primary)] text-[var(--text-main)] px-3 py-2 rounded-lg transition-colors shadow-sm ${shareCopied ? '!border-emerald-500 !text-emerald-500 bg-emerald-500/10' : 'hover:text-[var(--primary)]'}`}
              >
                {isSharing ? <Loader2 size={14} className="animate-spin" /> : (shareCopied ? <Check size={14} /> : <Share size={14} />)}
                {shareCopied ? t('lien-copie') : (isSharing ? t('creation') : t('partager'))}
              </button>
            </div>

          </div>

          <div className="mb-6 bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)]">
            <div className={`text-sm text-[var(--text-muted)] leading-relaxed ${!showFullDesc ? 'line-clamp-3' : ''}`}>{description}</div>
            {description.length > 150 && <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] mt-2 transition-colors">{showFullDesc ? t('voir-moins') : t('voir-plus')}</button>}
          </div>

          {trackedItem && (
            <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
              <div className="flex gap-2 items-center pt-2">
                <div className="flex-1 flex items-center gap-2">
                  {isEditingLink ? (
                    <div className="relative flex-1 flex items-center">
                      <LinkIcon className="absolute left-3 text-[var(--text-muted)]" size={16} />
                      <input autoFocus type="text" placeholder="https://exemple.com/serie" value={String(customLink)} onChange={(e) => setCustomLink(e.target.value)} onBlur={() => { setIsEditingLink(false); saveExtras(); }} className="w-full bg-[var(--bg-base)] border border-[var(--primary)] text-[var(--text-main)] text-sm rounded-xl py-3 pl-10 pr-4 focus:outline-none transition-all placeholder:text-[var(--primary)]/50 font-medium" onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      {customLink ? <a href={customLink.startsWith('http') ? customLink : `https://${customLink}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-bold py-3 px-4 rounded-xl transition-all shadow-lg shadow-[var(--shadow-color)]"><ExternalLink size={16} /> {t('ouvrir-le-lien')}</a> : <button onClick={() => setIsEditingLink(true)} className="flex-1 flex items-center justify-center gap-2 bg-[var(--panel-bg-alt)] border border-[var(--border-color)] hover:border-[var(--primary)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm font-bold py-3 px-4 rounded-xl transition-all"><Plus size={16} /> {t('ajouter-un-lien')}</button>}
                      <button onClick={() => setIsEditingLink(true)} className="p-3 bg-[var(--panel-bg-alt)] border border-[var(--border-color)] hover:border-[var(--primary)] text-[var(--text-muted)] hover:text-[var(--primary)] rounded-xl transition-colors" title={t('modifier-le-lien')}><Edit2 size={18} /></button>
                    </div>
                  )}

                  {/* NOUVEAU : AFFICHAGE DES PLATEFORMES DE STREAMING */}
                  {(isLoadingProviders || streamingProviders.length > 0) && (
                    <div className="pt-3 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Disponible sur :</span>
                      {isLoadingProviders ? (
                        <Loader2 size={12} className="animate-spin text-[var(--text-muted)]" />
                      ) : (
                        <div className="flex gap-2">
                          {streamingProviders.map((prov, i) => (
                            <a 
                              key={i} 
                              href={prov.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              title={prov.name}
                              className="w-6 h-6 rounded-md overflow-hidden hover:scale-110 transition-transform shadow-sm border border-[var(--border-color)]"
                            >
                              {prov.icon ? (
                                <img src={prov.icon} alt={prov.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[var(--primary)] flex items-center justify-center text-white text-[8px] font-bold">
                                  {prov.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
                <button onClick={() => setShowReminder(!showReminder)} className={`p-3 rounded-xl border transition-colors flex items-center justify-center shrink-0 ${showReminder || reminderDays.length > 0 || reminderExactDate ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-[var(--panel-bg-alt)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} title={t('configurer-un-rappel')}><Bell size={20} /></button>
              </div>

              {showReminder && (
                <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-amber-500 flex items-center gap-1.5"><BellRing size={14}/> {t('configurer-un-rappel-push')}</p>
                    <div className="flex bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg p-0.5">
                      <button onClick={() => { setReminderType('weekly'); saveExtras({ type: 'weekly' }); }} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${reminderType === 'weekly' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--text-muted)]'}`}>{t('hebdomadaire')}</button>
                      <button onClick={() => { setReminderType('exact'); saveExtras({ type: 'exact' }); }} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${reminderType === 'exact' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--text-muted)]'}`}>{t('date-precise')}</button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {reminderType === 'weekly' ? (
                      <>
                        <div className="flex justify-between items-center gap-2 w-full">
                          {WEEK_DAYS.map(day => {
                            const isSelected = reminderDays.includes(day.value);
                            return (
                              <button
                                key={day.value}
                                onClick={() => {
                                  const newDays = isSelected ? reminderDays.filter(d => d !== day.value) : [...reminderDays, day.value];
                                  setReminderDays(newDays);
                                  saveExtras({ days: newDays });
                                }}
                                className={`w-9 h-9 shrink-0 rounded-full text-xs font-bold flex items-center justify-center transition-all border ${isSelected ? 'bg-amber-500 border-amber-500 text-white shadow-md scale-110' : 'bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-muted)] hover:border-amber-500/50'}`}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex gap-2">
                           <div className="flex-1"><CustomSelect value={String(reminderFreq)} onChange={(val) => { setReminderFreq(val); saveExtras({ freq: val }); }} options={FREQUENCY_OPTIONS.map(o => ({ value: String(o.value), label: t(o.labelKey!) }))} placement="top" className="bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-main)] focus:border-amber-500" /></div>
                           <div className="relative shrink-0 w-28">
                             <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                             <input type="time" value={String(reminderTime)} onChange={e => setReminderTime(e.target.value)} onBlur={() => saveExtras()} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-xl py-3 pl-10 pr-2 outline-none focus:border-amber-500 transition-colors" />
                           </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                          <input type="date" value={String(reminderExactDate)} onChange={e => setReminderExactDate(e.target.value)} onBlur={() => saveExtras()} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-xl py-3 pl-10 pr-2 outline-none focus:border-amber-500 transition-colors" />
                        </div>
                        <div className="relative shrink-0 w-28">
                           <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                           <input type="time" value={String(reminderTime)} onChange={e => setReminderTime(e.target.value)} onBlur={() => saveExtras()} className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-xl py-3 pl-10 pr-2 outline-none focus:border-amber-500 transition-colors" />
                         </div>
                      </div>
                    )}

                    {(reminderDays.length > 0 || reminderExactDate) && (
                      <button onClick={async () => { setReminderDays([]); setReminderExactDate(''); await supabase.from('user_media').update({ reminder_day: null, reminder_time: null }).match({ id: trackedItem.id }); if(onLibraryUpdate) onLibraryUpdate(trackedItem.id, { reminder_day: null, reminder_time: null }); setShowReminder(false); }} className="mt-2 text-[10px] font-bold text-[var(--text-muted)] hover:text-red-500 uppercase tracking-wider flex justify-center items-center gap-1 transition-colors">
                        <BellOff size={12}/> {t('desactiver-ce-rappel')}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {trackedItem.status === 'completed' || (trackedItem.rewatch_count && trackedItem.rewatch_count > 0) ? (
                <div className="pt-4 border-t border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider mb-2">Historique de visionnage</p>
                  <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl">
                    <div className="flex-1 flex items-center gap-2">
                      <Clock size={16} className="text-indigo-500" />
                      <span className="text-sm font-bold text-[var(--text-main)]">Revu</span>
                      <input
                        type="number"
                        min="0"
                        className="w-12 bg-[var(--bg-base)] text-xs text-[var(--text-main)] border border-indigo-500/50 rounded px-1 outline-none text-center py-1 font-mono"
                        value={trackedItem.rewatch_count || 0}
                        onChange={async (e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, { rewatch_count: val });
                          await supabase.from('user_media').update({ rewatch_count: val }).match({ id: trackedItem.id });
                        }}
                      />
                      <span className="text-sm font-bold text-[var(--text-main)]">fois</span>
                    </div>
                    {trackedItem.status === 'completed' && (
                      <button
                        onClick={async () => {
                          const currentCount = trackedItem.rewatch_count || 0;
                          const updates = { status: 'watching' as any, progress: 0, rewatch_count: currentCount + 1, updated_at: new Date().toISOString() };
                          if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, updates);
                          await supabase.from('user_media').update(updates).match({ id: trackedItem.id });
                        }}
                        className="text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition-colors shadow-md"
                      >
                        Revoir
                      </button>
                    )}
                  </div>
                </div>
              ) : null}


              <div className="pt-2">
                <div className="pt-4">
                  <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider mb-2">{t('tags-listes-personnalisees')}</p>
                  <TagEditor 
                  currentTags={tags} 
                    allTags={allUserTags} 
                    onTagsChange={async (newTags) => {
                      setTags(newTags);
                      if (trackedItem) {
                      if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, { tags: newTags });
                      await supabase.from('user_media').update({ tags: newTags }).match({ id: trackedItem.id });
                      }
                    }} 
                  />
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-end mb-2 px-1">
                  <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">{t('bloc-note')}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider h-4 transition-opacity duration-300">
                    {syncStatus === 'syncing' && <><Loader2 size={12} className="animate-spin text-[var(--primary)]" /> <span className="text-[var(--primary)]">{t('enregistrement')}</span></>}
                    {syncStatus === 'synced' && <><Check size={12} className="text-emerald-500" /> <span className="text-emerald-500">{t('sauvegarde')}</span></>}
                  </div>
                </div>
                <textarea 
                  placeholder={t('bloc-note-enregistre-automatiquement')} 
                  value={String(notes)} 
                  onChange={(e) => setNotes(e.target.value)} 
                  className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-xl p-4 min-h-[120px] focus:outline-none focus:border-[var(--primary)] transition-all resize-y placeholder:text-[var(--text-muted)] font-medium custom-scrollbar" 
                />
              </div>

            </div>
          )}
        </div> {/* FIN DU CORPS SCROLLABLE */}

        {/* FOOTER STICKY (ACTIONS PRINCIPALES) */}
        <div className="shrink-0 p-4 sm:p-6 bg-[var(--panel-bg)]/95 backdrop-blur-xl border-t border-[var(--border-color)] z-20 rounded-b-3xl">
          {!trackedItem ? (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider text-center">{t('ajouter-a-ma-liste')}</p>
              {isActing ? (
                <div className="flex justify-center p-2"><Loader2 className="animate-spin text-[var(--primary)]" /></div>
              ) : (
                <CustomSelect 
                  placement="top" 
                  value="" 
                  onChange={handleAddOrUpdate} 
                  options={STATUS_OPTIONS.map(o => ({...o, label: o.labelKey ? t(o.labelKey) : o.label}))} 
                  className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] !text-white border border-transparent shadow-lg shadow-[var(--shadow-color)] text-center justify-center" 
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              
              {/* BARRE DE PROGRESSION STICKY (Apparaît si "En cours" ou "En pause") */}
              {(trackedItem.status === 'watching' || trackedItem.status === 'on_hold') && (
                <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-bottom-2">
                  <span className="text-xs font-mono font-bold text-[var(--text-muted)] w-10 text-right shrink-0">
                    {trackedItem.progress}/{trackedItem.total_episodes || '?'}
                  </span>
                  <div className="flex-1 h-2 bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border-color)]">
                    <div 
                      className="h-full bg-[var(--primary)] rounded-full transition-all duration-300" 
                      style={{ width: `${trackedItem.total_episodes ? Math.min(100, (trackedItem.progress / trackedItem.total_episodes) * 100) : 0}%` }} 
                    />
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={async () => {
                        const newProgress = Math.max(0, trackedItem.progress - 1);
                        if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, { progress: newProgress, updated_at: new Date().toISOString() });
                        await supabase.from('user_media').update({ progress: newProgress, updated_at: new Date().toISOString() }).match({ id: trackedItem.id });
                      }} 
                      disabled={trackedItem.progress <= 0} 
                      className="w-10 h-10 flex items-center justify-center bg-[var(--panel-bg-alt)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-50 transition-colors"
                    >
                      <Minus size={18} strokeWidth={3}/>
                    </button>
                    <button 
                      onClick={async () => {
                        const newProgress = trackedItem.progress + 1;
                        if (trackedItem.total_episodes && newProgress > trackedItem.total_episodes) return;
                        
                        const updates: Partial<LibraryItem> = { progress: newProgress, updated_at: new Date().toISOString() };
                        
                        // Auto-complétion si on atteint la fin
                        if (trackedItem.total_episodes && newProgress === trackedItem.total_episodes) {
                          updates.status = 'completed';
                        }
                        
                        if (onLibraryUpdate) onLibraryUpdate(trackedItem.id, updates);
                        await supabase.from('user_media').update(updates).match({ id: trackedItem.id });
                      }} 
                      disabled={trackedItem.total_episodes !== null && trackedItem.progress >= trackedItem.total_episodes} 
                      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-md shadow-[var(--shadow-color)] disabled:opacity-50 transition-transform active:scale-95"
                    >
                      <Plus size={20} strokeWidth={3}/>
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex w-full items-center h-12 relative">
                
                {/* BLOC GAUCHE : Statut, Trophée, Favori */}
                <div className={`flex gap-2 h-full transition-all duration-300 ease-in-out overflow-hidden ${showDeleteConfirm ? 'w-0 opacity-0 pointer-events-none' : 'w-full opacity-100 pr-14'}`}>
                  <div className="flex-1 min-w-[100px] h-full">
                    <CustomSelect 
                      placement="top" 
                      value={String(trackedItem.status)} 
                      onChange={handleAddOrUpdate} 
                      options={STATUS_OPTIONS.filter(o => o.value !== "").map(o => ({...o, label: o.labelKey ? t(o.labelKey) : o.label}))} 
                      className="bg-[var(--panel-bg-alt)] border border-[var(--border-color)] h-full" 
                    />
                  </div>
                  <Button variant="ghost" className={`!p-3 shrink-0 rounded-xl h-full border ${trackedItem.rating !== null ? 'border-amber-500 bg-amber-500/10 text-amber-500' : 'border-[var(--border-color)] bg-[var(--panel-bg-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} onClick={trackedItem.rating !== null ? handleRemoveFromRanking : handleAddToRanking} title={trackedItem.rating !== null ? t('retirer-du-classement') : t('ajouter-au-classement')}>
                    <Trophy size={20} className={trackedItem.rating !== null ? "fill-amber-500 text-amber-500" : ""} />
                  </Button>
                  <Button variant="ghost" className={`!p-3 shrink-0 rounded-xl h-full border ${trackedItem.is_favorite ? 'border-rose-500 bg-rose-500/10 text-rose-500' : 'border-[var(--border-color)] bg-[var(--panel-bg-alt)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} onClick={toggleFavoriteModal} title={t('favori')}>
                    <Heart size={20} className={trackedItem.is_favorite ? "fill-rose-500 text-rose-500" : ""} />
                  </Button>
                </div>

                {/* BLOC DROITE : Poubelle extensible */}
                <div className={`absolute right-0 h-full bg-red-500/10 border border-red-500/30 rounded-xl transition-all duration-300 ease-in-out overflow-hidden ${showDeleteConfirm ? 'w-full' : 'w-12'}`}>
                  
                  {/* Contenu étendu (Confirmation) */}
                  <div className={`absolute inset-0 flex items-center justify-between px-4 transition-opacity duration-300 whitespace-nowrap ${showDeleteConfirm ? 'opacity-100 delay-100' : 'opacity-0 pointer-events-none'}`}>
                    <span className="text-sm font-bold text-red-500">{t('etes-vous-sur')}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 bg-[var(--panel-bg-alt)] border border-[var(--border-color)] text-[var(--text-main)] text-xs font-bold rounded-lg transition-colors hover:bg-[var(--border-color)]">
                        {t('non')}
                      </button>
                      <button onClick={() => { setShowDeleteConfirm(false); handleRemove(); }} className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg shadow-md hover:bg-red-600 transition-transform active:scale-95">
                        {t('oui')}
                      </button>
                    </div>
                  </div>

                  {/* Contenu réduit (Icône corbeille) */}
                  <button onClick={() => setShowDeleteConfirm(true)} className={`absolute inset-0 w-full h-full flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-opacity duration-200 ${showDeleteConfirm ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-100'}`} title={t('supprimer-de-la-liste')}>
                    <Trash2 size={20} />
                  </button>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT RAPPELS (VUE CHRONOLOGIQUE)
// ============================================================================
const RemindersList: React.FC<{ items: LibraryItem[], onUpdate: (id: string, updates: Partial<LibraryItem>) => void, onSelect: (m: LibraryItem) => void }> = ({ items, onUpdate, onSelect }) => {
  const { t } = useTranslation();
  // Calcul de la prochaine date d'occurrence pour le tri
  const itemsWithDates = items.map(item => {
    const nextDate = getNextOccurrence(item.reminder_day, item.reminder_time);
    return { ...item, _nextDate: nextDate };
  }).filter(item => item._nextDate !== null) as (LibraryItem & { _nextDate: Date })[];

  itemsWithDates.sort((a, b) => a._nextDate.getTime() - b._nextDate.getTime());

  const handleCancelReminder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from('user_media').update({ reminder_day: null, reminder_time: null }).match({ id });
    onUpdate(id, { reminder_day: null, reminder_time: null });
  };

  if (itemsWithDates.length === 0) {
    return (
      <div className="text-center py-20 text-[var(--text-muted)] animate-in fade-in">
        <BellOff className="mx-auto mb-6 opacity-30" size={64} />
        <h2 className="text-xl font-black text-[var(--text-main)] mb-2">{t('aucun-rappel-actif')}</h2>
        <p className="text-sm font-medium max-w-md mx-auto">{t('vous-pouvez-configurer-des-alertes-push-sur-chaque-oeuvre-pour-etre-notifie-de-la-sortie-des-nouveaux-episodes-ou-chapitres')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {itemsWithDates.map(item => {
        const isToday = item._nextDate.toDateString() === new Date().toDateString();
        const dateFormatted = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(item._nextDate);
        const timeFormatted = item.reminder_time || '00:00';

        return (
          <div key={item.id} onClick={() => onSelect(item)} className="group cursor-pointer bg-[var(--panel-bg)] border border-[var(--border-color)] hover:border-amber-500/50 rounded-2xl p-4 flex items-center gap-4 transition-all shadow-sm hover:shadow-md">

            <div className="w-16 sm:w-20 aspect-[2/3] shrink-0 relative bg-[var(--bg-base)] rounded-lg overflow-hidden border border-[var(--border-color)] shadow-sm">
              {item.cover_url ? <img src={String(item.cover_url)} className="w-full h-full object-cover" /> : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={24} />}
            </div>

            <div className="flex flex-col min-w-0 flex-grow justify-center">
              <TypeBadge type={String(item.type)} />
              <h3 className="font-bold text-[var(--text-main)] text-sm sm:text-base line-clamp-1 mt-1.5">{String(item.title)}</h3>
              <p className="text-xs text-[var(--text-muted)] font-medium mt-1 truncate max-w-[200px]">{String(item.description) || t('appuyez-pour-voir-les-details')}</p>
            </div>

            <div className="flex flex-col items-end shrink-0 pl-4 border-l border-[var(--border-color)]">
               <div className={`text-2xl sm:text-3xl font-black tracking-tighter leading-none ${isToday ? 'text-amber-500' : 'text-[var(--text-main)]'}`}>
                 {timeFormatted}
               </div>
               <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1 ${isToday ? 'text-amber-600' : 'text-[var(--text-muted)]'}`}>
                 {isToday ? t('aujourdhui') : dateFormatted}
               </div>
               <button onClick={(e) => handleCancelReminder(e, item.id)} className="mt-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1">
                 <X size={12}/> {t('annuler')}
               </button>
            </div>

          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// COMPOSANT CLASSEMENT (MIS À JOUR : FILTRE PAR FORMAT ET PAR TAGS)
// ============================================================================
const RankingScreen: React.FC<{ 
  items: LibraryItem[], 
  onUpdate: (id: string, updates: Partial<LibraryItem>) => void, 
  onSelect: (m: LibraryItem) => void,
  allUserTags: string[],
  rankingTagFilter: string,
  setRankingTagFilter: (tag: string) => void
}> = ({ items, onUpdate, onSelect, allUserTags, rankingTagFilter, setRankingTagFilter }) => {
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState<string>('all'); // Changé à 'all' par défaut pour voir tout le classement d'un tag
  const [isSwapping, setIsSwapping] = useState(false);

  const rankedItems = useMemo(() => {
    return items
      .filter(item => {
        const ratingMatch = item.rating !== null;
        const typeMatch = filterType === 'all' || item.type === filterType;
        const tagMatch = rankingTagFilter === 'all' || (item.tags && item.tags.includes(rankingTagFilter));
        return ratingMatch && typeMatch && tagMatch;
      })
      .sort((a, b) => (a.rating || 0) - (b.rating || 0));
  }, [items, filterType, rankingTagFilter]);

  const handleMove = async (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (isSwapping) return;

    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === rankedItems.length - 1) return;

    setIsSwapping(true);

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const currentItem = rankedItems[index];
    const targetItem = rankedItems[targetIndex];

    const newCurrentRating = targetItem.rating;
    const newTargetRating = currentItem.rating;

    onUpdate(currentItem.id, { rating: newCurrentRating });
    onUpdate(targetItem.id, { rating: newTargetRating });

    await Promise.all([
      supabase.from('user_media').update({ rating: newCurrentRating }).match({ id: currentItem.id }),
      supabase.from('user_media').update({ rating: newTargetRating }).match({ id: targetItem.id })
    ]);

    setIsSwapping(false);
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-yellow-500';
    if (index === 1) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-900 border-gray-400';
    if (index === 2) return 'bg-gradient-to-br from-amber-700 to-amber-900 text-white border-amber-800';
    return 'bg-[var(--panel-bg-alt)] border-[var(--border-color)] text-[var(--text-main)]';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="sticky top-0 sm:top-24 z-10 bg-[var(--bg-base)]/90 backdrop-blur-xl pb-4 pt-4 border-b border-[var(--border-color)] -mx-4 px-4 sm:mx-0 sm:px-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
            <Trophy className="text-amber-500" /> {t('nav_ranking')}
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">{t('organisez-vos-oeuvres-preferees')}</p>
        </div>
        
        {/* FILTRES DE CLASSEMENT JOINTIFS */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Sélection du Format */}
          <div className="w-full sm:w-44">
             <CustomSelect 
               value={filterType} 
               onChange={setFilterType} 
               options={FORMAT_OPTIONS.map(o => ({...o, label: o.labelKey ? t(o.labelKey) : o.label}))} 
               className="bg-[var(--panel-bg)] border border-[var(--border-color)] shadow-sm" 
             />
          </div>
          
          {/* Sélection du Tag (Nouveau) */}
          {allUserTags.length > 0 && (
            <div className="w-full sm:w-44">
              <CustomSelect 
                value={rankingTagFilter} 
                onChange={setRankingTagFilter} 
                options={[{ value: 'all', label: t('tous-les-tags') }, ...allUserTags.map(t => ({ value: t, label: t }))]} 
                className="bg-[var(--panel-bg)] border border-[var(--border-color)] shadow-sm" 
              />
            </div>
          )}
        </div>
      </div>

      {rankedItems.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-muted)] animate-in fade-in">
          <Trophy className="mx-auto mb-6 opacity-30" size={64} />
          <h2 className="text-xl font-black text-[var(--text-main)] mb-2">Aucun classement trouvé</h2>
          <p className="text-sm font-medium max-w-md mx-auto">
            Ajustez vos filtres ou ajoutez des œuvres avec le tag sélectionné à votre classement depuis les fiches de détails.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rankedItems.map((item, index) => {
            const rankStyle = getRankStyle(index);
            const rankNumber = String(index + 1).padStart(2, '0');

            return (
              <div key={item.id} onClick={() => onSelect(item)} className={`group cursor-pointer rounded-2xl overflow-hidden border hover:shadow-lg transition-all flex items-stretch h-28 sm:h-32 ${rankStyle} ${index > 2 ? 'hover:border-[var(--primary)]' : ''}`}>
                <div className="w-20 sm:w-28 shrink-0 flex items-center justify-center border-r border-black/10">
                  <span className="text-4xl sm:text-5xl font-black tracking-tighter opacity-90">{rankNumber}</span>
                </div>

                <div className="flex-1 flex items-center gap-4 bg-[var(--panel-bg)] text-[var(--text-main)]">
                  <div className="h-full aspect-[2/3] shrink-0 bg-[var(--bg-base)] border-r border-[var(--border-color)]">
                    {item.cover_url ? <img src={String(item.cover_url)} className="w-full h-full object-cover" /> : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={24} />}
                  </div>
                  <div className="flex-1 min-w-0 pr-4 py-2 flex flex-col justify-center">
                    <div className="flex flex-wrap gap-1 items-center">
                      <TypeBadge type={String(item.type)} />
                      {item.tags && item.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded font-bold">{tag}</span>
                      ))}
                    </div>
                    <h3 className="font-bold text-sm sm:text-base line-clamp-1 mt-1">{String(item.title)}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">{String(item.year || 'N/A')}</p>
                  </div>
                </div>

                <div className="w-16 sm:w-20 shrink-0 bg-[var(--panel-bg-alt)] border-l border-[var(--border-color)] flex flex-col items-center justify-center p-2 gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleMove(e, index, 'up')}
                    disabled={index === 0 || isSwapping}
                    className="w-full flex-1 flex items-center justify-center bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-emerald-500 hover:text-emerald-500 text-[var(--text-muted)] disabled:opacity-30 disabled:hover:border-[var(--border-color)] disabled:hover:text-[var(--text-muted)] rounded-lg transition-colors"
                  >
                    <ChevronUp strokeWidth={3} />
                  </button>
                  <button
                    onClick={(e) => handleMove(e, index, 'down')}
                    disabled={index === rankedItems.length - 1 || isSwapping}
                    className="w-full flex-1 flex items-center justify-center bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-red-500 hover:text-red-500 text-[var(--text-muted)] disabled:opacity-30 disabled:hover:border-[var(--border-color)] disabled:hover:text-[var(--text-muted)] rounded-lg transition-colors"
                  >
                    <ChevronDown strokeWidth={3} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPOSANT EXPLORER (SEARCH)
// ============================================================================
const DiscoverySearch: React.FC<{
  user: UserData, fetchLibrary: () => void, userLibrary: LibraryItem[], setSelectedMedia: (m: MediaItem | LibraryItem) => void, onToggleFavorite: (id: string, currentFav: boolean) => void
}> = ({ user, fetchLibrary, userLibrary, setSelectedMedia, onToggleFavorite }) => {
  const { lang } = useContext(LangContext);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 400);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [localShowNSFW, setLocalShowNSFW] = useState<boolean>(false);

  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [upcoming, setUpcoming] = useState<MediaItem[]>([]);
  const [community, setCommunity] = useState<LibraryItem[]>([]);
  const [loadingFeeds, setLoadingFeeds] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    if (debouncedQuery) return;
    const loadFeeds = async () => {
      setLoadingFeeds(true);
      try {
        const tmdbs = await fetchTrendingTMDB(lang); setTrending(tmdbs);
        const upcs = await fetchAniList('', true); setUpcoming(upcs);
        const { data, error } = await supabase.from('user_media').select('*').order('created_at', { ascending: false }).limit(15);
        if (error) console.error(error);
        if (data) {
          const unique = data.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => (t.media_id === v.media_id)) === i);
          setCommunity(unique);
        }
      } catch (e) {}
      finally { setLoadingFeeds(false); }
    };
    loadFeeds();
  }, [debouncedQuery, lang]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    const localQ = debouncedQuery.toLowerCase();
    const localResults = userLibrary.filter(item => {
      if (filter !== 'all' && item.type !== filter) return false;
      return item.title.toLowerCase().includes(localQ) || item.description?.toLowerCase().includes(localQ);
    }).map(item => ({
      id: item.media_id, source: item.source as any, title: item.title, cover: item.cover_url,
      type: item.type as any, year: item.year || 'N/A', description: item.description || '',
      totalEpisodes: item.total_episodes, isAiring: item.isAiring, isAdult: item.isAdult
    }));

    setResults(localResults);

    const pushResults = (newItems: MediaItem[]) => {
      if (isCancelled || !newItems || newItems.length === 0) return;
      setResults(prev => {
        const map = new Map();
        const validNewItems = newItems.filter(i => filter === 'all' || i.type === filter);
        [...prev, ...validNewItems].forEach(item => map.set(`${item.source}-${item.id}`, item));
        return Array.from(map.values()).sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
      });
    };

    const promises = [];

    if (filter === 'all' || filter === 'movie' || filter === 'tv') {
      promises.push(fetchTMDB(debouncedQuery, lang).then(pushResults).catch(() => {}));
    }
    if (filter === 'all' || filter === 'anime') {
      promises.push(fetchAniList(debouncedQuery).then(pushResults).catch(() => {}));
    }
    if (filter === 'all' || filter === 'manga' || filter === 'webtoon') {
      promises.push(fetchShikimori(debouncedQuery).then(pushResults).catch(() => {}));
    }
    if (filter === 'all' || filter === 'book') {
      promises.push(fetchOpenLibrary(debouncedQuery).then(pushResults).catch(() => {}));
    }

    Promise.allSettled(promises).finally(() => {
      if (!isCancelled) setLoading(false);
    });

    return () => { isCancelled = true; };
  }, [debouncedQuery, filter, userLibrary, lang]);

  const renderCarousel = (title: string, items: (MediaItem | LibraryItem)[]) => {
    if (items.length === 0) return null;
    
    // On génère un ID unique pour chaque carrousel afin que le clic sache lequel scroller
    const carouselId = `carousel-${title.replace(/[^a-zA-Z0-9]/g, '-')}`;

    return (
      <div className="mb-10">
        <h2 className="text-xl font-black text-[var(--text-main)] mb-5 flex items-center gap-2">{String(title)} <ChevronRight size={20} className="text-[var(--primary)]"/></h2>
        
        {/* Wrapper en "relative group" pour détecter le survol */}
        <div className="relative group">
          
          {/* FADE & FLÈCHE GAUCHE */}
          <div className="absolute left-0 top-0 bottom-6 w-24 sm:w-32 bg-gradient-to-r from-[var(--bg-base)] to-transparent z-20 flex items-center justify-start px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:flex">
            <button 
              onClick={() => { const c = document.getElementById(carouselId); if(c) c.scrollBy({ left: -c.clientWidth * 0.8, behavior: 'smooth' }); }} 
              className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-[var(--panel-bg)]/80 hover:bg-[var(--primary)] text-[var(--text-main)] hover:text-white rounded-full backdrop-blur-md border border-[var(--border-color)] shadow-lg transition-all transform -translate-x-2 group-hover:translate-x-0"
            >
              <ChevronLeft size={24} />
            </button>
          </div>

          {/* CONTENEUR DÉFILABLE EXISTANT */}
          <div id={carouselId} className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar snap-x snap-mandatory scroll-smooth">
            {items.map(media => {
              const cover = 'cover' in media ? media.cover : media.cover_url;
              const isExplicit = ('isAdult' in media && media.isAdult) || media.source === 'shikimori';
              const needsBlur = !localShowNSFW && isExplicit;
              const tracked = userLibrary.find(item => item.media_id === media.id && item.source === media.source);

              return (
                <div key={`${media.source}-${media.id}`} onClick={() => setSelectedMedia(media)} className="snap-start shrink-0 w-36 sm:w-44 group/card cursor-pointer flex flex-col bg-[var(--panel-bg)] rounded-2xl overflow-hidden border border-[var(--border-color)] hover:border-[var(--primary)] transition-all shadow-lg">
                  <div className="aspect-[2/3] w-full bg-[var(--bg-base)] relative overflow-hidden">
                    {cover ? (
                      <FadeInImage src={String(cover)} className={`absolute inset-0 w-full h-full object-cover ${needsBlur ? 'blur-2xl scale-125 opacity-40' : 'group-hover/card:scale-105'}`} />
                    ) : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={40} />}
                    <div className="absolute top-2 left-2"><TypeBadge type={String(media.type)} /></div>

                    {tracked && (
                      <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(tracked.id, !!tracked.is_favorite); }} className="absolute top-2 right-2 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all border border-white/10">
                        <Heart size={16} className={tracked.is_favorite ? "fill-rose-500 text-rose-500" : "text-white"} />
                      </button>
                    )}

                    {media.isAiring && <span className="absolute bottom-2 left-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{t('en-prod')}</span>}
                    {needsBlur && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-[var(--panel-bg)]/80 backdrop-blur-md p-3 rounded-full border border-[var(--border-color)]"><EyeOff size={24} className="text-[var(--text-main)]" /></div>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5">
                    <h3 className="font-bold text-[var(--text-main)] text-sm line-clamp-1">{String(media.title)}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-1">{String(media.year)}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* FADE & FLÈCHE DROITE */}
          <div className="absolute right-0 top-0 bottom-6 w-24 sm:w-32 bg-gradient-to-l from-[var(--bg-base)] to-transparent z-20 flex items-center justify-end px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden sm:flex">
            <button 
              onClick={() => { const c = document.getElementById(carouselId); if(c) c.scrollBy({ left: c.clientWidth * 0.8, behavior: 'smooth' }); }} 
              className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-[var(--panel-bg)]/80 hover:bg-[var(--primary)] text-[var(--text-main)] hover:text-white rounded-full backdrop-blur-md border border-[var(--border-color)] shadow-lg transition-all transform translate-x-2 group-hover:translate-x-0"
            >
              <ChevronRight size={24} />
            </button>
          </div>

        </div>
      </div>
    );
  };

  const filteredResults = results.filter(item => filter === 'all' || item.type === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="sticky top-0 sm:top-24 z-10 bg-[var(--bg-base)]/90 backdrop-blur-xl pb-4 pt-4 flex flex-col sm:flex-row gap-3 border-b border-[var(--border-color)] -mx-4 px-4 sm:mx-0 sm:px-0 sm:top-2">
        <div className="flex-grow">
          <Input icon={Search} placeholder="Films, Animes, Webcomic..." value={String(query)} onChange={e => setQuery(e.target.value)} autoFocus />
        </div>

        <div className="flex gap-3">
          <div className="shrink-0 flex-1 sm:w-48">
             <CustomSelect
                value={String(filter)}
                onChange={setFilter}
                options={FORMAT_OPTIONS.map(o => ({...o, label: o.labelKey ? t(o.labelKey) : o.label}))}
                className="bg-[var(--panel-bg)] border border-[var(--border-color)] hover:border-[var(--primary)]"
              />
          </div>

          <div
            onClick={() => setLocalShowNSFW(!localShowNSFW)}
            className="flex items-center justify-center gap-3 shrink-0 bg-[var(--panel-bg)] border border-[var(--border-color)] px-4 rounded-xl cursor-pointer hover:bg-[var(--bg-base)] transition-colors"
            title={t('afficher-le-contenu-pour-adultes')}
          >
            <EyeOff size={20} className={localShowNSFW ? "text-rose-500" : "text-[var(--text-muted)]"} />
            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${localShowNSFW ? 'bg-rose-500' : 'bg-[var(--text-muted)]'}`}>
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${localShowNSFW ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* 1. SKELETON POUR LA RECHERCHE ACTIVE (Grille) */}
      {/* Affiché uniquement si on charge et qu'on a pas encore de résultats locaux pour éviter les sauts d'image */}
      {debouncedQuery && loading && filteredResults.length === 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-breathe flex flex-col bg-[var(--panel-bg)] rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-lg">
              <div className="aspect-[2/3] w-full bg-[var(--border-color)]/30"></div>
              <div className="p-3.5 flex flex-col gap-3">
                <div className="h-4 bg-[var(--border-color)]/30 rounded w-3/4"></div>
                <div className="h-3 bg-[var(--border-color)]/30 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. SKELETON POUR L'ACCUEIL (Carrousels) */}
      {!debouncedQuery && loadingFeeds && (
        <div className="animate-in fade-in pt-4 space-y-10 overflow-hidden">
          {[1, 2, 3].map((carousel) => (
            <div key={carousel}>
              <div className="h-6 bg-[var(--border-color)]/30 rounded w-48 mb-5 animate-breathe"></div>
              <div className="flex gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="shrink-0 w-36 sm:w-44 animate-breathe flex flex-col bg-[var(--panel-bg)] rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-lg">
                    <div className="aspect-[2/3] w-full bg-[var(--border-color)]/30"></div>
                    <div className="p-3.5 flex flex-col gap-3">
                      <div className="h-4 bg-[var(--border-color)]/30 rounded w-3/4"></div>
                      <div className="h-3 bg-[var(--border-color)]/30 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!debouncedQuery && !loadingFeeds && (
        <div className="animate-in fade-in pt-4">
          {renderCarousel(t('tendances-actuelles'), trending)}
          {renderCarousel(t('prochaines-sorties'), upcoming)}
          {community.length > 0 && renderCarousel(t('decouvertes-communautaires'), community)}
          <ManualAddForm user={user} fetchLibrary={fetchLibrary} userLibrary={userLibrary} />
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
                    <FadeInImage src={String(media.cover)} className={`absolute inset-0 w-full h-full object-cover ${needsBlur ? 'blur-2xl scale-125 opacity-40' : 'group-hover:scale-105'}`} />
                  ) : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={40} />}
                  <div className="absolute top-2 left-2"><TypeBadge type={String(media.type)} /></div>

                  {tracked && (
                    <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(tracked.id, !!tracked.is_favorite); }} className="absolute top-2 right-2 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all border border-white/10">
                      <Heart size={16} className={tracked.is_favorite ? "fill-rose-500 text-rose-500" : "text-white"} />
                    </button>
                  )}

                  {media.isAiring && <span className="absolute bottom-2 left-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{t('en-prod')}</span>}
                  {needsBlur && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-[var(--panel-bg)]/80 backdrop-blur-md p-3 rounded-full border border-[var(--border-color)]"><EyeOff size={24} className="text-[var(--text-main)]" /></div>
                    </div>
                  )}
                </div>
                <div className="p-3.5 flex flex-col flex-grow justify-between">
                  <div>
                    <h3 className="font-bold text-[var(--text-main)] text-sm line-clamp-1">{String(media.title)}</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium mt-1">{String(media.year)}</p>
                  </div>
                  {tracked && (
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold bg-[var(--primary)]/10 text-[var(--primary)] py-2 rounded-lg border border-[var(--primary)]/20">
                      <Check size={14} strokeWidth={3}/> {t('suivi')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {debouncedQuery && filteredResults.length === 0 && !loading && (
        <div className="text-center py-10 text-[var(--text-muted)] flex flex-col items-center">
          <BookOpen className="mb-6 opacity-30" size={64} />
          <p className="text-lg font-medium mb-4">{t('aucun-resultat-pour')} "{debouncedQuery}"</p>
          <div className="w-full">
            <ManualAddForm user={user} fetchLibrary={fetchLibrary} userLibrary={userLibrary} />
          </div>
        </div>
      )}

      {/* AFFICHAGE DES CRÉDITS API */}
      <div className="text-center opacity-50 py-10 pointer-events-none select-none flex flex-col items-center gap-2">
         <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Data provided by</p>
         <div className="flex justify-center gap-6 items-center text-[var(--text-muted)] font-bold text-xs">
           <img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB" className="h-3 opacity-60" />
           <span>AniList</span>
           <span>Shikimori</span>
           <span>OpenLibrary</span>
         </div>
      </div>

    </div>
  );
};

// ============================================================================
// COMPOSANT LECTEUR PERSISTANT
// ============================================================================
const PersistentPlayer: React.FC<{ item: LibraryItem | null, onUpdate: (item: LibraryItem, i: number) => void }> = ({ item, onUpdate }) => {
  const { t } = useTranslation();
  if (!item) return null;
  const progressPercent = item.total_episodes ? Math.min(100, (item.progress / item.total_episodes) * 100) : 0;
  return (
    <div className="fixed bottom-24 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-[var(--panel-bg)]/95 backdrop-blur-xl border border-[var(--border-color)] shadow-2xl shadow-[var(--shadow-color)] rounded-2xl overflow-hidden flex items-center p-3 gap-4 relative">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: `linear-gradient(90deg, var(--primary) ${progressPercent}%, transparent ${progressPercent}%)`}} />
        <div className="w-12 h-16 shrink-0 rounded-lg overflow-hidden bg-[var(--bg-base)] shadow-md z-10 border border-[var(--border-color)]">{item.cover_url ? <img src={String(item.cover_url)} className="w-full h-full object-cover" /> : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={20} />}</div>
        <div className="flex-1 min-w-0 z-10"><p className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1"><PlayCircle size={10} /> {t('reprendre')}</p><h4 className="font-bold text-[var(--text-main)] text-sm line-clamp-1 truncate">{String(item.title)}</h4><div className="flex items-center gap-2 mt-1.5"><span className="text-xs font-mono font-bold text-[var(--text-muted)]">{item.progress} / {item.total_episodes || '?'}</span><div className="flex-1 h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border-color)]"><div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${progressPercent}%` }} /></div></div></div>
        <div className="flex items-center gap-1.5 shrink-0 z-10"><button onClick={() => onUpdate(item, -1)} disabled={item.progress <= 0} className="w-10 h-10 flex items-center justify-center bg-[var(--bg-base)] hover:bg-[var(--border-color)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl disabled:opacity-50 transition-colors"><Minus size={18} strokeWidth={3}/></button><button onClick={() => onUpdate(item, 1)} disabled={item.total_episodes !== null && item.progress >= item.total_episodes} className="w-12 h-12 flex items-center justify-center bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl shadow-lg shadow-[var(--shadow-color)] disabled:opacity-50 transition-transform active:scale-95"><Plus size={24} strokeWidth={3}/></button></div>
      </div>
    </div>
  );
};
// ============================================================================
// COMPOSANT AKASHA WRAPPED (RÉÉCRITURE COMPLÈTE : GEN Z, OPTIMISÉ, ROAST)
// ============================================================================
const AkashaWrapped: React.FC<{ library: LibraryItem[]; year: number; onClose: () => void }> = ({ library, year, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useTranslation();

  // --- 1. MOTEUR D'ANALYSE DES DONNÉES FILTRÉ PAR ANNÉE ---
  const insights = useMemo(() => {
    let totalMinutes = 0;
    let videoEpisodes = 0;
    let readChapters = 0;
    let favCount = 0;
    let maxTimeSpent = 0;
    let obsessionItem: LibraryItem | null = null;
    
    const genreCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = { movie: 0, tv: 0, anime: 0, manga: 0, webtoon: 0, book: 0 };
    const creatorCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const rankings: LibraryItem[] = [];

    // On ne garde STRICTEMENT que les éléments modifiés ou créés cette année-là
    const yearItems = library.filter(item => {
      const dateStr = item.updated_at || item.created_at;
      return new Date(dateStr).getFullYear() === year;
    });

    yearItems.forEach((item) => {
      if (item.is_favorite) favCount++;
      if (item.rating) rankings.push(item);
      
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
      if (item.creator) creatorCounts[item.creator] = (creatorCounts[item.creator] || 0) + 1;
      if (item.prod_status) statusCounts[item.prod_status] = (statusCounts[item.prod_status] || 0) + 1;

      if (item.genres && Array.isArray(item.genres)) {
        item.genres.forEach((g) => { genreCounts[g] = (genreCounts[g] || 0) + 1; });
      }

      // Calcul du vrai progrès avec le Rewatch
      const rewatches = item.rewatch_count || 0;
      const totalEps = item.total_episodes || item.progress || 0;
      const trueProgress = (item.progress || 0) + (rewatches * totalEps);

      // Séparation rigoureuse Vidéo / Lecture
      const isRead = ['manga', 'webtoon', 'book'].includes(item.type);
      if (isRead) readChapters += trueProgress;
      else videoEpisodes += trueProgress;

      // Calcul précis du temps selon le format
      let unitTime = 20; 
      if (item.type === 'movie') unitTime = item.runtime || 100;
      else if (item.type === 'tv') unitTime = item.runtime || 45;
      else if (item.type === 'anime') unitTime = item.runtime || 24;
      else if (item.type === 'manga') unitTime = 10; 
      else if (item.type === 'webtoon') unitTime = 10; 
      else if (item.type === 'book') unitTime = 5; 

      const timeSpent = trueProgress * unitTime;
      totalMinutes += timeSpent;

      if (timeSpent > maxTimeSpent && item.progress > 0) {
        maxTimeSpent = timeSpent;
        obsessionItem = item;
      }
    });

    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
    const topCreator = Object.entries(creatorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Inconnu';
    const favoriteType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'anime';
    const isOngoingLover = (statusCounts['releasing'] || 0) > (statusCounts['completed'] || 0) || (statusCounts['ongoing'] || 0) > (statusCounts['finished'] || 0);
    
    const top3 = rankings.sort((a, b) => (a.rating || 999) - (b.rating || 999)).slice(0, 3);

    // Détermination du Persona Culturel (Direct, sans fioritures, intégrant ton contexte subtilement)
    let persona = t('lelectron-libre');
    let personaDesc = t('impossible-de-cerner-ton-algo-tu-navigues-a-vue-doeil-entre-tous-les-formats');

    if (favoriteType === 'anime' || favoriteType === 'manga' || favoriteType === 'webtoon') {
      persona = t('lotaku-originel');
      personaDesc = t('lesthetique-asiatique-est-validee-mais-entre-deux-dramas-ou-webtoons-noublie-pas-de-preparer-ton-sac-pour-ton-voyage-au-japon');
    } else if (favoriteType === 'movie' || favoriteType === 'tv') {
      persona = "Main Character Syndrome 🎬";
      personaDesc = t('tu-consommes-tellement-dinterfaces-et-de-plans-de-camera-que-tu-devrais-serieusement-penser-a-avancer-sur-ton-propre-portfolio-figma-au-lieu-de-binger');
    } else if (favoriteType === 'book') {
      persona = t('erudit-sombre');
      personaDesc = t('le-papier-te-comprend-mieux-que-les-humains-une-vraie-vibe-de-softboy-reclus');
    }

    return {
      hoursSpent: Math.round(totalMinutes / 60),
      equivalentDays: (totalMinutes / (60 * 24)).toFixed(1),
      videoEpisodes,
      readChapters,
      topGenres,
      favCount,
      topCreator,
      top3,
      isOngoingLover,
      obsession: obsessionItem ? { title: (obsessionItem as LibraryItem).title, cover: (obsessionItem as LibraryItem).cover_url, hours: Math.round(maxTimeSpent / 60) } : null,
      persona,
      personaDesc
    };
  }, [library, year]);

  const handleShare = async (slideTitle: string) => {
    const text = `{t('mon-akasha-wrapped')} ${year} - ${slideTitle} 🚀\n{t('jai-passe')} ${insights.hoursSpent}h {t('sur-mes-oeuvres-cette-annee')}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Akasha Wrapped ${year}`, text }); } catch (e) {}
    } else {
      fallbackCopyTextToClipboard(text);
      alert(t('texte-copie-pour-flex-sur-tes-reseaux'));
    }
  };

  // --- 2. CONFIGURATION DES ÉCRANS (STORIES GEN Z) ---
  const steps = [
    {
      bg: "from-indigo-950 via-purple-900 to-black",
      title: "Lancement",
      render: () => (
        <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-700">
          <div className="inline-flex p-4 bg-white/10 rounded-3xl backdrop-blur-md mb-2 border border-white/20 animate-bounce shadow-[0_0_40px_rgba(168,85,247,0.5)]">
            <Flame size={48} className="text-rose-500 fill-rose-500" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-purple-400 to-blue-400 uppercase leading-none">
            Akasha<br />Wrapped {year}
          </h2>
          <p className="text-base font-bold text-indigo-200 max-w-xs mx-auto">
            {t('chargement-de-ton-aura-on-va-voir-si-tas-ete-productif-ou-si-tas-juste-procrastine-toute-lannee-0')}
          </p>
        </div>
      )
    },
    {
      bg: "from-rose-950 via-neutral-950 to-black",
      title: "Screen Time",
      render: () => (
        <div className="text-center space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <p className="text-xs font-black uppercase tracking-widest text-rose-400">{t('la-realite-fait-mal')}</p>
          <h3 className="text-3xl font-black text-white">{t('temps-de-cerveau-vole')}</h3>
          <div className="text-7xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-rose-500 font-mono tracking-tighter leading-none drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]">
            {insights.hoursSpent}h
          </div>
          <p className="text-sm font-bold text-rose-200 max-w-xs mx-auto leading-relaxed border border-rose-500/20 bg-rose-500/10 p-4 rounded-2xl">
            {t('cest-lequivalent-de')} <span className="text-white underline decoration-rose-500 decoration-2">{insights.equivalentDays} {t('jours')}</span> non-stop. 
          </p>
        </div>
      )
    },
    {
      bg: "from-blue-950 via-slate-900 to-black",
      title: "Régime",
      render: () => (
        <div className="text-center space-y-8 animate-in zoom-in-95 duration-500 w-full max-w-sm">
          <p className="text-xs font-black uppercase tracking-widest text-blue-400">{t('ton-regime-alimentaire')}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-3xl flex flex-col items-center justify-center">
              <Tv size={32} className="text-blue-400 mb-3" />
              <span className="text-4xl font-black text-white mb-1">{insights.videoEpisodes}</span>
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider text-center">{t('episodes-films-saignes')}</span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-3xl flex flex-col items-center justify-center">
              <BookOpen size={32} className="text-emerald-400 mb-3" />
              <span className="text-4xl font-black text-white mb-1">{insights.readChapters}</span>
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider text-center">{t('chapitres-livres-finis')}</span>
            </div>
          </div>
          <p className="text-sm font-medium text-slate-400 italic">{t('ton-ophtalmo-est-en-pls')}</p>
        </div>
      )
    },
    {
      bg: "from-amber-950 via-neutral-950 to-black",
      title: "Obsession",
      render: () => (
        <div className="text-center space-y-6 w-full max-w-sm animate-in scale-in duration-500">
          <p className="text-xs font-black uppercase tracking-widest text-amber-500">{t('ton-red-flag-de-lannee')}</p>
          <h3 className="text-2xl sm:text-3xl font-black text-white">{t('ce-qui-a-detruit-ton-sommeil')}</h3>
          {insights.obsession ? (
            <div className="mt-4 bg-gradient-to-t from-black to-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-sm flex flex-col items-center gap-4 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              <div className="w-32 aspect-[2/3] rounded-xl overflow-hidden border border-white/20 shrink-0 bg-neutral-800 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
                {insights.obsession.cover ? (
                  <img src={insights.obsession.cover} className="w-full h-full object-cover" alt="" />
                ) : <BookOpen className="text-neutral-500 m-auto h-full" size={24} />}
              </div>
              <div className="min-w-0 w-full">
                <h4 className="font-black text-white text-lg sm:text-xl truncate px-2">{insights.obsession.title}</h4>
                <div className="mt-3 inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 font-bold px-4 py-2 rounded-full text-sm border border-amber-500/30">
                  <Clock size={16}/> ~{insights.obsession.hours} {t('heures-dessus')}
                </div>
              </div>
            </div>
          ) : (
             <p className="text-sm text-neutral-400 italic">{t('aucune-obsession-detectee-tas-touche-de-lherbe-cette-annee')}</p>
          )}
        </div>
      )
    },
    {
      bg: "from-teal-950 via-slate-900 to-black",
      title: "Top 3 & Favs",
      render: () => (
        <div className="text-center space-y-6 w-full max-w-sm animate-in fade-in duration-500">
          <p className="text-xs font-black uppercase tracking-widest text-teal-400">Hall of Fame</p>
          <div className="flex items-center justify-center gap-2 text-rose-500 font-black text-xl mb-4 bg-rose-500/10 w-fit mx-auto px-4 py-2 rounded-xl border border-rose-500/20">
            <Heart className="fill-rose-500" /> {insights.favCount} {t('coups-de-coeur')}
          </div>
          
          <div className="space-y-3 text-left bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
            <h4 className="font-black text-white mb-4 text-center">{t('ton-top-3-absolu')}</h4>
            {insights.top3.length > 0 ? insights.top3.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5">
                <span className={`text-xl font-black ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : 'text-amber-700'}`}>#{idx+1}</span>
                <div className="w-10 aspect-[2/3] bg-neutral-800 rounded overflow-hidden shrink-0">
                  {item.cover_url ? <img src={item.cover_url} className="w-full h-full object-cover"/> : null}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.title}</p>
                  <p className="text-[10px] text-teal-300 uppercase tracking-widest">{item.type}</p>
                </div>
              </div>
            )) : <p className="text-sm text-center text-neutral-400">{t('aucun-classement-fait-cette-annee')}</p>}
          </div>
        </div>
      )
    },
    {
      bg: "from-orange-950 via-neutral-950 to-black",
      title: "Habitudes",
      render: () => (
        <div className="text-center space-y-6 animate-in slide-in-from-right-8 duration-500 max-w-sm w-full">
          <p className="text-xs font-black uppercase tracking-widest text-orange-400">{t('tes-habitudes')}</p>
          <div className="grid gap-4">
            <div className="bg-gradient-to-br from-white/10 to-transparent border border-white/10 p-6 rounded-3xl backdrop-blur-md text-left">
              <p className="text-[10px] uppercase font-bold text-orange-300 mb-1">{t('methode-de-consommation')}</p>
              <h4 className="text-xl font-black text-white">{insights.isOngoingLover ? t('masochiste-de-lattente') : t('binge-watcher-patient')}</h4>
              <p className="text-xs text-slate-400 mt-2">
                {insights.isOngoingLover 
                  ? t('tu-aimes-souffrir-a-attendre-chaque-nouvel-episode-chapitre-semaine-par-semaine') 
                  : t('tu-attends-que-loeuvre-soit-finie-pour-tout-avaler-dun-coup-smart')}
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      bg: "from-fuchsia-950 via-purple-950 to-black",
      title: "Persona",
      render: () => (
        <div className="text-center space-y-6 max-w-xs mx-auto animate-in scale-in duration-600">
          <p className="text-xs font-black uppercase tracking-widest text-fuchsia-400">{t('ton-aura-finale')}</p>
          <div className="w-24 h-24 bg-gradient-to-tr from-fuchsia-500 to-purple-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(217,70,239,0.4)] border-4 border-white/20">
            <User size={40} className="text-white" />
          </div>
          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-white leading-tight">
            {insights.persona}
          </h3>
          <p className="text-sm text-fuchsia-200 font-medium leading-relaxed bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-sm shadow-xl">
            "{insights.personaDesc}"
          </p>
          <div className="pt-6">
            <Button variant="secondary" onClick={onClose} className="w-full bg-white text-purple-950 font-black hover:bg-neutral-200 border-0 shadow-[0_10px_20px_rgba(0,0,0,0.5)] !py-4 rounded-2xl text-lg">
              {t('terminer-le-flex')}
            </Button>
          </div>
        </div>
      )
    }
  ];

  const next = () => currentStep < steps.length - 1 ? setCurrentStep(currentStep + 1) : onClose();
  const prev = () => currentStep > 0 && setCurrentStep(currentStep - 1);

  return (
    <div className={`fixed inset-0 z-50 bg-gradient-to-b ${steps[currentStep].bg} flex flex-col justify-between p-6 select-none transition-colors duration-700`}>
      {/* BARRE DE PROGRESSION DU SCRIPT */}
      <div className="flex gap-1.5 w-full max-w-md mx-auto pt-2 z-40">
        {steps.map((_, idx) => (
          <div key={idx} className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div className={`h-full bg-white transition-all duration-300 ${idx <= currentStep ? 'w-full' : 'w-0'}`} />
          </div>
        ))}
      </div>

      {/* BOUTONS D'ACTION HAUT DE PAGE */}
      <div className="absolute top-10 inset-x-6 flex justify-between items-center z-40 max-w-md mx-auto">
        <button onClick={() => handleShare(steps[currentStep].title)} className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors border border-white/20">
          <Share size={14}/> {t('partager')}
        </button>
        <button onClick={onClose} className="bg-black/50 hover:bg-black/80 backdrop-blur-md text-white p-2 rounded-full transition-colors border border-white/10">
          <X size={20} strokeWidth={3} />
        </button>
      </div>

      {/* ZONE DE CONTENU CENTRAL */}
      <div className="flex-1 flex items-center justify-center px-4 z-10">
        {steps[currentStep].render()}
      </div>

      {/* NAVIGATION TACTILE / CLIC GAUCHE DROITE */}
      <div className="absolute inset-y-0 inset-x-0 flex z-20">
        <div className="w-1/3 h-full cursor-w-resize" onClick={prev} />
        <div className="w-2/3 h-full cursor-e-resize" onClick={next} />
      </div>

      {/* BAS DE PAGE DE CONTEXTE */}
      <div className="text-center pb-4 z-30 pointer-events-none">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold font-mono">
          {t('ecran')} {currentStep + 1} {t('sur')} {steps.length} {t('appuie-a-droite-pour-avancer')}
        </p>
        <p className="text-xs text-white/20 font-medium mt-1 flex items-center justify-center gap-1">
           {t('screen-pour-flex-sur-tes-reseaux')}
        </p>
      </div>
    </div>
  );
};
// ============================================================================
// COMPOSANT PROFIL (MODIFIÉ POUR INTÉGRER LES CARTES WRAPPED PAR ANNÉE)
// ============================================================================
const ProfileScreen: React.FC<{ user: UserData, library: LibraryItem[], onLogout: () => void, onDelete: () => void, theme: string, toggleTheme: () => void, onOpenRanking: () => void, fetchLibrary: () => void, onOpenWrapped: (year: number) => void }> = ({ user, library, onLogout, onDelete, theme, toggleTheme, onOpenRanking, fetchLibrary, onOpenWrapped }) => {
  const { t } = useTranslation();
  const { lang, setLang } = useContext(LangContext);
  const toggleLang = () => {
    const newLang = lang === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
    setLang(newLang);
  };
  // importations
  const [importSource, setImportSource] = useState<string>('');
  const [enrichmentProgress, setEnrichmentProgress] = useState({ active: false, current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const IMPORT_OPTIONS = [
    { value: '', label: 'Importer depuis...' },
    { value: 'letterboxd', label: 'Letterboxd (CSV)' },
    { value: 'tvtime', label: 'TV Time (CSV)' },
    { value: 'mal', label: 'MyAnimeList (XML)' },
    //{ value: 'mdl', label: 'MyDramaList (CSV)' },
    { value: 'anilist', label: 'AniList (JSON)' }
  ];

  // --- LOGIQUE DES CARTES WRAPPED ---
  const wrappedYears = useMemo(() => {
    const years = new Set<number>();
    library.forEach(item => {
      const dateStr = item.updated_at || item.created_at;
      if (dateStr) years.add(new Date(dateStr).getFullYear());
    });
    const sorted = Array.from(years).sort((a, b) => b - a);
    return sorted.length > 0 ? sorted : [new Date().getFullYear()];
  }, [library]);

  const gradientClasses = [
    "from-purple-600 via-rose-500 to-amber-500",
    "from-blue-600 via-teal-500 to-emerald-500",
    "from-fuchsia-600 via-pink-500 to-orange-500",
    "from-indigo-600 via-blue-500 to-cyan-500"
  ];

  const totalAdded = library.length;
  const totalCompleted = library.filter(i => i.status === 'completed').length;
  const getTrueProgress = (item: LibraryItem) => {
    const rewatches = item.rewatch_count || 0;
    const totalEps = item.total_episodes || item.progress || 0;
    return (item.progress || 0) + (rewatches * totalEps);
  };

  const totalEpisodesWatched = library.reduce((acc, item) => acc + getTrueProgress(item), 0);

  const watchableItems = library.filter(i => i.type === 'tv' || i.type === 'movie' || i.type === 'anime');
  const watchTimeMinutes = watchableItems.reduce((acc, item) => {
    let runtime = 24; // default anime
    if (item.runtime) runtime = item.runtime;
    else if (item.type === 'movie') runtime = 90;
    else if (item.type === 'tv') runtime = 50;
    return acc + (getTrueProgress(item) * runtime);
  }, 0);
  const watchTimeHours = (watchTimeMinutes / 60).toFixed(1);

  const completionRate = totalAdded > 0 ? Math.round((totalCompleted / totalAdded) * 100) : 0;
  const watchProgress = watchableItems.reduce((acc, item) => acc + getTrueProgress(item), 0);
  const readProgress = library.filter(i => ['manga', 'webtoon', 'book'].includes(i.type)).reduce((acc, item) => acc + getTrueProgress(item), 0);
  const totalInteractions = watchProgress + readProgress;
  const watchRatio = totalInteractions > 0 ? Math.round((watchProgress / totalInteractions) * 100) : 0;
  const readRatio = totalInteractions > 0 ? 100 - watchRatio : 0;

  const timezones = useMemo(() => {
    try {
      // @ts-ignore
      if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone').map((tz: string) => ({ value: tz, label: tz.replace(/_/g, ' ') }));
    } catch (e) {}
    return [{ value: 'Europe/Paris', label: 'Europe/Paris' }, { value: 'America/New_York', label: 'America/New York' }, { value: 'Asia/Tokyo', label: 'Asia/Tokyo' }, { value: 'UTC', label: 'UTC' }];
  }, []);
  const [userTz, setUserTz] = useState(user.user_metadata?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris');
  const handleTzChange = async (val: string) => { setUserTz(val); await supabase.auth.updateUser({ data: { timezone: val } }); };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [isPushLoading, setIsPushLoading] = useState(false);
  //const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) setIsStandalone(true);
    setIsIOS(/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()));
    const handleBeforeInstallPrompt = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) setPushStatus('unsupported'); else setPushStatus(Notification.permission as any);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') setDeferredPrompt(null); }
  };

  const handleSubscribePush = async () => {
    if (pushStatus === 'unsupported' || !VAPID_PUBLIC_KEY) return;
    setIsPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission as any);
      if (permission === 'granted') {
        const swRegistration = await navigator.serviceWorker.getRegistration();
        if (!swRegistration) throw new Error("SW manquant");
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
        await supabase.from('push_subscriptions').upsert({ user_id: user.id, subscription: subscription.toJSON() }, { onConflict: 'user_id, subscription' });
      }
    } catch (e: any) { console.error(e.message); } finally { setIsPushLoading(false); }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(library, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `akasha_backup_${new Date().toISOString().split('T')[0]}.json`);
    linkElement.click();
  };

 
  const processEnrichmentQueue = async (itemsToEnrich: Partial<LibraryItem>[]) => {
    setEnrichmentProgress({ active: true, current: 0, total: itemsToEnrich.length });

    for (let i = 0; i < itemsToEnrich.length; i++) {
      const item = itemsToEnrich[i];
      let coverFound = null;
      let descriptionFound = '';
      let realMediaId = item.media_id;
      let totalEpsFound = null;
      let titleFound = null; // NOUVEAU : Pour écraser le faux titre
      let typeFound = null;  // NOUVEAU : Pour corriger Anime/Manga

      try {
        if (item.source === 'tmdb' || item.type === 'movie' || item.type === 'tv') {
          const results = await fetchTMDB(item.title || '', lang); 
          if (results && results.length > 0) {
            coverFound = results[0].cover;
            descriptionFound = results[0].description;
            realMediaId = results[0].id; 
            totalEpsFound = results[0].totalEpisodes;
          }
        } else if (item.source === 'anilist' || item.type === 'anime' || item.type === 'manga') {
          
          // GESTION CHIRURGICALE DE L'EXPORT RGPD
          const isIdOnly = item.title?.startsWith('[ID:');
          
          if (isIdOnly) {
            const extractId = item.title?.replace(/[^0-9]/g, '');
            const res = await fetch('https://graphql.anilist.co', { 
              method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, 
              body: JSON.stringify({ 
                query: `query ($id: Int) { Media(id: $id) { id title { romaji english } coverImage { large } description episodes type } }`, 
                variables: { id: parseInt(extractId || '0') } 
              }) 
            });
            if (res.ok) {
              const data = await res.json();
              if (data.data && data.data.Media) {
                coverFound = data.data.Media.coverImage?.large;
                descriptionFound = data.data.Media.description?.replace(/<[^>]*>?/gm, '');
                realMediaId = data.data.Media.id;
                totalEpsFound = data.data.Media.episodes;
                titleFound = data.data.Media.title.english || data.data.Media.title.romaji;
                typeFound = data.data.Media.type === 'MANGA' ? 'manga' : 'anime';
              }
            }
          } else {
            const results = await fetchAniList(item.title || '');
            if (results && results.length > 0) {
              coverFound = results[0].cover;
              descriptionFound = results[0].description;
              realMediaId = results[0].id;
              totalEpsFound = results[0].totalEpisodes;
            }
          }
        }

        const updates: any = { 
          cover_url: coverFound, 
          description: descriptionFound,
          media_id: realMediaId 
        };

        if (totalEpsFound) updates.total_episodes = totalEpsFound;
        if (titleFound) updates.title = titleFound; // Remplace [ID:1234] par le vrai nom
        if (typeFound) updates.type = typeFound; // Aligne le bon icône de format

        if (coverFound || realMediaId !== item.media_id || titleFound) {
           await supabase.from('user_media').update(updates).match({ user_id: user?.id, media_id: item.media_id });
        }

      } catch (e) {
        console.warn(`Impossible de fetcher les données pour ${item.title}`);
      }

      setEnrichmentProgress(prev => ({ ...prev, current: i + 1 }));
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setEnrichmentProgress({ active: false, current: 0, total: 0 });
    fetchLibrary(); 
    alert("Importation et téléchargement des données terminés !");
  };



  // smart import pour les plateformes externes
  const handleSmartImport = async (e: React.ChangeEvent<HTMLInputElement>, sourceFormat: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setImportSource('');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      let parsedItems: Partial<LibraryItem>[] = [];

      try {
        // --- 1. LETTERBOXD ---
        if (sourceFormat === 'letterboxd') {
          const isWatchlist = file.name.toLowerCase().includes('watchlist');
          const defaultStatus = isWatchlist ? 'planning' : 'completed';
          const defaultProgress = isWatchlist ? 0 : 1;

          const lines = content.split('\n');
          const headers = lines[0].split(',');
          const nameIndex = headers.findIndex(h => h.includes('Name') || h.includes('Title'));
          const yearIndex = headers.findIndex(h => h.includes('Year'));
          
          parsedItems = lines.slice(1).filter(l => l.trim()).map((line) => {
            const columns = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const title = columns[nameIndex]?.replace(/"/g, '').trim() || 'Inconnu';
            const year = columns[yearIndex]?.replace(/"/g, '').trim() || '';
            
            return {
              user_id: user.id,
              media_id: `lb_${title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}_${year}`,
              source: 'tmdb', 
              type: 'movie',
              title: title,
              year: year,
              status: defaultStatus, 
              progress: defaultProgress,
              total_episodes: 1,
              cover_url: null 
            };
          });

        // --- 2. MYANIMELIST (XML) ---
        } else if (sourceFormat === 'mal') {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, "text/xml");
          const animes = Array.from(xmlDoc.getElementsByTagName('anime'));
          
          parsedItems = animes.map((anime) => {
            const statusRaw = anime.getElementsByTagName('my_status')[0]?.textContent || '';
            const statusMap: any = { 'Completed': 'completed', 'Watching': 'watching', 'Plan to Watch': 'planning', 'On-Hold': 'on_hold' };
            const title = anime.getElementsByTagName('series_title')[0]?.textContent?.trim() || 'Inconnu';
            
            const watchedEps = parseInt(anime.getElementsByTagName('my_watched_episodes')[0]?.textContent || '0', 10);
            const totalEps = parseInt(anime.getElementsByTagName('series_episodes')[0]?.textContent || '0', 10);
            
            return {
              user_id: user.id,
              media_id: `mal_${anime.getElementsByTagName('series_animedb_id')[0]?.textContent || title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
              source: 'anilist',
              type: 'anime',
              title: title,
              progress: watchedEps,
              total_episodes: totalEps > 0 ? totalEps : null,
              status: statusMap[statusRaw] || 'completed',
              cover_url: null
            };
          });

        // --- 3. TV TIME (CSV - Séparation Vus / Total) ---
        } else if (sourceFormat === 'tvtime') {
          const lines = content.split('\n');
          const headers = lines[0].toLowerCase().replace(/"/g, '').split(',');
          
          let nameIndex = headers.findIndex(h => h === 'series_name' || h === 'show_name' || h === 'tv show name');
          if (nameIndex === -1) nameIndex = headers.findIndex(h => (h.includes('name') || h.includes('title') || h.includes('show')) && !h.includes('id'));
          if (nameIndex === -1) throw new Error("Impossible de trouver la colonne du titre dans ce fichier TV Time.");

          // Identification stricte de la colonne validant le visionnage
          const seenIndex = headers.findIndex(h => h === 'seen' || h === 'watched' || h === 'is_seen');

          const showsMap = new Map();
          
          lines.slice(1).filter(l => l.trim()).forEach((line) => {
            const columns = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            if (!columns[nameIndex]) return;

            const title = columns[nameIndex].replace(/"/g, '').trim();
            if (!title || title === '') return;

            // Déduction de l'état "vu"
            let isSeen = false;
            if (seenIndex !== -1 && columns[seenIndex]) {
                const val = columns[seenIndex].replace(/"/g, '').trim().toLowerCase();
                if (val === 'true' || val === '1' || val === 'yes') isSeen = true;
            } else {
                isSeen = true; // Fallback par défaut si la colonne manque
            }

            if (!showsMap.has(title)) {
              showsMap.set(title, { progress: isSeen ? 1 : 0, total: 1 });
            } else {
              const data = showsMap.get(title);
              data.total += 1;
              if (isSeen) data.progress += 1;
            }
          });

          parsedItems = Array.from(showsMap.entries()).map(([title, data]) => {
              // Ajustement du statut en fonction du ratio vus/total
              let status: 'watching' | 'completed' | 'planning' = 'watching';
              if (data.progress === 0) status = 'planning';
              else if (data.progress >= data.total && data.total > 0) status = 'completed';

              return {
                  user_id: user.id,
                  media_id: `tvt_${title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
                  source: 'tmdb', 
                  type: 'tv', 
                  title: title,
                  status: status, 
                  progress: data.progress,
                  total_episodes: data.total, // Injection du vrai total
                  cover_url: null 
              };
          });

        // --- 4. MYDRAMALIST (CSV) ---
        } else if (sourceFormat === 'mdl') {
          const lines = content.split('\n');
          const headers = lines[0].toLowerCase().split(',');
          
          const titleIdx = headers.findIndex(h => h.includes('title') || h.includes('name'));
          const statusIdx = headers.findIndex(h => h.includes('status'));
          const progressIdx = headers.findIndex(h => h.includes('watched') || h.includes('episode'));
          const typeIdx = headers.findIndex(h => h.includes('type'));
          const yearIdx = headers.findIndex(h => h.includes('year'));

          parsedItems = lines.slice(1).filter(l => l.trim()).map((line) => {
             const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
             const title = cols[titleIdx]?.replace(/"/g, '').trim() || 'Inconnu';
             const rawStatus = cols[statusIdx]?.replace(/"/g, '').trim().toLowerCase() || '';
             
             let status: 'completed' | 'watching' | 'planning' | 'on_hold' = 'completed';
             if (rawStatus.includes('watch') && !rawStatus.includes('plan')) status = 'watching';
             else if (rawStatus.includes('plan')) status = 'planning';
             else if (rawStatus.includes('hold')) status = 'on_hold';

             const rawType = cols[typeIdx]?.replace(/"/g, '').trim().toLowerCase() || '';
             const type = rawType.includes('movie') ? 'movie' : 'tv'; 
             
             return {
                user_id: user.id,
                media_id: `mdl_${title.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`,
                source: 'tmdb',
                type: type,
                title: title,
                year: cols[yearIdx]?.replace(/"/g, '').trim(),
                status: status,
                progress: parseInt(cols[progressIdx]?.replace(/"/g, '') || '0', 10),
                cover_url: null
             };
          });

        // --- 5. ANILIST (JSON - Export RGPD) ---
        } else if (sourceFormat === 'anilist') {
          const anilistData = JSON.parse(content);

          if (!anilistData.lists) {
            throw new Error("Format AniList invalide. Ce fichier ne contient pas l'objet 'lists'.");
          }

          // Correction stricte du mapping entier RGPD
          // 0 = Watching, 1 = Plan to Watch, 2 = Completed, 3 = Dropped, 4 = Paused
          const statusMap: Record<number, 'watching' | 'completed' | 'on_hold' | 'planning'> = { 
            0: 'watching', 1: 'planning', 2: 'completed', 3: 'on_hold', 4: 'on_hold', 5: 'watching' 
          };

          parsedItems = anilistData.lists.map((entry: any) => ({
             user_id: user.id,
             media_id: `al_${entry.series_id}`,
             source: 'anilist',
             type: 'anime', 
             title: `[ID:${entry.series_id}]`, 
             progress: entry.progress || 0,
             status: statusMap[entry.status] || 'completed',
             cover_url: null
          }));

        } else {
           alert("Ce parseur n'est pas encore finalisé pour cette plateforme.");
           return;
        }

        if (parsedItems.length === 0) throw new Error("Aucune donnée valide trouvée.");

        // --- DÉDUPLICATION BLINDÉE ---
        const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const existingTitles = new Set(library.map((item: LibraryItem) => normalizeStr(item.title)));
        
        const newItemsToImport: Partial<LibraryItem>[] = [];
        const seenInFile = new Set<string>();

        parsedItems.forEach(item => {
          const normTitle = normalizeStr(item.title || '');
          if (!existingTitles.has(normTitle) && !seenInFile.has(normTitle)) {
            seenInFile.add(normTitle);
            newItemsToImport.push(item);
          }
        });

        if (newItemsToImport.length === 0) {
          alert("Bonne nouvelle : toutes les œuvres de ce fichier sont déjà dans votre bibliothèque ! Aucun doublon n'a été créé.");
          return;
        }

        const { error } = await supabase.from('user_media').upsert(newItemsToImport, { onConflict: 'user_id, media_id, source' });
        if (error) throw error;
        
        fetchLibrary();
        processEnrichmentQueue(newItemsToImport);

      } catch (err) {
        console.error(err);
        alert("Erreur lors de la lecture du fichier. Vérifiez le format. (JSON/CSV/XML invalide)");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 sm:pb-0 pt-6">
      <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl p-4 sm:p-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[var(--bg-base)] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[var(--border-color)] shadow-xl text-[var(--primary)]">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-black text-[var(--text-main)]">{t('profile.title')}</h2>
          <p className="text-[var(--text-muted)] font-medium mt-1 mb-6">{String(user.email || "")}</p>
          <Button onClick={onOpenRanking} className="mx-auto !px-6 !py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
            <Trophy size={18}/> {t('profile.ranking.button')}
          </Button>
        </div>

        {/* NOUVELLE SECTION WRAPPED PAR ANNÉE */}
        <div className="mb-10 pt-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="text-rose-500" size={24} />
            <h3 className="font-black text-xl text-[var(--text-main)]">Wrapped</h3>
          </div>
          <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 snap-x pr-4">
            {wrappedYears.map((y, i) => (
               <div 
                 key={y} 
                 onClick={() => onOpenWrapped(y)} 
                 className={`snap-start shrink-0 w-36 h-48 rounded-3xl p-5 flex flex-col justify-end cursor-pointer shadow-lg hover:-translate-y-2 hover:shadow-xl transition-all bg-gradient-to-br ${gradientClasses[i % gradientClasses.length]}`}
               >
                  <div className="mt-auto pointer-events-none">
                     <h4 className="text-4xl font-black text-white leading-none drop-shadow-md">{y}</h4>
                     <p className="text-[10px] font-black text-white/80 mt-1 uppercase tracking-widest bg-black/20 w-fit px-2 py-1 rounded border border-white/20">Wrapped</p>
                  </div>
               </div>
            ))}
          </div>
        </div>

        {/* SECTION GESTION DES DONNÉES */}
        <div className="mb-8 bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <FolderHeart className="text-purple-500" size={24} />
            <h3 className="font-bold text-[var(--text-main)] text-lg">{t('profile.data.title')}</h3>
          </div>
          <p className="text-sm text-[var(--text-muted)]">{t('profile.data.description')}</p>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button onClick={handleExport} className="flex-1 bg-purple-600 hover:bg-purple-700 !py-3">
              <Download size={18} /> {t('profile.data.export')}
            </Button>
            
            <div className="flex-1 relative">
              <input 
                type="file" 
                accept=".json,.csv,.xml" 
                ref={fileInputRef}
                onChange={(e) => handleSmartImport(e, importSource)} 
                className="hidden" 
              />
              <CustomSelect 
                value={importSource} 
                onChange={(val) => { 
                  if(val) {
                    setImportSource(val);
                    fileInputRef.current?.click(); // Ouvre l'explorateur de fichiers dès qu'une source est choisie
                  }
                }} 
                options={IMPORT_OPTIONS} 
                className="bg-[var(--panel-bg-alt)] border border-[var(--border-color)] text-[var(--text-main)] w-full !py-3" 
                placement="top"
              />
            </div>
          </div>

          {/* BARRE DE PROGRESSION ENRICHISSEMENT (BACKGROUND) */}
          {enrichmentProgress.active && (
            <div className="mt-4 p-4 bg-[var(--bg-base)] border border-amber-500/30 rounded-xl animate-in fade-in">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs font-bold text-amber-500 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Récupération des affiches...
                </span>
                <span className="text-xs font-bold text-[var(--text-main)]">
                  {enrichmentProgress.current} / {enrichmentProgress.total}
                </span>
              </div>
              <div className="h-2 w-full bg-[var(--panel-bg)] rounded-full overflow-hidden border border-[var(--border-color)]">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-300" 
                  style={{ width: `${(enrichmentProgress.current / enrichmentProgress.total) * 100}%` }} 
                />
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">
                Ne fermez pas l'application. Les œuvres sont déjà dans vos listes, nous téléchargeons juste les images.
              </p>
            </div>
          )}
        </div>

        <div className="mb-8 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3"><Smartphone className="text-blue-500" size={24} /><h3 className="font-bold text-[var(--text-main)] text-lg">{t('profile.application.heading')}</h3></div>
          {!isStandalone ? (
            <>
              <p className="text-sm text-[var(--text-muted)]">{t('profile.application.install.description')}</p>
              {deferredPrompt ? <Button onClick={handleInstallClick} className="w-full !py-3 bg-blue-600 hover:bg-blue-700"><Download size={18} /> {t('profile.application.install.button')}</Button> : isIOS ? (
                <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] text-sm text-[var(--text-main)]"><p className="font-bold mb-2">{t('profile.application.ios.title')}</p><ol className="list-decimal pl-5 space-y-2 text-[var(--text-muted)]"><li>{t('profile.application.ios.step1.before')} <Share size={14} className="inline mx-1" /> {t('profile.application.ios.step1.after')}</li><li>{t('profile.application.ios.step2.before')} <strong>{t('profile.application.ios.step2.highlight')}</strong> <Plus size={14} className="inline mx-1 border border-current rounded-sm" /> {t('profile.application.ios.step2.after')}</li><li>{t('profile.application.ios.step3')}</li></ol></div>
              ) : <p className="text-xs text-[var(--text-muted)] italic text-center">{t('profile.application.install.note')}</p>}
            </>
          ) : (
             <div className="bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)]">
               <p className="text-sm text-[var(--text-main)] font-bold mb-2 flex items-center gap-2"><BellRing size={16} className="text-blue-500"/> {t('profile.notifications.heading')}</p>
               <p className="text-xs text-[var(--text-muted)] mb-4">{t('profile.notifications.description')}</p>
               {pushStatus === 'granted' ? <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-500 bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20"><Check size={18} /> {t('profile.notifications.enabled')}</div> : pushStatus === 'denied' ? <div className="text-xs text-red-500 text-center bg-red-500/10 p-3 rounded-xl">{t('profile.notifications.denied')}</div> : <Button onClick={handleSubscribePush} disabled={isPushLoading} className="w-full !py-3 bg-blue-600 hover:bg-blue-700">{isPushLoading ? <Loader2 className="animate-spin" size={18}/> : t('profile.notifications.enable_button')}</Button>}
             </div>
          )}
        </div>

        <div className="sm:hidden flex items-center justify-between p-4 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-color)] mb-8"><span className="font-bold text-[var(--text-main)]">{t('profile.theme.mobileLabel')}</span><button onClick={toggleTheme} className="p-2.5 bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl text-[var(--primary)] shadow-sm">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button></div>

        <div className="bg-[var(--bg-base)] rounded-2xl p-6 mb-8 border border-[var(--border-color)]">
          <div className="mb-8">
            <div className="flex justify-between items-end mb-3"><h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('profile.stats.completion.title')}</h3><span className="text-3xl font-black text-emerald-500 leading-none">{completionRate}%</span></div>
            <div className="h-3 w-full bg-[var(--panel-bg)] rounded-full overflow-hidden border border-[var(--border-color)]"><div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${completionRate}%` }} /></div>
            <p className="text-xs text-[var(--text-muted)] mt-2 font-medium">{totalCompleted} {t('profile.stats.completion.meta', { count: totalAdded })}</p>
          </div>
          <div>
            <div className="flex justify-between items-end mb-3"><h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('profile.stats.screen_vs_reading.title')}</h3></div>
            <div className="flex h-4 w-full bg-[var(--panel-bg)] rounded-full overflow-hidden border border-[var(--border-color)] mb-3">{totalInteractions === 0 ? <div className="h-full w-full bg-[var(--border-color)]" /> : <><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${watchRatio}%` }} /><div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${readRatio}%` }} /></>}</div>
            <div className="flex justify-between text-xs font-bold"><div className="flex items-center gap-1.5 text-blue-500"><Tv size={14} /> {watchRatio}% {t('profile.stats.screen_vs_reading.binge_watching')}</div><div className="flex items-center gap-1.5 text-purple-500">{readRatio}% {t('profile.stats.screen_vs_reading.reading')} <BookOpen size={14} /></div></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-10">
          <div className="bg-blue-500/10 border border-blue-500/20 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-4"><div className="p-2 sm:p-3 bg-blue-500 text-white rounded-lg sm:rounded-xl"><FolderHeart className="w-5 h-5 sm:w-6 sm:h-6"/></div><div className="min-w-0"><p className="text-lg sm:text-2xl font-black text-[var(--text-main)] leading-none truncate">{totalAdded}</p><p className="text-[9px] sm:text-xs font-bold text-blue-500 uppercase tracking-wider mt-1 truncate">{t('profile.cards.added')}</p></div></div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-4"><div className="p-2 sm:p-3 bg-emerald-500 text-white rounded-lg sm:rounded-xl"><Check className="w-5 h-5 sm:w-6 sm:h-6"/></div><div className="min-w-0"><p className="text-lg sm:text-2xl font-black text-[var(--text-main)] leading-none truncate">{totalCompleted}</p><p className="text-[9px] sm:text-xs font-bold text-emerald-500 uppercase tracking-wider mt-1 truncate">{t('profile.cards.finished')}</p></div></div>
          <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-4"><div className="p-2 sm:p-3 bg-rose-500 text-white rounded-lg sm:rounded-xl"><Clock className="w-5 h-5 sm:w-6 sm:h-6"/></div><div className="min-w-0"><p className="text-lg sm:text-2xl font-black text-[var(--text-main)] leading-none truncate">{watchTimeHours}<span className="text-xs sm:text-sm">h</span></p><p className="text-[9px] sm:text-xs font-bold text-rose-500 uppercase tracking-wider mt-1 truncate">{t('profile.cards.watchtime')}</p></div></div>
          <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-4"><div className="p-2 sm:p-3 bg-amber-500 text-white rounded-lg sm:rounded-xl"><PlayCircle className="w-5 h-5 sm:w-6 sm:h-6"/></div><div className="min-w-0"><p className="text-lg sm:text-2xl font-black text-[var(--text-main)] leading-none truncate">{totalEpisodesWatched}</p><p className="text-[9px] sm:text-xs font-bold text-amber-500 uppercase tracking-wider mt-1 truncate">{t('profile.cards.episodes')}</p></div></div>
        </div>

        <div className="mb-6"><label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-2"><Globe size={14}/> {t('profile.timezone.label')}</label><CustomSelect value={String(userTz)} onChange={handleTzChange} options={timezones} placement="top" className="bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-main)]" /><p className="text-[10px] text-[var(--text-muted)] mt-2 italic">{t('profile.timezone.description')}</p></div>
        <div className="sm:hidden flex items-center justify-between p-4 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-color)] mb-8"><span className="font-bold text-[var(--text-main)] flex items-center gap-2"><Languages size={20} className="text-[var(--primary)]" /> {t('profile.language.mobileTitle')}</span><button onClick={toggleLang} className="p-2.5 bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl text-[var(--primary)] shadow-sm font-black text-xs">{lang === 'fr' ? t('profile.language.short.en') : t('profile.language.short.fr')}</button></div>
        <div className="space-y-3 pt-6 border-t border-[var(--border-color)]"><Button variant="secondary" className="w-full !py-3" onClick={onLogout}><LogOut size={18} /> {t('profile.actions.logout')}</Button><button onClick={onDelete} className="w-full py-3 text-xs font-bold text-[var(--text-muted)] hover:text-red-500 transition-colors">{t('profile.actions.delete')}</button></div>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT AUTHENTIFICATION (VERSION MISE À JOUR AVEC RESET PASSWORD)
// ============================================================================
const AuthScreen: React.FC<{ 
  onLogin: (u: UserData) => void;
  isResettingPassword?: boolean;
  setIsResettingPassword?: (b: boolean) => void;
}> = ({ onLogin, isResettingPassword = false, setIsResettingPassword }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState(''); // Pour le nouveau mot de passe
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<any>(null);

  const handleAuth = async () => {
    setLoading(true); setError(''); setSuccessMessage('');
    try {
      if (!captchaToken && HCAPTCHA_SITE_KEY !== '') {
        setError(t('veuillez-valider-le-captcha-pour-continuer'));
        setLoading(false);
        return;
      }

      if (isRegistering) {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { captchaToken: captchaToken || undefined }
        });
        if (err) setError(err.message);
        else if (data.user) onLogin(data.user);
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken: captchaToken || undefined }
        });
        if (err) setError(err.message);
        else if (data.user) onLogin(data.user);
      }
    } catch (e: any) {
      setError(e.message || t('erreur-critique-de-connexion'));
    } finally {
      setLoading(false);
      if (captchaRef.current) captchaRef.current.resetCaptcha();
      setCaptchaToken(null);
    }
  };

  // Nouvelle fonction pour envoyer le mail de récupération de mot de passe
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Veuillez entrer votre adresse email dans le champ ci-dessus.");
      return;
    }

    if (!captchaToken && HCAPTCHA_SITE_KEY !== '') {
      setError(t('veuillez-valider-le-captcha-pour-continuer'));
      return;
    }

    setLoading(true); setError(''); setSuccessMessage('');
    
    // CORRECTION : On passe captchaToken directement à la racine de l'objet de configuration
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}`,
      captchaToken: captchaToken || undefined
    });

    if (err) {
      setError(err.message);
    } else {
      setSuccessMessage("Un email de récupération a été envoyé ! Vérifie ta boîte de réception.");
    }
    
    setLoading(false);
    if (captchaRef.current) captchaRef.current.resetCaptcha();
    setCaptchaToken(null);
  };

  // Nouvelle fonction pour enregistrer le nouveau mot de passe
  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true); setError('');
    
    const { error: err } = await supabase.auth.updateUser({
      password: newPassword.trim()
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      alert("Mot de passe mis à jour avec succès ! Tu es maintenant connecté.");
      if (setIsResettingPassword) setIsResettingPassword(false);
    }
  };

  if (isResettingPassword) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4 flex-col">
        <div className="max-w-md w-full bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl relative overflow-hidden z-10">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-[var(--primary)] to-amber-500" />
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl text-[var(--primary)]"><AkashaLogo size={48} /></div>
            <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight uppercase">Nouveau mot de passe</h1>
            <p className="text-[var(--text-muted)] font-medium mt-2">Saisis ton nouveau mot de passe sécurisé.</p>
          </div>
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl mb-6 text-sm font-bold">{error}</div>}
          <div className="space-y-4">
            <Input type="password" placeholder="Nouveau mot de passe (min 6 caractères)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <Button className="w-full !py-3.5 text-base mt-4" onClick={handleUpdatePassword} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Mettre à jour le mot de passe"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // FORMULAIRE DE CONNEXION / INSCRIPTION CLASSIQUE
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4 flex-col">
      <div className="max-w-md w-full bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl p-8 shadow-2xl relative overflow-hidden z-10">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-[var(--primary)] to-amber-500" />
        <div className="text-center mb-10"><div className="w-20 h-20 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl text-[var(--primary)]"><AkashaLogo size={48} /></div><h1 className="text-3xl font-black text-[var(--text-main)] tracking-tight uppercase">Akasha</h1><p className="text-[var(--text-muted)] font-medium mt-2">{t('auth_title')}</p></div>
        
        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl mb-6 text-sm font-bold">{error}</div>}
        {successMessage && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 p-4 rounded-xl mb-6 text-sm font-bold">{successMessage}</div>}
        
        <div className="space-y-4">
          <Input type="email" placeholder={t('auth_email')} value={email} onChange={e => setEmail(e.target.value)} />

          <div className="space-y-1.5">
            <Input type="password" placeholder={t('auth_password')} value={password} onChange={e => setPassword(e.target.value)} />
            {!isRegistering && (
              <div className="flex justify-end pr-2">
                <button
                  onClick={handleForgotPassword}
                  className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
                >
                  {t('auth_forgot')}
                </button>
              </div>
            )}
          </div>

          {HCAPTCHA_SITE_KEY && (
            <div className="flex justify-center pt-2">
              <HCaptcha
                sitekey={HCAPTCHA_SITE_KEY}
                onVerify={(token: string) => setCaptchaToken(token)}
                ref={captchaRef}
                theme="dark"
              />
            </div>
          )}

          <div className="pt-6 flex flex-col gap-3">
            <Button className="w-full !py-3.5 text-base" onClick={handleAuth} disabled={loading || (isRegistering && !captchaToken && HCAPTCHA_SITE_KEY !== '')}>
              {loading ? <Loader2 className="animate-spin" /> : (isRegistering ? t('auth_register') : t('auth_login'))}
            </Button>
            <Button variant="ghost" className="w-full border border-[var(--border-color)]" onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccessMessage(''); setCaptchaToken(null); if(captchaRef.current) captchaRef.current.resetCaptcha(); }} disabled={loading}>
              {isRegistering ? t('auth_switch_to_login') : t('auth_register')}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-[var(--text-muted)] space-y-4 max-w-sm z-0">
        <p>© {new Date().getFullYear()} Akasha Tracker. {t('auth_copyright')}</p>
        <div className="flex justify-center gap-4 items-center opacity-40 grayscale">
          <img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="TMDB" className="h-3" />
        </div>
        <p className="opacity-60 text-[10px]">This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        <a href="/legal.html" target="_blank" className="inline-block underline hover:text-[var(--text-main)] transition-colors">{t('auth_legal')}</a>
      </div>
    </div>
  );
};

// ============================================================================
// COMPOSANT PARTAGE (VUE PUBLIQUE NON CONNECTÉE)
// ============================================================================
const SharedMediaScreen: React.FC<{ item: any, onJoin: () => void, theme: string }> = ({ item, onJoin, theme }) => {
  const { lang } = useContext(LangContext);
  const [localData, setLocalData] = useState(item);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const { t } = useTranslation();

  // On revalide les données pour récupérer les genres, la durée, le créateur, etc. (non inclus dans l'URL)
  useEffect(() => {
    const checkAndRevalidate = async () => {
      const freshData = await revalidateMediaDetails(item, lang);
      if (freshData) {
        setLocalData((prev: any) => ({ ...prev, ...freshData }));
      }
    };
    checkAndRevalidate();
  }, [item.id, item.source, lang]);

  const title = String(localData.title || "");
  const cover = ('cover' in localData) ? localData.cover : localData.cover_url;
  const description = String(localData.description || t('description-en-cours-de-chargement'));
  const year = String(localData.year || t('annee-inconnue'));
  const prodStatusLabel = String(mapStatusToLabel(localData.prod_status));
  const statusColor = prodStatusLabel === t('statut-inconnu') ? "bg-[var(--border-color)] text-[var(--text-main)]" : prodStatusLabel.includes("cours") || prodStatusLabel.includes("production") ? "bg-[var(--primary)] text-white" : prodStatusLabel.includes("venir") ? "bg-amber-500 text-black" : "bg-emerald-600 text-white";
  const normalizedTotal = ('total_episodes' in localData) ? localData.total_episodes : localData.totalEpisodes;

  return (
    <div className={`${theme} min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto custom-scrollbar`}>
       <GlobalStyles />
       <div className="max-w-xl w-full bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center animate-in fade-in zoom-in-95 duration-500 my-auto">

          <h1 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center justify-center gap-2 mb-6">
            <Share size={16} /> {t('on-vous-a-recommande-cette-oeuvre')}
          </h1>

          <div className="w-40 sm:w-48 aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-[var(--border-color)] mx-auto mb-6">
            {cover ? <img src={String(cover)} alt={title} className="w-full h-full object-cover" /> : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={40}/>}
            <div className="absolute top-2 left-2"><TypeBadge type={String(localData.type)} /></div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-main)] mb-3 leading-tight tracking-tight">{title}</h2>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {localData.type !== 'book' && <span className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md ${String(statusColor)}`}>{prodStatusLabel}</span>}

            {(normalizedTotal || localData.type !== 'book') && (
              <span className="text-xs font-bold text-[var(--text-main)] bg-[var(--bg-base)] px-3 py-1 rounded-md flex items-center gap-1.5 border border-[var(--border-color)]">
                {normalizedTotal ? `${String(normalizedTotal)} ${localData.type === 'book' ? 'pages' : 'ép'}` : '? ép'}
                {localData.type !== 'book' && localData.runtime && (
                  <span className="flex items-center gap-1 text-[var(--text-muted)] ml-1 border-l border-[var(--border-color)] pl-2">
                    <Clock size={12}/> {localData.runtime}m
                  </span>
                )}
              </span>
            )}

            <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-base)] px-3 py-1 rounded-md border border-[var(--border-color)]">{year} • {String(localData.source).toUpperCase()}</span>
          </div>

          {localData.creator && <p className="text-sm font-bold text-[var(--primary)] mb-4">Par {String(localData.creator)}</p>}

          {localData.genres && localData.genres.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mb-4">
              {localData.genres.map((genre: string) => <span key={String(genre)} className="text-[10px] uppercase tracking-wider bg-[var(--panel-bg-alt)] text-[var(--text-main)] border border-[var(--border-color)] px-3 py-1 rounded-full font-bold">{String(genre)}</span>)}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(title + ' trailer')}`, '_blank')} className="flex items-center gap-1.5 text-xs font-bold bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-[var(--text-main)] px-3 py-2 rounded-lg transition-colors shadow-sm"><PlayCircle size={14} /> {t('bande-annonce')}</button>
            <button onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(title + ' date de sortie')}`, '_blank')} className="flex items-center gap-1.5 text-xs font-bold bg-[var(--bg-base)] border border-[var(--border-color)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-[var(--text-main)] px-3 py-2 rounded-lg transition-colors shadow-sm"><CalendarIcon size={14} /> {t('date-de-sortie')}</button>
          </div>

          <div className="mb-8 bg-[var(--bg-base)] p-4 rounded-xl border border-[var(--border-color)] text-left">
            <div className={`text-sm text-[var(--text-muted)] leading-relaxed ${!showFullDesc ? 'line-clamp-4' : ''}`}>{description}</div>
            {description.length > 200 && <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] mt-2 transition-colors">{showFullDesc ? t('voir-moins') : t('voir-plus')}</button>}
          </div>

          <div className="bg-gradient-to-br from-[var(--primary)] to-rose-600 rounded-2xl p-6 sm:p-8 text-white text-center shadow-lg transform transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-center gap-3 mb-4">
              <AkashaLogo size={36} className="text-white drop-shadow-md" />
              <h3 className="font-black text-2xl tracking-tight">{t('rejoignez-akasha')}</h3>
            </div>
            <p className="text-sm font-medium mb-6 text-white/90 max-w-sm mx-auto">{t('ne-perdez-plus-le-fil-de-vos-series-animes-et-livres-preferes-sauvegardez-votre-progression-et-organisez-votre-bibliotheque-culturelle-gratuitement')}</p>
            <Button onClick={onJoin} className="w-full bg-white !text-[var(--primary)] hover:!text-rose-700 hover:bg-gray-100 !py-4 shadow-xl text-base font-black border-0">
               {t('creer-un-compte-ou-se-connecter')}
            </Button>
          </div>
       </div>
    </div>
  );
};

// ============================================================================
// APPLICATION PRINCIPALE (RACINE ET CONTEXTE)
// ============================================================================
export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // --- 1. MOTEUR D'ANIMATION ET DIRECTIONS ---
  const MAIN_TABS = ['dashboard', 'search', 'ranking', 'profile'];
  const FILTER_TABS = ['favorites', 'watching', 'planning', 'completed', 'on_hold', 'reminders'];
  
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'search' | 'profile' | 'ranking'>('dashboard');
  const [pageDirection, setPageDirection] = useState<'left' | 'right'>('right');
  
  const changeTab = (newTab: 'dashboard' | 'search' | 'profile' | 'ranking') => {
    if (newTab === currentTab) return;
    const currIdx = MAIN_TABS.indexOf(currentTab);
    const newIdx = MAIN_TABS.indexOf(newTab);
    setPageDirection(newIdx > currIdx ? 'right' : 'left'); 
    setCurrentTab(newTab);
  };

  // CHARGEMENT DE LA MÉMOIRE DES FILTRES
  const [activeFilter, setActiveFilter] = useState<'watching'|'planning'|'completed'|'on_hold'|'favorites'|'reminders'>(() => getSavedFilter('akasha_activeFilter', 'watching') as any);
  const [filterDirection, setFilterDirection] = useState<'left' | 'right'>('right');
  const [userLibrary, setUserLibrary] = useState<LibraryItem[]>([]);

  
  const changeFilter = (newFilter: string) => {
    if (newFilter === activeFilter) return;
    const currIdx = FILTER_TABS.indexOf(activeFilter);
    const newIdx = FILTER_TABS.indexOf(newFilter);
    setFilterDirection(newIdx > currIdx ? 'right' : 'left');
    setActiveFilter(newFilter as any);
  };

  // --- 2. GESTION DE L'INDICATEUR FLUIDE DES FILTRES ---
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, color: 'var(--primary)' });

  useEffect(() => {
    const activeIdx = FILTER_TABS.indexOf(activeFilter);
    const activeTabElement = tabsRef.current[activeIdx];
    if (activeTabElement) {
      // Attribution de la couleur exacte selon le statut
      let color = 'var(--primary)';
      if (activeFilter === 'favorites') color = '#f43f5e'; // rose-500
      else if (activeFilter === 'planning') color = '#6366f1'; // indigo-500
      else if (activeFilter === 'completed') color = '#10b981'; // emerald-500
      else if (activeFilter === 'on_hold' || activeFilter === 'reminders') color = '#f59e0b'; // amber-500

      setIndicatorStyle({ left: activeTabElement.offsetLeft, width: activeTabElement.offsetWidth, color });
    }
  }, [activeFilter, userLibrary]); // Recalcule si la liste change (les nombres modifient la largeur du bouton)

  // ------------------------------------------

  const [isLibraryLoading, setIsLibraryLoading] = useState(true);
  const [wrappedYear, setWrappedYear] = useState<number | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [formatFilter, setFormatFilter] = useState<string>(
    () => getSavedFilter('akasha_formatFilter', 'all')
  );
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [rankingTagFilter, setRankingTagFilter] = useState<string>('all');

  // Extraction des tags uniques
  const allUserTags = useMemo(() => {
    const tags = new Set<string>();
    userLibrary.forEach(item => {
      if (item.tags) item.tags.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [userLibrary]);

  const [selectedMedia, setSelectedMedia] = useState<MediaItem | LibraryItem | null>(null);
  const [lastInteractedId, setLastInteractedId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => getSavedFilter('akasha_theme', 'dark') as 'dark' | 'light'
  );
  const [lang, setLang] = useState<Lang>('fr');

  // GESTION DU LIEN PARTAGÉ
  const [sharedItem, setSharedItem] = useState<any>(null);
  const [showAuthForShare, setShowAuthForShare] = useState(false);


  // SAUVEGARDE DE LA MÉMOIRE DES FILTRES
  useEffect(() => {
    try { localStorage.setItem('akasha_activeFilter', activeFilter); } catch {}
  }, [activeFilter]);

  useEffect(() => {
    try { localStorage.setItem('akasha_formatFilter', formatFilter); } catch {}
  }, [formatFilter]);

  useEffect(() => {
    try { localStorage.setItem('akasha_theme', theme); } catch {}
  }, [theme]);

  const filteredLibrary = userLibrary.filter(item => {
    if (activeFilter === 'reminders') return item.reminder_day !== null && item.reminder_time !== null;
    const formatMatch = formatFilter === 'all' || item.type === formatFilter;
    const tagMatch = tagFilter === 'all' || (item.tags && item.tags.includes(tagFilter)); // NOUVEAU
    if (activeFilter === 'favorites') return item.is_favorite === true && formatMatch && tagMatch;
    return item.status === activeFilter && formatMatch && tagMatch;
  });

  const activePlayerItem = useMemo(() => userLibrary.find(i => i.id === lastInteractedId) || null, [userLibrary, lastInteractedId]);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});

    // INTERCEPTER LE LIEN PARTAGÉ
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(shareData)));
        if (decoded && decoded.title) {
          setSharedItem(decoded);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) {
        console.error("Lien de partage invalide");
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => { setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
     });
    
    return () => subscription.unsubscribe();
  }, []);

  const fetchLibrary = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('user_media').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (error) console.error("Erreur DB:", error);
    if (data) {
      setUserLibrary(data as LibraryItem[]);
      setLastInteractedId(prev => prev || (data.length > 0 ? data[0].id : null));
    }
    setIsLibraryLoading(false);
  }, [user]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  // Si on est connecté et qu'on a un sharedItem en attente, on l'ouvre directement
  useEffect(() => {
    if (user && sharedItem) {
      setSelectedMedia(sharedItem);
      setSharedItem(null); // Consommé
      setShowAuthForShare(false);
    }
  }, [user, sharedItem]);

  const updateProgress = async (item: LibraryItem, increment: number) => {
    const newProgress = Math.max(0, item.progress + increment);
    if (item.total_episodes && newProgress > item.total_episodes) return;
    setLastInteractedId(item.id);
    const newDate = new Date().toISOString();
    setUserLibrary(prev => prev.map(libItem => libItem.id === item.id ? { ...libItem, progress: newProgress, updated_at: newDate } : libItem));
    await supabase.from('user_media').update({ progress: newProgress, updated_at: newDate }).match({ id: item.id });
  };

  const handleSWRUpdate = (id: string, updates: Partial<LibraryItem>) => { setUserLibrary(prev => prev.map(libItem => libItem.id === id ? { ...libItem, ...updates } : libItem)); };
  const handleToggleFavorite = async (id: string, currentFav: boolean) => { const newFav = !currentFav; handleSWRUpdate(id, { is_favorite: newFav }); await supabase.from('user_media').update({ is_favorite: newFav }).match({ id }); };
  const handleDeleteAccount = async () => { const confirm1 = window.confirm(t('attention-cette-action-detruira-toutes-vos-donnees')); if (!confirm1) return; const { error } = await supabase.rpc('delete_user'); if (error) console.error(error); await supabase.auth.signOut(); };
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const toggleLang = () => {
  const newLang = lang === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
    setLang(newLang);
  };

  if (authLoading) return <div className={`min-h-screen ${theme} bg-[var(--bg-base)] flex items-center justify-center`}><GlobalStyles/><Loader2 className="animate-spin text-[var(--primary)]" size={48} /></div>;
  if (isResettingPassword) {
    return (
      <div className={theme}>
        <GlobalStyles />
        <AuthScreen 
          onLogin={setUser} 
          isResettingPassword={isResettingPassword} 
          setIsResettingPassword={setIsResettingPassword} 
        />
      </div>
    );
  }

  // Si on n'est pas en reset et que l'utilisateur n'est pas connecté
  if (!user) {
    return (
      <>
         {sharedItem && !showAuthForShare ? (
           <SharedMediaScreen item={sharedItem} onJoin={() => setShowAuthForShare(true)} theme={theme} />
         ) : (
           <div className={theme}>
             <GlobalStyles />
             <AuthScreen 
               onLogin={setUser} 
               isResettingPassword={isResettingPassword} 
               setIsResettingPassword={setIsResettingPassword} 
             />
           </div>
         )}
      </>
    );
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {!user ? (
        <>
           {/* Si pas d'utilisateur, qu'on a un lien partagé, et qu'on n'a pas encore cliqué sur 'rejoindre' */}
           {sharedItem && !showAuthForShare ? (
             <SharedMediaScreen item={sharedItem} onJoin={() => setShowAuthForShare(true)} theme={theme} />
           ) : (
             <div className={theme}>
               <GlobalStyles />
               <AuthScreen 
               onLogin={setUser}
               isResettingPassword={isResettingPassword}
               setIsResettingPassword={setIsResettingPassword}
                />
             </div>
           )}
        </>
      ) : (
        <div className={`${theme} min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] font-sans pb-28 sm:pb-12 flex flex-col relative transition-colors duration-300`}>
          <GlobalStyles />
          <nav className="fixed bottom-4 inset-x-6 mx-auto sm:mx-0 max-w-[250px] sm:max-w-none sm:top-6 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 z-50 sm:w-auto px-6 py-3 sm:py-3 bg-[var(--panel-bg)]/95 backdrop-blur-xl border sm:border border-[var(--border-color)] rounded-3xl sm:rounded-full flex justify-between sm:justify-center items-center sm:gap-12 shadow-2xl">

            {/* BOUTON TRADUCTION INTÉGRÉ À GAUCHE */}
            <button onClick={toggleLang} className="hidden sm:flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all mr-2" title={t('changer-la-langue')}>
              <Languages size={22} />
            </button>

            <div className="hidden sm:flex items-center gap-2 pr-4 border-r border-[var(--border-color)]"><AkashaLogo size={24} className="text-[var(--primary)]" /><span className="font-black tracking-widest text-[var(--text-main)] mt-0.5">AKASHA</span></div>
            <button onClick={() => changeTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${currentTab === 'dashboard' ? 'text-[var(--primary)] scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} title={t('nav_library')}><Library size={24} strokeWidth={currentTab === 'dashboard' ? 3 : 2} /></button>
            <button onClick={() => changeTab('search')} className={`flex flex-col items-center gap-1 transition-all ${currentTab === 'search' ? 'text-[var(--primary)] scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} title={t('nav_explore')}><Search size={24} strokeWidth={currentTab === 'search' ? 3 : 2} /></button>
            <button onClick={() => changeTab('profile')} className={`flex flex-col items-center gap-1 transition-all ${currentTab === 'profile' ? 'text-[var(--primary)] scale-110' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`} title={t('nav_profile')}><User size={24} strokeWidth={currentTab === 'profile' ? 3 : 2} /></button>
            {currentTab === 'ranking' && <div className="hidden sm:flex flex-col items-center gap-1 text-[var(--primary)] scale-110 transition-all"><Trophy size={24} strokeWidth={3}/></div>}
            <div className="hidden sm:block w-px h-6 bg-[var(--border-color)] mx-2"></div>
            <button onClick={toggleTheme} className="hidden sm:flex flex-col items-center gap-1 text-[var(--text-muted)] hover:text-[var(--primary)] transition-all" title={t('changer-le-theme')}>{theme === 'dark' ? <Sun size={22} /> : <Moon size={22} />}</button>
          </nav>

          {/* CORRECTION : Suppression de l'overflow ici pour sauver les éléments Sticky */}
          <main className="max-w-7xl mx-auto px-4 py-6 sm:pt-28 flex-grow w-full">
            
            {/* UTILISATION DE NOTRE MOTEUR D'ANIMATION CSS PERSONNALISÉ ET INFAILLIBLE */}
            <div key={currentTab} className={`w-full ${pageDirection === 'right' ? 'animate-page-right' : 'animate-page-left'}`}>
              
              {currentTab === 'dashboard' && (
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                    
                    {/* CONTENEUR RELATIF POUR L'INDICATEUR FLUIDE */}
                    <div className="flex gap-1 overflow-x-auto w-full sm:w-auto custom-scrollbar px-1 pt-1 relative pb-0.5">
                      
                      {/* LA BOÎTE MAGIQUE (L'INDICATEUR QUI GLISSE EN ARRIÈRE-PLAN) */}
                      <div 
                        className="absolute bottom-[-1px] top-1 transition-all duration-300 ease-out z-0 border-t-2 border-x rounded-t-xl bg-[var(--panel-bg)]"
                        style={{
                          left: indicatorStyle.left,
                          width: indicatorStyle.width,
                          borderColor: indicatorStyle.color
                        }}
                      />

                      {/* LES BOUTONS (Désormais transparents, ils se posent sur la boîte) */}
                      {FILTER_TABS.map((fId, idx) => {
                        const isActive = activeFilter === fId;
                        const count = userLibrary.filter(i => {
                          if (fId === 'reminders') return i.reminder_day !== null && i.reminder_time !== null;
                          const formatMatch = formatFilter === 'all' || i.type === formatFilter;
                          const tagMatch = tagFilter === 'all' || (i.tags && i.tags.includes(tagFilter));
                          if (fId === 'favorites') return i.is_favorite === true && formatMatch && tagMatch;
                          return i.status === fId && formatMatch && tagMatch;
                        }).length;
                        
                        const config = STATUS_CONFIG[fId as keyof typeof STATUS_CONFIG];
                        
                        return (
                          <button 
                            key={fId} 
                            ref={(el) => { tabsRef.current[idx] = el; }}
                            onClick={() => changeFilter(fId)} 
                            className={`relative z-10 whitespace-nowrap px-5 py-2.5 rounded-t-xl text-sm font-bold transition-colors border-t-2 border-transparent border-x border-x-transparent ${isActive ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)] hover:bg-[var(--border-color)]/30 border-b-2 border-b-[var(--border-color)]/0'}`}
                          >
                            {fId === 'favorites' && <Heart size={14} className={`inline mr-1 ${isActive ? "fill-[var(--text-main)]" : ""}`} />}
                            {fId === 'reminders' && <Bell size={14} className={`inline mr-1 ${isActive ? "text-amber-500" : ""}`} />}
                            {t(config.labelKey)} <span className="ml-1.5 opacity-50 font-medium">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  <div className={`flex gap-2 shrink-0 w-full sm:w-auto z-10 transition-opacity duration-300 ${activeFilter === 'reminders' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="w-1/2 sm:w-40">
                      <CustomSelect 
                        value={formatFilter} 
                        onChange={setFormatFilter} 
                        options={FORMAT_OPTIONS.map(o => ({...o, label: o.labelKey ? t(o.labelKey) : o.label}))} 
                        className="bg-[var(--panel-bg)] border border-[var(--border-color)] hover:border-[var(--primary)] shadow-sm" 
                      />
                    </div>
                    {allUserTags.length > 0 && (
                      <div className="w-1/2 sm:w-40">
                        <CustomSelect 
                          value={tagFilter} 
                          onChange={setTagFilter} 
                          options={[{ value: 'all', label: t('tous-les-tags') }, ...allUserTags.map(t => ({ value: t, label: t }))]} 
                          className="bg-[var(--panel-bg)] border border-[var(--border-color)] hover:border-[var(--primary)] shadow-sm" 
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className={`p-4 sm:p-6 rounded-b-2xl rounded-tr-2xl border ${STATUS_CONFIG[activeFilter as keyof typeof STATUS_CONFIG].containerBg} ${STATUS_CONFIG[activeFilter as keyof typeof STATUS_CONFIG].containerBorder} transition-colors duration-300`}>
                  {/* ANIMATION DE CHANGEMENT DE FILTRE (GLISSEMENT DES CARTES UNIQUEMENT) */}
                  <div key={activeFilter} className={`w-full ${filterDirection === 'right' ? 'animate-page-right' : 'animate-page-left'}`}>

                    {activeFilter === 'reminders' ? (
                      <RemindersList items={filteredLibrary} onUpdate={handleSWRUpdate} onSelect={setSelectedMedia} />
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        
                        {/* SKELETON SCREEN */}
                        {isLibraryLoading ? (
                          Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="animate-breathe flex flex-row sm:flex-col bg-[var(--bg-base)]/50 rounded-2xl overflow-hidden border border-[var(--border-color)] h-[140px] sm:h-auto sm:aspect-[2/3] shadow-md">
                              <div className="w-28 sm:w-full h-full sm:h-[70%] bg-[var(--border-color)]/30 shrink-0 border-r sm:border-b sm:border-r-0 border-[var(--border-color)]"></div>
                              <div className="flex-1 p-3.5 sm:p-4 flex flex-col gap-3">
                                <div className="h-4 bg-[var(--border-color)]/30 rounded w-3/4"></div>
                                <div className="h-3 bg-[var(--border-color)]/30 rounded w-1/2 mt-auto"></div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <>
                            {/* LES VRAIES CARTES */}
                            {filteredLibrary.map(item => {
                              const progressPercent = item.total_episodes ? Math.min(100, (item.progress / item.total_episodes) * 100) : 0;
                              return (
                                <div key={item.id} onClick={() => setSelectedMedia(item)} className="cursor-pointer bg-[var(--bg-base)]/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-[var(--border-color)] group hover:border-[var(--primary)] transition-all flex flex-row sm:flex-col relative h-[140px] sm:h-auto shadow-md">
                                  <div className="w-28 sm:w-full shrink-0 relative bg-[var(--bg-base)] sm:aspect-[2/3] overflow-hidden border-r sm:border-b sm:border-r-0 border-[var(--border-color)]">
                                    {item.cover_url ? <FadeInImage src={String(item.cover_url)} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105" /> : <BookOpen className="text-[var(--text-muted)] m-auto h-full" size={40} />}
                                    <div className="absolute top-2 left-2 hidden sm:block z-10"><TypeBadge type={item.type} /></div>
                                    <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item.id, !!item.is_favorite); }} className="absolute top-2 right-2 z-20 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all border border-white/10"><Heart size={16} className={item.is_favorite ? "fill-rose-500 text-rose-500" : "text-white"} /></button>
                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-transparent to-transparent opacity-80 sm:hidden" />
                                  </div>
                                  <div className="p-3.5 sm:p-4 flex flex-col flex-1 min-w-0 justify-between gap-3 bg-[var(--bg-base)]/80 z-10">
                                    <div className="flex flex-col"><h3 className="font-bold text-[var(--text-main)] text-sm sm:text-base line-clamp-2 leading-tight mb-1">{item.title}</h3><div className="w-fit" onClick={e => e.stopPropagation()}><InlineEpisodeEdit item={item} onSave={async (id, newTotal) => { setUserLibrary(prev => prev.map(libItem => libItem.id === id ? { ...libItem, total_episodes: newTotal } : libItem)); await supabase.from('user_media').update({ total_episodes: newTotal }).match({ id }); }}/></div></div>
                                    <div className="flex items-center gap-3 w-full mt-auto" onClick={e => e.stopPropagation()}><div className="flex-1 h-1.5 sm:h-2 bg-[var(--border-color)] rounded-full overflow-hidden"><div className="h-full bg-[var(--primary)] rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} /></div><div className="flex flex-row gap-1.5 items-center shrink-0"><button onClick={() => updateProgress(item, -1)} disabled={item.progress <= 0} className="p-2 sm:p-2 bg-[var(--panel-bg)] hover:bg-[var(--border-color)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><Minus size={18} strokeWidth={3}/></button><button onClick={() => updateProgress(item, 1)} disabled={item.total_episodes !== null && item.progress >= item.total_episodes} className="w-10 h-10 sm:w-10 sm:h-10 flex items-center justify-center bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl text-white transition-transform active:scale-95 shadow-lg shadow-[var(--shadow-color)]"><Plus size={20} strokeWidth={3}/></button></div></div>
                                  </div>
                                </div>
                              )
                            })}
                            
                            {/* MESSAGE VIDE (Uniquement si le chargement est terminé) */}
                            {filteredLibrary.length === 0 && !isLibraryLoading && (
                              <div className="col-span-full py-20 text-center text-[var(--text-muted)] font-medium">
                                {t('aucun-media-trouve-avec-ces-filtres')}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'search' && <DiscoverySearch user={user!} fetchLibrary={fetchLibrary} userLibrary={userLibrary} setSelectedMedia={setSelectedMedia} onToggleFavorite={handleToggleFavorite} />}
            {currentTab === 'profile' && <ProfileScreen user={user!} library={userLibrary} onLogout={async () => await supabase.auth.signOut()} onDelete={handleDeleteAccount} theme={theme} toggleTheme={toggleTheme} onOpenRanking={() => setCurrentTab('ranking')} fetchLibrary={fetchLibrary} onOpenWrapped={setWrappedYear} />}
          
            {currentTab === 'ranking' && <RankingScreen items={userLibrary} onUpdate={handleSWRUpdate} onSelect={setSelectedMedia} allUserTags={allUserTags} rankingTagFilter={rankingTagFilter} setRankingTagFilter={setRankingTagFilter} />}
            </div>
        </main>

        {currentTab !== 'profile' && currentTab !== 'ranking' && activePlayerItem && <PersistentPlayer item={activePlayerItem} onUpdate={updateProgress} />}

        {selectedMedia && (
          <DetailModal
            item={selectedMedia}
            onClose={() => setSelectedMedia(null)}
            trackedItem={userLibrary.find(i => String(i.media_id) === String(('media_id' in selectedMedia) ? selectedMedia.media_id : selectedMedia.id) && String(i.source) === String(selectedMedia.source))}            onLibraryUpdate={handleSWRUpdate}
            user={user || undefined}
            fetchLibrary={fetchLibrary}
            userLibrary={userLibrary}
          />
        )}
        
        {/* CHANGEMENT ICI : Condition sur wrappedYear au lieu de showWrapped */}
        {wrappedYear !== null && (
          <AkashaWrapped 
            library={userLibrary} 
            year={wrappedYear}
            onClose={() => setWrappedYear(null)} 
          />
        )}
      </div>
      )}
    </LangContext.Provider>
  );
}
