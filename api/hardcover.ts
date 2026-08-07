import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// L'utilisation du point d'exclamation (!) indique à TypeScript que tu es certain 
// que ces variables existeront au moment de l'exécution (Vercel les fournira).
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Ajout des types VercelRequest et VercelResponse
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé : Aucun jeton fourni' });
  }

  const token = authHeader.split(' ')[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error("Tentative d'accès rejetée : Jeton invalide");
    return res.status(403).json({ error: 'Interdit : Jeton expiré ou corrompu' });
  }

  try {
    const response = await fetch('https://api.hardcover.app/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // process.env est maintenant reconnu grâce à @types/node
        'Authorization': `Bearer ${process.env.HARDCOVER_API_TOKEN}` 
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Erreur critique sur l'appel Hardcover:", error);
    return res.status(500).json({ error: 'Erreur serveur interne' });
  }
}