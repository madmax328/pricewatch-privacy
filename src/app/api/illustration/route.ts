import { NextRequest, NextResponse } from 'next/server';

// Edge runtime : timeout 30s sur Vercel Hobby (vs 10s serverless)
export const runtime = 'edge';

const ILLUS_STYLE =
  "children's book illustration, watercolor style, soft warm colors, cute, dreamy, magical, no text, no words";

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || theme;
  const seed = req.nextUrl.searchParams.get('seed') || '1';

  const prompt = `${ILLUS_STYLE}, ${storyPrompt}`;

  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=512&height=384&seed=${seed}&nologo=true&model=flux&enhance=false`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.startsWith('image/')) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  } catch {
    // timeout ou erreur → fallback SVG
  }

  return NextResponse.redirect(
    new URL(`/api/illustration/svg?theme=${encodeURIComponent(theme)}&seed=${seed}`, req.url)
  );
}
