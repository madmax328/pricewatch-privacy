// PDF generation for Kidshade print books using pdf-lib
// Book format: 5.83" × 8.27" (A5) — matches Lulu pod package 0583X0827FCSTDPB080CW444GXX
// Total pages: 32 (Lulu minimum)

import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { PDFFont, PDFPage, PDFImage } from 'pdf-lib';

function loadFont(name: string): Uint8Array {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', name);
  return new Uint8Array(fs.readFileSync(fontPath));
}

// ── Dimensions ────────────────────────────────────────────────────────────────
// 1 inch = 72 points
const PAGE_W = 419.76; // 5.83" × 72
const PAGE_H = 595.44; // 8.27" × 72
const MARGIN = 38;

// Cover: back + spine + front, with 0.125" bleed on all sides
// Spine for 32 pages on 80# paper: ~0.08" = 5.76 pts
const BLEED = 9; // 0.125" × 72
const SPINE_W = 6;
const COVER_W = BLEED + PAGE_W + SPINE_W + PAGE_W + BLEED;
const COVER_H = PAGE_H + BLEED * 2;

// ── Theme color palettes ───────────────────────────────────────────────────────
type RGB3 = [number, number, number];
interface ThemePalette {
  bg: RGB3;
  accent: RGB3;
}

const THEME_PALETTES: Record<string, ThemePalette> = {
  dragons:     { bg: [0.10, 0.02, 0.20], accent: [0.98, 0.45, 0.09] },
  space:       { bg: [0.01, 0.02, 0.09], accent: [0.51, 0.55, 0.97] },
  forest:      { bg: [0.02, 0.18, 0.08], accent: [0.53, 0.94, 0.67] },
  ocean:       { bg: [0.05, 0.29, 0.43], accent: [0.49, 0.83, 0.99] },
  princess:    { bg: [0.31, 0.03, 0.14], accent: [0.98, 0.66, 0.83] },
  dinosaurs:   { bg: [0.21, 0.33, 0.08], accent: [0.53, 0.94, 0.67] },
  superheroes: { bg: [0.12, 0.11, 0.29], accent: [0.98, 0.75, 0.14] },
  animals:     { bg: [0.47, 0.21, 0.04], accent: [0.99, 0.91, 0.54] },
  pirates:     { bg: [0.05, 0.29, 0.43], accent: [0.98, 0.75, 0.14] },
  fairies:     { bg: [0.18, 0.06, 0.40], accent: [0.94, 0.67, 0.99] },
};
const DEFAULT_PALETTE: ThemePalette = { bg: [0.12, 0.11, 0.29], accent: [0.65, 0.48, 0.98] };

function palette(theme: string): ThemePalette {
  return THEME_PALETTES[theme] ?? DEFAULT_PALETTE;
}

// ── Image helpers ──────────────────────────────────────────────────────────────
async function fetchAndEmbedImage(doc: PDFDocument, url: string): Promise<PDFImage | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    try {
      return await doc.embedJpg(buf);
    } catch {
      return await doc.embedPng(buf);
    }
  } catch {
    return null;
  }
}

function drawImageFit(
  page: PDFPage,
  img: PDFImage,
  x: number, y: number,
  maxW: number, maxH: number
) {
  const { width: iw, height: ih } = img.scale(1);
  const scale = Math.min(maxW / iw, maxH / ih);
  const w = iw * scale;
  const h = ih * scale;
  page.drawImage(img, {
    x: x + (maxW - w) / 2,
    y: y + (maxH - h) / 2,
    width: w,
    height: h,
  });
}

// ── Text helpers ───────────────────────────────────────────────────────────────
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  y: number,
  color: ReturnType<typeof rgb>,
  pageWidth = PAGE_W,
  offsetX = 0,
  opacity?: number
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: offsetX + (pageWidth - w) / 2,
    y,
    size,
    font,
    color,
    ...(opacity !== undefined ? { opacity } : {}),
  });
}

