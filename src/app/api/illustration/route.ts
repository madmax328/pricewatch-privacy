import { NextRequest, NextResponse } from 'next/server';

// Extend Vercel function timeout to 60s (requires Pro plan; Hobby = 10s max)
export const maxDuration = 60;

const STYLE =
  "children's book illustration, watercolor style, soft warm colors, cute, dreamy, magical, high quality";
const NO_TEXT = 'no text, no words, no letters, no watermark, centered composition';

function buildPrompt(theme: string, storyPrompt: string): string {
  return `${STYLE}, ${storyPrompt || theme} scene, ${NO_TEXT}`;
}

async function tryModel(
  token: string,
  model: string,
  prompt: string,
  seed: number,
  timeoutMs: number
): Promise<ArrayBuffer | null> {
  const body = JSON.stringify({
    inputs: prompt,
    parameters: { seed, width: 512, height: 384 },
  });
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });

  // Cold start — wait then retry once
  if (res.status === 503) {
    const json = await res.json().catch(() => ({}));
    const wait = Math.min((json.estimated_time ?? 15) * 1000, 20000);
    await new Promise((r) => setTimeout(r, wait));
    const retry = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!retry.ok) return null;
    const buf = await retry.arrayBuffer();
    return buf.byteLength > 1000 ? buf : null;
  }

  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  return buf.byteLength > 1000 ? buf : null;
}

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || '';
  const seed = parseInt(req.nextUrl.searchParams.get('seed') || '1', 10);
  const hfToken = process.env.HUGGINGFACE_API_TOKEN;

  if (hfToken) {
    try {
      const prompt = buildPrompt(theme, storyPrompt);

      // 1st try: sdxl-turbo (2-4 seconds, good quality)
      let buffer = await tryModel(
        hfToken,
        'stabilityai/sdxl-turbo',
        prompt,
        seed,
        15000
      );

      // 2nd try: SDXL base if turbo failed
      if (!buffer) {
        buffer = await tryModel(
          hfToken,
          'stabilityai/stable-diffusion-xl-base-1.0',
          prompt,
          seed,
          45000
        );
      }

      if (buffer) {
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
          },
        });
      }
    } catch {
      // Fall through to SVG
    }
  }

  // Fallback: SVG thématique
  return NextResponse.redirect(
    new URL(`/api/illustration/svg?theme=${encodeURIComponent(theme)}&seed=${seed}`, req.url)
  );
}
