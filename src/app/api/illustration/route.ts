import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const STYLE = "children's book illustration, watercolor, soft colors, cute, magical, no text";

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || theme;
  const seed = parseInt(req.nextUrl.searchParams.get('seed') || '1', 10);
  const token = process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    return NextResponse.redirect(
      new URL(`/api/illustration/svg?theme=${encodeURIComponent(theme)}&seed=${seed}`, req.url)
    );
  }

  const prompt = `${STYLE}, ${storyPrompt}`;
  const body = JSON.stringify({ inputs: prompt, parameters: { seed, width: 512, height: 384 } });
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1er essai
  let res = await fetch('https://api-inference.huggingface.co/models/stabilityai/sdxl-turbo', {
    method: 'POST', headers, body, signal: AbortSignal.timeout(20000),
  });

  // Cold start : on attend et on réessaie une fois
  if (res.status === 503) {
    const json = await res.json().catch(() => ({})) as { estimated_time?: number };
    await new Promise(r => setTimeout(r, Math.min((json.estimated_time ?? 10) * 1000, 15000)));
    res = await fetch('https://api-inference.huggingface.co/models/stabilityai/sdxl-turbo', {
      method: 'POST', headers, body, signal: AbortSignal.timeout(20000),
    });
  }

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

  return NextResponse.redirect(
    new URL(`/api/illustration/svg?theme=${encodeURIComponent(theme)}&seed=${seed}`, req.url)
  );
}
