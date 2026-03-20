// Quick preview script — run with: node generate-preview.mjs
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { writeFileSync } from 'fs';

const PAGE_W = 419.76;
const PAGE_H = 595.44;
const MARGIN = 38;
const BLEED = 9;
const SPINE_W = 6;
const COVER_W = BLEED + PAGE_W + SPINE_W + PAGE_W + BLEED;
const COVER_H = PAGE_H + BLEED * 2;

const THEME_PALETTES = {
  dragons:     { bg: [0.10, 0.02, 0.20], accent: [0.98, 0.45, 0.09] },
  space:       { bg: [0.01, 0.02, 0.09], accent: [0.51, 0.55, 0.97] },
  forest:      { bg: [0.02, 0.18, 0.08], accent: [0.53, 0.94, 0.67] },
  ocean:       { bg: [0.05, 0.29, 0.43], accent: [0.49, 0.83, 0.99] },
  princess:    { bg: [0.31, 0.03, 0.14], accent: [0.98, 0.66, 0.83] },
  superheroes: { bg: [0.12, 0.11, 0.29], accent: [0.98, 0.75, 0.14] },
};

const SAMPLE = {
  childName: 'Emma',
  childAge: 7,
  storyTitle: 'Emma et le Dragon des Étoiles',
  theme: 'dragons',
  loyaltyPromoCode: 'KIDSHADE-A3X7K2', // exemple de code fidélité
  storyContent: `Il était une fois une petite fille courageuse prénommée Emma, qui vivait dans un village niché au pied de montagnes majestueuses. Chaque nuit, elle levait les yeux vers le ciel étoilé et rêvait d'aventures lointaines.

Un soir, alors qu'elle observait les étoiles depuis sa fenêtre, Emma remarqua une lumière étrange qui descendait du ciel en spirale. C'était un dragon aux écailles dorées, dont les ailes brillaient comme mille diamants.

Le dragon se posa doucement dans le jardin d'Emma. Ses grands yeux violets regardèrent la petite fille avec bienveillance. "Je m'appelle Astral," dit-il d'une voix douce comme le tonnerre lointain. "Je suis venu te chercher pour une grande aventure."

Emma n'eut pas peur. Elle enfila son manteau, prit son chapeau préféré — celui avec les petites étoiles brodées — et grimpa sur le dos du dragon. En quelques battements d'ailes, ils s'élevèrent au-dessus des nuages.

Le voyage les emmena au cœur d'une forêt enchantée suspendue entre les étoiles. Les arbres avaient des feuilles en cristal qui tintaient doucement dans le vent cosmique. Des créatures lumineuses dansaient entre les branches.

"Ces créatures sont perdues," expliqua Astral. "Leur étoile-guide s'est éteinte il y a bien longtemps, et elles errent sans savoir où aller." Emma regarda les petits êtres avec compassion. Elle devait les aider.

Emma se souvint alors de son cahier magique, cadeau de sa grand-mère. Chaque dessin qu'elle y faisait devenait réel. Elle sortit le cahier et, avec son crayon d'argent, dessina une étoile brillante au milieu du ciel forestier.

La lumière jaillit du dessin et illumina toute la forêt. Les créatures s'arrêtèrent, levèrent les yeux, et poussèrent des cris de joie. Elles avaient retrouvé leur chemin. La plus grande des créatures s'approcha d'Emma et lui offrit une plume dorée.

"Cette plume te permettra de dessiner une étoile dans le ciel réel," dit la créature. "Ainsi, chaque nuit, tu pourras guider ceux qui sont perdus dans l'obscurité."

Emma remercia la créature avec un grand sourire. Le voyage du retour fut tout aussi magique. Astral volait doucement, et Emma observait les étoiles nouvelles apparaître une à une dans le ciel nocturne.

De retour dans son jardin, Emma embrassa le cou du dragon. "Merci pour cette aventure," dit-elle. Astral sourit de ses grandes dents brillantes. "C'est toi qui as tout fait," répondit-il. "Tu avais le courage et la magie en toi depuis le début."

Le lendemain matin, Emma se réveilla avec la plume dorée sur son oreiller. Ce n'était pas un rêve. Et dans le ciel de son village, une nouvelle étoile brillait, plus lumineuse que toutes les autres — l'étoile d'Emma.`,
};

