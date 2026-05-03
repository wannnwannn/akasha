import React, { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from 'react';
// IMPORT POUR VERCEL/LOCAL : Décommentez ces lignes dans votre vrai projet et supprimez celles avec "esm.sh"
import { createClient } from '@supabase/supabase-js';
import HCaptcha from '@hcaptcha/react-hcaptcha';

//import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
//import HCaptcha from 'https://esm.sh/@hcaptcha/react-hcaptcha@1.11.0';

import {
  Search, Plus, Check, LogOut, Tv, Film, BookOpen, Book, Trophy,
  PlayCircle, Loader2, Library, X, Minus, Edit2, Trash2, ChevronRight, Clock, EyeOff, User, FolderHeart, Sun, Moon, Flame,
  Link as LinkIcon, Bell, ExternalLink, Globe, Heart, Download, Share, Smartphone, BellRing, Calendar as CalendarIcon, BellOff, ChevronUp, ChevronDown, PenTool, Languages, Upload
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
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
    * { scrollbar-width: thin; scrollbar-color: var(--border-color) var(--bg-base); }
    .custom-scrollbar::-webkit-scrollbar { height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; margin-inline: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
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
// SYSTÈME DE TRADUCTION (i18n Dictionnaire Complet)
// ============================================================================
type Lang = 'fr' | 'en';
const LangContext = createContext<{ lang: Lang, setLang: (l: Lang) => void, t: (key: string) => string }>({ lang: 'fr', setLang: () => {}, t: () => '' });

const DICTIONARY: Record<string, Record<Lang, string>> = {
  "nav_library": { fr: "Ma Liste", en: "My List" },
  "nav_explore": { fr: "Explorer", en: "Explore" },
  "nav_profile": { fr: "Profil", en: "Profile" },
  "nav_ranking": { fr: "Classement", en: "Ranking" },
  "nav_lang": { fr: "Changer la langue", en: "Change language" },
  "nav_theme": { fr: "Changer le thème", en: "Change theme" },

  "auth_title": { fr: "Votre mémoire culturelle.", en: "Your cultural memory." },
  "auth_email": { fr: "Adresse email", en: "Email address" },
  "auth_password": { fr: "Mot de passe", en: "Password" },
  "auth_login": { fr: "Se connecter", en: "Sign in" },
  "auth_register": { fr: "Créer un compte", en: "Create account" },
  "auth_forgot": { fr: "Mot de passe oublié ?", en: "Forgot password?" },
  "auth_switch_to_login": { fr: "J'ai déjà un compte", en: "I already have an account" },
  "auth_copyright": { fr: "Distribué sous licence AGPL-3.0.", en: "Distributed under AGPL-3.0 license." },
  "auth_legal": { fr: "Mentions Légales & CGU", en: "Legal Notice & TOS" },

  "status_favorites": { fr: "Favoris", en: "Favorites" },
  "status_watching": { fr: "En cours", en: "Watching" },
  "status_planning": { fr: "À voir", en: "Plan to watch" },
  "status_completed": { fr: "Terminés", en: "Completed" },
  "status_on_hold": { fr: "En pause", en: "On Hold" },
  "status_reminders": { fr: "Rappels", en: "Reminders" },
  "status_add": { fr: "Ajouter à la liste...", en: "Add to list..." },
  "status_unknown": { fr: "Statut inconnu", en: "Unknown Status" },
  "status_finished": { fr: "Terminée", en: "Finished" },
  "status_production": { fr: "En production", en: "In Production" },
  "status_upcoming": { fr: "À venir", en: "Upcoming" },
  "status_canceled": { fr: "Annulée", en: "Canceled" },

  "type_all": { fr: "Tous les formats", en: "All formats" },
  "type_movie": { fr: "Films", en: "Movies" },
  "type_tv": { fr: "Séries", en: "TV Shows" },
  "type_anime": { fr: "Animes", en: "Anime" },
  "type_manga": { fr: "Mangas", en: "Manga" },
  "type_webtoon": { fr: "Webtoons", en: "Webtoons" },
  "type_book": { fr: "Livres", en: "Books" },
  "type_manual": { fr: "Manuel", en: "Manual" },

  "profile_logout": { fr: "Déconnexion", en: "Log out" },
  "profile_delete": { fr: "Supprimer mon compte (Action irréversible)", en: "Delete my account (Irreversible)" },
  "profile_delete_confirm": { fr: "ATTENTION: Cette action détruira toutes vos données.", en: "WARNING: This action will destroy all your data." },
  "profile_added": { fr: "Ajoutés", en: "Added" },
  "profile_finished": { fr: "Terminés", en: "Finished" },
  "profile_watchtime": { fr: "Visionnage", en: "Watch time" },
  "profile_completion": { fr: "Taux de complétion", en: "Completion Rate" },
  "profile_screens_vs_reading": { fr: "Écrans vs Lecture", en: "Screens vs Reading" },
  "profile_stats_interactions": { fr: "Basé sur vos %s interactions d'épisodes/pages.", en: "Based on your %s episode/page interactions." },
  "profile_timezone": { fr: "Fuseau Horaire (Rappels)", en: "Timezone (Reminders)" },
  "profile_timezone_desc": { fr: "Définit l'heure d'envoi matinale de vos emails de rappels.", en: "Sets the morning sending time for your reminder emails." },
  "profile_app_alerts": { fr: "Application & Alertes", en: "App & Alerts" },
  "profile_app_desc": { fr: "Installez Akasha sur votre écran d'accueil pour une expérience optimale et pour débloquer les notifications Push.", en: "Install Akasha on your home screen for an optimal experience and to unlock Push notifications." },
  "profile_app_unsupported": { fr: "Ouvrez ce site depuis le navigateur Safari (iOS) ou Chrome (Android) pour l'installer.", en: "Open this site from Safari (iOS) or Chrome (Android) browser to install it." },
  "profile_data_title": { fr: "Sauvegarde & Données", en: "Backup & Data" },
  "profile_data_desc": { fr: "Exportez votre bibliothèque pour la sauvegarder, ou importez un ancien fichier pour restaurer vos œuvres.", en: "Export your library to back it up, or import an old file to restore your media." },
  "profile_export": { fr: "Exporter", en: "Export" },
  "profile_import": { fr: "Importer", en: "Import" },
  "profile_lang": { fr: "Langue de l'app", en: "App Language" },
  "profile_theme": { fr: "Thème de l'application", en: "App Theme" },

  "ranking_organize": { fr: "Organisez vos œuvres préférées.", en: "Organize your favorite media." },
  "ranking_no_rank": { fr: "Aucun classement pour ce format", en: "No ranking for this format" },
  "ranking_desc": { fr: "Ouvrez les détails d'une œuvre de votre bibliothèque et cliquez sur l'icône trophée pour l'ajouter ici.", en: "Open the details of a media in your library and click the trophy icon to add it here." },

  "detail_trailer": { fr: "Bande-annonce", en: "Trailer" },
  "detail_release": { fr: "Date de sortie", en: "Release Date" },
  "detail_status_title": { fr: "Statut de la série", en: "Series Status" },
  "detail_notes_placeholder": { fr: "Bloc note (enregistrer automatiquement)...", en: "Notepad (auto-saved)..." },
  "detail_show_more": { fr: "... Voir plus", en: "... Show more" },
  "detail_show_less": { fr: "Voir moins", en: "Show less" },
  "query_trailer": { fr: "bande-annonce", en: "trailer" },
  "query_release": { fr: "date de sortie", en: "release date" },

  "manual_add_title": { fr: "Vous ne trouvez pas votre bonheur ?", en: "Can't find what you're looking for?" },
  "manual_add_desc": { fr: "Ajoutez manuellement l'œuvre à votre bibliothèque si elle n'existe pas dans nos bases de données.", en: "Manually add the media to your library if it doesn't exist in our databases." },
  "manual_input_title": { fr: "Titre de l'œuvre *", en: "Media Title *" },
  "manual_input_type": { fr: "Type *", en: "Type *" },
  "manual_input_status": { fr: "Statut *", en: "Status *" },
  "manual_input_episodes": { fr: "Total Épisodes / Pages", en: "Total Episodes / Pages" },
  "manual_input_runtime": { fr: "Durée (minutes)", en: "Runtime (minutes)" },
  "manual_input_cover": { fr: "Lien de l'image (Cover URL)", en: "Image Link (Cover URL)" },
  "manual_btn_submit": { fr: "Ajouter manuellement", en: "Add manually" },

  "search_placeholder": { fr: "Films, Animes, Livres...", en: "Movies, Anime, Books..." },
  "search_manual_btn": { fr: "Ajout Manuel", en: "Manual Add" },
  "search_adult_toggle": { fr: "Afficher le contenu pour adultes", en: "Show adult content" },

  "dashboard_no_media": { fr: "Aucun média trouvé avec ces filtres.", en: "No media found with these filters." },
  "reminders_no_active": { fr: "Aucun rappel actif", en: "No active reminders" },
  "reminders_desc": { fr: "Vous pouvez configurer des alertes Push sur chaque œuvre pour être notifié de la sortie des nouveaux épisodes ou chapitres.", en: "You can set up Push alerts on each media to be notified of new episodes or chapters." },
  "player_resume": { fr: "Reprendre", en: "Resume" }
};

// ============================================================================
// UTILS & TYPES
// ============================================================================
const getSavedFilter = (key: string, defaultValue: string) => {
  try { return localStorage.getItem(key) || defaultValue; } catch { return defaultValue; }
};

interface MediaItem {
  id: string; source: 'tmdb' | 'anilist' | 'shikimori' | 'openlibrary' | 'manual'; title: string; cover: string | null; type: 'movie' | 'tv' | 'anime' | 'manga' | 'webtoon' | 'book'; year: string | number; description: string; totalEpisodes?: number | null; total_episodes?: number | null; isAiring?: boolean; genres?: string[]; runtime?: number; prod_status?: string; isAdult?: boolean; creator?: string;
}
interface LibraryItem {
  id: string; user_id: string; media_id: string; source: string; title: string; cover_url: string | null; type: string; status: 'planning' | 'watching' | 'completed' | 'on_hold'; progress: number; total_episodes: number | null; rating: number | null; created_at: string; updated_at: string; description?: string; year?: string; genres?: string[]; runtime?: number; prod_status?: string; creator?: string; custom_link?: string | null; notes?: string | null; reminder_day?: string | null; reminder_time?: string | null; is_favorite?: boolean; isAiring?: boolean; isAdult?: boolean; totalEpisodes?: number | null;
}
interface UserData { id: string; email?: string; user_metadata?: { timezone?: string } }
interface SelectOption { value: string; label?: string; disabled?: boolean; }

// ============================================================================
// SERVICES API (MOTEUR)
// ============================================================================
const fetchTMDB = async (query: string, lang: Lang): Promise<MediaItem[]> => {
  if (TMDB_API_KEY === '7dfd3c0011bfe4c3bd253da99abf4e4d' && !TMDB_API_KEY) return [];
  const apiLang = lang === 'fr' ? 'fr-FR' : 'en-US';
  const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=${apiLang}&include_adult=true`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv').map((item: any) => ({
    id: String(item.id), source: 'tmdb', title: String(item.title || item.name), cover: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    type: item.media_type, year: String(item.release_date || item.first_air_date || '').split('-')[0], description: String(item.overview || ''),
    totalEpisodes: item.media_type === 'movie' ? 1 : null, isAiring: false, isAdult: item.adult === true
  }));
};

const fetchAniList = async (query: string, isUpcoming = false): Promise<MediaItem[]> => {
  const statusFilter = isUpcoming ? ', status: NOT_YET_RELEASED' : '';
  const graphqlQuery = `query ($search: String) { Page(page: 1, perPage: 15) { media(search: $search, type: ANIME${statusFilter}) { id title { romaji english native } coverImage { large } format startDate { year } description episodes status genres duration isAdult studios(isMain: true) { nodes { name } } } } }`;
  const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: graphqlQuery, variables: query ? { search: query } : {} }) });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data.Page.media.map((item: any) => ({
    id: String(item.id), source: 'anilist', title: String(item.title.english || item.title.romaji || item.title.native), cover: item.coverImage.large,
    type: 'anime', year: String(item.startDate.year || 'N/A'), description: String(item.description?.replace(/<[^>]*>?/gm, '') || ''),
    totalEpisodes: item.episodes || null, isAiring: item.status === 'RELEASING' || item.status === 'NOT_YET_RELEASED', genres: item.genres, runtime: item.duration, prod_status: String(item.status), isAdult: item.isAdult === true, creator: item.studios?.nodes?.[0]?.name || null
  }));
};

const fetchShikimori = async (query: string): Promise<MediaItem[]> => {
  const res = await fetch(`https://shikimori.one/api/mangas?search=${encodeURIComponent(query)}&limit=10`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.map((item: any) => ({
    id: String(item.id), source: 'shikimori', title: String(item.name || item.russian), cover: item.image?.original ? `https://shikimori.one${item.image.original}` : null,
    type: item.kind === 'manhwa' ? 'webtoon' : 'manga', year: item.aired_on ? String(item.aired_on).split('-')[0] : 'N/A', description: '', totalEpisodes: item.volumes || item.chapters || null, isAiring: item.status === 'ongoing', isAdult: false
  }));
};

