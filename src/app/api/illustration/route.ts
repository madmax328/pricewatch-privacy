import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const STYLE = "children's book illustration, watercolor, soft colors, cute, magical, no text, no words";

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || theme;
  const seed = req.nextUrl.searchParams.get('seed') || '1';
  const token = process.env.TOGETHER_API_KEY;

  if (!token) {
    return new NextResponse('TOGETHER_API_KEY manquante', { status: 500 });
  }

  const prompt = `${STYLE}, ${storyPrompt}`;
  const res = await fetch(
    'https://api.together.xyz/v1/images/generations',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell-Free',
        prompt,
        width: 512,
        height: 384,
        steps: 4,
        seed: parseInt(seed),
        response_format: 'url',
        n: 1,
      }),
      signal: AbortSignal.timeout(25000),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return new NextResponse(`Together AI error ${res.status}: ${err}`, { status: 502 });
  }

  const json = await res.json();
  const url = json?.data?.[0]?.url;

  if (!url) {
    return new NextResponse('Pas d\'URL dans la réponse Together AI', { status: 502 });
  }

  return NextResponse.redirect(url);
}
