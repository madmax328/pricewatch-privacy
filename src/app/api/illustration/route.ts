import { NextRequest, NextResponse } from 'next/server';

const STYLE =
  "children's book illustration, watercolor style, soft warm colors, cute, dreamy, magical, high quality";
const NO_TEXT = 'no text, no words, no letters, no watermark, centered composition';

function buildPrompt(theme: string, storyPrompt: string): string {
  return `${STYLE}, ${storyPrompt || theme} scene, ${NO_TEXT}`;
}

async function callHuggingFace(
  token: string,
  model: string,
  prompt: string,
  seed: number
): Promise<ArrayBuffer | null> {
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { seed, width: 512, height: 384 },
    }),
    signal: AbortSignal.timeout(60000),
  });

  // Model is loading (cold start) — wait and retry once
  if (res.status === 503) {
    const json = await res.json().catch(() => ({}));
    const wait = Math.min((json.estimated_time ?? 20) * 1000, 30000);
    await new Promise((r) => setTimeout(r, wait));

    const retry = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { seed, width: 512, height: 384 },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!retry.ok) return null;
    return retry.arrayBuffer();
  }

  if (!res.ok) return null;
  return res.arrayBuffer();
}

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || '';
  const seed = parseInt(req.nextUrl.searchParams.get('seed') || '1', 10);

  const hfToken = process.env.HUGGINGFACE_API_TOKEN;

  if (hfToken) {
    try {
      const prompt = buildPrompt(theme, storyPrompt);
      // SDXL is public (no terms acceptance needed), high quality
      const buffer = await callHuggingFace(
        hfToken,
        'stabilityai/stable-diffusion-xl-base-1.0',
        prompt,
        seed
      );

      if (buffer && buffer.byteLength > 1000) {
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

  // Fallback: SVG
  return NextResponse.redirect(
    new URL(`/api/illustration/svg?theme=${encodeURIComponent(theme)}&seed=${seed}`, req.url)
  );
}
