import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const STYLE = "children's book illustration, watercolor, soft colors, cute, magical, no text, no words";

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || theme;
  const seed = req.nextUrl.searchParams.get('seed') || '1';
  const token = process.env.TOGETHER_API_KEY;

  if (token) {
    try {
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
            response_format: 'b64_json',
            n: 1,
          }),
          signal: AbortSignal.timeout(25000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const b64 = json?.data?.[0]?.b64_json;
        if (b64) {
          const buffer = Buffer.from(b64, 'base64');
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'public, max-age=86400',
            },
          });
        }
      }
    } catch {
      // timeout ou erreur → SVG fallback
    }
  }

  return NextResponse.redirect(
    new URL(`/api/illustration/svg?theme=${encodeURIComponent(theme)}&seed=${seed}`, req.url)
  );
}
