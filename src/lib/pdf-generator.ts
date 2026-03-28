// PDF generation for Kidshade print books using pdf-lib
// Book format: 5.83" × 8.27" (A5) — matches Lulu pod package 0583X0827FCSTDPB080CW444GXX
// Total pages: 32 (Lulu minimum)

import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { PDFFont, PDFPage, PDFImage } from 'pdf-lib';

// ── Book translations ──────────────────────────────────────────────────────────
interface BookStrings {
  storyOf: string;         // "L'histoire de" / "The story of"
  dedicationLine1: string; // "Ce livre magique"
  dedicationLine2: string; // "appartient à"
  dedicationWish1: string;
  dedicationWish2: string;
  drawAdventureTitle: string;
  drawAdventureSubtitle: string;
  heroPortraitTitle: (name: string) => string;
  heroPortraitSubtitle: string;
  superpowers: string;
  theEnd: string;
  bravo: (name: string) => string;
  closingLines: string[];
  nextAdventure: string;
  aboutTitle: string;
  aboutLines: string[];
  thankYou: string;
  discountLine1: string;
  discountLine2: string;
  loyaltyValidity: string;
  loyaltyEmailFallback: string;
  backCoverLine1: string;
  backCoverLine2: string;
}

const BOOK_STRINGS: Record<string, BookStrings> = {
  fr: {
    storyOf: "L'histoire de",
    dedicationLine1: 'Ce livre magique',
    dedicationLine2: 'appartient à',
    dedicationWish1: 'Que tes aventures soient',
    dedicationWish2: 'toujours extraordinaires.',
    drawAdventureTitle: 'Dessine ton aventure !',
    drawAdventureSubtitle: "La scène la plus magique de l'histoire...",
    heroPortraitTitle: (n) => `${n}, le héros !`,
    heroPortraitSubtitle: 'Dessine ton portrait de super-héros :',
    superpowers: 'Mes super-pouvoirs :',
    theEnd: 'FIN',
    bravo: (n) => `Bravo ${n} !`,
    closingLines: ["Tu as vécu une grande aventure.", "Chaque histoire que tu lis", "t'ouvre une porte vers un", "nouveau monde magique."],
    nextAdventure: "La prochaine aventure t'attend...",
    aboutTitle: 'À propos de Kidshade',
    aboutLines: ["Kidshade crée des histoires personnalisées", "pour chaque enfant unique.", "", "Votre enfant est le héros de sa propre aventure,", "imprimée et livrée avec soin.", "", "kidshade.net"],
    thankYou: 'Merci de votre confiance !',
    discountLine1: 'Profitez de 5% de réduction sur votre',
    discountLine2: 'prochain livre avec le code :',
    loyaltyValidity: 'Valable 1 fois · kidshade.net',
    loyaltyEmailFallback: 'Code transmis par e-mail',
    backCoverLine1: 'Une histoire',
    backCoverLine2: 'rien que pour',
  },
  en: {
    storyOf: 'The story of',
    dedicationLine1: 'This magical book',
    dedicationLine2: 'belongs to',
    dedicationWish1: 'May your adventures',
    dedicationWish2: 'always be extraordinary.',
    drawAdventureTitle: 'Draw your adventure!',
    drawAdventureSubtitle: 'The most magical scene from the story...',
    heroPortraitTitle: (n) => `${n}, the hero!`,
    heroPortraitSubtitle: 'Draw your superhero portrait:',
    superpowers: 'My superpowers:',
    theEnd: 'THE END',
    bravo: (n) => `Well done, ${n}!`,
    closingLines: ["You lived a great adventure.", "Every story you read", "opens a door to a", "new magical world."],
    nextAdventure: 'The next adventure awaits...',
    aboutTitle: 'About Kidshade',
    aboutLines: ["Kidshade creates personalised stories", "for every unique child.", "", "Your child is the hero of their own adventure,", "printed and delivered with care.", "", "kidshade.net"],
    thankYou: 'Thank you for your trust!',
    discountLine1: 'Enjoy 5% off your next',
    discountLine2: 'book with the code:',
    loyaltyValidity: 'Valid once · kidshade.net',
    loyaltyEmailFallback: 'Code sent by email',
    backCoverLine1: 'A story',
    backCoverLine2: 'just for',
  },
  es: {
    storyOf: 'La historia de',
    dedicationLine1: 'Este libro mágico',
    dedicationLine2: 'pertenece a',
    dedicationWish1: 'Que tus aventuras sean',
    dedicationWish2: 'siempre extraordinarias.',
    drawAdventureTitle: '¡Dibuja tu aventura!',
    drawAdventureSubtitle: 'La escena más mágica de la historia...',
    heroPortraitTitle: (n) => `¡${n}, el héroe!`,
    heroPortraitSubtitle: 'Dibuja tu retrato de superhéroe:',
    superpowers: 'Mis superpoderes:',
    theEnd: 'FIN',
    bravo: (n) => `¡Bravo, ${n}!`,
    closingLines: ["Has vivido una gran aventura.", "Cada historia que lees", "te abre una puerta a un", "nuevo mundo mágico."],
    nextAdventure: 'La próxima aventura te espera...',
    aboutTitle: 'Sobre Kidshade',
    aboutLines: ["Kidshade crea historias personalizadas", "para cada niño único.", "", "Tu hijo es el héroe de su propia aventura,", "impresa y entregada con cuidado.", "", "kidshade.net"],
    thankYou: '¡Gracias por su confianza!',
    discountLine1: 'Disfruta de 5% de descuento en tu',
    discountLine2: 'próximo libro con el código:',
    loyaltyValidity: 'Válido 1 vez · kidshade.net',
    loyaltyEmailFallback: 'Código enviado por email',
    backCoverLine1: 'Una historia',
    backCoverLine2: 'solo para',
  },
  pt: {
    storyOf: 'A história de',
    dedicationLine1: 'Este livro mágico',
    dedicationLine2: 'pertence a',
    dedicationWish1: 'Que as tuas aventuras sejam',
    dedicationWish2: 'sempre extraordinárias.',
    drawAdventureTitle: 'Desenha a tua aventura!',
    drawAdventureSubtitle: 'A cena mais mágica da história...',
    heroPortraitTitle: (n) => `${n}, o herói!`,
    heroPortraitSubtitle: 'Desenha o teu retrato de super-herói:',
    superpowers: 'Os meus superpoderes:',
    theEnd: 'FIM',
    bravo: (n) => `Parabéns, ${n}!`,
    closingLines: ["Viveste uma grande aventura.", "Cada história que lês", "abre-te uma porta para um", "novo mundo mágico."],
    nextAdventure: 'A próxima aventura espera por ti...',
    aboutTitle: 'Sobre a Kidshade',
    aboutLines: ["A Kidshade cria histórias personalizadas", "para cada criança única.", "", "O teu filho é o herói da sua própria aventura,", "impressa e entregue com cuidado.", "", "kidshade.net"],
    thankYou: 'Obrigado pela sua confiança!',
    discountLine1: 'Aproveite 5% de desconto no seu',
    discountLine2: 'próximo livro com o código:',
    loyaltyValidity: 'Válido 1 vez · kidshade.net',
    loyaltyEmailFallback: 'Código enviado por email',
    backCoverLine1: 'Uma história',
    backCoverLine2: 'só para',
  },
  de: {
    storyOf: 'Die Geschichte von',
    dedicationLine1: 'Dieses magische Buch',
    dedicationLine2: 'gehört',
    dedicationWish1: 'Mögen deine Abenteuer',
    dedicationWish2: 'immer außergewöhnlich sein.',
    drawAdventureTitle: 'Zeichne dein Abenteuer!',
    drawAdventureSubtitle: 'Die magischste Szene aus der Geschichte...',
    heroPortraitTitle: (n) => `${n}, der Held!`,
    heroPortraitSubtitle: 'Zeichne dein Superhelden-Porträt:',
    superpowers: 'Meine Superkräfte:',
    theEnd: 'ENDE',
    bravo: (n) => `Toll gemacht, ${n}!`,
    closingLines: ["Du hast ein großes Abenteuer erlebt.", "Jede Geschichte, die du liest,", "öffnet dir eine Tür zu einer", "neuen magischen Welt."],
    nextAdventure: 'Das nächste Abenteuer wartet...',
    aboutTitle: 'Über Kidshade',
    aboutLines: ["Kidshade erstellt personalisierte Geschichten", "für jedes einzigartige Kind.", "", "Dein Kind ist der Held seines eigenen Abenteuers,", "gedruckt und liebevoll geliefert.", "", "kidshade.net"],
    thankYou: 'Danke für Ihr Vertrauen!',
    discountLine1: '5% Rabatt auf Ihr nächstes',
    discountLine2: 'Buch mit dem Code:',
    loyaltyValidity: 'Einmal gültig · kidshade.net',
    loyaltyEmailFallback: 'Code per E-Mail gesendet',
    backCoverLine1: 'Eine Geschichte',
    backCoverLine2: 'nur für',
  },
};

