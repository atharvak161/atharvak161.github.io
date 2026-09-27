#!/usr/bin/env node
// Regenerates <lastmod> in sitemap.xml from git, so the dates can never drift
// from the files again. Run by .githooks/pre-commit; safe to run by hand.
//   node tools/build-sitemap.mjs          # rewrite sitemap.xml
//   node tools/build-sitemap.mjs --check  # exit 1 if it is stale
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadSite, readSiteJs } from './ssot.mjs';

const SITEMAP = 'sitemap.xml';
const ORIGIN = 'https://atharvaxsecurity.com';

// Served from this domain but built from other repositories, so there is no
// local file to stat and no commit here to date them from. They are declared in
// the sitemap on purpose: Google finds them through the portfolio's links, and
// without a declaration that shows up as "Discovered, currently not indexed".
const EXTERNAL = new Set([
  `${ORIGIN}/cybersec-toolkit/`,
  `${ORIGIN}/cybersec-vault/`,
  `${ORIGIN}/Blueprint/`,
]);

const fileFor = (loc) => {
  const p = loc.replace(ORIGIN, '').replace(/^\//, '');
  if (p === '') return 'index.html';
  return p.endsWith('/') ? `${p}index.html` : p;
};

const lastCommitDate = (file) => {
  // Staged content counts: a file edited in this commit should date to today.
  const staged = execFileSync('git', ['diff', '--cached', '--name-only']).toString().split('\n');
  if (staged.includes(file)) return new Date().toISOString().slice(0, 10);
  const out = execFileSync('git', ['log', '-1', '--format=%ad', '--date=short', '--', file]).toString().trim();
  return out || new Date().toISOString().slice(0, 10);
};

let xml = readFileSync(SITEMAP, 'utf8');
const original = xml;
const missing = [];

/* Add any writeup that SITE.writeups declares and the sitemap does not yet
   carry. This file only refreshed <lastmod>, so a new writeup was published,
   linked from four surfaces, and still absent from the sitemap - the one
   remaining hand-edited step in adding one, and the easiest to forget because
   nothing on the site looks wrong without it.

   Inserted after the last existing writeup entry so the file keeps its order,
   and only ever appended to: an entry already present is left exactly as it is,
   dates included. */
{
  const SITE = loadSite(readSiteJs());
  const added = [];
  for (const w of (SITE.writeups || [])) {
    const loc = `${ORIGIN}/writeups/${w.slug}.html`;
    if (xml.includes(`<loc>${loc}</loc>`)) continue;
    if (!existsSync(`writeups/${w.slug}.html`)) {
      console.error(`sitemap: SITE.writeups names ${w.slug} but writeups/${w.slug}.html does not exist.`);
      process.exit(1);
    }
    const today = new Date().toISOString().slice(0, 10);
    const entry = `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
    const lastWriteup = xml.lastIndexOf(`${ORIGIN}/writeups/`);
    const lineEnd = xml.indexOf('\n', lastWriteup);
    if (lastWriteup === -1 || lineEnd === -1) {
      console.error('sitemap: could not find an existing writeup entry to insert after.');
      process.exit(1);
    }
    xml = xml.slice(0, lineEnd + 1) + entry + '\n' + xml.slice(lineEnd + 1);
    added.push(w.slug);
  }
  if (added.length) console.log(`sitemap.xml: added ${added.length} writeup(s) — ${added.join(', ')}`);
}

xml = xml.replace(/<url>\s*<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>/gs, (whole, loc, old) => {
  if (EXTERNAL.has(loc)) return whole;   // another repo owns it; leave its date alone
  const file = fileFor(loc);
  if (!existsSync(file)) { missing.push(`${loc} -> ${file}`); return whole; }
  return whole.replace(`<lastmod>${old}</lastmod>`, `<lastmod>${lastCommitDate(file)}</lastmod>`);
});

if (missing.length) {
  console.error('sitemap references files that do not exist:');
  missing.forEach((m) => console.error(`  ${m}`));
  process.exit(1);
}

if (process.argv.includes('--check')) {
  if (xml !== original) {
    console.error('sitemap.xml lastmod dates are stale. Run: node tools/build-sitemap.mjs');
    process.exit(1);
  }
  console.log('sitemap lastmod: up to date');
} else {
  if (xml !== original) { writeFileSync(SITEMAP, xml); console.log('sitemap.xml lastmod dates regenerated'); }
  else console.log('sitemap.xml already up to date');
}
