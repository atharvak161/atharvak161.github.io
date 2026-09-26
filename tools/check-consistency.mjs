#!/usr/bin/env node
/**
 * Portfolio consistency invariants.
 *
 * The site duplicates the same facts across several surfaces by hand (hero badges,
 * Certifications section, Skills tags, JSON-LD). Adding a credential in one place and
 * forgetting the others is the recurring failure mode this file exists to prevent.
 *
 * The Certifications section is treated as the SOURCE OF TRUTH. Everything else must
 * agree with it. Run before every commit:  node tools/check-consistency.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  GENERATED_NOTICE,
  loadSite,
  readSiteJs,
  readSiteCss,
  badgesGridInner,
  certsGridInner,
  projectsGridInner,
  writeupsGridInner,
  hasCredentialArrayText,
  seeAllHTML,
  thmDisplay,
  HUB_HREF,
  getRegion,
  getHasCredentialText,
  badgeAria,
} from './ssot.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readSiteCss();
const hubPaths = {
  badges: join(root, 'badges/index.html'),
  certs: join(root, 'certifications/index.html'),
  projects: join(root, 'projects/index.html'),
  writeups: join(root, 'writeups/index.html'),
};
const hubHtml = {};
for (const [key, p] of Object.entries(hubPaths)) {
  try { hubHtml[key] = readFileSync(p, 'utf8'); }
  catch (e) { hubHtml[key] = null; }
}

const fail = [];
const warn = [];
const decode = s => s.replace(/&amp;/g, '&').replace(/&middot;/g, '·').trim();
const section = (id) => {
  const m = html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`, 'i'));
  return m ? m[0] : '';
};

/* ── Source of truth: the Certifications section ────────────────────────── */
const certsSection = section('certifications');
// Split into per-card chunks first — a single greedy regex silently spans cards
// and under-reports, which produces a false PASS (worse than no check at all).
const certCards = certsSection
  .split(/<div class="cert-card[ "]/).slice(1)
  .map(chunk => {
    const name = (chunk.match(/<div class="cert-card-name">([\s\S]*?)<\/div>/) || [])[1];
    if (!name) return null;
    const pill = (chunk.match(/class="cert-pill"[^>]*>([\s\S]*?)<\/(?:a|span)>/) || [])[1];
    const credId = /class="cert-card-id"/.test(chunk);
    // A card counts as EARNED unless it explicitly says in-progress. Cards carrying a
    // credential ID (CEH, NSE) have no status pill at all — that absence is not ambiguity.
    const inProgress = /in progress/i.test(chunk);
    return {
      name: decode(name),
      status: decode(pill || (credId ? 'Credential ID on file' : '')),
      earned: !inProgress,
      evidence: !!(pill || credId),
    };
  })
  .filter(Boolean);

if (!certCards.length) fail.push('Could not parse any cert cards — selectors drifted, fix this script.');

// Only EARNED credentials belong in the skills tags / JSON-LD.
// In-progress items live in #learning instead.
const earned = certCards.filter(c => c.earned);
// A card with neither a status pill nor a credential ID is unverifiable — flag it rather
// than quietly treating it as earned.
certCards.filter(c => c.earned && !c.evidence)
  .forEach(c => warn.push(`"${c.name}" has no status pill and no credential ID — cannot confirm it is earned.`));

/* ── 1. Every earned cert appears in the Skills "Certifications" card ───── */
const skillsSection = section('skills');
const certSkillCard = (skillsSection.match(
  /<div class="skill-category[^"]*"[^>]*data-team="amber"[\s\S]*?<\/div>\s*<\/div>/
) || [''])[0];
const skillTags = [...certSkillCard.matchAll(/<span class="skill-tag">([\s\S]*?)<\/span>/g)]
  .map(m => decode(m[1]));

