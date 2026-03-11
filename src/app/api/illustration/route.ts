import { NextRequest, NextResponse } from 'next/server';

const STYLE =
  "children's book illustration, watercolor style, soft warm colors, cute, dreamy, magical";
const NEG = 'no text, no words, no letters, no watermark';

function buildPrompt(theme: string, storyPrompt: string): string {
  return `${STYLE}, ${storyPrompt || theme} scene, ${NEG}`;
}

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || '';
  const seed = parseInt(req.nextUrl.searchParams.get('seed') || '1', 10);

  const prompt = buildPrompt(theme, storyPrompt);

  // Pollinations.ai: gratuit, sans clé, rapide (~2-5s)
  // La fonction retourne un redirect instantané → pas de timeout Vercel Hobby
  const pollinationsUrl =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=512&height=384&seed=${seed}&nologo=true&model=flux&enhance=false`;

  return NextResponse.redirect(pollinationsUrl, {
    headers: {
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
