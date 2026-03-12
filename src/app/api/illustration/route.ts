import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const STYLE = "children's book illustration, watercolor, soft colors, cute, magical, no text, no words";

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || theme;
  const seed = req.nextUrl.searchParams.get('seed') || '1';

  const prompt = `${STYLE}, ${storyPrompt}`;
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=384&nologo=true&seed=${seed}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(25000) });

  if (!res.ok) {
    return new NextResponse(`Pollinations error ${res.status}`, { status: 502 });
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
