// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7"; // Le nouveau moteur de transport

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

// Configuration obligatoire pour l'identification auprès d'Apple/Google
webpush.setVapidDetails(
  'mailto:etanefidji@gmail.com', // Mets un email valide lié à ton projet
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  console.log("🚀 [DÉBUT] Exécution de l'Edge Function (Web Push)");

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Récupération optimisée : On ne prend QUE les utilisateurs qui ont un jeton Push actif
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('user_id, subscription');

    if (subsError) throw new Error(`Erreur récupération abonnements: ${subsError.message}`);
    if (!subs || subs.length === 0) {
      console.log("Aucun abonnement Push trouvé. Arrêt du script.");
      return new Response(JSON.stringify({ message: "Aucun abonné" }), { status: 200 });
    }

    // Regrouper les abonnements par utilisateur (un user peut avoir un PC et un mobile)
    const userSubs = subs.reduce((acc, row) => {
      if (!acc[row.user_id]) acc[row.user_id] = [];
      acc[row.user_id].push(row.subscription);
      return acc;
    }, {} as Record<string, any[]>);

    const currentGlobalWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    let pushSentCount = 0;

    // 2. Traitement des rappels pour chaque utilisateur abonné
    for (const userId of Object.keys(userSubs)) {
      const { data: userAdmin } = await supabase.auth.admin.getUserById(userId);
      const tz = userAdmin?.user?.user_metadata?.timezone || 'Europe/Paris';

      const now = new Date();
      const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hour12: false }).format(now);
      const hour = parseInt(hourStr, 10); // Heure de l'utilisateur

      const dayStr = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(now);
      const dayMap: Record<string, string> = { 'Sun': 'Dimanche', 'Mon': 'Lundi', 'Tue': 'Mardi', 'Wed': 'Mercredi', 'Thu': 'Jeudi', 'Fri': 'Vendredi', 'Sat': 'Samedi' };
      const currentDay = dayMap[dayStr];

      // ATTENTION: Remplace "true" par "hour === 8" (ou l'heure que tu veux) après tes tests
      if (true) {
        const { data: userMedia } = await supabase
          .from('user_media')
          .select('title, reminder_day, reminder_time')
          .eq('user_id', userId)
          .not('reminder_day', 'is', null);

        if (!userMedia) continue;

        const todaysReminders = userMedia.filter(media => {
          try {
            const parsed = JSON.parse(media.reminder_day);
            if (!parsed.days || !Array.isArray(parsed.days)) return false;
            if (!parsed.days.includes(currentDay)) return false;
            const freq = parsed.frequency ? parseInt(parsed.frequency) : 1;
            if (freq > 1 && (currentGlobalWeek % freq !== 0)) return false;
            return true;
          } catch(e) {
            return media.reminder_day === currentDay; // Fallback vieux format
          }
        });

        if (todaysReminders.length > 0) {
          const titles = todaysReminders.map(m => m.title).join(', ');

          // Le payload strict attendu par le Service Worker côté frontend
          const payload = JSON.stringify({
            title: "Akasha : Vos sorties du jour !",
            body: `Prévu aujourd'hui : ${titles}`,
            url: "/" // S'ouvrira dans la PWA
          });

          // Envoi de la notification sur tous les appareils de cet utilisateur
          for (const subscription of userSubs[userId]) {
            try {
              await webpush.sendNotification(subscription, payload);
              pushSentCount++;
              console.log(`✅ Push envoyé à l'utilisateur ${userId}`);
            } catch (err: any) {
              console.error(`❌ Erreur d'envoi Push pour ${userId}:`, err.message);

              // NETTOYAGE DES MORTS : 410 Gone ou 404 Not Found signifie que l'abonnement a été révoqué
              if (err.statusCode === 410 || err.statusCode === 404) {
                console.log(`🗑️ Nettoyage du jeton mort pour ${userId}`);
                await supabase
                  .from('push_subscriptions')
                  .delete()
                  .eq('subscription->>endpoint', subscription.endpoint);
              }
            }
          }
        }
      }
    }

    console.log(`🏁 [FIN] Exécution terminée. ${pushSentCount} notifications envoyées.`);
    return new Response(JSON.stringify({ success: true, push_sent: pushSentCount }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("🚨 ERREUR FATALE :", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
