import { NextRequest, NextResponse } from 'next/server';
import { generateIllustrationSvg } from '@/lib/illustrations';

export async function GET(req: NextRequest) {
  const theme = req.nextUrl.searchParams.get('theme') || 'dragons';
  const seed = parseInt(req.nextUrl.searchParams.get('seed') || '1', 10);

  const svgDataUrl = generateIllustrationSvg(theme, seed);
  // Extract SVG from data URL
  const svgContent = decodeURIComponent(svgDataUrl.replace('data:image/svg+xml;charset=utf-8,', ''));

  return new NextResponse(svgContent, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
