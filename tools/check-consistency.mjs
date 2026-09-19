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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  GENERATED_NOTICE,
  loadSite,
  badgesGridInner,
  certsGridInner,
  hasCredentialArrayText,
  getRegion,
  getHasCredentialText,
} from './ssot.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

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
if (/\.skill-category:nth-child\(\d\)/.test(html)) {
  fail.push('.skill-category:nth-child(n) colour rules are back — colour must bind to data-team, not DOM position.');
}

/* ── 5. Every theme accent needs its -rgb twin in BOTH themes ───────────── */
for (const block of ['\\:root', '\\[data-theme="light"\\]']) {
  const m = html.match(new RegExp(`${block}\\s*\\{([\\s\\S]*?)\\}`));
  if (!m) { fail.push(`Theme block ${block} not found.`); continue; }
  const body = m[1];
  for (const v of ['--accent', '--accent2', '--accent3', '--accent4']) {
    if (body.includes(`${v}:`) && !body.includes(`${v}-rgb:`)) {
      fail.push(`${block}: ${v} defined without ${v}-rgb — rgba(var(...)) tints will break.`);
    }
  }
}

/* ── 6. Local assets referenced must exist (no silent 404s) ─────────────── */
import { existsSync } from 'node:fs';
for (const m of html.matchAll(/(?:src|href)="((?!https?:|data:|mailto:|#)[^"]+)"/g)) {
  const p = m[1].split(/[?#]/)[0];
  if (!p || p === '/') continue;
  // The SSOT renderers build markup by string concatenation, so the regex also
  // matches template fragments like `'+ssotEsc(b.img)+'`. Those are code, not
  // paths — the real values are checked by the SSOT block below.
  if (p.includes("'+") || p.includes("+'") || p.includes('${')) continue;
  if (!existsSync(join(root, p))) warn.push(`Referenced asset not found on disk: ${p}`);
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
  SITE = loadSite(html);
} catch (e) {
  fail.push(`Could not parse SITE.* out of index.html: ${e.message}`);
}
function readArray(name) {
  if (!SITE) return null;
  const arr = SITE[name];
  if (!arr) { fail.push(`SITE.${name} not found — the SSOT check could not run`); return null; }
  return arr;
}

const norm = s => (s || '').replace(/&mdash;/g, '—').replace(/&amp;/g, '&').trim();

const siteBadges = readArray('badges');
if (siteBadges) {
  const sec = section('badges') || '';
  const cards = sec.match(/<a class="badge-card[\s\S]*?<\/a>/g) || [];
  if (cards.length !== siteBadges.length) {
    fail.push(`SITE.badges has ${siteBadges.length} entries but the static fallback has ${cards.length} cards`);
  }
  siteBadges.forEach((b, i) => {
    const card = cards[i];
    const label = b.name || `badge ${i}`;
    if (b.img && !existsSync(join(root, b.img))) fail.push(`badge "${label}": img not on disk: ${b.img}`);
    if (!card) return;
    const got = {
      img:  (card.match(/src="([^"]+)"/) || [])[1],
      name: (card.match(/class="badge-name">([\s\S]*?)</) || [])[1],
      tag:  (card.match(/class="badge-tag">([\s\S]*?)</) || [])[1],
      desc: (card.match(/class="badge-desc">([\s\S]*?)</) || [])[1],
      aria: (card.match(/aria-label="([^"]*)"/) || [])[1],
      cls:  (card.match(/class="badge-card ([^"]*)"/) || [])[1],
    };
    const wantAria = b.aria || `${b.name} badge on TryHackMe`;
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

/* ── GENERATED regions must match what build-fallbacks.mjs would produce ──
   The blocks above check the static fallback's *content* agrees with the
   SSOT. This checks the fallback is actually the GENERATOR's output byte
   for byte — so a hand-edit inside a <!-- GENERATED:... --> region (even
   one that happens to still agree in content, e.g. reordered attributes)
   is caught, and the pre-commit hook blocks it until someone runs
   `node tools/build-fallbacks.mjs`. This is what makes drift structurally
   impossible rather than just detected-after-the-fact. */
function checkGenerated(label, startMarker, endMarker, expected) {
  if (expected === null) return; // SITE.<name> failed to parse — already reported above
  const actual = getRegion(html, startMarker, endMarker);
  if (actual === null) {
    fail.push(`GENERATED:${label} markers not found in index.html — the fallback can no longer be verified or regenerated.`);
    return;
  }
  if (actual.trim() !== expected.trim()) {
    fail.push(`GENERATED:${label} region does not match what "node tools/build-fallbacks.mjs" would produce from SITE.${label} — it was hand-edited or is stale. Run the generator and commit the result.`);
  }
}

if (SITE) {
  checkGenerated('badges', GENERATED_NOTICE.badges, GENERATED_NOTICE.badgesEnd,
    siteBadges ? badgesGridInner(siteBadges, SITE.thmShare) : null);
  checkGenerated('certs', GENERATED_NOTICE.certs, GENERATED_NOTICE.certsEnd,
    siteCerts ? certsGridInner(siteCerts) : null);

  const actualHasCred = getHasCredentialText(html, GENERATED_NOTICE.jsonld, GENERATED_NOTICE.jsonldEnd);
  if (actualHasCred === null) {
    fail.push('GENERATED:jsonld markers (or "hasCredential" inside them) not found in index.html.');
  } else if (siteCerts) {
    const expectedHasCred = hasCredentialArrayText(siteCerts);
    if (actualHasCred.trim() !== expectedHasCred.trim()) {
      fail.push('GENERATED:jsonld "hasCredential" array does not match what "node tools/build-fallbacks.mjs" would produce from SITE.certs — it was hand-edited or is stale. Run the generator and commit the result.');
    }
  }
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
