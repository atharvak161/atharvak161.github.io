#!/usr/bin/env node
// Regenerates <lastmod> in sitemap.xml from git, so the dates can never drift
// from the files again. Run by .githooks/pre-commit; safe to run by hand.
//   node tools/build-sitemap.mjs          # rewrite sitemap.xml
//   node tools/build-sitemap.mjs --check  # exit 1 if it is stale
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SITEMAP = 'sitemap.xml';
const ORIGIN = 'https://atharvaxsecurity.com';

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

xml = xml.replace(/<url>\s*<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>/gs, (whole, loc, old) => {
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