function getStrings(language: string): BookStrings {
  return BOOK_STRINGS[language] ?? BOOK_STRINGS.fr;
}

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

// ── Theme accent colors (for text/decorations, NOT dark backgrounds) ──────────
type RGB3 = [number, number, number];
interface ThemePalette {
  accent: RGB3;   // primary color (title, borders)
  soft: RGB3;     // lighter tint for backgrounds
}

const THEME_PALETTES: Record<string, ThemePalette> = {
  dragons:     { accent: [0.85, 0.22, 0.07], soft: [1.00, 0.93, 0.90] },
  space:       { accent: [0.34, 0.37, 0.90], soft: [0.92, 0.93, 1.00] },
  forest:      { accent: [0.13, 0.60, 0.23], soft: [0.90, 0.97, 0.91] },
  ocean:       { accent: [0.05, 0.55, 0.80], soft: [0.90, 0.96, 1.00] },
  princess:    { accent: [0.85, 0.28, 0.52], soft: [1.00, 0.92, 0.96] },
  dinosaurs:   { accent: [0.22, 0.55, 0.10], soft: [0.91, 0.97, 0.90] },
  superheroes: { accent: [0.20, 0.18, 0.75], soft: [0.93, 0.93, 1.00] },
  animals:     { accent: [0.75, 0.42, 0.05], soft: [1.00, 0.95, 0.88] },
  pirates:     { accent: [0.10, 0.42, 0.65], soft: [0.90, 0.95, 1.00] },
  fairies:     { accent: [0.62, 0.22, 0.80], soft: [0.97, 0.92, 1.00] },
};
const DEFAULT_PALETTE: ThemePalette = { accent: [0.45, 0.28, 0.85], soft: [0.95, 0.93, 1.00] };

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
  language?: string;
  illustrationUrls?: Record<number, string>; // page index 0-25 → blob URL
  loyaltyPromoCode?: string;                 // printed on page 32
}): Promise<Uint8Array> {
  const { childName, storyTitle, storyContent, theme, language = 'fr', illustrationUrls, loyaltyPromoCode } = params;
  const s = getStrings(language);
  const { accent, soft } = palette(theme);
  const [ar, ag, ab] = accent;
  const [sr, sg, sb] = soft;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bold = await doc.embedFont(loadFont('Geist-Bold.ttf'));
  const regular = await doc.embedFont(loadFont('Geist-Regular.ttf'));

  const accentColor = rgb(ar, ag, ab);
  const softColor = rgb(sr, sg, sb);
  const white = rgb(1, 1, 1);
  const dark = rgb(0.10, 0.10, 0.14);
  const gray = rgb(0.50, 0.50, 0.55);

  // Pre-fetch all illustrations in parallel (gracefully handle failures)
  const STORY_PAGES = 26;
  const embeddedImages: (PDFImage | null)[] = Array(STORY_PAGES).fill(null);
  if (illustrationUrls && Object.keys(illustrationUrls).length > 0) {
    await Promise.all(
      Array.from({ length: STORY_PAGES }, async (_, i) => {
        const url = illustrationUrls[i];
        if (url) embeddedImages[i] = await fetchAndEmbedImage(doc, url);
      })
    );
  }

  // Layout constants for story pages (Disney picture-book style)
  const TOP_BAND = 16;     // thin colored header
  const ILLUS_H = 340;     // large illustration (57% of page height)
  const TEXT_FONT = 15;
  const TEXT_LINE = 23;
  const TEXT_MARGIN = 32;

  // ── Page 1: Title ──────────────────────────────────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    // Soft pastel background
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: softColor });
    // Decorative circles (light, playful)
    p.drawCircle({ x: PAGE_W - 40, y: PAGE_H - 40, size: 55, color: accentColor, opacity: 0.12 });
    p.drawCircle({ x: 40, y: 60, size: 40, color: accentColor, opacity: 0.10 });
    p.drawCircle({ x: PAGE_W * 0.2, y: PAGE_H * 0.35, size: 30, color: accentColor, opacity: 0.08 });
    p.drawCircle({ x: PAGE_W * 0.82, y: PAGE_H * 0.28, size: 22, color: accentColor, opacity: 0.08 });

    // Large illustration centered on upper half
    const IY = PAGE_H * 0.33;
    const IH = PAGE_H * 0.40;
    const IX = MARGIN;
    const IW = PAGE_W - MARGIN * 2;
    if (embeddedImages[0]) {
      drawImageFit(p, embeddedImages[0], IX, IY, IW, IH);
    } else {
      p.drawRectangle({ x: IX, y: IY, width: IW, height: IH, color: white, opacity: 0.50,
        borderColor: accentColor, borderWidth: 1.5, borderOpacity: 0.30 });
    }

    // Title — bold, colorful, centered
    const titleLines = wrapText(storyTitle, bold, 24, PAGE_W - MARGIN * 2 - 8);
    let ty = IY - 20;
    for (const line of titleLines.slice(0, 3)) {
      drawCenteredText(p, line, bold, 24, ty, accentColor);
      ty -= 32;
    }
    // Subtitle
    drawCenteredText(p, `${s.storyOf} ${childName}`, regular, 14, ty - 4, gray);
    // Branding
    drawCenteredText(p, 'Kidshade', bold, 11, 28, accentColor, PAGE_W, 0, 0.55);
  }

  // ── Page 2: Dedication ─────────────────────────────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: white });
    // Soft top band
    p.drawRectangle({ x: 0, y: PAGE_H - TOP_BAND, width: PAGE_W, height: TOP_BAND, color: accentColor, opacity: 0.15 });
    // Decorative frame
    p.drawRectangle({ x: 22, y: 22, width: PAGE_W - 44, height: PAGE_H - 44,
      borderColor: accentColor, borderWidth: 1.2, borderOpacity: 0.30 });

    const lines: Array<{ text: string; size: number; isBold: boolean }> = [
      { text: s.dedicationLine1, size: 15, isBold: false },
      { text: s.dedicationLine2, size: 15, isBold: false },
      { text: childName, size: 30, isBold: true },
      { text: '', size: 14, isBold: false },
      { text: s.dedicationWish1, size: 13, isBold: false },
      { text: s.dedicationWish2, size: 13, isBold: false },
    ];
    let y = PAGE_H * 0.65;
    for (const line of lines) {
      if (!line.text) { y -= 12; continue; }
      const f = line.isBold ? bold : regular;
      const color = line.isBold ? accentColor : dark;
      drawCenteredText(p, line.text, f, line.size, y, color);
      y -= line.size + 14;
    }
  }

  // ── Pages 3–28: Story pages ───────────────────────────────────────────────
  // New design: white page, large illustration at top, text below (Disney style)
  const chunks = splitIntoChunks(storyContent, STORY_PAGES);

  for (let i = 0; i < STORY_PAGES; i++) {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    const pageNum = i + 3;
    const chunk = chunks[i] ?? '';

    // White background
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: white });

    // Thin top colored band
    p.drawRectangle({ x: 0, y: PAGE_H - TOP_BAND, width: PAGE_W, height: TOP_BAND, color: accentColor, opacity: 0.18 });

    // Title in top band (small, subtle)
    const shortTitle = storyTitle.length > 30 ? storyTitle.slice(0, 28) + '…' : storyTitle;
    drawCenteredText(p, shortTitle, regular, 8, PAGE_H - TOP_BAND + 5, dark, PAGE_W, 0, 0.45);

    // Page number — small circles on alternating sides
    const pnStr = String(pageNum);
    const pnX = pageNum % 2 === 0 ? TEXT_MARGIN : PAGE_W - TEXT_MARGIN - bold.widthOfTextAtSize(pnStr, 9);
    p.drawText(pnStr, { x: pnX, y: PAGE_H - TOP_BAND + 4, size: 9, font: bold, color: accentColor, opacity: 0.70 });

    // Large illustration — takes up most of the page
    const ILLUS_Y = PAGE_H - TOP_BAND - 4 - ILLUS_H;
    const ILLUS_X = 0; // full width, no side margin for max visual impact
    const ILLUS_W = PAGE_W;

    const img = embeddedImages[i];
    if (img) {
      drawImageFit(p, img, ILLUS_X, ILLUS_Y, ILLUS_W, ILLUS_H);
    } else {
      // Soft placeholder that looks intentional
      p.drawRectangle({ x: ILLUS_X, y: ILLUS_Y, width: ILLUS_W, height: ILLUS_H, color: softColor });
      p.drawCircle({ x: PAGE_W / 2, y: ILLUS_Y + ILLUS_H / 2, size: 40, color: accentColor, opacity: 0.15 });
    }

    // Text zone — white area below illustration
    if (chunk) {
      const TEXT_TOP = ILLUS_Y - 16;
      const TEXT_BOTTOM = 30;
      const maxLines = Math.floor((TEXT_TOP - TEXT_BOTTOM) / TEXT_LINE);
      const textLines = wrapText(chunk, regular, TEXT_FONT, PAGE_W - TEXT_MARGIN * 2);
      let ty = TEXT_TOP;
      for (const line of textLines.slice(0, maxLines)) {
        p.drawText(line, { x: TEXT_MARGIN, y: ty, size: TEXT_FONT, font: regular, color: dark });
        ty -= TEXT_LINE;
      }
    }

    // Thin bottom accent line
    p.drawRectangle({ x: TEXT_MARGIN, y: 20, width: PAGE_W - TEXT_MARGIN * 2, height: 1.5,
      color: accentColor, opacity: 0.18 });
  }

  // ── Page 29: Activité — Dessine ton aventure ───────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    // White background with soft top band (matches story pages)
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: white });
    p.drawRectangle({ x: 0, y: PAGE_H - TOP_BAND, width: PAGE_W, height: TOP_BAND, color: accentColor, opacity: 0.18 });

    drawCenteredText(p, s.drawAdventureTitle, bold, 20, PAGE_H - 52, accentColor);
    drawCenteredText(p, s.drawAdventureSubtitle, regular, 12, PAGE_H - 76, gray);

    const frameY = 45;
    const frameH = PAGE_H - 110;
    p.drawRectangle({
      x: MARGIN + 8, y: frameY,
      width: PAGE_W - (MARGIN + 8) * 2, height: frameH,
      color: softColor,
      borderColor: accentColor, borderWidth: 1.2, borderOpacity: 0.35,
    });
    for (const [cx, cy] of [
      [MARGIN + 8, frameY],
      [MARGIN + 8, frameY + frameH],
      [PAGE_W - MARGIN - 8, frameY],
      [PAGE_W - MARGIN - 8, frameY + frameH],
    ] as [number, number][]) {
      p.drawCircle({ x: cx, y: cy, size: 4, color: accentColor, opacity: 0.45 });
    }
    // Thin bottom line
    p.drawRectangle({ x: TEXT_MARGIN, y: 20, width: PAGE_W - TEXT_MARGIN * 2, height: 1.5, color: accentColor, opacity: 0.18 });
  }

  // ── Page 30: Activité — Portrait du héros ──────────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: white });
    p.drawRectangle({ x: 0, y: PAGE_H - TOP_BAND, width: PAGE_W, height: TOP_BAND, color: accentColor, opacity: 0.18 });

    drawCenteredText(p, s.heroPortraitTitle(childName), bold, 20, PAGE_H - 52, accentColor);
    drawCenteredText(p, s.heroPortraitSubtitle, regular, 12, PAGE_H - 76, gray);

    // Portrait oval — soft background for drawing
    p.drawEllipse({
      x: PAGE_W / 2, y: PAGE_H * 0.52,
      xScale: 110, yScale: 140,
      borderColor: accentColor, borderWidth: 1.5, borderOpacity: 0.40,
      color: softColor,
    });

    // Superpowers box at bottom
    p.drawRectangle({
      x: MARGIN + 30, y: 45,
      width: PAGE_W - (MARGIN + 30) * 2, height: 55,
      color: softColor,
      borderColor: accentColor, borderWidth: 0.8, borderOpacity: 0.30,
    });
    drawCenteredText(p, s.superpowers, regular, 11, 88, dark);
    drawCenteredText(p, '___________________________', regular, 11, 72, gray);
    p.drawRectangle({ x: TEXT_MARGIN, y: 20, width: PAGE_W - TEXT_MARGIN * 2, height: 1.5, color: accentColor, opacity: 0.18 });
  }

  // ── Page 31: Mot de la fin ─────────────────────────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    // Soft pastel background (cheerful, not dark)
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: softColor });

    // Decorative circles
    p.drawCircle({ x: PAGE_W / 2, y: PAGE_H * 0.50, size: 150, color: accentColor, opacity: 0.07 });
    p.drawCircle({ x: PAGE_W / 2, y: PAGE_H * 0.50, size: 90, color: accentColor, opacity: 0.07 });
    p.drawCircle({ x: PAGE_W - 30, y: PAGE_H - 30, size: 55, color: accentColor, opacity: 0.12 });
    p.drawCircle({ x: 30, y: 50, size: 40, color: accentColor, opacity: 0.10 });
    p.drawCircle({ x: 25, y: PAGE_H - 40, size: 28, color: accentColor, opacity: 0.09 });

    // THE END — large, colorful
    drawCenteredText(p, s.theEnd, bold, 52, PAGE_H * 0.70, accentColor);

    // Bravo — dark text (readable on pastel bg)
    drawCenteredText(p, s.bravo(childName), bold, 20, PAGE_H * 0.57, dark);

    let closingY = PAGE_H * 0.46;
    for (const line of s.closingLines) {
      drawCenteredText(p, line, regular, 13, closingY, dark, PAGE_W, 0, 0.72);
      closingY -= 22;
    }

    drawCenteredText(p, '✦  ✦  ✦', regular, 13, PAGE_H * 0.26, accentColor, PAGE_W, 0, 0.60);
    drawCenteredText(p, s.nextAdventure, regular, 12, PAGE_H * 0.19, dark, PAGE_W, 0, 0.55);

    drawCenteredText(p, 'Kidshade', bold, 11, 26, accentColor, PAGE_W, 0, 0.60);
  }

  // ── Page 32: À propos + Code fidélité ─────────────────────────────────────
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: white });
    p.drawRectangle({ x: 0, y: PAGE_H - TOP_BAND, width: PAGE_W, height: TOP_BAND, color: accentColor, opacity: 0.18 });

    drawCenteredText(p, s.aboutTitle, bold, 16, PAGE_H - 52, accentColor);

    let ay = PAGE_H - 82;
    for (const line of s.aboutLines) {
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
      color: softColor,
      borderColor: accentColor, borderWidth: 1.2, borderOpacity: 0.40,
    });
    // Corner accents
    for (const [cx2, cy2] of [
      [BOX_X, BOX_Y], [BOX_X, BOX_Y + BOX_H],
      [BOX_X + BOX_W, BOX_Y], [BOX_X + BOX_W, BOX_Y + BOX_H],
    ] as [number, number][]) {
      p.drawCircle({ x: cx2, y: cy2, size: 3.5, color: accentColor, opacity: 0.50 });
    }

    drawCenteredText(p, s.thankYou, bold, 12, BOX_Y + BOX_H - 22, dark);
    drawCenteredText(p, s.discountLine1, regular, 10, BOX_Y + BOX_H - 42, dark, PAGE_W, 0, 0.80);
    drawCenteredText(p, s.discountLine2, regular, 10, BOX_Y + BOX_H - 56, dark, PAGE_W, 0, 0.80);

    if (loyaltyPromoCode) {
      drawCenteredText(p, loyaltyPromoCode, bold, 18, BOX_Y + 42, accentColor);
      drawCenteredText(p, s.loyaltyValidity, regular, 9, BOX_Y + 24, dark, PAGE_W, 0, 0.55);
    } else {
      drawCenteredText(p, s.loyaltyEmailFallback, bold, 13, BOX_Y + 42, accentColor, PAGE_W, 0, 0.75);
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
  language?: string;
  coverIllustrationUrl?: string; // optional — embedded on front cover
}): Promise<Uint8Array> {
  const { childName, storyTitle, theme, language = 'fr', coverIllustrationUrl } = params;
  const s = getStrings(language);
  const { accent, soft } = palette(theme);
  const [ar, ag, ab] = accent;
  const [sr, sg, sb] = soft;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bold = await doc.embedFont(loadFont('Geist-Bold.ttf'));
  const regular = await doc.embedFont(loadFont('Geist-Regular.ttf'));
  const p = doc.addPage([COVER_W, COVER_H]);

  const accentColor = rgb(ar, ag, ab);
  const softColor = rgb(sr, sg, sb);
  const white = rgb(1, 1, 1);
  const dark = rgb(0.10, 0.10, 0.14);

  // Pre-fetch cover illustration
  let coverImg: PDFImage | null = null;
  if (coverIllustrationUrl) {
    coverImg = await fetchAndEmbedImage(doc, coverIllustrationUrl);
  }

  // Full cover: soft pastel background (light and cheerful)
  p.drawRectangle({ x: 0, y: 0, width: COVER_W, height: COVER_H, color: softColor });

  // ── Back cover ────────────────────────────────────────────────────────────
  const backX = BLEED;

  // Back cover: white panel
  p.drawRectangle({ x: backX, y: BLEED, width: PAGE_W, height: PAGE_H, color: white });
  p.drawRectangle({
    x: backX + 18, y: BLEED + 18,
    width: PAGE_W - 36, height: PAGE_H - 36,
    borderColor: accentColor, borderWidth: 1, borderOpacity: 0.25,
  });

  // Decorative circles on back
  p.drawCircle({ x: backX + PAGE_W * 0.15, y: BLEED + PAGE_H * 0.85, size: 45, color: accentColor, opacity: 0.10 });
  p.drawCircle({ x: backX + PAGE_W * 0.80, y: BLEED + PAGE_H * 0.20, size: 30, color: accentColor, opacity: 0.08 });

  const backTexts: Array<{ text: string; size: number; isBold: boolean }> = [
    { text: s.backCoverLine1, size: 15, isBold: false },
    { text: s.backCoverLine2, size: 15, isBold: false },
    { text: childName, size: 26, isBold: true },
    { text: '', size: 12, isBold: false },
    { text: 'kidshade.net', size: 12, isBold: true },
  ];
  let bY = BLEED + PAGE_H * 0.58;
  for (const item of backTexts) {
    if (!item.text) { bY -= 10; continue; }
    const f = item.isBold ? bold : regular;
    const color = item.text === childName ? accentColor : dark;
    const w = f.widthOfTextAtSize(item.text, item.size);
    p.drawText(item.text, {
      x: backX + (PAGE_W - w) / 2,
      y: bY, size: item.size, font: f, color,
      opacity: item.text === 'kidshade.net' ? 0.65 : 1,
    });
    bY -= item.size + 10;
  }

  // ── Spine ─────────────────────────────────────────────────────────────────
  const spineX = BLEED + PAGE_W;
  p.drawRectangle({
    x: spineX, y: 0,
    width: SPINE_W, height: COVER_H,
    color: accentColor,
  });

  // ── Front cover ───────────────────────────────────────────────────────────
  const frontX = BLEED + PAGE_W + SPINE_W;

  // Front: white panel
  p.drawRectangle({ x: frontX, y: BLEED, width: PAGE_W, height: PAGE_H, color: white });

  // Colored top bar (bold, cheerful)
  const TOP_BAR_H = PAGE_H * 0.10;
  p.drawRectangle({ x: frontX, y: BLEED + PAGE_H - TOP_BAR_H, width: PAGE_W, height: TOP_BAR_H, color: accentColor });

  // Decorative circles behind illustration
  p.drawCircle({ x: frontX + PAGE_W - 40, y: BLEED + PAGE_H - 40, size: 65, color: accentColor, opacity: 0.10 });
  p.drawCircle({ x: frontX + 35, y: BLEED + 55, size: 50, color: accentColor, opacity: 0.08 });

  // Large illustration — takes up ~55% of page height, full width
  const COVER_ILLUS_H = PAGE_H * 0.55;
  const COVER_ILLUS_Y = BLEED + PAGE_H * 0.26;
  const COVER_ILLUS_X = frontX;
  const COVER_ILLUS_W = PAGE_W;

  if (coverImg) {
    drawImageFit(p, coverImg, COVER_ILLUS_X, COVER_ILLUS_Y, COVER_ILLUS_W, COVER_ILLUS_H);
  } else {
    p.drawRectangle({
      x: COVER_ILLUS_X, y: COVER_ILLUS_Y, width: COVER_ILLUS_W, height: COVER_ILLUS_H,
      color: softColor,
    });
    p.drawCircle({ x: frontX + PAGE_W / 2, y: COVER_ILLUS_Y + COVER_ILLUS_H / 2, size: 55, color: accentColor, opacity: 0.18 });
  }

  // Title text — large, bold, colorful, on white area below illustration
  const titleLines = wrapText(storyTitle, bold, 24, PAGE_W - MARGIN * 2);
  let ty = COVER_ILLUS_Y - 18;
  for (const line of titleLines.slice(0, 3)) {
    const w = bold.widthOfTextAtSize(line, 24);
    p.drawText(line, { x: frontX + (PAGE_W - w) / 2, y: ty, size: 24, font: bold, color: accentColor });
    ty -= 32;
  }

  // "Story of [name]" subtitle
  const nameStr = `${s.storyOf} ${childName}`;
  const nameW = regular.widthOfTextAtSize(nameStr, 14);
  p.drawText(nameStr, {
    x: frontX + (PAGE_W - nameW) / 2,
    y: BLEED + PAGE_H * 0.175,
    size: 14, font: regular, color: dark, opacity: 0.75,
  });

  // Kidshade branding — white text on top color bar
  const brandW = bold.widthOfTextAtSize('Kidshade', 12);
  p.drawText('Kidshade', {
    x: frontX + (PAGE_W - brandW) / 2,
    y: BLEED + PAGE_H - TOP_BAR_H + (TOP_BAR_H - 12) / 2,
    size: 12, font: bold, color: white, opacity: 0.92,
  });

  return doc.save();
}