function wrapText(text, font, fontSize, maxWidth) {
  const words = text.split(' ');
  const lines = [];
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

function drawCentered(page, text, font, size, y, color, pageWidth = PAGE_W, offsetX = 0, opacity) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: offsetX + (pageWidth - w) / 2, y,
    size, font, color,
    ...(opacity !== undefined ? { opacity } : {}),
  });
}

function splitIntoChunks(content, targetCount) {
  const paragraphs = content.split('\n\n').map(p => p.trim()).filter(Boolean);
  const chunks = [...paragraphs];
  while (chunks.length < targetCount) {
    let longestIdx = 0;
    for (let i = 1; i < chunks.length; i++) {
      if (chunks[i].length > chunks[longestIdx].length) longestIdx = i;
    }
    const sentences = chunks[longestIdx].match(/[^.!?]+[.!?]+\s*/g) ?? [chunks[longestIdx]];
    if (sentences.length <= 1) break;
    const mid = Math.ceil(sentences.length / 2);
    chunks.splice(longestIdx, 1,
      sentences.slice(0, mid).join('').trim(),
      sentences.slice(mid).join('').trim()
    );
  }
  while (chunks.length < targetCount) chunks.push('');
  return chunks;
}

async function generateInterior() {
  const { childName, storyTitle, storyContent, theme } = SAMPLE;
  const { bg, accent } = THEME_PALETTES[theme];
  const [br, bg2, bb] = bg;
  const [ar, ag, ab] = accent;

  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const bgColor = rgb(br, bg2, bb);
  const accentColor = rgb(ar, ag, ab);
  const white = rgb(1, 1, 1);
  const dark = rgb(0.08, 0.08, 0.12);
  const cream = rgb(1, 0.99, 0.97);

  // Page 1: Title
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: bgColor });
    p.drawCircle({ x: PAGE_W - 55, y: PAGE_H - 55, size: 75, color: accentColor, opacity: 0.18 });
    p.drawCircle({ x: 55, y: 90, size: 55, color: accentColor, opacity: 0.12 });
    p.drawCircle({ x: PAGE_W / 2, y: PAGE_H * 0.52, size: 110, color: accentColor, opacity: 0.07 });

    // Illustration placeholder with "Image IA" label
    p.drawRectangle({
      x: MARGIN + 10, y: PAGE_H * 0.22,
      width: PAGE_W - (MARGIN + 10) * 2, height: PAGE_H * 0.24,
      color: accentColor, opacity: 0.10,
      borderColor: accentColor, borderWidth: 1.5, borderOpacity: 0.30,
    });
    drawCentered(p, '[ Illustration IA ]', regular, 11, PAGE_H * 0.35, accentColor, PAGE_W, 0, 0.45);

    const titleLines = wrapText(storyTitle, bold, 26, PAGE_W - MARGIN * 2);
    let ty = PAGE_H * 0.72;
    for (const line of titleLines.slice(0, 3)) {
      drawCentered(p, line, bold, 26, ty, accentColor);
      ty -= 36;
    }
    drawCentered(p, `L'histoire de ${childName}`, regular, 16, PAGE_H * 0.58, white, PAGE_W, 0, 0.85);
    drawCentered(p, 'Kidshade', bold, 12, 28, accentColor, PAGE_W, 0, 0.65);
  }

  // Page 2: Dedication
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
    p.drawRectangle({ x: 18, y: 18, width: PAGE_W - 36, height: PAGE_H - 36, borderColor: accentColor, borderWidth: 1.5, borderOpacity: 0.40 });

    const lines = [
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
      drawCentered(p, line.text, f, line.size, y, color);
      y -= line.size + 14;
    }
  }

  // Pages 3-28: Story
  const chunks = splitIntoChunks(storyContent, 26);
  for (let i = 0; i < 26; i++) {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    const pageNum = i + 3;
    const chunk = chunks[i] ?? '';
    const isEven = pageNum % 2 === 0;

    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
    p.drawRectangle({ x: 0, y: PAGE_H - 30, width: PAGE_W, height: 30, color: bgColor });

    const pnStr = String(pageNum);
    const pnW = bold.widthOfTextAtSize(pnStr, 10);
    p.drawText(pnStr, { x: isEven ? MARGIN : PAGE_W - MARGIN - pnW, y: PAGE_H - 20, size: 10, font: bold, color: accentColor });

    const shortTitle = storyTitle.length > 28 ? storyTitle.slice(0, 26) + '…' : storyTitle;
    const stW = regular.widthOfTextAtSize(shortTitle, 8);
    p.drawText(shortTitle, { x: isEven ? PAGE_W - MARGIN - stW : MARGIN, y: PAGE_H - 19, size: 8, font: regular, color: white, opacity: 0.65 });

    const ILLUS_H = 220;
    const ILLUS_Y = PAGE_H - 30 - 6 - ILLUS_H;
    p.drawRectangle({
      x: MARGIN, y: ILLUS_Y,
      width: PAGE_W - MARGIN * 2, height: ILLUS_H,
      color: bgColor, opacity: 0.07,
      borderColor: accentColor, borderWidth: 0.8, borderOpacity: 0.25,
    });
    p.drawCircle({ x: PAGE_W / 2, y: ILLUS_Y + ILLUS_H / 2, size: 28, color: accentColor, opacity: 0.08 });
    drawCentered(p, '[ Illustration IA ]', regular, 10, ILLUS_Y + ILLUS_H / 2 - 5, accentColor, PAGE_W, 0, 0.30);

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

  // Page 29: Activité — Dessine ton aventure
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
    p.drawRectangle({ x: 0, y: PAGE_H - 30, width: PAGE_W, height: 30, color: bgColor });
    drawCentered(p, 'Dessine ton aventure !', bold, 20, PAGE_H - 62, rgb(ar * 0.75, ag * 0.75, ab * 0.75));
    drawCentered(p, "La scène la plus magique de l'histoire...", regular, 12, PAGE_H - 85, dark);
    const frameY = 45;
    const frameH = PAGE_H - 110;
    p.drawRectangle({ x: MARGIN + 8, y: frameY, width: PAGE_W - (MARGIN + 8) * 2, height: frameH, color: white, borderColor: accentColor, borderWidth: 1.2, borderOpacity: 0.45 });
    for (const [cx, cy] of [[MARGIN+8, frameY],[MARGIN+8, frameY+frameH],[PAGE_W-MARGIN-8, frameY],[PAGE_W-MARGIN-8, frameY+frameH]]) {
      p.drawCircle({ x: cx, y: cy, size: 4, color: accentColor, opacity: 0.55 });
    }
  }

  // Page 30: Portrait du héros
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
    p.drawRectangle({ x: 0, y: PAGE_H - 30, width: PAGE_W, height: 30, color: bgColor });
    drawCentered(p, `${childName}, le héros !`, bold, 20, PAGE_H - 62, rgb(ar * 0.75, ag * 0.75, ab * 0.75));
    drawCentered(p, 'Dessine ton portrait de super-héros :', regular, 12, PAGE_H - 85, dark);
    p.drawEllipse({ x: PAGE_W / 2, y: PAGE_H * 0.46, xScale: 110, yScale: 140, borderColor: accentColor, borderWidth: 1.5, borderOpacity: 0.50, color: white });
    p.drawRectangle({ x: MARGIN + 30, y: 45, width: PAGE_W - (MARGIN + 30) * 2, height: 55, borderColor: accentColor, borderWidth: 0.8, borderOpacity: 0.30 });
    drawCentered(p, 'Mes super-pouvoirs :', regular, 11, 88, dark);
    drawCentered(p, '___________________________', regular, 11, 72, rgb(0.7, 0.7, 0.7));
  }

  // Page 31: Mot de la fin
  {
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: bgColor });
    p.drawCircle({ x: PAGE_W / 2, y: PAGE_H * 0.55, size: 130, color: accentColor, opacity: 0.08 });
    p.drawCircle({ x: PAGE_W / 2, y: PAGE_H * 0.55, size: 80, color: accentColor, opacity: 0.08 });
    p.drawCircle({ x: PAGE_W - 40, y: PAGE_H - 40, size: 50, color: accentColor, opacity: 0.10 });
    p.drawCircle({ x: 40, y: 60, size: 35, color: accentColor, opacity: 0.10 });

    drawCentered(p, 'FIN', bold, 48, PAGE_H * 0.70, accentColor);
    drawCentered(p, `Bravo ${childName} !`, bold, 20, PAGE_H * 0.58, white, PAGE_W, 0, 0.92);

    const closingLines = [
      'Tu as vécu une grande aventure.',
      'Chaque histoire que tu lis',
      't\'ouvre une porte vers un',
      'nouveau monde magique.',
    ];
    let cy = PAGE_H * 0.46;
    for (const line of closingLines) {
      drawCentered(p, line, regular, 13, cy, white, PAGE_W, 0, 0.70);
      cy -= 22;
    }
    drawCentered(p, '* * *', regular, 14, PAGE_H * 0.25, accentColor, PAGE_W, 0, 0.55);
    drawCentered(p, 'La prochaine aventure t\'attend...', regular, 12, PAGE_H * 0.19, white, PAGE_W, 0, 0.50);
    drawCentered(p, 'Kidshade', bold, 11, 26, accentColor, PAGE_W, 0, 0.55);
  }

  // Page 32: À propos + Code fidélité
  {
    const { loyaltyPromoCode } = SAMPLE;
    const p = doc.addPage([PAGE_W, PAGE_H]);
    p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
    p.drawRectangle({ x: 0, y: PAGE_H - 30, width: PAGE_W, height: 30, color: bgColor });
    drawCentered(p, 'À propos de Kidshade', bold, 16, PAGE_H - 66, rgb(ar * 0.7, ag * 0.7, ab * 0.7));

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
      drawCentered(p, line, isUrl ? bold : regular, isUrl ? 13 : 12, ay, isUrl ? accentColor : dark);
      ay -= 20;
    }

    // Loyalty promo code block
    const BOX_Y = 70;
    const BOX_H = 115;
    const BOX_X = MARGIN + 10;
    const BOX_W = PAGE_W - (MARGIN + 10) * 2;
    p.drawRectangle({ x: BOX_X, y: BOX_Y, width: BOX_W, height: BOX_H, color: bgColor, opacity: 0.07, borderColor: accentColor, borderWidth: 1.2, borderOpacity: 0.45 });
    for (const [cx2, cy2] of [[BOX_X, BOX_Y],[BOX_X, BOX_Y+BOX_H],[BOX_X+BOX_W, BOX_Y],[BOX_X+BOX_W, BOX_Y+BOX_H]]) {
      p.drawCircle({ x: cx2, y: cy2, size: 3.5, color: accentColor, opacity: 0.55 });
    }
    drawCentered(p, 'Merci de votre confiance !', bold, 12, BOX_Y + BOX_H - 22, dark);
    drawCentered(p, 'Profitez de 5% de réduction sur votre', regular, 10, BOX_Y + BOX_H - 42, dark, PAGE_W, 0, 0.80);
    drawCentered(p, 'prochain livre avec le code :', regular, 10, BOX_Y + BOX_H - 56, dark, PAGE_W, 0, 0.80);
    drawCentered(p, loyaltyPromoCode, bold, 18, BOX_Y + 42, accentColor);
    drawCentered(p, 'Valable 1 fois · kidshade.net', regular, 9, BOX_Y + 24, dark, PAGE_W, 0, 0.55);
  }

  return doc.save();
}

