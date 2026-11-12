#!/usr/bin/env node
/**
 * Baut aus src/ die Release-Artefakte in dist/:
 *  - flowzz-plus.user.js   (Tampermonkey/Violentmonkey, mit Update-URLs)
 *  - flowzz-plus-chrome.zip
 *  - flowzz-plus-firefox.xpi
 *  - updates.json          (Firefox-Selbstverteilung)
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const BUILD = path.join(ROOT, 'build');
const REPO = 'CRZX1337/flowzz-plus';
const BASE = `https://github.com/${REPO}/releases/latest/download`;

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;

const read = (file) => fs.readFileSync(path.join(SRC, file), 'utf8');
const content = read('content.js').replaceAll('__FX_VERSION__', version);
const css = read('overlay.css');
const background = read('background.js');
const manifestChrome = JSON.parse(read('manifest.chrome.json'));
const manifestFirefox = JSON.parse(read('manifest.firefox.json'));

for (const m of [manifestChrome, manifestFirefox]) m.version = version;
manifestFirefox.browser_specific_settings.gecko.update_url = `${BASE}/updates.json`;

fs.rmSync(DIST, { recursive: true, force: true });
fs.rmSync(BUILD, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

/* ---------- Userscript ---------- */

const header = `// ==UserScript==
// @name         flowzz+ · Herkunft & Preise
// @namespace    https://github.com/${REPO}
// @version      ${version}
// @description  Herkunft, Apothekenpreise, Favoriten, Preisalarm und CSV-Export auf flowzz.com
// @author       CRZX1337
// @match        https://flowzz.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    ${BASE}/flowzz-plus.user.js
// @downloadURL  ${BASE}/flowzz-plus.user.js
// @supportURL   https://github.com/${REPO}/issues
// ==/UserScript==

(function () {
  window.__FX_CSS = ${JSON.stringify(css)};
})();

`;

const userscript = header + content;
fs.writeFileSync(path.join(DIST, 'flowzz-plus.user.js'), userscript);

/* ---------- Erweiterungen ---------- */

function stage(name, manifest) {
  const dir = path.join(BUILD, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'content.js'), content);
  fs.copyFileSync(path.join(SRC, 'overlay.css'), path.join(dir, 'overlay.css'));
  fs.copyFileSync(path.join(SRC, 'background.js'), path.join(dir, 'background.js'));
  fs.cpSync(path.join(ROOT, 'icons'), path.join(dir, 'icons'), { recursive: true });
  return dir;
}

function zipDir(dir, outFile) {
  fs.rmSync(outFile, { force: true });
  execFileSync('zip', ['-qr', outFile, '.'], { cwd: dir });
}

zipDir(stage('chrome', manifestChrome), path.join(DIST, 'flowzz-plus-chrome.zip'));
zipDir(stage('firefox', manifestFirefox), path.join(DIST, 'flowzz-plus-firefox.xpi'));

/* ---------- Firefox-Update-Manifest ---------- */

const updates = {
  addons: {
    'flowzz-plus@crzx.space': {
      updates: [
        {
          version,
          update_link: `${BASE}/flowzz-plus-firefox.xpi`
        }
      ]
    }
  }
};
fs.writeFileSync(path.join(DIST, 'updates.json'), JSON.stringify(updates, null, 2) + '\n');

/* ---------- Zusammenfassung ---------- */

for (const f of fs.readdirSync(DIST)) {
  const size = fs.statSync(path.join(DIST, f)).size;
  console.log(`dist/${f}`.padEnd(36), (size / 1024).toFixed(1) + ' KB');
}
console.log('Version:', version);