function splitIntoChunks(content: string, targetCount: number): string[] {
  const paragraphs = content.split('\n\n').map(p => p.trim()).filter(Boolean);
  if (!paragraphs.length) return Array(targetCount).fill('');

  const chunks: string[] = [...paragraphs];

  while (chunks.length < targetCount) {
    let longestIdx = 0;
    for (let i = 1; i < chunks.length; i++) {
      if (chunks[i].length > chunks[longestIdx].length) longestIdx = i;
    }
    const sentences = chunks[longestIdx].match(/[^.!?]+[.!?]+\s*/g) ?? [chunks[longestIdx]];
    if (sentences.length <= 1) break;
    const mid = Math.ceil(sentences.length / 2);
    chunks.splice(
      longestIdx,
      1,
      sentences.slice(0, mid).join('').trim(),
      sentences.slice(mid).join('').trim()
    );
  }

  while (chunks.length < targetCount) chunks.push('');
  return chunks;
}

// ── Interior PDF (32 pages) ────────────────────────────────────────────────────
export async function generateInteriorPdf(params: {
  childName: string;
  storyTitle: string;
  storyContent: string;
  theme: string;
  illustrationUrls?: Record<number, string>; // page index 0-25 → blob URL
  loyaltyPromoCode?: string;                 // printed on page 32
}): Promise<Uint8Array> {
  const { childName, storyTitle, storyContent, theme, illustrationUrls, loyaltyPromoCode } = params;
  const { bg, accent } = palette(theme);
  const [br, bg2, bb] = bg;
  const [ar, ag, ab] = accent;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bold = await doc.embedFont(loadFont('Geist-Bold.ttf'));
  const regular = await doc.embedFont(loadFont('Geist-Regular.ttf'));

  const bgColor = rgb(br, bg2, bb);
  const accentColor = rgb(ar, ag, ab);
  const white = rgb(1, 1, 1);
  const dark = rgb(0.08, 0.08, 0.12);
  const cream = rgb(1, 0.99, 0.97);

  // Pre-fetch all illustrations in parallel (gracefully handle failures)
  const STORY_PAGES = 26;
  const embeddedImages: (PDFImage | null)[] = Array(STORY_PAGES).fill(null);
  if (illustrationUrls && Object.keys(illustrationUrls).length > 0) {
    await Promise.all(
      Array.from({ length: STORY_PAGES }, async (_, i) => {
        const url = illustrationUrls[i];
        if (url) {
          embeddedImages[i] = await fetchAndEmbedImage(doc, url);
        }
      })
    );
  }

  // ── Page 1: Title ──────────────────────────────────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: bgColor });
    p.drawCircle({ x: PAGE_W - 55, y: PAGE_H - 55, size: 75, color: accentColor, opacity: 0.18 });
    p.drawCircle({ x: 55, y: 90, size: 55, color: accentColor, opacity: 0.12 });
    p.drawCircle({ x: PAGE_W / 2, y: PAGE_H * 0.52, size: 110, color: accentColor, opacity: 0.07 });

    // Illustration: use first story page image if available, else placeholder
    const TITLE_ILLUS_X = MARGIN + 10;
    const TITLE_ILLUS_Y = PAGE_H * 0.22;
    const TITLE_ILLUS_W = PAGE_W - (MARGIN + 10) * 2;
    const TITLE_ILLUS_H = PAGE_H * 0.24;

    if (embeddedImages[0]) {
      drawImageFit(p, embeddedImages[0], TITLE_ILLUS_X, TITLE_ILLUS_Y, TITLE_ILLUS_W, TITLE_ILLUS_H);
    } else {
      p.drawRectangle({
        x: TITLE_ILLUS_X, y: TITLE_ILLUS_Y,
        width: TITLE_ILLUS_W, height: TITLE_ILLUS_H,
        color: accentColor, opacity: 0.10,
        borderColor: accentColor, borderWidth: 1.5, borderOpacity: 0.30,
      });
    }

    const titleLines = wrapText(storyTitle, bold, 26, PAGE_W - MARGIN * 2);
    let ty = PAGE_H * 0.72;
    for (const line of titleLines.slice(0, 3)) {
      drawCenteredText(p, line, bold, 26, ty, accentColor);
      ty -= 36;
    }
    drawCenteredText(p, `L'histoire de ${childName}`, regular, 16, PAGE_H * 0.58, white, PAGE_W, 0, 0.85);
    drawCenteredText(p, 'Kidshade', bold, 12, 28, accentColor, PAGE_W, 0, 0.65);
  }

  // ── Page 2: Dedication ─────────────────────────────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
    p.drawRectangle({
      x: 18, y: 18, width: PAGE_W - 36, height: PAGE_H - 36,
      borderColor: accentColor, borderWidth: 1.5, borderOpacity: 0.40,
    });

    const lines: Array<{ text: string; size: number; isBold: boolean }> = [
      { text: 'Ce livre magique', size: 16, isBold: false },
      { text: 'appartient à', size: 16, isBold: false },
      { text: childName, size: 28, isBold: true },
      { text: '', size: 16, isBold: false },
      { text: 'Que tes aventures soient', size: 14, isBold: false },
      { text: 'toujours extraordinaires.', size: 14, isBold: false },
    ];

    let y = PAGE_H * 0.68;
    for (const line of lines) {
      if (!line.text) { y -= 14; continue; }
      const f = line.isBold ? bold : regular;
      const color = line.isBold ? accentColor : dark;
      drawCenteredText(p, line.text, f, line.size, y, color);
      y -= line.size + 14;
    }
  }

  // ── Pages 3–28: Story (26 pages) ──────────────────────────────────────────
  const chunks = splitIntoChunks(storyContent, STORY_PAGES);

  for (let i = 0; i < STORY_PAGES; i++) {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    const pageNum = i + 3;
    const chunk = chunks[i] ?? '';
    const isEven = pageNum % 2 === 0;

    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });

    // Header bar
    const HEADER_H = 30;
    p.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: bgColor });

    // Page number
    const pnStr = String(pageNum);
    const pnW = bold.widthOfTextAtSize(pnStr, 10);
    p.drawText(pnStr, {
      x: isEven ? MARGIN : PAGE_W - MARGIN - pnW,
      y: PAGE_H - HEADER_H + 10,
      size: 10, font: bold, color: accentColor,
    });

    // Title in header
    const shortTitle = storyTitle.length > 28 ? storyTitle.slice(0, 26) + '…' : storyTitle;
    const stW = regular.widthOfTextAtSize(shortTitle, 8);
    p.drawText(shortTitle, {
      x: isEven ? PAGE_W - MARGIN - stW : MARGIN,
      y: PAGE_H - HEADER_H + 11,
      size: 8, font: regular, color: white, opacity: 0.65,
    });

    // Illustration area
    const ILLUS_TOP = PAGE_H - HEADER_H - 6;
    const ILLUS_H = 220;
    const ILLUS_Y = ILLUS_TOP - ILLUS_H;
    const ILLUS_X = MARGIN;
    const ILLUS_W = PAGE_W - MARGIN * 2;

    const img = embeddedImages[i];
    if (img) {
      drawImageFit(p, img, ILLUS_X, ILLUS_Y, ILLUS_W, ILLUS_H);
      // Thin border over image
      p.drawRectangle({
        x: ILLUS_X, y: ILLUS_Y,
        width: ILLUS_W, height: ILLUS_H,
        borderColor: accentColor, borderWidth: 0.5, borderOpacity: 0.20,
      });
    } else {
      p.drawRectangle({
        x: ILLUS_X, y: ILLUS_Y,
        width: ILLUS_W, height: ILLUS_H,
        color: bgColor, opacity: 0.07,
        borderColor: accentColor, borderWidth: 0.8, borderOpacity: 0.25,
      });
      p.drawCircle({
        x: PAGE_W / 2, y: ILLUS_Y + ILLUS_H / 2,
        size: 28, color: accentColor, opacity: 0.08,
      });
    }

    // Story text
    if (chunk) {
      const TEXT_TOP = ILLUS_Y - 14;
      const TEXT_BOTTOM = 34;
      const FONT_SIZE = 13;
      const LINE_H = 20;
      const maxLines = Math.floor((TEXT_TOP - TEXT_BOTTOM) / LINE_H);
      const textLines = wrapText(chunk, regular, FONT_SIZE, PAGE_W - MARGIN * 2);
      let ty = TEXT_TOP;
      for (const line of textLines.slice(0, maxLines)) {
        p.drawText(line, { x: MARGIN, y: ty, size: FONT_SIZE, font: regular, color: dark });
        ty -= LINE_H;
      }
    }

    p.drawRectangle({ x: MARGIN, y: 22, width: PAGE_W - MARGIN * 2, height: 1, color: accentColor, opacity: 0.20 });
  }

  // ── Page 29: Activité — Dessine ton aventure ───────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
    p.drawRectangle({ x: 0, y: PAGE_H - 30, width: PAGE_W, height: 30, color: bgColor });

    drawCenteredText(p, 'Dessine ton aventure !', bold, 20, PAGE_H - 62, rgb(ar * 0.75, ag * 0.75, ab * 0.75));
    drawCenteredText(p, 'La scène la plus magique de l\'histoire...', regular, 12, PAGE_H - 85, dark);

    const frameY = 45;
    const frameH = PAGE_H - 110;
    p.drawRectangle({
      x: MARGIN + 8, y: frameY,
      width: PAGE_W - (MARGIN + 8) * 2, height: frameH,
      color: white,
      borderColor: accentColor, borderWidth: 1.2, borderOpacity: 0.45,
    });
    for (const [cx, cy] of [
      [MARGIN + 8, frameY],
      [MARGIN + 8, frameY + frameH],
      [PAGE_W - MARGIN - 8, frameY],
      [PAGE_W - MARGIN - 8, frameY + frameH],
    ] as [number, number][]) {
      p.drawCircle({ x: cx, y: cy, size: 4, color: accentColor, opacity: 0.55 });
    }
  }

  // ── Page 30: Activité — Portrait du héros ──────────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
    p.drawRectangle({ x: 0, y: PAGE_H - 30, width: PAGE_W, height: 30, color: bgColor });

    drawCenteredText(p, `${childName}, le héros !`, bold, 20, PAGE_H - 62, rgb(ar * 0.75, ag * 0.75, ab * 0.75));
    drawCenteredText(p, 'Dessine ton portrait de super-héros :', regular, 12, PAGE_H - 85, dark);

    p.drawEllipse({
      x: PAGE_W / 2, y: PAGE_H * 0.46,
      xScale: 110, yScale: 140,
      borderColor: accentColor, borderWidth: 1.5, borderOpacity: 0.50,
      color: white,
    });

    p.drawRectangle({
      x: MARGIN + 30, y: 45,
      width: PAGE_W - (MARGIN + 30) * 2, height: 55,
      borderColor: accentColor, borderWidth: 0.8, borderOpacity: 0.30,
    });
    drawCenteredText(p, 'Mes super-pouvoirs :', regular, 11, 88, dark);
    drawCenteredText(p, '___________________________', regular, 11, 72, rgb(0.7, 0.7, 0.7));
  }

  // ── Page 31: Mot de la fin ─────────────────────────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: bgColor });

    // Decorative circles
    p.drawCircle({ x: PAGE_W / 2, y: PAGE_H * 0.55, size: 130, color: accentColor, opacity: 0.08 });
    p.drawCircle({ x: PAGE_W / 2, y: PAGE_H * 0.55, size: 80, color: accentColor, opacity: 0.08 });
    p.drawCircle({ x: PAGE_W - 40, y: PAGE_H - 40, size: 50, color: accentColor, opacity: 0.10 });
    p.drawCircle({ x: 40, y: 60, size: 35, color: accentColor, opacity: 0.10 });

    drawCenteredText(p, 'FIN', bold, 48, PAGE_H * 0.70, accentColor);
    drawCenteredText(p, `Bravo ${childName} !`, bold, 20, PAGE_H * 0.58, white, PAGE_W, 0, 0.92);

    const closingLines = [
      'Tu as vécu une grande aventure.',
      'Chaque histoire que tu lis',
      't\'ouvre une porte vers un',
      'nouveau monde magique.',
    ];
    let cy = PAGE_H * 0.46;
    for (const line of closingLines) {
      drawCenteredText(p, line, regular, 13, cy, white, PAGE_W, 0, 0.70);
      cy -= 22;
    }

    drawCenteredText(p, '* * *', regular, 14, PAGE_H * 0.25, accentColor, PAGE_W, 0, 0.55);
    drawCenteredText(p, 'La prochaine aventure t\'attend...', regular, 12, PAGE_H * 0.19, white, PAGE_W, 0, 0.50);

    drawCenteredText(p, 'Kidshade', bold, 11, 26, accentColor, PAGE_W, 0, 0.55);
  }

  // ── Page 32: À propos + Code fidélité ─────────────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
    p.drawRectangle({ x: 0, y: PAGE_H - 30, width: PAGE_W, height: 30, color: bgColor });

    drawCenteredText(p, 'À propos de Kidshade', bold, 16, PAGE_H - 66, rgb(ar * 0.7, ag * 0.7, ab * 0.7));

    const aboutLines = [
      'Kidshade crée des histoires personnalisées',
      'pour chaque enfant unique.',
      '',
      'Votre enfant est le héros de sa propre aventure,',
      'imprimée et livrée avec soin.',
      '',
      'kidshade.net',
    ];
    let ay = PAGE_H - 100;
    for (const line of aboutLines) {
      if (!line) { ay -= 10; continue; }
      const isUrl = line === 'kidshade.net';
      drawCenteredText(p, line, isUrl ? bold : regular, isUrl ? 13 : 12, ay, isUrl ? accentColor : dark);
      ay -= 20;
    }

    // Loyalty promo code block
    const BOX_Y = 70;
    const BOX_H = 115;
    const BOX_X = MARGIN + 10;
    const BOX_W = PAGE_W - (MARGIN + 10) * 2;

    p.drawRectangle({
      x: BOX_X, y: BOX_Y,
      width: BOX_W, height: BOX_H,
      color: bgColor, opacity: 0.07,
      borderColor: accentColor, borderWidth: 1.2, borderOpacity: 0.45,
    });
    // Corner accents
    for (const [cx2, cy2] of [
      [BOX_X, BOX_Y], [BOX_X, BOX_Y + BOX_H],
      [BOX_X + BOX_W, BOX_Y], [BOX_X + BOX_W, BOX_Y + BOX_H],
    ] as [number, number][]) {
      p.drawCircle({ x: cx2, y: cy2, size: 3.5, color: accentColor, opacity: 0.55 });
    }

    drawCenteredText(p, 'Merci de votre confiance !', bold, 12, BOX_Y + BOX_H - 22, dark);
    drawCenteredText(p, 'Profitez de 5% de réduction sur votre', regular, 10, BOX_Y + BOX_H - 42, dark, PAGE_W, 0, 0.80);
    drawCenteredText(p, 'prochain livre avec le code :', regular, 10, BOX_Y + BOX_H - 56, dark, PAGE_W, 0, 0.80);

    if (loyaltyPromoCode) {
      drawCenteredText(p, loyaltyPromoCode, bold, 18, BOX_Y + 42, accentColor);
      drawCenteredText(p, 'Valable 1 fois · kidshade.net', regular, 9, BOX_Y + 24, dark, PAGE_W, 0, 0.55);
    } else {
      drawCenteredText(p, 'Code transmis par e-mail', bold, 13, BOX_Y + 42, accentColor, PAGE_W, 0, 0.75);
      drawCenteredText(p, 'kidshade.net', regular, 9, BOX_Y + 24, dark, PAGE_W, 0, 0.55);
    }
  }

  return doc.save();
}