for (const c of earned) {
  // match on the distinctive token (e.g. "SEC0", "CEH V12", "NSE")
  const key = (c.name.match(/\(([^)]+)\)/) || [null, c.name])[1];
  const hit = skillTags.some(t => t.toLowerCase().includes(key.toLowerCase()))
    || skillTags.some(t => c.name.toLowerCase().includes(t.toLowerCase().replace(/\s*1 & 2$/, '')));
  if (!hit) fail.push(`Skills card is missing earned credential: "${c.name}" (looked for "${key}")`);
}

/* ── 2. Every earned cert appears in JSON-LD hasCredential ──────────────── */
const ld = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
let credNames = [];
if (!ld) {
  fail.push('No JSON-LD block found.');
} else {
  try {
    const parsed = JSON.parse(ld);
    credNames = (parsed.hasCredential || []).map(c => c.name);
  } catch (e) {
    fail.push(`JSON-LD does not parse: ${e.message}`);
  }
}
for (const c of earned) {
  const key = (c.name.match(/\(([^)]+)\)/) || [null, c.name])[1];
  if (!credNames.some(n => n.toLowerCase().includes(key.toLowerCase()))) {
    fail.push(`JSON-LD hasCredential is missing: "${c.name}"`);
  }
}

/* ── 3. Skill categories must declare a semantic colour, not rely on order ─ */
const cats = [...skillsSection.matchAll(/<div class="skill-category[^"]*"([^>]*)>[\s\S]*?<h3>([\s\S]*?)<\/h3>/g)];
for (const [, attrs, name] of cats) {
  if (!/data-team="/.test(attrs)) {
    fail.push(`Skill category "${decode(name)}" has no data-team — its colour would fall back to position-independent default.`);
  }
}
// Red team = offence, blue team = defence. Guard the convention.
for (const [, attrs, rawName] of cats) {
  const name = decode(rawName).toLowerCase();
  const team = (attrs.match(/data-team="([^"]+)"/) || [])[1];
  if (/offensive|red team|attack/.test(name) && team !== 'red') {
    fail.push(`"${decode(rawName)}" is offensive but data-team="${team}" — offence must be red.`);
  }
  if (/defensive|blue team|defence/.test(name) && team !== 'blue') {
    fail.push(`"${decode(rawName)}" is defensive but data-team="${team}" — defence must be blue.`);
  }
}

/* ── 4. No positional colour binding may creep back in ──────────────────── */
if (/\.skill-category:nth-child\(\d\)/.test(css)) {
  fail.push('.skill-category:nth-child(n) colour rules are back — colour must bind to data-team, not DOM position.');
}



/* ── 5. Theme tokens: one file, both themes, every accent with its -rgb ──── */
// Tokens moved out of site.css into assets/css/tokens.css. They had been
// copy-pasted into six files and drifted, which is what produced two live
// WCAG failures: a contrast fix landed in some copies and not the others.
// These checks enforce the new shape so that cannot come back.
const tokensPath = join(root, 'assets/css/tokens.css');
if (!existsSync(tokensPath)) {
  fail.push('assets/css/tokens.css is missing — it is the single source of truth for every theme token.');
} else {
  const tokens = readFileSync(tokensPath, 'utf8');

  for (const block of ['\\:root', '\\[data-theme="light"\\]']) {
    const m = tokens.match(new RegExp(`${block}\\s*\\{([\\s\\S]*?)\\}`));
    if (!m) { fail.push(`tokens.css: theme block ${block} not found.`); continue; }
    const body = m[1];
    for (const v of ['--accent', '--accent2', '--accent3', '--accent4']) {
      if (body.includes(`${v}:`) && !body.includes(`${v}-rgb:`)) {
        fail.push(`tokens.css ${block}: ${v} defined without ${v}-rgb — rgba(var(...)) tints will break.`);
      }
    }
  }

  // An -rgb twin that does not match its own hex is how the open-to-work banner
  // and the green skill category kept rendering the pre-fix colour after the hex
  // was corrected. Compare them, per theme.
  for (const block of ['\\:root', '\\[data-theme="light"\\]']) {
    const m = tokens.match(new RegExp(`${block}\\s*\\{([\\s\\S]*?)\\}`));
    if (!m) continue;
    const body = m[1];
    for (const v of ['--accent', '--accent2', '--accent3', '--accent4', '--tier-exam', '--tier-common', '--tier-rare', '--tier-epic']) {
      const hex = body.match(new RegExp(`${v}:\\s*#([0-9a-fA-F]{6})`));
      const rgb = body.match(new RegExp(`${v}-rgb:\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)`));
      if (!hex || !rgb) continue;
      const want = [1, 3, 5].map(i => parseInt(hex[1].slice(i - 1, i + 1), 16));
      const got = [rgb[1], rgb[2], rgb[3]].map(Number);
      if (want.join(',') !== got.join(',')) {
        fail.push(`tokens.css ${block}: ${v} is #${hex[1]} but ${v}-rgb is ${got.join(',')} — should be ${want.join(',')}.`);
      }
    }
  }

  // No page may reintroduce a local token block and start the drift again.
  // Built from the tree rather than hardcoded, so a writeup added later is
  // checked without anyone remembering to add it here.
  const allPages = [
    'index.html',
    'badges/index.html', 'certifications/index.html',
    'projects/index.html', 'writeups/index.html',
    ...readdirSync(join(root, 'writeups'))
      .filter(f => f.endsWith('.html') && f !== 'index.html')
      .map(f => `writeups/${f}`),
  ];
  for (const f of allPages) {
    const t = readFileSync(join(root, f), 'utf8');
    if (/^[ \t]*:root[ \t]*\{/m.test(t)) {
      fail.push(`${f} declares its own :root block — theme tokens belong only in assets/css/tokens.css.`);
    }
    if (!t.includes('css/tokens.css')) {
      fail.push(`${f} does not load assets/css/tokens.css — its colours will fall back to nothing.`);
    }
  }
  for (const sheet of ['assets/css/site.css', 'assets/css/hub.css', 'assets/css/writeup.css']) {
    const t = readFileSync(join(root, sheet), 'utf8');
    // Only a BARE selector defines tokens. `[data-theme="light"] body { ... }`
    // and `[data-theme="light"] #net-canvas { ... }` are ordinary themed rules
    // and must keep working, so the selector has to end at the brace.
    if (/^[ \t]*(?::root|\[data-theme="[a-z]+"\])[ \t]*\{/m.test(t)) {
      fail.push(`${sheet} declares theme tokens — they belong only in assets/css/tokens.css.`);
    }
  }
}

/* ── 6. Local assets referenced must exist (no silent 404s) ─────────────── */
import { existsSync } from 'node:fs';
// Resolve url() RELATIVE TO THE STYLESHEET, not the repo root. Resolving from
// root is what let `url('assets/fonts/x.woff2')` look valid after the CSS moved
// to assets/css/ — the browser resolved it to assets/css/assets/fonts/ and every
// font 404'd. Scans EVERY stylesheet: checking only site.css let the identical
// bug ship again in hub.css and writeup.css.
for (const sheet of ['assets/css/site.css', 'assets/css/hub.css', 'assets/css/writeup.css']) {
  const sheetPath = join(root, sheet);
  if (!existsSync(sheetPath)) { fail.push(`${sheet} is missing.`); continue; }
  const sheetCss = readFileSync(sheetPath, 'utf8');
  const sheetDir = dirname(sheetPath);
  for (const m of sheetCss.matchAll(/url\(['"]?((?!https?:|data:)[^'")]+)['"]?\)/g)) {
    if (!existsSync(resolve(sheetDir, m[1]))) {
      fail.push(`${sheet} url() does not resolve from the stylesheet: ${m[1]}`);
    }
  }
}
for (const m of html.matchAll(/(?:src|href)="((?!https?:|data:|mailto:|#)[^"]+)"/g)) {
  const p = m[1].split(/[?#]/)[0];
  if (!p || p === '/') continue;
  // The SSOT renderers build markup by string concatenation, so the regex also
  // matches template fragments like `'+ssotEsc(b.img)+'`. Those are code, not
  // paths — the real values are checked by the SSOT block below.
  if (p.includes("'+") || p.includes("+'") || p.includes('${')) continue;
  if (!existsSync(join(root, p))) warn.push(`Referenced asset not found on disk: ${p}`);
}


/* ── Favicon on every page ───────────────────────────────────────────────────
   Ten of eleven pages shipped a favicon tag truncated mid-attribute:

     <link rel="icon" href="data:image/svg+xml,<svg ... viewBox='0 0 100 100'>

   No closing quote, so the parser ran the href on to the next `"` it found,
   which lived inside the following <meta property="og:type">. Result: a blank
   favicon on every sub-page AND a silently destroyed og:type, the tag
   LinkedIn and Slack read when someone shares a writeup.

   A 500-character data URI copy-pasted into eleven files is what made that
   possible. The icon is now one file referenced by absolute path, so it
   resolves identically from /, /writeups/ and any depth added later.  */
{
  const ICON_FILES = ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'];
  for (const f of ICON_FILES) {
    if (!existsSync(join(root, f))) fail.push(`${f} is missing from the repo root.`);
  }

  const REQUIRED = [
    /<link[^>]+rel="icon"[^>]+href="\/favicon\.ico"/,
    /<link[^>]+rel="icon"[^>]+href="\/favicon\.svg"/,
    /<link[^>]+rel="apple-touch-icon"[^>]+href="\/apple-touch-icon\.png"/
  ];

  const pages = [];
  const walk = dir => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === '_local'
        || entry.name === 'node_modules' || entry.name === 'assets') continue;
      const rel = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith('.html')) pages.push(rel);
    }
  };
  walk('');

  for (const rel of pages) {
    const pageHtml = readFileSync(join(root, rel), 'utf8');

    for (const re of REQUIRED) {
      if (!re.test(pageHtml)) fail.push(`${rel}: missing icon link matching ${re}`);
    }
    // The original defect: an icon href that never closes its quote.
    for (const m of pageHtml.matchAll(/<link[^>]*rel="[^"]*icon[^>]*$/gm)) {
      fail.push(`${rel}: icon link is not closed on its own line — ${m[0].slice(0, 70)}...`);
    }
    // A data: URI here is what got truncated. Files only.
    if (/<link[^>]*rel="[^"]*icon[^>]*href="data:/.test(pageHtml)) {
      fail.push(`${rel}: icon uses a data: URI. Reference /favicon.svg instead — the inline copy is what broke.`);
    }
    // og:type is the tag the broken href swallowed.
    if (!/<meta[^>]+property="og:type"/.test(pageHtml)) {
      fail.push(`${rel}: og:type is missing.`);
    }
  }
}