const fetchOpenLibrary = async (query: string): Promise<MediaItem[]> => {
  if (query.length < 4) return [];
  const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.docs.map((item: any) => ({
    id: String(item.key), source: 'openlibrary', title: String(item.title), cover: item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg` : null,
    type: 'book', year: String(item.first_publish_year || 'N/A'), description: item.author_name ? item.author_name.join(', ') : '',
    totalEpisodes: item.number_of_pages_median || null, isAiring: false, genres: item.subject ? item.subject.slice(0, 3) : [], isAdult: false, creator: item.author_name ? item.author_name[0] : null
  }));
};

const mapStatusToLabel = (status: string | undefined) => {
  if (!status) return "status_unknown";
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'finished' || s === 'ended' || s === 'released') return "status_finished";
  if (s === 'ongoing' || s === 'releasing' || s === 'returning series' || s === 'in production') return "status_production";
  if (s === 'planned' || s === 'post production' || s === 'not_yet_released') return "status_upcoming";
  if (s === 'canceled') return "status_canceled";
  return "status_unknown";
};

const revalidateMediaDetails = async (item: any, lang: Lang): Promise<any | null> => {
  if (item.source === 'manual') return null;
  const targetId = item.media_id || item.id;
  const apiLang = lang === 'fr' ? 'fr-FR' : 'en-US';

  try {
    if (item.source === 'tmdb') {
      const res = await fetch(`https://api.themoviedb.org/3/${item.type}/${targetId}?api_key=${TMDB_API_KEY}&language=${apiLang}&append_to_response=credits`);
      if (!res.ok) return null;
      const data = await res.json();
      let creator = null;
      if (item.type === 'movie' && data.credits?.crew) creator = data.credits.crew.find((c: any) => c.job === 'Director')?.name;
      else if (item.type === 'tv' && data.created_by?.length > 0) creator = data.created_by[0].name;
      return { description: data.overview, total_episodes: item.type === 'tv' ? data.number_of_episodes : 1, genres: data.genres?.map((g: any) => g.name), runtime: item.type === 'movie' ? data.runtime : (data.episode_run_time?.[0] || 0), prod_status: data.status, creator: creator || item.creator };
    }
    if (item.source === 'anilist') {
      const res = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `query ($id: Int) { Media(id: $id) { description episodes status genres duration studios(isMain: true) { nodes { name } } } }`, variables: { id: parseInt(targetId) } }) });
      if (!res.ok) return null;
      const data = await res.json();
      return { description: data.data.Media.description?.replace(/<[^>]*>?/gm, ''), total_episodes: data.data.Media.episodes || item.total_episodes, genres: data.data.Media.genres, runtime: data.data.Media.duration, prod_status: data.data.Media.status, creator: data.data.Media.studios?.nodes?.[0]?.name || item.creator };
    }
  } catch (e) {} return null;
};