async function generateCover() {
  const { childName, storyTitle, theme } = SAMPLE;
  const { bg, accent } = THEME_PALETTES[theme];
  const [br, bg2, bb] = bg;
  const [ar, ag, ab] = accent;

  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const p = doc.addPage([COVER_W, COVER_H]);

  const bgColor = rgb(br, bg2, bb);
  const accentColor = rgb(ar, ag, ab);
  const white = rgb(1, 1, 1);

  p.drawRectangle({ x: 0, y: 0, width: COVER_W, height: COVER_H, color: bgColor });

  // Back cover
  const backX = BLEED;
  p.drawRectangle({ x: backX + 18, y: BLEED + 18, width: PAGE_W - 36, height: PAGE_H - 36, borderColor: accentColor, borderWidth: 1, borderOpacity: 0.28 });
  const backTexts = [
    { text: 'Une histoire', size: 15, isBold: false },
    { text: 'rien que pour', size: 15, isBold: false },
    { text: childName, size: 24, isBold: true },
    { text: '', size: 12, isBold: false },
    { text: 'kidshade.net', size: 13, isBold: true },
  ];
  let bY = BLEED + PAGE_H * 0.60;
  for (const item of backTexts) {
    if (!item.text) { bY -= 10; continue; }
    const f = item.isBold ? bold : regular;
    const color = item.isBold && item.text === childName ? accentColor : white;
    const w = f.widthOfTextAtSize(item.text, item.size);
    p.drawText(item.text, { x: backX + (PAGE_W - w) / 2, y: bY, size: item.size, font: f, color, opacity: item.text === childName ? 1 : 0.82 });
    bY -= item.size + 10;
  }

  // Spine
  const spineX = BLEED + PAGE_W;
  p.drawRectangle({ x: spineX, y: 0, width: SPINE_W, height: COVER_H, color: rgb(ar * 0.75, ag * 0.75, ab * 0.75) });

  // Front cover
  const frontX = BLEED + PAGE_W + SPINE_W;
  p.drawCircle({ x: frontX + PAGE_W - 50, y: BLEED + PAGE_H - 50, size: 80, color: accentColor, opacity: 0.16 });
  p.drawCircle({ x: frontX + 50, y: BLEED + 70, size: 60, color: accentColor, opacity: 0.12 });
  p.drawCircle({ x: frontX + PAGE_W / 2, y: BLEED + PAGE_H * 0.48, size: 120, color: accentColor, opacity: 0.06 });

  p.drawRectangle({
    x: frontX + MARGIN, y: BLEED + PAGE_H * 0.36,
    width: PAGE_W - MARGIN * 2, height: PAGE_H * 0.44,
    color: accentColor, opacity: 0.09,
    borderColor: accentColor, borderWidth: 1.5, borderOpacity: 0.35,
  });
  const centerFront = PAGE_W;
  drawCentered(p, '[ Illustration IA couverture ]', regular, 11, BLEED + PAGE_H * 0.57, accentColor, centerFront, frontX, 0.40);

  const titleLines = wrapText(storyTitle, bold, 22, PAGE_W - MARGIN * 2);
  let ty = BLEED + PAGE_H * 0.305;
  for (const line of titleLines.slice(0, 3)) {
    const w = bold.widthOfTextAtSize(line, 22);
    p.drawText(line, { x: frontX + (PAGE_W - w) / 2, y: ty, size: 22, font: bold, color: accentColor });
    ty -= 30;
  }

  const nameStr = `L'histoire de ${childName}`;
  const nameW = regular.widthOfTextAtSize(nameStr, 15);
  p.drawText(nameStr, { x: frontX + (PAGE_W - nameW) / 2, y: BLEED + PAGE_H * 0.23, size: 15, font: regular, color: white, opacity: 0.87 });

  const brandW = bold.widthOfTextAtSize('Kidshade', 12);
  p.drawText('Kidshade', { x: frontX + (PAGE_W - brandW) / 2, y: BLEED + 18, size: 12, font: bold, color: accentColor, opacity: 0.72 });

  return doc.save();
}

console.log('Generating preview PDFs...');
const [interiorBytes, coverBytes] = await Promise.all([generateInterior(), generateCover()]);
writeFileSync('preview-interior.pdf', interiorBytes);
writeFileSync('preview-cover.pdf', coverBytes);
console.log('Done!');
console.log('  preview-interior.pdf — 32 pages intérieures');
console.log('  preview-cover.pdf    — couverture (dos + tranche + première de couv)');
