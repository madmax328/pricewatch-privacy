import { NextRequest, NextResponse } from 'next/server';

// Children's storybook illustration style optimized for AI
function buildStoryPrompt(theme: string, storyPrompt: string): string {
  const stylePrefix = 'children\'s book illustration, watercolor style, warm soft colors, cute, dreamy, magical, high quality, detailed';
  const styleSuffix = 'no text, no words, no letters, no watermark, centered composition';
  return `${stylePrefix}, ${storyPrompt || theme}, ${styleSuffix}`;
}

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'magic';
  const storyPrompt = req.nextUrl.searchParams.get('prompt') || '';
  const seed = parseInt(req.nextUrl.searchParams.get('seed') || '1', 10);

  const hfToken = process.env.HUGGINGFACE_API_TOKEN;

  // Try Hugging Face FLUX.1-schnell (free, fast, high quality)
  if (hfToken) {
    try {
      const fullPrompt = buildStoryPrompt(theme, storyPrompt);
      const res = await fetch(
        'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: fullPrompt,
            parameters: {
              seed,
              num_inference_steps: 4,
              width: 512,
              height: 384,
            },
          }),
          signal: AbortSignal.timeout(45000),
        }
      );

      if (res.ok) {
        const buffer = await res.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
          },
        });
      }
    } catch {
      // Fall through to SVG fallback
    }
  }

  // Fallback: redirect to SVG endpoint
  return NextResponse.redirect(
    new URL(`/api/illustration/svg?theme=${encodeURIComponent(theme)}&seed=${seed}`, req.url)
  );
}