// ============================================================================
// COMPOSANTS UI
// ============================================================================
const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const { t } = useContext(LangContext);
  const config: Record<string, { color: string, icon: any, label: string }> = {
    movie: { color: 'bg-rose-500/20 text-rose-500', icon: Film, label: t('type_movie') },
    tv: { color: 'bg-amber-500/20 text-amber-600 dark:text-amber-400', icon: Tv, label: t('type_tv') },
    anime: { color: 'bg-orange-500/20 text-orange-600 dark:text-orange-400', icon: PlayCircle, label: t('type_anime') },
    manga: { color: 'bg-teal-500/20 text-teal-600 dark:text-teal-400', icon: BookOpen, label: t('type_manga') },
    webtoon: { color: 'bg-blue-500/20 text-blue-600 dark:text-blue-400', icon: Flame, label: t('type_webtoon') },
    book: { color: 'bg-purple-500/20 text-purple-600 dark:text-purple-400', icon: Book, label: t('type_book') },
    manual: { color: 'bg-gray-500/20 text-gray-500', icon: PenTool, label: t('type_manual') }
  };
  const current = config[type] || config.movie;
  const Icon = current.icon;
  return <span className={`flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold backdrop-blur-md ${current.color}`}><Icon size={12} strokeWidth={3} /> {current.label}</span>;
};

