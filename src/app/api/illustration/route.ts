import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const HF_URL = 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';

const NO_TEXT = 'no text, no words, no letters, no watermark';

function styleForAge(age: number): string {
  if (age <= 4)  return `children's picture book illustration, watercolor, soft pastel colors, very cute, simple shapes, ${NO_TEXT}`;
  if (age <= 7)  return `children's book illustration, colorful watercolor, whimsical, friendly characters, ${NO_TEXT}`;
  if (age <= 10) return `illustrated storybook, digital painting, vibrant colors, adventurous, detailed, ${NO_TEXT}`;
  if (age <= 13) return `young adult graphic novel style, dynamic composition, cinematic lighting, detailed illustration, ${NO_TEXT}`;
  return `young adult illustration, semi-realistic digital art, dramatic lighting, detailed, cinematic, ${NO_TEXT}`;
}

async function fetchHF(prompt: string, seed: number, token: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(HF_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: prompt, parameters: { seed } }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) {
    return new NextResponse('HUGGINGFACE_API_TOKEN manquante', { status: 500 });
  }

  const storyPrompt = req.nextUrl.searchParams.get('prompt') || 'magic adventure';
  const seed = parseInt(req.nextUrl.searchParams.get('seed') || '1');
  const age = parseInt(req.nextUrl.searchParams.get('age') || '8');
  const style = styleForAge(age);

  try {
    let res = await fetchHF(`${style}, ${storyPrompt}`, seed, token, 15000);

    // Modèle froid (503) → attendre et réessayer
    if (res.status === 503) {
      const json = await res.json().catch(() => ({})) as { estimated_time?: number };
      const wait = Math.min((json.estimated_time ?? 10) * 1000, 12000);
      await new Promise(r => setTimeout(r, wait));
      res = await fetchHF(storyPrompt, seed, token, 15000);
    }

    if (!res.ok) {
      const err = await res.text().catch(() => '(pas de détail)');
      return new NextResponse(`HF ${res.status}: ${err}`, { status: 502 });
    }

    const ct = res.headers.get('content-type') || 'image/jpeg';
    if (!ct.startsWith('image/')) {
      const text = await res.text();
      return new NextResponse(`Réponse non-image: ${text}`, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' },
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(`Erreur: ${msg}`, { status: 502 });
  }
}
