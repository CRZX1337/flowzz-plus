#!/usr/bin/env node
/**
 * WCAG-Kontrastprüfung für die flowzz+ Paletten.
 * Exitcode 1, wenn ein Paar unter dem Zielwert liegt.
 */
const hex = (h) => {
  const s = h.replace('#', '');
  const v = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
};

const lum = (h) => {
  const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
  const l1 = lum(a);
  const l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const themes = {
  light: {
    bg: '#f7f8f6',
    surface: '#ffffff',
    soft: '#f1f4f1',
    accentSoft: '#edf5f2',
    ink: '#111512',
    muted: '#5f6b64',
    faint: '#68736c',
    green: '#19796d',
    greenDark: '#12615a',
    onGreen: '#ffffff',
    rating: '#8a6d1f'
  },
  dark: {
    bg: '#0f1412',
    surface: '#161d1a',
    soft: '#18201d',
    accentSoft: '#17332c',
    ink: '#eaf0ec',
    muted: '#aab6af',
    faint: '#8d9a93',
    green: '#52cbb2',
    greenDark: '#8fe3d1',
    onGreen: '#08130f',
    rating: '#e6c76e'
  }
};

// [Name, Vordergrund, Hintergrund, Mindestwert]
const pairs = [
  ['Text auf Seitenhintergrund', 'ink', 'bg', 4.5],
  ['Text auf Karte', 'ink', 'surface', 4.5],
  ['Sekundärtext auf Karte', 'muted', 'surface', 4.5],
  ['Sekundärtext auf Seite', 'muted', 'bg', 4.5],
  ['Kleingedrucktes auf Karte', 'faint', 'surface', 4.5],
  ['Grüner Link auf Karte', 'green', 'surface', 4.5],
  ['Grüner Link auf Seite', 'green', 'bg', 4.5],
  ['Button-Text auf Grün', 'onGreen', 'green', 4.5],
  ['Badge auf Akzentfläche', 'greenDark', 'accentSoft', 4.5],
  ['Bewertung auf Karte', 'rating', 'surface', 4.5],
  ['Aktives Tab auf Akzentfläche', 'greenDark', 'accentSoft', 4.5],
  ['Text auf Hover-Fläche', 'ink', 'soft', 4.5]
];

let failed = 0;
for (const [themeName, c] of Object.entries(themes)) {
  console.log(`\n${themeName.toUpperCase()}`);
  console.log('-'.repeat(62));
  for (const [name, fgKey, bgKey, min] of pairs) {
    const r = ratio(c[fgKey], c[bgKey]);
    const pass = r >= min;
    if (!pass) failed++;
    console.log(
      `${pass ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  (min ${min})  ${name}  [${c[fgKey]} auf ${c[bgKey]}]`
    );
  }
}

// Invertierter Site-Darkmode: Invertierung erhält das Luminanzverhältnis.
const site = [['Site-Text vorher', '#111512', '#ffffff'], ['Site-Text invertiert', '#eeeeee', '#000000']];
console.log('\nSITE (Invert-Modus, Kontrast bleibt erhalten)');
console.log('-'.repeat(62));
for (const [name, fg, bg] of site) {
  console.log(`${ratio(fg, bg).toFixed(2).padStart(5)}:1  ${name}`);
}

console.log(`\n${failed ? failed + ' Paar(e) unter Zielwert' : 'Alle Paare erfüllen WCAG AA (4.5:1)'}`);
process.exit(failed ? 1 : 0);