/* ── Sub-page return links ───────────────────────────────────────────────────
   Every hub and writeup page carries a "← Portfolio" link home. Those links
   were `../index.html`: a valid path that exists on disk, so the asset check
   above passed them for months, but the wrong DESTINATION. Clicking one is a
   fresh navigation that lands at the top of the homepage, losing the section
   the reader came from, and it resolves to /index.html rather than the
   canonical /, splitting analytics across two URLs for one page.

   Existence was never the invariant. The invariant is that a return link goes
   back to the section that owns the page. This block checks destination, which
   is the class of bug the disk check structurally cannot see.  */
{
  const RETURN_SECTION = {
    writeups: '#writeups',
    projects: '#projects',
    certifications: '#certifications',
    badges: '#badges',
  };
  for (const [dir, hash] of Object.entries(RETURN_SECTION)) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) { fail.push(`${dir}/ is missing.`); continue; }
    for (const entry of readdirSync(dirPath)) {
      if (!entry.endsWith('.html')) continue;
      const rel = `${dir}/${entry}`;
      const pageHtml = readFileSync(join(dirPath, entry), 'utf8');
      // Links that leave the sub-directory and head for the homepage.
      for (const m of pageHtml.matchAll(/href="(\.\.\/[^"]*)"/g)) {
        const href = m[1];
        if (!/^\.\.\/(index\.html)?(#|$)/.test(href)) continue;   // not a homepage link
        if (href === `../${hash}`) continue;                        // correct
        fail.push(
          `${rel}: return link is "${href}" — it must be "../${hash}" so the reader `
          + `lands back on the section this page belongs to, on the canonical / URL.`
        );
      }
    }
  }
}


