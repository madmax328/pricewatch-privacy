// Themed SVG illustrations for children's storybook
// Each theme has a color palette and scene elements

interface ThemeConfig {
  bg1: string;
  bg2: string;
  accent: string;
  accent2: string;
  scene: (seed: number) => string;
}

const themes: Record<string, ThemeConfig> = {
  dragons: {
    bg1: '#1a0533', bg2: '#6b21a8', accent: '#f97316', accent2: '#fbbf24',
    scene: (s) => `
      <ellipse cx="256" cy="340" rx="180" ry="40" fill="#0f0022" opacity="0.4"/>
      <rect x="60" y="200" width="60" height="120" fill="#7c3aed" rx="4"/>
      <rect x="50" y="180" width="80" height="30" fill="#7c3aed" rx="2"/>
      <polygon points="50,180 90,150 130,180" fill="#6d28d9"/>
      <rect x="340" y="220" width="80" height="100" fill="#6d28d9" rx="4"/>
      <polygon points="340,220 380,185 420,220" fill="#5b21b6"/>
      <path d="M180 ${220 + (s % 3) * 10} Q256 ${160 + (s % 4) * 15} ${300 + s % 30} ${200 + s % 20}" stroke="#f97316" stroke-width="3" fill="none" opacity="0.6"/>
      <ellipse cx="${200 + s % 40}" cy="${180 + s % 30}" rx="55" ry="35" fill="#f97316"/>
      <polygon points="${200 + s % 40},145 ${160 + s % 40},175 ${240 + s % 40},175" fill="#dc2626"/>
      <circle cx="${210 + s % 40}" cy="${172 + s % 30}" r="6" fill="#fbbf24"/>
      <circle cx="${230 + s % 40}" cy="${172 + s % 30}" r="6" fill="#fbbf24"/>
      <path d="M${195 + s % 40} ${195 + s % 30} Q${200 + s % 40} ${205 + s % 30} ${215 + s % 40} ${195 + s % 30}" stroke="#dc2626" stroke-width="2" fill="none"/>
      ${Array.from({length:12},(_,i)=>`<circle cx="${30+i*42}" cy="${300+Math.sin(i)*20}" r="2" fill="#fbbf24" opacity="${0.4+i*0.05}"/>`).join('')}
    `,
  },
  space: {
    bg1: '#020617', bg2: '#0f172a', accent: '#818cf8', accent2: '#38bdf8',
    scene: (s) => `
      ${Array.from({length:30},(_,i)=>`<circle cx="${(i*67+s*13)%490+10}" cy="${(i*41+s*7)%350+10}" r="${1+i%2}" fill="white" opacity="${0.4+0.6*(i%3)/3}"/>`).join('')}
      <circle cx="${180+s%40}" cy="${130+s%30}" r="45" fill="#312e81"/>
      <circle cx="${180+s%40}" cy="${130+s%30}" r="45" fill="none" stroke="#818cf8" stroke-width="2"/>
      <ellipse cx="${350+s%20}" cy="${90+s%20}" rx="30" ry="30" fill="#7c3aed" opacity="0.8"/>
      <ellipse cx="${350+s%20}" cy="${90+s%20}" rx="45" ry="12" fill="none" stroke="#a78bfa" stroke-width="2" opacity="0.7"/>
      <polygon points="240,280 256,200 272,280" fill="#e2e8f0"/>
      <rect x="230" y="278" width="52" height="20" fill="#e2e8f0" rx="4"/>
      <rect x="218" y="290" width="20" height="12" fill="#94a3b8" rx="3"/>
      <rect x="274" y="290" width="20" height="12" fill="#94a3b8" rx="3"/>
      <circle cx="256" cy="236" r="12" fill="#38bdf8" opacity="0.9"/>
      <path d="M256 295 L256 320 Q256 330 246 330 L236 330" stroke="#f97316" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M256 295 L256 320 Q256 330 266 330 L276 330" stroke="#f97316" stroke-width="3" fill="none" stroke-linecap="round"/>
    `,
  },
  forest: {
    bg1: '#052e16', bg2: '#14532d', accent: '#86efac', accent2: '#fbbf24',
    scene: (s) => `
      <ellipse cx="256" cy="360" rx="220" ry="30" fill="#052e16"/>
      ${[60,130,190,260,330,390].map((x,i)=>`
        <polygon points="${x},${280-(i%3)*20} ${x-35+(i%2)*10},${350} ${x+35-(i%2)*10},${350}" fill="${['#15803d','#166534','#16a34a'][i%3]}"/>
        <polygon points="${x},${240-(i%3)*20} ${x-25+(i%2)*8},${300} ${x+25-(i%2)*8},${300}" fill="${['#22c55e','#4ade80','#16a34a'][i%3]}"/>
      `).join('')}
      <ellipse cx="256" cy="300" rx="60" ry="55" fill="#713f12"/>
      <circle cx="256" cy="245" r="55" fill="#78350f"/>
      <circle cx="240" cy="248" r="8" fill="#fbbf24"/>
      <circle cx="265" cy="243" r="8" fill="#fbbf24"/>
      <path d="M245 268 Q256 278 267 268" stroke="#92400e" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <circle cx="${100+s%60}" cy="${200+s%40}" r="8" fill="#fbbf24" opacity="0.8"/>
      <circle cx="${380+s%40}" cy="${180+s%30}" r="6" fill="#fbbf24" opacity="0.6"/>
      ${Array.from({length:8},(_,i)=>`<circle cx="${60+i*55+s%20}" cy="${340+Math.sin(i+s)*10}" r="4" fill="#86efac" opacity="0.7"/>`).join('')}
    `,
  },
  ocean: {
    bg1: '#0c4a6e', bg2: '#0369a1', accent: '#7dd3fc', accent2: '#34d399',
    scene: (s) => `
      <ellipse cx="256" cy="${220+s%20}" rx="200" ry="80" fill="#0284c7" opacity="0.5"/>
      <ellipse cx="256" cy="${240+s%20}" rx="230" ry="60" fill="#0369a1" opacity="0.6"/>
      <path d="M10 280 Q80 ${260+s%20} 150 280 Q220 ${300+s%20} 290 280 Q360 ${260+s%20} 430 280 Q500 ${300+s%20} 512 280 L512 400 L10 400 Z" fill="#1d4ed8" opacity="0.8"/>
      <ellipse cx="${180+s%50}" cy="${180+s%30}" rx="55" ry="35" fill="#7dd3fc"/>
      <path d="M${155+s%50} ${175+s%30} Q${180+s%50} ${155+s%30} ${205+s%50} ${175+s%30}" stroke="#38bdf8" stroke-width="2.5" fill="none"/>
      <circle cx="${170+s%50}" cy="${168+s%30}" r="5" fill="#0f172a"/>
      <path d="M${205+s%50} ${175+s%30} L${230+s%50} ${165+s%30} L${225+s%50} ${180+s%30} Z" fill="#7dd3fc"/>
      <ellipse cx="${320+s%30}" cy="${240+s%20}" rx="30" ry="18" fill="#34d399" opacity="0.8"/>
      <ellipse cx="${100+s%30}" cy="${260+s%20}" rx="20" ry="12" fill="#f472b6" opacity="0.7"/>
      ${Array.from({length:15},(_,i)=>`<circle cx="${20+i*33+s%15}" cy="${120+Math.sin(i+s*0.5)*25}" r="3" fill="#7dd3fc" opacity="0.5"/>`).join('')}
    `,
  },
  princess: {
    bg1: '#500724', bg2: '#9d174d', accent: '#f9a8d4', accent2: '#fde68a',
    scene: (s) => `
      <polygon points="180,160 205,220 155,220" fill="#c026d3"/>
      <rect x="155" y="220" width="50" height="100" fill="#d946ef"/>
      <polygon points="300,140 330,210 270,210" fill="#a21caf"/>
      <rect x="270" y="210" width="60" height="110" fill="#c026d3"/>
      <rect x="155" y="180" width="175" height="50" fill="#9333ea"/>
      <circle cx="256" cy="195" r="20" fill="#fbbf24"/>
      <circle cx="256" cy="175" r="22" fill="#fcd34d"/>
      <path d="M234 175 Q256 155 278 175" fill="#fbbf24"/>
      <circle cx="248" cy="178" r="4" fill="#7c3aed"/>
      <circle cx="264" cy="178" r="4" fill="#7c3aed"/>
      <path d="M249 188 Q256 196 263 188" stroke="#be123c" stroke-width="2" fill="none"/>
      <circle cx="256" cy="155" r="8" fill="#fbbf24"/>
      ${Array.from({length:3},(_,i)=>`<circle cx="${240+i*16}" cy="153" r="4" fill="${['#f472b6','#fbbf24','#f472b6'][i]}"/>`).join('')}
      ${Array.from({length:10},(_,i)=>`<path d="M${80+i*38+s%15} ${300+s%20} Q${90+i*38+s%15} ${280+s%20} ${100+i*38+s%15} ${300+s%20}" stroke="#f9a8d4" stroke-width="1.5" fill="none" opacity="0.7"/>`).join('')}
    `,
  },
  dinosaurs: {
    bg1: '#365314', bg2: '#4d7c0f', accent: '#86efac', accent2: '#fbbf24',
    scene: (s) => `
      <ellipse cx="100" cy="320" rx="80" ry="60" fill="#15803d" opacity="0.5"/>
      <ellipse cx="400" cy="310" rx="70" ry="50" fill="#15803d" opacity="0.5"/>
      <ellipse cx="256" cy="${240+s%20}" rx="80" ry="65" fill="#16a34a"/>
      <ellipse cx="256" cy="${180+s%20}" rx="55" ry="48" fill="#22c55e"/>
      <path d="M${290+s%10} ${185+s%20} L${330+s%10} ${165+s%20} L${320+s%10} ${200+s%20}" fill="#16a34a"/>
      <path d="M${295+s%10} ${195+s%20} L${325+s%10} ${180+s%20} L${315+s%10} ${210+s%20}" fill="#22c55e"/>
      <circle cx="${240+s%10}" cy="${175+s%20}" r="7" fill="#fbbf24"/>
      <circle cx="${268+s%10}" cy="${173+s%20}" r="7" fill="#fbbf24"/>
      <circle cx="${241+s%10}" cy="${175+s%20}" r="3.5" fill="#052e16"/>
      <circle cx="${269+s%10}" cy="${173+s%20}" r="3.5" fill="#052e16"/>
      <path d="M${243+s%10} ${195+s%20} L${269+s%10} ${195+s%20}" stroke="#052e16" stroke-width="2" fill="none"/>
      <path d="M${180+s%20} ${290+s%10} L${140+s%20} ${340+s%10} L${175+s%20} ${340+s%10}" fill="#15803d"/>
      <path d="M${290+s%20} ${295+s%10} L${340+s%20} ${340+s%10} L${300+s%20} ${340+s%10}" fill="#15803d"/>
      ${Array.from({length:5},(_,i)=>`<polygon points="${80+i*80+s%20},${360} ${95+i*80+s%20},${330} ${110+i*80+s%20},${360}" fill="#4ade80" opacity="0.6"/>`).join('')}
    `,
  },
  superheroes: {
    bg1: '#1e1b4b', bg2: '#312e81', accent: '#fbbf24', accent2: '#ef4444',
    scene: (s) => `
      ${Array.from({length:20},(_,i)=>`<rect x="${(i*57+s*7)%480+10}" y="${(i*43+s*11)%350+10}" width="2" height="${4+i%6}" fill="${['#fbbf24','#f97316','#ef4444'][i%3]}" opacity="${0.3+0.7*(i%4)/4}"/>`).join('')}
      <path d="M${180+s%30} ${300+s%20} L${200+s%30} ${160+s%20} L${256} ${120} L${312-s%30} ${160-s%20} L${332-s%30} ${300-s%20}" fill="#dc2626"/>
      <path d="M${200+s%30} ${160+s%20} L${256} ${120} L${312-s%30} ${160-s%20} L${256} ${200}" fill="#b91c1c"/>
      <rect x="230" y="115" width="52" height="45" rx="26" fill="#fbbf24"/>
      <circle cx="244" cy="133" r="5" fill="#1e1b4b"/>
      <circle cx="268" cy="133" r="5" fill="#1e1b4b"/>
      <path d="M244 145 Q256 155 268 145" stroke="#1e1b4b" stroke-width="2" fill="none"/>
      <rect x="238" y="112" width="36" height="12" rx="6" fill="#fbbf24"/>
      <path d="M${256} ${165} L${226+s%10} ${220} L${256} ${210} L${286-s%10} ${220} Z" fill="#fbbf24"/>
      <path d="M${150+s%20} ${220} L${200+s%20} ${260} L${190+s%20} ${300}" stroke="#ef4444" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M${362-s%20} ${220} L${312-s%20} ${260} L${322-s%20} ${300}" stroke="#ef4444" stroke-width="4" fill="none" stroke-linecap="round"/>
    `,
  },
  animals: {
    bg1: '#78350f', bg2: '#92400e', accent: '#fde68a', accent2: '#86efac',
    scene: (s) => `
      <ellipse cx="256" cy="350" rx="200" ry="40" fill="#78350f" opacity="0.5"/>
      <circle cx="${220+s%30}" cy="${200+s%20}" rx="60" ry="58" fill="#f59e0b"/>
      <circle cx="${220+s%30}" cy="${200+s%20}" r="58" fill="#f59e0b"/>
      <circle cx="${205+s%30}" cy="${185+s%20}" r="20" fill="#fbbf24"/>
      <circle cx="${240+s%30}" cy="${185+s%20}" r="20" fill="#fbbf24"/>
      <ellipse cx="${220+s%30}" cy="${210+s%20}" rx="35" ry="28" fill="#fde68a"/>
      <circle cx="${210+s%30}" cy="${188+s%20}" r="7" fill="#1c1917"/>
      <circle cx="${234+s%30}" cy="${186+s%20}" r="7" fill="#1c1917"/>
      <ellipse cx="${220+s%30}" cy="${213+s%20}" rx="12" ry="7" fill="#b45309"/>
      <path d="M${208+s%30} ${222+s%20} Q${220+s%30} ${232+s%20} ${232+s%30} ${222+s%20}" stroke="#92400e" stroke-width="2" fill="none"/>
      <ellipse cx="${200+s%30}" cy="${162+s%20}" rx="14" ry="18" fill="#f59e0b"/>
      <ellipse cx="${240+s%30}" cy="${160+s%20}" rx="14" ry="18" fill="#f59e0b"/>
      <ellipse cx="${260+s%30}" cy="${230+s%20}" rx="30" ry="12" fill="#f59e0b"/>
      ${Array.from({length:6},(_,i)=>`<circle cx="${80+i*60+s%25}" cy="${320+Math.sin(i+s)*12}" r="8" fill="#86efac" opacity="0.7"/>`).join('')}
    `,
  },
  pirates: {
    bg1: '#0c4a6e', bg2: '#075985', accent: '#fbbf24', accent2: '#dc2626',
    scene: (s) => `
      <path d="M10 280 Q80 ${260+s%15} 150 280 Q220 ${300+s%15} 290 280 Q360 ${260+s%15} 430 280 Q500 ${295+s%15} 512 280 L512 400 L10 400 Z" fill="#1d4ed8"/>
      <path d="M156 ${280} L156 ${160} L${290} ${200} L156 ${230}" fill="#f5f5f4"/>
      <rect x="150" y="150" width="10" height="160" fill="#78350f"/>
      <path d="M156 ${280} L${100} ${290} L${100} ${280} L${100} ${260} L${150} ${220}" fill="#dc2626"/>
      <polygon points="280,195 300,185 290,205" fill="#fbbf24"/>
      <rect x="90" y="270" width="170" height="50" rx="8" fill="#92400e"/>
      <rect x="110" y="260" width="130" height="15" rx="4" fill="#78350f"/>
      <circle cx="${180+s%20}" cy="${200+s%15}" r="22" fill="#fde68a"/>
      <circle cx="${180+s%20}" cy="${193+s%15}" r="18" fill="#fbbf24"/>
      <circle cx="${174+s%20}" cy="${190+s%15}" r="4" fill="#1c1917"/>
      <circle cx="${188+s%20}" cy="${190+s%15}" r="4" fill="#1c1917"/>
      <path d="M${174+s%20} ${200+s%15} Q${181+s%20} ${207+s%15} ${188+s%20} ${200+s%15}" stroke="#92400e" stroke-width="1.5" fill="none"/>
      <polygon points="${180+s%20},${177+s%15} ${165+s%20},${187+s%15} ${195+s%20},${187+s%15}" fill="#1c1917"/>
    `,
  },
  fairies: {
    bg1: '#2e1065', bg2: '#4c1d95', accent: '#f0abfc', accent2: '#fde68a',
    scene: (s) => `
      ${Array.from({length:25},(_,i)=>`<circle cx="${(i*61+s*9)%480+15}" cy="${(i*37+s*5)%340+15}" r="${1+i%3}" fill="${['#f0abfc','#fde68a','#a5f3fc'][i%3]}" opacity="${0.3+0.7*(i%5)/5}"/>`).join('')}
      <ellipse cx="${230+s%30}" cy="${210+s%20}" rx="30" ry="50" fill="#e879f9" opacity="0.9"/>
      <ellipse cx="${230+s%30}" cy="${210+s%20}" rx="30" ry="50" fill="none" stroke="#f0abfc" stroke-width="1.5"/>
      <circle cx="${230+s%30}" cy="${170+s%20}" r="25" fill="#fde68a"/>
      <circle cx="${222+s%30}" cy="${165+s%20}" r="5" fill="#7c3aed"/>
      <circle cx="${240+s%30}" cy="${163+s%20}" r="5" fill="#7c3aed"/>
      <path d="M${222+s%30} ${178+s%20} Q${230+s%30} ${186+s%20} ${238+s%30} ${178+s%20}" stroke="#c026d3" stroke-width="1.5" fill="none"/>
      <ellipse cx="${265+s%30}" cy="${195+s%20}" rx="40" ry="20" fill="#f0abfc" opacity="0.6" transform="rotate(-30,${265+s%30},${195+s%20})"/>
      <ellipse cx="${195+s%30}" cy="${200+s%20}" rx="40" ry="20" fill="#f0abfc" opacity="0.6" transform="rotate(30,${195+s%30},${200+s%20})"/>
      <rect x="${223+s%30}" y="${218+s%20}" width="14" height="40" fill="#fde68a"/>
      ${Array.from({length:8},(_,i)=>`<path d="M${60+i*50+s%20} ${300+Math.sin(i+s)*15} Q${70+i*50+s%20} ${280+Math.sin(i+s)*15} ${80+i*50+s%20} ${300+Math.sin(i+s)*15}" stroke="#f0abfc" stroke-width="2" fill="none" opacity="0.8"/>`).join('')}
    `,
  },
};

