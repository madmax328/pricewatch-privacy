import { NextRequest, NextResponse } from 'next/server';
import { put, head } from '@vercel/blob';
import { connectToDatabase } from '@/lib/mongodb';
import Story from '@/models/Story';

// Node.js runtime — needed for MongoDB + Vercel Blob
export const runtime = 'nodejs';
export const maxDuration = 60;

const HF_URL = 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';
const NO_TEXT = 'no text, no words, no letters, no watermark';

function styleForAge(age: number): string {
  if (age <= 4)  return `children's picture book illustration, watercolor, soft pastel colors, very cute, simple shapes, ${NO_TEXT}`;
  if (age <= 7)  return `children's book illustration, colorful watercolor, whimsical, friendly characters, ${NO_TEXT}`;
  if (age <= 10) return `illustrated storybook, digital painting, vibrant colors, adventurous, detailed, ${NO_TEXT}`;
  if (age <= 13) return `young adult graphic novel style, dynamic composition, cinematic lighting, detailed illustration, ${NO_TEXT}`;
  return `young adult illustration, semi-realistic digital art, dramatic lighting, detailed, cinematic, ${NO_TEXT}`;
}

async function fetchHF(prompt: string, seed: number, token: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(HF_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          seed,
          negative_prompt:
            'text, words, letters, alphabet, numbers, watermark, label, caption, title, signature, logo, subtitle, writing, font, typography, inscription',
        },
      }),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const token = process.env.HUGGINGFACE_API_TOKEN;
  if (!token) return new NextResponse('HUGGINGFACE_API_TOKEN manquante', { status: 500 });

  const { searchParams } = req.nextUrl;
  const storyId = searchParams.get('storyId');
  const pageIndex = searchParams.get('page') ?? '0';
  const prompt = searchParams.get('prompt') || 'magic adventure';
  const seed = parseInt(searchParams.get('seed') || '1');
  const age = parseInt(searchParams.get('age') || '8');

  // --- 1. If storyId provided: check Blob cache first ---
  if (storyId) {
    const blobPath = `illustrations/${storyId}/${pageIndex}.jpg`;

    // Check if already stored in Blob
    try {
      const existing = await head(blobPath);
      if (existing?.url) {
        // Already cached — update DB if needed then redirect
        await connectToDatabase();
        await Story.updateOne(
          { _id: storyId, [`illustrationUrls.${pageIndex}`]: { $exists: false } },
          { $set: { [`illustrationUrls.${pageIndex}`]: existing.url } }
        );
        return NextResponse.redirect(existing.url, { status: 302 });
      }
    } catch {
      // Not found in Blob → generate below
    }
  }

  // --- 2. Generate from HuggingFace ---
  const style = styleForAge(age);
  const fullPrompt = `${style}, ${prompt}`;

  try {
    let res = await fetchHF(fullPrompt, seed, token, 20000);

    if (res.status === 503) {
      const json = await res.json().catch(() => ({})) as { estimated_time?: number };
      const wait = Math.min((json.estimated_time ?? 10) * 1000, 12000);
      await new Promise(r => setTimeout(r, wait));
      res = await fetchHF(fullPrompt, seed, token, 20000);
    }

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return new NextResponse(`HF ${res.status}: ${err}`, { status: 502 });
    }

    const ct = res.headers.get('content-type') || 'image/jpeg';
    if (!ct.startsWith('image/')) {
      const text = await res.text();
      return new NextResponse(`Réponse non-image: ${text}`, { status: 502 });
    }

    const buffer = await res.arrayBuffer();

    // --- 3. Store in Vercel Blob + update DB ---
    if (storyId && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blobPath = `illustrations/${storyId}/${pageIndex}.jpg`;
        const blob = await put(blobPath, buffer, {
          access: 'public',
          contentType: 'image/jpeg',
          addRandomSuffix: false,
        });
        await connectToDatabase();
        await Story.updateOne(
          { _id: storyId },
          { $set: { [`illustrationUrls.${pageIndex}`]: blob.url } }
        );
      } catch (e) {
        console.error('Blob storage failed:', e);
        // Non-fatal: still return the image
      }
    }

    return new NextResponse(buffer, {
      headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' },
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new NextResponse(`Erreur: ${msg}`, { status: 502 });
  }
}