/* ── SSOT vs static fallback ──────────────────────────────────────────────────
   The section above treats the STATIC certifications markup as the source of
   truth. That markup is overwritten at runtime by renderCerts()/renderBadges()
   from SITE.certs and SITE.badges, so comparing static against static can never
   catch the failure this file exists to prevent: the SSOT and its hand-mirrored
   no-JS fallback drifting apart.

   This block reads the two arrays out of index.html and diffs every field that
   appears in both surfaces. Added after an audit found 14 such disagreements
   that had all shipped through a green run of this script.  */

// Parsing delegates to tools/ssot.mjs — the same bracket-balanced extractor
// build-fallbacks.mjs uses to generate the fallback markup. One parser, so a
// change to SITE's shape can't make the generator and this check disagree
// about what SITE.badges/SITE.certs even are.
let SITE = null;
try {
  SITE = loadSite(readSiteJs());
} catch (e) {
  // SITE lives in assets/js/site.js since the split, not index.html.
  fail.push(`Could not parse SITE.* out of assets/js/site.js: ${e.message}`);
}

/* Featured sections must stay a curated subset. This block previously sat
   inside the catch of the SITE parse, so it never ran at all - and would have
   thrown a TypeError on null if it ever had. Outside the catch, guarded. */
if (SITE) {
  const FEATURED_CAP = { badges: 14, certs: 8, projects: 8, writeups: 8 };
  for (const [key, cap] of Object.entries(FEATURED_CAP)) {
    const n = (SITE[key] || []).filter(x => x.featured).length;
    if (n > cap) {
      fail.push(`${n} ${key} are marked featured; the home page cap is ${cap}. Un-feature some - they stay visible on the hub page.`);
    }
  }
}

