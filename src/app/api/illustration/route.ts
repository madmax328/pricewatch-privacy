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
        n: 1,
      }),
      signal: AbortSignal.timeout(25000),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    return new NextResponse(`Together AI ${res.status}: ${err}`, { status: 502 });
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;

  if (!b64) {
    return new NextResponse(`Réponse inattendue: ${JSON.stringify(json)}`, { status: 502 });
  }

  // Edge runtime n'a pas Buffer — décodage manuel base64
  const binaryStr = atob(b64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