const CustomSelect: React.FC<{ value: string, onChange: (val: string) => void, options: SelectOption[], className?: string, placement?: 'bottom' | 'top' }> = ({ value, onChange, options, className = "", placement = 'bottom' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (selectRef.current && !selectRef.current.contains(e.target as Node)) setIsOpen(false); };
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
        <div className={`absolute z-50 left-0 right-0 ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden`}>
          <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {options.map((opt) => (
              !opt.disabled && <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors mx-1 rounded-lg ${String(value) === String(opt.value) ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:bg-[var(--border-color)] hover:text-[var(--text-main)]'}`}>{opt.label}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODAL DETAILS
// ============================================================================
const DetailModal: React.FC<{ item: any, onClose: () => void, trackedItem: any, onLibraryUpdate: any, user: any, fetchLibrary: any, userLibrary: any }> = ({ item, onClose, trackedItem, onLibraryUpdate, user, fetchLibrary, userLibrary }) => {
  const { lang, t } = useContext(LangContext);
  const [localData, setLocalData] = useState(item);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [notes, setNotes] = useState(trackedItem?.notes || '');

  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    window.history.pushState({ modal: 'detail' }, '', window.location.pathname + window.location.search + '#modal');
    const handlePopState = () => onCloseRef.current();
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.location.hash === '#modal') window.history.back();
    };
  }, []);

  useEffect(() => {
    const check = async () => {
      const fresh = await revalidateMediaDetails(item, lang);
      if (fresh) setLocalData((prev: any) => ({ ...prev, ...fresh }));
    };
    check();
  }, [item.id, lang]);

  const handleAddOrUpdate = async (status: string) => {
    if (!user) return;
    setIsActing(true);
    const total = localData.total_episodes || localData.totalEpisodes;
    if (trackedItem) {
      const updates = { status, updated_at: new Date().toISOString() };
      if (status === 'completed' && total) (updates as any).progress = total;
      await supabase.from('user_media').update(updates).match({ id: trackedItem.id });
    } else {
      await supabase.from('user_media').insert([{
        user_id: user.id, media_id: item.id, source: item.source, title: localData.title,
        cover_url: localData.cover || localData.cover_url, type: localData.type, status,
        progress: status === 'completed' ? (total || 0) : 0, year: localData.year?.toString()
      }]);
    }
    fetchLibrary();
    setIsActing(false);
    if (!trackedItem) onClose();
  };

  const title = localData.title || "";
  const trailerQ = `${title} ${t('query_trailer')}`;
  const releaseQ = `${title} ${t('query_release')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-[var(--panel-bg)] sm:border border-[var(--border-color)] rounded-t-3xl sm:rounded-3xl w-full max-w-xl shadow-2xl relative animate-in slide-in-from-bottom-10 my-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 left-4 z-20 bg-[var(--bg-base)]/80 p-2 rounded-full border border-[var(--border-color)]"><X size={20} /></button>
        <div className="p-6 sm:p-8 overflow-y-auto max-h-[90vh] custom-scrollbar">
          <div className="flex justify-center mb-6 mt-4">
             <div className="w-48 aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl border border-[var(--border-color)]">
               <img src={localData.cover || localData.cover_url} className="w-full h-full object-cover" />
               <div className="absolute top-2 left-2"><TypeBadge type={localData.type} /></div>
             </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black mb-2">{title}</h2>
            <div className="flex justify-center gap-3 mb-4">
              <button onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(trailerQ)}`, '_blank')} className="flex items-center gap-1.5 text-xs font-bold bg-[var(--bg-base)] border border-[var(--border-color)] px-3 py-2 rounded-lg hover:text-[var(--primary)] transition-colors"><PlayCircle size={14}/> {t('detail_trailer')}</button>
              <button onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(releaseQ)}`, '_blank')} className="flex items-center gap-1.5 text-xs font-bold bg-[var(--bg-base)] border border-[var(--border-color)] px-3 py-2 rounded-lg hover:text-[var(--primary)] transition-colors"><CalendarIcon size={14}/> {t('detail_release')}</button>
            </div>
            <p className={`text-sm text-[var(--text-muted)] leading-relaxed ${!showFullDesc ? 'line-clamp-3' : ''}`}>{localData.description}</p>
            {localData.description?.length > 150 && (
              <button onClick={() => setShowFullDesc(!showFullDesc)} className="text-xs font-bold text-[var(--primary)] mt-2">
                {showFullDesc ? t('detail_show_less') : t('detail_show_more')}
              </button>
            )}
          </div>

          <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)] font-bold uppercase text-center">{t('detail_status_title')}</p>
            <CustomSelect
              value={trackedItem?.status || ""}
              onChange={handleAddOrUpdate}
              options={['watching', 'planning', 'completed', 'on_hold'].map(v => ({ value: v, label: t(`status_${v}`) }))}
              className={trackedItem ? "" : "bg-[var(--primary)] !text-white border-transparent"}
            />
            {trackedItem && (
              <textarea
                placeholder={t('detail_notes_placeholder')}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={async () => {
                  await supabase.from('user_media').update({ notes }).match({ id: trackedItem.id });
                  onLibraryUpdate(trackedItem.id, { notes });
                }}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-color)] text-sm rounded-xl p-4 min-h-[100px] resize-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROFILE SCREEN
// ============================================================================
const ProfileScreen: React.FC<any> = ({ user, library, onLogout, onDelete, theme, toggleTheme, fetchLibrary }) => {
  const { t, lang, setLang } = useContext(LangContext);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    const data = JSON.stringify(library, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `akasha_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImport = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const existing = new Set(library.map((i: any) => `${i.source}-${i.media_id}`));
        const newItems = data.filter((i: any) => !existing.has(`${i.source}-${i.media_id}`)).map((i: any) => {
          const { id, created_at, updated_at, ...rest } = i;
          return { ...rest, user_id: user.id };
        });
        if (newItems.length > 0) await supabase.from('user_media').insert(newItems);
        fetchLibrary();
        alert("Importation terminée !");
      } catch (err) { alert("Erreur de format."); } finally { setIsImporting(false); }
    };
    reader.readAsText(file);
  };

  const totalAdded = library.length;
  const totalCompleted = library.filter((i: any) => i.status === 'completed').length;
  const totalInteractions = library.reduce((acc: number, i: any) => acc + (i.progress || 0), 0);
  const completionRate = totalAdded > 0 ? Math.round((totalCompleted / totalAdded) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-10 shadow-xl text-center">
        <div className="w-20 h-20 bg-[var(--bg-base)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--primary)] border border-[var(--border-color)] shadow-inner"><User size={32} /></div>
        <h2 className="text-2xl font-black">{t('nav_profile')}</h2>
        <p className="text-[var(--text-muted)] mb-8">{user.email}</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[var(--bg-base)] p-4 rounded-2xl border border-[var(--border-color)]">
            <p className="text-2xl font-black leading-none">{totalAdded}</p>
            <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] mt-1">{t('profile_added')}</p>
          </div>
          <div className="bg-[var(--bg-base)] p-4 rounded-2xl border border-[var(--border-color)]">
            <p className="text-2xl font-black leading-none">{totalCompleted}</p>
            <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] mt-1">{t('profile_finished')}</p>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl text-left mb-6">
           <h3 className="font-bold flex items-center gap-2 mb-2"><Smartphone size={20}/> {t('profile_app_alerts')}</h3>
           <p className="text-xs text-[var(--text-muted)] mb-4">{t('profile_app_desc')}</p>
           <p className="text-[10px] italic text-[var(--text-muted)]">{t('profile_app_unsupported')}</p>
        </div>

        <div className="space-y-4 text-left">
          <div className="bg-[var(--bg-base)] rounded-2xl p-6 border border-[var(--border-color)]">
            <div className="flex justify-between items-end mb-3"><h3 className="text-sm font-bold uppercase text-[var(--text-muted)]">{t('profile_stats_completion')}</h3><span className="text-3xl font-black text-emerald-500">{completionRate}%</span></div>
            <div className="h-3 w-full bg-[var(--panel-bg)] rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${completionRate}%` }} /></div>
            <p className="text-[11px] text-[var(--text-muted)] mt-2">{totalCompleted} {t('profile_stats_completed_text')} {totalAdded} {t('profile_stats_added_text')}</p>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/20 p-5 rounded-2xl">
            <h3 className="font-bold flex items-center gap-2 mb-1"><FolderHeart size={18} /> {t('profile_data_title')}</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">{t('profile_data_desc')}</p>
            <div className="flex gap-2">
              <Button onClick={handleExport} className="flex-1 bg-purple-600 !py-2.5"><Download size={16}/> {t('profile_export')}</Button>
              <div className="flex-1 relative">
                <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer" />
                <Button variant="secondary" className="w-full !py-2.5">{isImporting ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>} {t('profile_import')}</Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-color)]">
            <span className="font-bold flex items-center gap-2"><Languages size={18} className="text-[var(--primary)]"/> {t('profile_lang')}</span>
            <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="p-2.5 bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl font-black text-xs">{lang.toUpperCase()}</button>
          </div>

          <div className="flex items-center justify-between p-4 bg-[var(--bg-base)] rounded-2xl border border-[var(--border-color)]">
            <span className="font-bold flex items-center gap-2">{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>} {t('profile_theme')}</span>
            <button onClick={toggleTheme} className="p-2.5 bg-[var(--panel-bg)] border border-[var(--border-color)] rounded-xl font-black text-xs">{theme.toUpperCase()}</button>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[var(--border-color)] space-y-3">
          <Button variant="secondary" className="w-full" onClick={onLogout}><LogOut size={18}/> {t('profile_logout')}</Button>
          <button onClick={() => { if(window.confirm(t('profile_delete_confirm'))) onDelete(); }} className="text-xs font-bold text-[var(--text-muted)] hover:text-red-500 transition-colors">{t('profile_delete')}</button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// DASHBOARD