/* The seven TryHackMe figures must match SITE.thm. They were previously typed
   into the markup with no source and no check - streak and rank both drifted
   within two days and a green run never noticed. */
if (SITE && SITE.thm) {
  const v = thmDisplay(SITE.thm);
  for (const [key, expected] of Object.entries(v)) {
    const m = html.match(new RegExp(`data-thm="${key}"[^>]*>([^<]*)<`));
    if (!m) { fail.push(`No data-thm="${key}" node found — the TryHackMe card can no longer be verified.`); continue; }
    if (m[1] !== expected) {
      fail.push(`TryHackMe ${key}: markup says "${m[1]}" but SITE.thm says "${expected}". Run node tools/build-fallbacks.mjs`);
    }
  }
  const age = Math.floor((Date.now() - Date.parse(SITE.thm.asOf)) / 86400000);
  if (age > 45) {
    warn.push(`SITE.thm was last refreshed ${age} days ago (${SITE.thm.asOf}). These figures move weekly — refresh from the TryHackMe profile API.`);
  }
}
function readArray(name) {
  if (!SITE) return null;
  const arr = SITE[name];
  if (!arr) { fail.push(`SITE.${name} not found — the SSOT check could not run`); return null; }
  return arr;
}

const norm = s => (s || '').replace(/&mdash;/g, '—').replace(/&amp;/g, '&').trim();

// "featured" must be an explicit boolean on every item in every SSOT array —
// it is decided per-item, never inferred from a count. Missing it silently
// breaks the home/hub split (an item with no featured field is falsy, so it
// would vanish from the home page without anyone deciding that).
function checkFeaturedField(name, arr) {
  if (!arr) return;
  arr.forEach((item, i) => {
    if (typeof item.featured !== 'boolean') {
      fail.push(`SITE.${name}[${i}] ("${item.name || item.id || i}") is missing an explicit boolean "featured" field`);
    }
  });
}

