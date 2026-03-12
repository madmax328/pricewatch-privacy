import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const STYLE = "children's book illustration, watercolor, soft colors, cute, magical, no text, no words";

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || theme;
  const seed = req.nextUrl.searchParams.get('seed') || '1';
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    return new NextResponse('HUGGINGFACE_API_TOKEN manquante', { status: 500 });
  }

  const prompt = `${STYLE}, ${storyPrompt}`;
  const HF_URL = 'https://api-inference.huggingface.co/models/stabilityai/sdxl-turbo';
  const body = JSON.stringify({ inputs: prompt, parameters: { seed: parseInt(seed) } });
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  let res = await fetch(HF_URL, { method: 'POST', headers, body, signal: AbortSignal.timeout(12000) });

  // Modèle en train de charger (cold start) — attendre et réessayer une fois
  if (res.status === 503) {
    const json = await res.json().catch(() => ({})) as { estimated_time?: number };
    const wait = Math.min((json.estimated_time ?? 8) * 1000, 10000);
    await new Promise(r => setTimeout(r, wait));
    res = await fetch(HF_URL, { method: 'POST', headers, body, signal: AbortSignal.timeout(12000) });
  }

  if (!res.ok) {
    const err = await res.text();
    return new NextResponse(`HuggingFace ${res.status}: ${err}`, { status: 502 });
  }

  const ct = res.headers.get('content-type') || 'image/jpeg';
  if (!ct.startsWith('image/')) {
    const text = await res.text();
    return new NextResponse(`Réponse non-image (${ct}): ${text}`, { status: 502 });
  }

  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': ct,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