// ============================================================================
const Dashboard = ({ filteredLibrary, t, setSelectedMedia, updateProgress }: any) => {
  if (filteredLibrary.length === 0) {
    return <div className="py-20 text-center text-[var(--text-muted)] font-medium">{t('dashboard_no_media')}</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
      {filteredLibrary.map((item: any) => {
        const total = item.total_episodes;
        const percent = total ? Math.min(100, (item.progress / total) * 100) : 0;
        return (
          <div key={item.id} onClick={() => setSelectedMedia(item)} className="cursor-pointer bg-[var(--panel-bg)] rounded-2xl overflow-hidden border border-[var(--border-color)] group hover:border-[var(--primary)] transition-all flex flex-row sm:flex-col shadow-md">
            <div className="w-28 sm:w-full shrink-0 relative aspect-[2/3] bg-[var(--bg-base)] border-r sm:border-r-0 sm:border-b border-[var(--border-color)]">
              <img src={item.cover_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute top-2 left-2 hidden sm:block"><TypeBadge type={item.type} /></div>
            </div>
            <div className="p-4 flex flex-col flex-1 min-w-0 justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm sm:text-base line-clamp-2 leading-tight mb-1">{item.title}</h3>
                <p className="text-[10px] font-mono text-[var(--text-muted)]">{item.progress} / {total || '?'}</p>
              </div>
              <div className="flex items-center gap-2 mt-auto" onClick={e => e.stopPropagation()}>
                <div className="flex-1 h-1.5 bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border-color)]">
                  <div className="h-full bg-[var(--primary)] transition-all" style={{ width: `${percent}%` }} />
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => updateProgress(item, -1)} className="p-1.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg hover:text-[var(--primary)]"><Minus size={14}/></button>
                  <button onClick={() => updateProgress(item, 1)} className="p-1.5 bg-[var(--primary)] text-white rounded-lg"><Plus size={14}/></button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// APPLICATION PRINCIPALE
// ============================================================================
export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'search' | 'profile' | 'ranking'>('dashboard');
  const [userLibrary, setUserLibrary] = useState<LibraryItem[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [lang, setLang] = useState<Lang>(() => getSavedFilter('akasha_lang', 'fr') as Lang);

  const [activeFilter, setActiveFilter] = useState<'watching'|'planning'|'completed'|'on_hold'|'favorites'|'reminders'>(
    () => getSavedFilter('akasha_activeFilter', 'watching') as any
  );
  const [formatFilter, setFormatFilter] = useState<string>(
    () => getSavedFilter('akasha_formatFilter', 'all')
  );

  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [lastInteractedId, setLastInteractedId] = useState<string | null>(null);

  const t = useCallback((key: string, param?: string) => {
    let text = DICTIONARY[key]?.[lang] || key;
    if (param) text = text.replace('%s', param);
    return text;
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem('akasha_activeFilter', activeFilter);
      localStorage.setItem('akasha_formatFilter', formatFilter);
      localStorage.setItem('akasha_lang', lang);
    } catch {}
  }, [activeFilter, formatFilter, lang]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setUser(session?.user ?? null); setAuthLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const fetchLibrary = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('user_media').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (!error && data) {
      setUserLibrary(data);
      setLastInteractedId(prev => prev || (data.length > 0 ? data[0].id : null));
    }
  }, [user]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const updateProgress = async (item: LibraryItem, increment: number) => {
    const newProgress = Math.max(0, item.progress + increment);
    if (item.total_episodes && newProgress > item.total_episodes) return;
    setLastInteractedId(item.id);
    const newDate = new Date().toISOString();
    setUserLibrary(prev => prev.map(l => l.id === item.id ? { ...l, progress: newProgress, updated_at: newDate } : l));
    await supabase.from('user_media').update({ progress: newProgress, updated_at: newDate }).match({ id: item.id });
  };

  const handleSWRUpdate = (id: string, updates: any) => setUserLibrary(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  const activePlayerItem = useMemo(() => userLibrary.find(i => i.id === lastInteractedId) || null, [userLibrary, lastInteractedId]);

  if (authLoading) return <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center"><GlobalStyles/><Loader2 className="animate-spin text-[var(--primary)]" size={48} /></div>;
  if (!user) return <LangContext.Provider value={{ lang, setLang, t }}><GlobalStyles/><AuthScreen onLogin={setUser} /></LangContext.Provider>;

  const filteredLibrary = userLibrary.filter(item => {
    if (activeFilter === 'reminders') return item.reminder_day !== null;
    const match = formatFilter === 'all' || item.type === formatFilter;
    if (activeFilter === 'favorites') return item.is_favorite && match;
    return item.status === activeFilter && match;
  });

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <div className={`${theme} min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] transition-colors duration-300 pb-28 sm:pb-12`}>
        <GlobalStyles />
        <nav className="fixed bottom-4 inset-x-6 mx-auto max-w-[300px] sm:max-w-none sm:top-6 sm:bottom-auto sm:left-1/2 sm:-translate-x-1/2 z-50 px-6 py-3 bg-[var(--panel-bg)]/95 backdrop-blur-xl border border-[var(--border-color)] rounded-3xl sm:rounded-full flex justify-between items-center sm:gap-12 shadow-2xl">
          <button onClick={() => setCurrentTab('dashboard')} className={`${currentTab === 'dashboard' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} title={t('nav_library')}><Library size={24} /></button>
          <button onClick={() => setCurrentTab('search')} className={`${currentTab === 'search' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} title={t('nav_explore')}><Search size={24} /></button>
          <button onClick={() => setCurrentTab('profile')} className={`${currentTab === 'profile' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`} title={t('nav_profile')}><User size={24} /></button>
          <div className="hidden sm:block w-px h-6 bg-[var(--border-color)]"></div>
          <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')} className="hidden sm:block text-xs font-black text-[var(--text-muted)]">{lang.toUpperCase()}</button>
        </nav>

        <main className="max-w-7xl mx-auto px-4 pt-6 sm:pt-28">
          {currentTab === 'dashboard' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex flex-col sm:flex-row justify-between gap-4 mb-2">
                <div className="flex gap-1 overflow-x-auto custom-scrollbar">
                  {['watching', 'planning', 'completed', 'on_hold', 'favorites', 'reminders'].map((f: any) => (
                    <button key={f} onClick={() => setActiveFilter(f)} className={`px-4 py-2.5 rounded-t-xl text-sm font-bold whitespace-nowrap transition-all ${activeFilter === f ? 'bg-[var(--panel-bg)] border-t-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>
                      {t(`status_${f}`)}
                    </button>
                  ))}
                </div>
                <div className="w-full sm:w-48">
                  <CustomSelect value={formatFilter} onChange={setFormatFilter} options={['all', 'movie', 'tv', 'anime', 'manga', 'webtoon', 'book'].map(v => ({ value: v, label: t(`type_${v}`) }))} />
                </div>
              </div>
              <div className={`p-4 sm:p-6 rounded-b-2xl border bg-[var(--panel-bg)] ${activeFilter === 'reminders' ? 'border-amber-500' : 'border-[var(--border-color)]'}`}>
                <Dashboard filteredLibrary={filteredLibrary} t={t} setSelectedMedia={setSelectedMedia} updateProgress={updateProgress} />
              </div>
            </div>
          )}

          {currentTab === 'search' && (
             <div className="space-y-6 animate-in fade-in duration-500">
                <div className="sticky top-0 sm:top-24 z-10 bg-[var(--bg-base)]/90 backdrop-blur-xl pb-4 pt-4 flex flex-col sm:flex-row gap-3 border-b border-[var(--border-color)]">
                   <Input icon={Search} placeholder={t('search_placeholder')} value="" onChange={() => {}} autoFocus />
                </div>
                {/* Formulaire manuel en bas de page comme discuté précédemment */}
                <ManualAddForm user={user} fetchLibrary={fetchLibrary} />
             </div>
          )}

          {currentTab === 'profile' && <ProfileScreen user={user} library={userLibrary} onLogout={() => supabase.auth.signOut()} onDelete={() => {}} theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} fetchLibrary={fetchLibrary} />}
        </main>

        {currentTab !== 'profile' && activePlayerItem && <PersistentPlayer item={activePlayerItem} onUpdate={updateProgress} />}

        {selectedMedia && (
          <DetailModal
            item={selectedMedia}
            onClose={() => setSelectedMedia(null)}
            trackedItem={userLibrary.find((i: any) => String(i.media_id) === String(selectedMedia.id || selectedMedia.media_id))}
            onLibraryUpdate={handleSWRUpdate}
            user={user}
            fetchLibrary={fetchLibrary}
            userLibrary={userLibrary}
          />
        )}
      </div>
    </LangContext.Provider>
  );
}