// ── Cover PDF (full wrap: back + spine + front) ────────────────────────────────
export async function generateCoverPdf(params: {
  childName: string;
  storyTitle: string;
  theme: string;
  coverIllustrationUrl?: string; // optional — embedded on front cover
}): Promise<Uint8Array> {
  const { childName, storyTitle, theme, coverIllustrationUrl } = params;
  const { bg, accent } = palette(theme);
  const [br, bg2, bb] = bg;
  const [ar, ag, ab] = accent;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bold = await doc.embedFont(loadFont('Geist-Bold.ttf'));
  const regular = await doc.embedFont(loadFont('Geist-Regular.ttf'));
  const p = doc.addPage([COVER_W, COVER_H]);

  const bgColor = rgb(br, bg2, bb);
  const accentColor = rgb(ar, ag, ab);
  const white = rgb(1, 1, 1);

  // Pre-fetch cover illustration
  let coverImg: PDFImage | null = null;
  if (coverIllustrationUrl) {
    coverImg = await fetchAndEmbedImage(doc, coverIllustrationUrl);
  }

  p.drawRectangle({ x: 0, y: 0, width: COVER_W, height: COVER_H, color: bgColor });

  // ── Back cover ────────────────────────────────────────────────────────────
  const backX = BLEED;
  p.drawRectangle({
    x: backX + 18, y: BLEED + 18,
    width: PAGE_W - 36, height: PAGE_H - 36,
    borderColor: accentColor, borderWidth: 1, borderOpacity: 0.28,
  });

  const backTexts: Array<{ text: string; size: number; bold: boolean }> = [
    { text: 'Une histoire', size: 15, bold: false },
    { text: 'rien que pour', size: 15, bold: false },
    { text: childName, size: 24, bold: true },
    { text: '', size: 12, bold: false },
    { text: 'kidshade.net', size: 13, bold: true },
  ];
  let bY = BLEED + PAGE_H * 0.60;
  for (const item of backTexts) {
    if (!item.text) { bY -= 10; continue; }
    const f = item.bold ? bold : regular;
    const color = item.bold && item.text === childName ? accentColor : white;
    const w = f.widthOfTextAtSize(item.text, item.size);
    p.drawText(item.text, {
      x: backX + (PAGE_W - w) / 2,
      y: bY, size: item.size, font: f, color,
      opacity: item.text === childName ? 1 : 0.82,
    });
    bY -= item.size + 10;
  }

  // ── Spine ─────────────────────────────────────────────────────────────────
  const spineX = BLEED + PAGE_W;
  p.drawRectangle({
    x: spineX, y: 0,
    width: SPINE_W, height: COVER_H,
    color: rgb(ar * 0.75, ag * 0.75, ab * 0.75),
  });

  // ── Front cover ───────────────────────────────────────────────────────────
  const frontX = BLEED + PAGE_W + SPINE_W;

  // Decorative circles (always drawn — visible behind/around image)
  p.drawCircle({ x: frontX + PAGE_W - 50, y: BLEED + PAGE_H - 50, size: 80, color: accentColor, opacity: 0.16 });
  p.drawCircle({ x: frontX + 50, y: BLEED + 70, size: 60, color: accentColor, opacity: 0.12 });
  p.drawCircle({ x: frontX + PAGE_W / 2, y: BLEED + PAGE_H * 0.48, size: 120, color: accentColor, opacity: 0.06 });

  // Illustration area
  const ILLUS_X = frontX + MARGIN;
  const ILLUS_Y = BLEED + PAGE_H * 0.36;
  const ILLUS_W = PAGE_W - MARGIN * 2;
  const ILLUS_H = PAGE_H * 0.44;

  if (coverImg) {
    drawImageFit(p, coverImg, ILLUS_X, ILLUS_Y, ILLUS_W, ILLUS_H);
    p.drawRectangle({
      x: ILLUS_X, y: ILLUS_Y, width: ILLUS_W, height: ILLUS_H,
      borderColor: accentColor, borderWidth: 0.8, borderOpacity: 0.25,
    });
  } else {
    p.drawRectangle({
      x: ILLUS_X, y: ILLUS_Y, width: ILLUS_W, height: ILLUS_H,
      color: accentColor, opacity: 0.09,
      borderColor: accentColor, borderWidth: 1.5, borderOpacity: 0.35,
    });
  }

  // Title
  const titleLines = wrapText(storyTitle, bold, 22, PAGE_W - MARGIN * 2);
  let ty = BLEED + PAGE_H * 0.305;
  for (const line of titleLines.slice(0, 3)) {
    const w = bold.widthOfTextAtSize(line, 22);
    p.drawText(line, { x: frontX + (PAGE_W - w) / 2, y: ty, size: 22, font: bold, color: accentColor });
    ty -= 30;
  }

  // Child name
  const nameStr = `L'histoire de ${childName}`;
  const nameW = regular.widthOfTextAtSize(nameStr, 15);
  p.drawText(nameStr, {
    x: frontX + (PAGE_W - nameW) / 2,
    y: BLEED + PAGE_H * 0.23,
    size: 15, font: regular, color: white, opacity: 0.87,
  });

  // Kidshade branding
  const brandW = bold.widthOfTextAtSize('Kidshade', 12);
  p.drawText('Kidshade', {
    x: frontX + (PAGE_W - brandW) / 2,
    y: BLEED + 18,
    size: 12, font: bold, color: accentColor, opacity: 0.72,
  });

  return doc.save();
}