// Default theme for unknown themes
const defaultTheme: ThemeConfig = {
  bg1: '#1e1b4b', bg2: '#312e81', accent: '#a78bfa', accent2: '#fbbf24',
  scene: (s) => `
    <circle cx="${200+s%60}" cy="${180+s%40}" r="60" fill="#7c3aed" opacity="0.8"/>
    <circle cx="${300+s%40}" cy="${220+s%30}" r="40" fill="#a78bfa" opacity="0.6"/>
    <polygon points="256,120 220,200 292,200" fill="#fbbf24"/>
    ${Array.from({length:12},(_,i)=>`<circle cx="${40+i*40}" cy="${300+Math.sin(i+s)*20}" r="5" fill="#a78bfa" opacity="${0.4+0.5*(i%3)/3}"/>`).join('')}
  `,
};

export function generateIllustrationSvg(theme: string, pageIndex: number): string {
  const config = themes[theme] || defaultTheme;
  const seed = pageIndex * 37 + 11;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 400" width="512" height="400">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${config.bg1}"/>
        <stop offset="100%" stop-color="${config.bg2}"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="${config.accent}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    <rect width="512" height="400" fill="url(#bg)"/>
    <rect width="512" height="400" fill="url(#glow)"/>
    ${config.scene(seed)}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
