import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const STYLE = "children's book illustration, watercolor, soft colors, cute, magical, no text";

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || theme;
  const seed = req.nextUrl.searchParams.get('seed') || '1';
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (token) {
    try {
      const prompt = `${STYLE}, ${storyPrompt}`;
      const res = await fetch(
        'https://api-inference.huggingface.co/models/stabilityai/sdxl-turbo',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: prompt, parameters: { seed: parseInt(seed), width: 512, height: 384 } }),
          signal: AbortSignal.timeout(8000), // timeout court : si le modèle est chaud ça passe, sinon SVG
        }
      );

      if (res.ok) {
        const ct = res.headers.get('content-type') || 'image/jpeg';
        if (ct.startsWith('image/')) {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 1000) {
            return new NextResponse(buffer, {
              headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' },
            });
          }
        }
      }
    } catch {
      // timeout ou erreur → SVG
    }
  }

  return NextResponse.redirect(
    new URL(`/api/illustration/svg?theme=${encodeURIComponent(theme)}&seed=${seed}`, req.url)
  );
}