const siteBadges = readArray('badges');
checkFeaturedField('badges', siteBadges);
if (siteBadges) {
  siteBadges.forEach((b, i) => {
    const label = b.name || `badge ${i}`;
    if (b.img && !existsSync(join(root, b.img))) fail.push(`badge "${label}": img not on disk: ${b.img}`);
  });
  // The home page's #badges fallback is FEATURED-only (see-all lives on
  // badges/index.html); the SSOT-vs-fallback field diff below has to compare
  // against that same subset, in the same order, or every non-featured badge
  // reads as "missing" here.
  const featuredBadges = siteBadges.filter(b => b.featured);
  const sec = section('badges') || '';
  const cards = sec.match(/<a class="badge-card[\s\S]*?<\/a>/g) || [];
  if (cards.length !== featuredBadges.length) {
    fail.push(`SITE.badges has ${featuredBadges.length} featured entries but the home-page fallback has ${cards.length} cards`);
  }
  featuredBadges.forEach((b, i) => {
    const card = cards[i];
    const label = b.name || `badge ${i}`;
    if (!card) return;
    const got = {
      img:  (card.match(/src="([^"]+)"/) || [])[1],
      name: (card.match(/class="badge-name">([\s\S]*?)</) || [])[1],
      tag:  (card.match(/class="badge-tag">([\s\S]*?)</) || [])[1],
      desc: (card.match(/class="badge-desc">([\s\S]*?)</) || [])[1],
      aria: (card.match(/aria-label="([^"]*)"/) || [])[1],
      cls:  (card.match(/class="badge-card ([^"]*)"/) || [])[1],
    };
    const wantAria = badgeAria(b);
    if (got.img !== b.img)                fail.push(`badge "${label}": SITE img "${b.img}" vs fallback "${got.img}"`);
    if (norm(got.name) !== norm(b.name))  fail.push(`badge "${label}": SITE name "${b.name}" vs fallback "${got.name}"`);
    if (norm(got.tag)  !== norm(b.tag))   fail.push(`badge "${label}": SITE tag "${b.tag}" vs fallback "${got.tag}"`);
    if (norm(got.desc) !== norm(b.desc))  fail.push(`badge "${label}": SITE desc "${b.desc}" vs fallback "${got.desc}"`);
    if (norm(got.aria) !== norm(wantAria)) fail.push(`badge "${label}": rendered aria "${wantAria}" vs fallback "${got.aria}"`);
    if (got.cls && b.tier && !got.cls.includes(b.tier))
      fail.push(`badge "${label}": SITE tier "${b.tier}" missing from fallback class "${got.cls}"`);
  });
}

const siteCerts = readArray('certs');
checkFeaturedField('certs', siteCerts);
if (siteCerts) {
  siteCerts.forEach(c => {
    if (c.certUrl && !existsSync(join(root, c.certUrl)))
      fail.push(`cert "${c.name}": certUrl not on disk: ${c.certUrl}`);
    if (c.pill && c.pill.href && !/^https?:/.test(c.pill.href) && !existsSync(join(root, c.pill.href)))
      fail.push(`cert "${c.name}": pill href not on disk: ${c.pill.href}`);
  });
  const earnedCerts = siteCerts.filter(c => c.earned).length;
  if (ld) {
    const ldCount = (ld.match(/"EducationalOccupationalCredential"/g) || []).length;
    if (ldCount !== earnedCerts)
      fail.push(`SITE.certs has ${earnedCerts} earned but JSON-LD lists ${ldCount} credentials`);
  }
}

const siteProjects = readArray('projects');
checkFeaturedField('projects', siteProjects);
if (siteProjects) {
  siteProjects.forEach((p, i) => {
    const label = p.name || `project ${i}`;
    if (typeof p.delay !== 'number') fail.push(`project "${label}": missing numeric "delay" field (reveal-stagger digit)`);
    if (!Array.isArray(p.outcomes) || !p.outcomes.length) fail.push(`project "${label}": "outcomes" must be a non-empty array`);
  });
}

const siteWriteups = readArray('writeups');
checkFeaturedField('writeups', siteWriteups);
if (siteWriteups) {
  siteWriteups.forEach((w, i) => {
    const label = w.name || `writeup ${i}`;
    if (!w.slug) fail.push(`writeup "${label}": missing "slug"`);
    else if (!existsSync(join(root, 'writeups', `${w.slug}.html`)))
      fail.push(`writeup "${label}": writeups/${w.slug}.html not on disk`);
    if (typeof w.delay !== 'number') fail.push(`writeup "${label}": missing numeric "delay" field (reveal-stagger digit)`);
  });
}

/* ── GENERATED regions must match what build-fallbacks.mjs would produce ──
   The blocks above check the static fallback's *content* agrees with the
   SSOT. This checks the fallback is actually the GENERATOR's output byte
   for byte — so a hand-edit inside a <!-- GENERATED:... --> region (even
   one that happens to still agree in content, e.g. reordered attributes)
   is caught, and the pre-commit hook blocks it until someone runs
   `node tools/build-fallbacks.mjs`. This is what makes drift structurally
   impossible rather than just detected-after-the-fact. */
function checkGenerated(label, startMarker, endMarker, expected, fileHtml, fileLabel) {
  if (expected === null) return; // SITE.<name> failed to parse — already reported above
  if (fileHtml === null) {
    fail.push(`${fileLabel} does not exist — GENERATED:${label} could not be verified.`);
    return;
  }
  const actual = getRegion(fileHtml, startMarker, endMarker);
  if (actual === null) {
    fail.push(`GENERATED:${label} markers not found in ${fileLabel} — the fallback can no longer be verified or regenerated.`);
    return;
  }
  if (actual.trim() !== expected.trim()) {
    fail.push(`GENERATED:${label} region in ${fileLabel} does not match what "node tools/build-fallbacks.mjs" would produce — it was hand-edited or is stale. Run the generator and commit the result.`);
  }
}

if (SITE) {
  const featuredBadges = siteBadges ? siteBadges.filter(b => b.featured) : null;
  const featuredCerts = siteCerts ? siteCerts.filter(c => c.featured) : null;
  const featuredProjects = siteProjects ? siteProjects.filter(p => p.featured) : null;
  const featuredWriteups = siteWriteups ? siteWriteups.filter(w => w.featured) : null;

  // Home page — featured-only regions, plus the conditional "see all" links.
  checkGenerated('badges', GENERATED_NOTICE.badges, GENERATED_NOTICE.badgesEnd,
    featuredBadges ? badgesGridInner(featuredBadges, SITE.thmShare) : null, html, 'index.html');
  checkGenerated('certs', GENERATED_NOTICE.certs, GENERATED_NOTICE.certsEnd,
    featuredCerts ? certsGridInner(featuredCerts) : null, html, 'index.html');
  checkGenerated('projects', GENERATED_NOTICE.projects, GENERATED_NOTICE.projectsEnd,
    featuredProjects ? projectsGridInner(featuredProjects) : null, html, 'index.html');
  checkGenerated('writeups', GENERATED_NOTICE.writeups, GENERATED_NOTICE.writeupsEnd,
    featuredWriteups ? writeupsGridInner(featuredWriteups, HUB_HREF.writeups) : null, html, 'index.html');

  checkGenerated('seeall-badges', GENERATED_NOTICE.seeallBadges, GENERATED_NOTICE.seeallBadgesEnd,
    siteBadges ? seeAllHTML(siteBadges, HUB_HREF.badges, 'badges') : null, html, 'index.html');
  checkGenerated('seeall-certs', GENERATED_NOTICE.seeallCerts, GENERATED_NOTICE.seeallCertsEnd,
    siteCerts ? seeAllHTML(siteCerts, HUB_HREF.certs, 'certifications') : null, html, 'index.html');
  checkGenerated('seeall-projects', GENERATED_NOTICE.seeallProjects, GENERATED_NOTICE.seeallProjectsEnd,
    siteProjects ? seeAllHTML(siteProjects, HUB_HREF.projects, 'projects') : null, html, 'index.html');
  checkGenerated('seeall-writeups', GENERATED_NOTICE.seeallWriteups, GENERATED_NOTICE.seeallWriteupsEnd,
    siteWriteups ? seeAllHTML(siteWriteups, HUB_HREF.writeups, 'writeups') : null, html, 'index.html');

  const actualHasCred = getHasCredentialText(html, GENERATED_NOTICE.jsonld, GENERATED_NOTICE.jsonldEnd);
  if (actualHasCred === null) {
    fail.push('GENERATED:jsonld markers (or "hasCredential" inside them) not found in index.html.');
  } else if (siteCerts) {
    const expectedHasCred = hasCredentialArrayText(siteCerts);
    if (actualHasCred.trim() !== expectedHasCred.trim()) {
      fail.push('GENERATED:jsonld "hasCredential" array does not match what "node tools/build-fallbacks.mjs" would produce from SITE.certs — it was hand-edited or is stale. Run the generator and commit the result.');
    }
  }

  // Hub pages — the same GENERATED:<type> marker text, but the FULL array
  // (no featured filter) and, for badges/certs, asset paths prefixed '../'.
  checkGenerated('badges', GENERATED_NOTICE.hubBadges, GENERATED_NOTICE.hubBadgesEnd,
    siteBadges ? badgesGridInner(siteBadges, SITE.thmShare, '../') : null, hubHtml.badges, 'badges/index.html');
  checkGenerated('certs', GENERATED_NOTICE.hubCerts, GENERATED_NOTICE.hubCertsEnd,
    siteCerts ? certsGridInner(siteCerts, '../') : null, hubHtml.certs, 'certifications/index.html');
  checkGenerated('projects', GENERATED_NOTICE.hubProjects, GENERATED_NOTICE.hubProjectsEnd,
    siteProjects ? projectsGridInner(siteProjects) : null, hubHtml.projects, 'projects/index.html');
  checkGenerated('writeups', GENERATED_NOTICE.hubWriteups, GENERATED_NOTICE.hubWriteupsEnd,
    siteWriteups ? writeupsGridInner(siteWriteups, '') : null, hubHtml.writeups, 'writeups/index.html');

  // Hub ".hub-count" lines — tied to the same array length.
  checkGenerated('count-badges', GENERATED_NOTICE.countBadges, GENERATED_NOTICE.countBadgesEnd,
    siteBadges ? `${siteBadges.length} badges &middot; TryHackMe` : null, hubHtml.badges, 'badges/index.html');
  checkGenerated('count-certs', GENERATED_NOTICE.countCerts, GENERATED_NOTICE.countCertsEnd,
    siteCerts ? `${siteCerts.length} certifications` : null, hubHtml.certs, 'certifications/index.html');
  checkGenerated('count-projects', GENERATED_NOTICE.countProjects, GENERATED_NOTICE.countProjectsEnd,
    siteProjects ? `${siteProjects.length} projects` : null, hubHtml.projects, 'projects/index.html');
  checkGenerated('count-writeups', GENERATED_NOTICE.countWriteups, GENERATED_NOTICE.countWriteupsEnd,
    siteWriteups ? `${siteWriteups.length} writeups &middot; TryHackMe` : null, hubHtml.writeups, 'writeups/index.html');
}

/* ── Report ─────────────────────────────────────────────────────────────── */
console.log(`Certifications parsed (source of truth): ${certCards.length} — earned: ${earned.length}`);
earned.forEach(c => console.log(`  · ${c.name} [${c.status}]`));
if (warn.length) {
  console.log(`\n${warn.length} warning(s):`);
  warn.forEach(w => console.log(`  ! ${w}`));
}
if (fail.length) {
  console.error(`\nFAIL — ${fail.length} consistency problem(s):`);
  fail.forEach(f => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log('\nPASS — all surfaces agree.');
