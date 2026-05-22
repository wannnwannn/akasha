import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createCanvas, loadImage } from "npm:@napi-rs/canvas";

const canvasWidth = 1200;
const canvasHeight = 630;

const drawText = (ctx: any, text: string, x: number, y: number, size: number, color: string, maxWidth?: number) => {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px Inter, system-ui, sans-serif`;
  const words = String(text).split(' ');
  let line = '';
  let lineHeight = size * 1.1;
  let currentY = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (maxWidth && testWidth > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
};

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const payload = await req.json().catch(() => null);
    const item = payload?.item;
    if (!item || !item.title) {
      return new Response(JSON.stringify({ error: 'Missing media item payload' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(40, 40, canvasWidth - 80, canvasHeight - 80);

    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(80, 80, 440, 470);

    if (item.cover) {
      try {
        const image = await loadImage(String(item.cover));
        ctx.drawImage(image, 90, 90, 420, 450);
      } catch (error) {
        console.warn('Impossible de charger la couverture', error);
        ctx.fillStyle = '#374151';
        ctx.fillRect(90, 90, 420, 450);
      }
    } else {
      ctx.fillStyle = '#374151';
      ctx.fillRect(90, 90, 420, 450);
    }

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(560, 130, 520, 450);

    drawText(ctx, String(item.title), 600, 190, 58, '#111827', 460);
    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillText(String(item.type || 'MEDIA').toUpperCase(), 600, 320);
    ctx.fillText(`Année : ${String(item.year || 'N/A')}`, 600, 360);
    ctx.fillText(`Statut : ${String(item.status || item.prod_status || 'Inconnu')}`, 600, 400);

    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(600, 430, 420, 14);
    ctx.fillStyle = '#c7d2fe';
    const progress = item.totalEpisodes ? Math.min(1, Number(item.progress || 0) / Number(item.totalEpisodes)) : 0;
    ctx.fillRect(600, 430, Math.max(20, progress * 420), 14);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 22px Inter, system-ui, sans-serif';
    ctx.fillText(item.totalEpisodes ? `${item.progress || 0} / ${item.totalEpisodes}` : `${item.progress || 0} progressions`, 600, 480);

    const png = await canvas.encode('png');
    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
