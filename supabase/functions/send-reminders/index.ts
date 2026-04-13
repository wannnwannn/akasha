import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails('mailto:contact@ton-domaine.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: subs, error: subsError } = await supabase.from('push_subscriptions').select('user_id, subscription');
    if (subsError) throw new Error(subsError.message);
    if (!subs || subs.length === 0) return new Response(JSON.stringify({ message: "Aucun abonné" }), { status: 200 });

    const userSubs = subs.reduce((acc, row) => {
      if (!acc[row.user_id]) acc[row.user_id] = [];
      acc[row.user_id].push(row.subscription);
      return acc;
    }, {} as Record<string, any[]>);

    const currentGlobalWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    let pushSentCount = 0;

    for (const userId of Object.keys(userSubs)) {
      const { data: userAdmin } = await supabase.auth.admin.getUserById(userId);
      const tz = userAdmin?.user?.user_metadata?.timezone || 'Europe/Paris';

      const now = new Date();
      // On récupère la date au format local de l'utilisateur (YYYY-MM-DD)
      const userTodayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now);
      const hour = parseInt(hourStr, 10);

      const dayStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now);
      const dayMap: Record<string, string> = { 'Sun': 'Dimanche', 'Mon': 'Lundi', 'Tue': 'Mardi', 'Wed': 'Mercredi', 'Thu': 'Jeudi', 'Fri': 'Vendredi', 'Sat': 'Samedi' };
      const currentDay = dayMap[dayStr];

      // ATTENTION : Remplacer "true" par ton heure d'envoi voulue. ex: "hour === 8"
      if (true) {
        const { data: userMedia } = await supabase.from('user_media').select('title, reminder_day, reminder_time').eq('user_id', userId).not('reminder_day', 'is', null);
        if (!userMedia) continue;

        const todaysReminders = userMedia.filter(media => {
          try {
            const parsed = JSON.parse(media.reminder_day);
            // 1. LOGIQUE DE DATE EXACTE
            if (parsed.date) {
               return parsed.date === userTodayStr;
            }
            // 2. LOGIQUE HEBDOMADAIRE CLASSIQUE
            if (parsed.days && Array.isArray(parsed.days)) {
              if (!parsed.days.includes(currentDay)) return false;
              const freq = parsed.frequency ? parseInt(parsed.frequency) : 1;
              if (freq > 1 && (currentGlobalWeek % freq !== 0)) return false;
              return true;
            }
            return false;
          } catch(e) {
            return media.reminder_day === currentDay; // Fallback
          }
        });

        if (todaysReminders.length > 0) {
          const titles = todaysReminders.map(m => m.title).join(', ');
          const payload = JSON.stringify({ title: "Akasha : Vos sorties du jour !", body: `Prévu aujourd'hui : ${titles}`, url: "/" });

          for (const subscription of userSubs[userId]) {
            try {
              await webpush.sendNotification(subscription, payload);
              pushSentCount++;
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                await supabase.from('push_subscriptions').delete().eq('subscription->>endpoint', subscription.endpoint);
              }
            }
          }
        }
      }
    }
    return new Response(JSON.stringify({ success: true, push_sent: pushSentCount }), { status: 200 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
