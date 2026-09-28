/**
 * Shared SSOT (single source of truth) helpers for index.html.
 *
 * assets/js/site.js defines SITE.badges / SITE.certs / SITE.thmShare as plain JS
 * literals, then renderBadges()/renderCerts()/renderJsonLd() turn them into
 * DOM at runtime for JS visitors. This module parses those same literals out
 * of index.html on the Node side (for crawlers / no-JS visitors, who get a
 * static fallback) and re-implements the exact same rendering logic, so the
 * generated fallback markup is byte-for-byte what a JS visitor would see.
 *
 * Both tools/build-fallbacks.mjs (writes the fallback) and
 * tools/check-consistency.mjs (checks it hasn't drifted) import this file.
 * There must be exactly one copy of this logic — duplicating it is how the
 * original drift bug happened.
 *
 * index.html is our own trusted file, not user input, so evaluating the
 * extracted literals with Function() is safe here. We still avoid a blind
 * eval of the whole file: only the specific SITE.* assignments we locate by
 * bracket-balanced parsing are ever evaluated.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function markers(name, srcArray) {
  return [
    `<!-- GENERATED:${name} start — produced by tools/build-fallbacks.mjs from SITE.${srcArray}. Do not hand-edit; edit SITE.${srcArray} and run \`node tools/build-fallbacks.mjs\` instead. -->`,
    `<!-- GENERATED:${name} end -->`,
  ];
}

export const GENERATED_NOTICE = {
  badges: '<!-- GENERATED:badges start — produced by tools/build-fallbacks.mjs from SITE.badges. Do not hand-edit; edit SITE.badges and run `node tools/build-fallbacks.mjs` instead. -->',
  badgesEnd: '<!-- GENERATED:badges end -->',
  certs: '<!-- GENERATED:certs start — produced by tools/build-fallbacks.mjs from SITE.certs. Do not hand-edit; edit SITE.certs and run `node tools/build-fallbacks.mjs` instead. -->',
  certsEnd: '<!-- GENERATED:certs end -->',
  jsonld: '<!-- GENERATED:jsonld start — the "hasCredential" array inside the JSON-LD block below is produced by tools/build-fallbacks.mjs from SITE.certs (earned only). Do not hand-edit hasCredential; the rest of this JSON-LD object is hand-maintained. Run `node tools/build-fallbacks.mjs` after changing SITE.certs. -->',
  jsonldEnd: '<!-- GENERATED:jsonld end -->',
};
[GENERATED_NOTICE.projects, GENERATED_NOTICE.projectsEnd] = markers('projects', 'projects');
[GENERATED_NOTICE.writeups, GENERATED_NOTICE.writeupsEnd] = markers('writeups', 'writeups');
[GENERATED_NOTICE.seeallBadges, GENERATED_NOTICE.seeallBadgesEnd] = markers('seeall-badges', 'badges');
[GENERATED_NOTICE.seeallCerts, GENERATED_NOTICE.seeallCertsEnd] = markers('seeall-certs', 'certs');
[GENERATED_NOTICE.seeallProjects, GENERATED_NOTICE.seeallProjectsEnd] = markers('seeall-projects', 'projects');
[GENERATED_NOTICE.seeallWriteups, GENERATED_NOTICE.seeallWriteupsEnd] = markers('seeall-writeups', 'writeups');
// Hub pages (badges/index.html, certifications/index.html, projects/index.html,
// writeups/index.html) each carry one GENERATED region for their full grid —
// same marker text as the home page's, since it's produced from the same
// SITE array (just unfiltered), and check-consistency.mjs matches on this
// exact string regardless of which file it appears in.
GENERATED_NOTICE.hubBadges = GENERATED_NOTICE.badges;
GENERATED_NOTICE.hubBadgesEnd = GENERATED_NOTICE.badgesEnd;
GENERATED_NOTICE.hubCerts = GENERATED_NOTICE.certs;
GENERATED_NOTICE.hubCertsEnd = GENERATED_NOTICE.certsEnd;
GENERATED_NOTICE.hubProjects = GENERATED_NOTICE.projects;
GENERATED_NOTICE.hubProjectsEnd = GENERATED_NOTICE.projectsEnd;
GENERATED_NOTICE.hubWriteups = GENERATED_NOTICE.writeups;
GENERATED_NOTICE.hubWriteupsEnd = GENERATED_NOTICE.writeupsEnd;
// Each hub's ".hub-count" line ("13 badges · TryHackMe") so the number can
// never drift from the array length it's counting.
[GENERATED_NOTICE.countBadges, GENERATED_NOTICE.countBadgesEnd] = markers('count-badges', 'badges');
[GENERATED_NOTICE.countCerts, GENERATED_NOTICE.countCertsEnd] = markers('count-certs', 'certs');
[GENERATED_NOTICE.countProjects, GENERATED_NOTICE.countProjectsEnd] = markers('count-projects', 'projects');
[GENERATED_NOTICE.countWriteups, GENERATED_NOTICE.countWriteupsEnd] = markers('count-writeups', 'writeups');

export function readIndexHtml() {
  return readFileSync(new URL('../index.html', import.meta.url), 'utf8');
}

/* The SITE.* arrays moved out of index.html into assets/js/site.js, and the
   theme tokens into assets/css/site.css, when the page was split into three
   files. Everything that used to parse index.html for those reads from here
   instead. */
export function readSiteJs() {
  return readFileSync(new URL('../assets/js/site.js', import.meta.url), 'utf8');
}

export function readSiteCss() {
  return readFileSync(new URL('../assets/css/site.css', import.meta.url), 'utf8');
}

/* ── Balanced literal extraction ─────────────────────────────────────────
   Finds `path = <literal>` (e.g. "SITE.badges = [...]") and returns the
   exact source text of <literal>, using bracket depth + string-aware
   scanning rather than a regex anchored on today's formatting. This holds
   up if entries later grow nested arrays/objects or the file gets
   reformatted. */
function extractBalanced(text, startIdx) {
  const open = text[startIdx];
  const close = open === '[' ? ']' : '}';
  if (open !== '[' && open !== '{') throw new Error(`extractBalanced: expected [ or { at ${startIdx}, got ${JSON.stringify(open)}`);
  let depth = 0;
  let inStr = null;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    // Comments are skipped before quote handling. An apostrophe in a prose
    // comment ("the hero tagline's framing") would otherwise open a string
    // that never closes, and the whole extraction fails with "unbalanced {}"
    // far from the real cause. Hit twice on 2026-09-28 writing comments in
    // SITE.identity.
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      if (nl === -1) break;
      i = nl;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const endC = text.indexOf('*/', i + 2);
      if (endC === -1) break;
      i = endC + 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  throw new Error(`extractBalanced: unbalanced ${open}${close} starting at ${startIdx}`);
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Extracts the source text of `SITE.<name> = <value>;` (array, object, or
 *  `function(...) {...}` literal) from raw JS source. Returns
 *  { valueText, start, end } with `start`/`end` spanning `SITE.<name> = <value>`
 *  (no trailing semicolon) so callers can splice safely. */
export function extractAssignment(src, path) {
  const re = new RegExp(escapeRe(path) + '\\s*=\\s*');
  const m = re.exec(src);
  if (!m) throw new Error(`${path} not found`);
  const valueStart = m.index + m[0].length;
  const ch = src[valueStart];
  let valueText;
  if (ch === '[' || ch === '{') {
    valueText = extractBalanced(src, valueStart);
  } else if (src.startsWith('function', valueStart)) {
    const braceIdx = src.indexOf('{', valueStart);
    if (braceIdx === -1) throw new Error(`${path}: function literal has no body`);
    valueText = src.slice(valueStart, braceIdx) + extractBalanced(src, braceIdx);
  } else {
    throw new Error(`${path}: unsupported literal at offset ${valueStart}`);
  }
  return { valueText, start: m.index, end: valueStart + valueText.length };
}

/** Parses SITE.certs / SITE.badges / SITE.projects / SITE.writeups /
 *  SITE.thmShare out of index.html's raw source and returns a real
 *  { certs, badges, projects, writeups, thmShare } object. */
export function loadSite(html) {
  const certs = extractAssignment(html, 'SITE.certs').valueText;
  const badges = extractAssignment(html, 'SITE.badges').valueText;
  const projects = extractAssignment(html, 'SITE.projects').valueText;
  const writeups = extractAssignment(html, 'SITE.writeups').valueText;
  const thmShare = extractAssignment(html, 'SITE.thmShare').valueText;
  const thm = extractAssignment(html, 'SITE.thm').valueText;
  const share = extractAssignment(html, 'SITE.share').valueText;
  const identity = extractAssignment(html, 'SITE.identity').valueText;
  // Every key this function is to expose must be listed here. It is not a
  // generic reader: a key that is added to site.js but not added here arrives
  // as undefined, which is how the share tags were briefly written as empty.
  const src = `"use strict";\nconst SITE = {};\nSITE.certs = ${certs};\nSITE.badges = ${badges};\nSITE.projects = ${projects};\nSITE.writeups = ${writeups};\nSITE.thmShare = ${thmShare};\nSITE.thm = ${thm};\nSITE.share = ${share};\nSITE.identity = ${identity};\nreturn SITE;`;
  return Function(src)();
}

/* ── Rendering — mirrors renderBadges()/renderCerts()/renderJsonLd() in
   index.html exactly. If you change those functions, change these too. ── */

export function ssotEsc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Derives the reveal-stagger class from index alone, cycling 1-5, so it
 *  never falls short regardless of how many badges/certs exist. Matches
 *  certDelay()/revealDelay() in index.html — same formula, kept in sync by
 *  hand in the two runtimes (browser vs. Node) since they can't share code. */
export function revealDelay(i) {
  return i === 0 ? '' : ' reveal-delay-' + (((i - 1) % 5) + 1);
}

/** Prefixes a same-origin relative path with basePath (e.g. '../' from a hub
 *  page one directory deep back to the repo root). Absolute URLs (http(s):,
 *  mailto:, data:) and already-anchored paths (#, /) pass through untouched —
 *  only bare relative paths like "assets/..." or "domino.html" get prefixed. */
export function withBase(path, basePath) {
  if (!path || !basePath) return path;
  if (/^(https?:|mailto:|data:|#|\/)/.test(path)) return path;
  return basePath + path;
}

/* One definition of a badge's accessible name, used by the static generator,
   the checker, and mirrored in assets/js/site.js.

   aria-label replaces EVERY bit of text inside the link, so the visible
   .badge-tag and .badge-desc were never announced: sighted visitors got the
   rarity and the description, screen reader users got neither. Folding them in
   here keeps the two audiences level.

   It lived in three places before, which is why changing it broke the checker. */
export function badgeAria(b) {
  const base = b.aria || (b.name + ' badge on TryHackMe');
  return [base, b.tag, b.desc].filter(Boolean).join(' \u2014 ');
}

export function badgeCardHTML(b, i, thmShare, basePath) {
  const rawHref = b.href || thmShare(b.slug);
  const href = withBase(rawHref, basePath);
  const aria = badgeAria(b);
  // tier lands inside a class attribute, so it needs escaping like
  // every other interpolated value - a quote in either breaks out of the
  // attribute. Nobody but Atharva writes SITE.badges, but an unescaped
  // interpolation is a latent correctness bug the moment a value contains a
  // quote or an ampersand, and both renderers would corrupt identically so
  // the consistency checker would still pass.
  const cls = 'badge-card ' + ssotEsc(b.tier) + ' reveal' + revealDelay(i);
  return `    <a class="${cls}" href="${ssotEsc(href)}" target="_blank" rel="noopener noreferrer" aria-label="${ssotEsc(aria)}">
      <img src="${ssotEsc(withBase(b.img, basePath))}" alt="${ssotEsc(b.name)} badge" loading="lazy">
      <span class="badge-name">${ssotEsc(b.name)}</span>
      <span class="badge-tag">${ssotEsc(b.tag)}</span>
      <span class="badge-desc">${ssotEsc(b.desc)}</span>
    </a>`;
}

export function certCardHTML(c, i, basePath) {
  let foot;
  if (c.credentialId) {
    const idInner = `<span class="lbl">Credential ID</span><span class="val">${ssotEsc(c.credentialId)}</span>`;
    foot = c.certUrl
      ? `<a class="cert-card-id" href="${ssotEsc(withBase(c.certUrl, basePath))}" target="_blank" rel="noopener noreferrer">${idInner}</a>`
      : `<div class="cert-card-id">${idInner}</div>`;
  } else if (c.pill && c.pill.href) {
    foot = `<a class="cert-pill" href="${ssotEsc(withBase(c.pill.href, basePath))}" target="_blank" rel="noopener noreferrer">${ssotEsc(c.pill.text)}</a>`;
  } else {
    foot = `<span class="cert-pill">${c.pill ? ssotEsc(c.pill.text) : ''}</span>`;
  }
  return `    <div class="cert-card ${ssotEsc(c.cls)} reveal${revealDelay(i)}">
      <div class="cert-card-top">
        <div class="cert-card-badge" aria-hidden="true">${c.badge}</div>
        <div class="cert-card-head">
          <span class="cert-card-issuer">${ssotEsc(c.issuer)}</span>
          <div class="cert-card-name">${ssotEsc(c.name)}</div>
        </div>
      </div>
      <div class="cert-card-foot">${foot}</div>
    </div>`;
}

// Project/writeup fields (name/org/desc/outcomes/refs) are trusted
// hand-authored HTML fragments — same trust model as c.badge above — and are
// NOT re-escaped here. Only real URLs (href) go through ssotEsc.
export function projectDelayClass(delay) {
  return delay ? ' reveal-delay-' + delay : '';
}

export function projectCardHTML(p, i) {
  const tech = p.techStack
    ? `\n      <div class="tech-stack">${p.techStack.map(t => `<span class="tech-badge">${t}</span>`).join('')}</div>`
    : '';
  const outcomes = `\n      <ul class="project-outcomes">${p.outcomes.map(o => `<li>${o}</li>`).join('')}</ul>`;
  const inner = `
      <div class="project-icon" aria-hidden="true">${p.icon}</div>
      <div><div class="project-org">${p.org}</div><h3>${p.name}</h3></div>
      <p>${p.desc}</p>${outcomes}${tech}
    `;
  // Stagger from position, not a typed field. A hand-set delay cannot survive a
  // reorder: every one would have pointed at the wrong column the moment the
  // array moved. Same derivation badges and certs already use.
  const cls = `project-card reveal${revealDelay(i)}`;
  return p.href
    ? `    <a href="${ssotEsc(p.href)}" target="_blank" rel="noopener noreferrer" class="${cls}" style="text-decoration:none;color:inherit;">${inner}</a>`
    : `    <div class="${cls}">${inner}</div>`;
}

/** basePath is prepended to the writeup's own href ("<slug>.html"): '' on the
 *  writeups hub itself (already inside /writeups/), 'writeups/' from the home
 *  page one level up. */
export function writeupCardHTML(w, i, basePath) {
  const href = (basePath || '') + w.slug + '.html';
  return `    <a href="${ssotEsc(href)}" class="project-card reveal${revealDelay(i)}" style="text-decoration:none;color:inherit;border-left:3px solid var(--accent2);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;">
        <div class="project-icon" aria-hidden="true">${w.icon}</div>
      </div>
      <div><div class="project-org">${w.org}</div><h3>${w.name}</h3></div>
      <p>${w.desc}</p>
      <div style="font-family:var(--font-mono);font-size:.68rem;color:var(--text3);margin:.4rem 0 .6rem;letter-spacing:.04em;">${w.refs}</div>
      <span style="color:var(--accent);font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;margin-top:.4rem;">Read Writeup &rarr;</span>
    </a>`;
}

export function badgesGridInner(badges, thmShare, basePath) {
  return badges.map((b, i) => badgeCardHTML(b, i, thmShare, basePath)).join('\n');
}

export function certsGridInner(certs, basePath) {
  return certs.map((c, i) => certCardHTML(c, i, basePath)).join('\n');
}

export function projectsGridInner(projects) {
  return projects.map((p, i) => projectCardHTML(p, i)).join('\n');
}

export function writeupsGridInner(writeups, basePath) {
  return writeups.map((w, i) => writeupCardHTML(w, i, basePath)).join('\n');
}

/** The home-page "See all N <label> »" link — empty string when every item
 *  is already featured (the mechanism is conditional, not always-on). */
/* The hub URL for each section, in ONE place. These were previously written out
   in both build-fallbacks.mjs and check-consistency.mjs, which meant changing a
   URL in one silently failed the other - the exact duplication this module
   exists to remove. Directory form, no index.html, so every hub URL reads the
   same way in the address bar. */
export const HUB_HREF = {
  badges: 'badges/',
  certs: 'certifications/',
  projects: 'projects/',
  writeups: 'writeups/',
};


/* ── The sibling row at the foot of every hub ──────────────────────────────

   The four hub pages linked back to the home page and nowhere else: zero links
   between them, in all twelve directions. These pages exist so a crawler has
   something to index and send people to, so every one of them was a cul-de-sac
   for the visitor most likely to land there.

   HUB_ORDER is the order the home page lists the sections in, and the single
   place the row is driven from. A fifth section page is added here and to
   HUB_HREF/HUB_LABEL, and `node tools/build-fallbacks.mjs` puts it in the row
   on every other hub with nothing hand-edited.

   The count beside each label comes from the same SITE array the target hub
   builds its own cards from, so the number cannot disagree with the page it
   points at - the reason the badges hub's own count is generated rather than
   typed. It is the SITE key too: a hub listed here with no SITE array behind it
   throws rather than render "0". */
export const HUB_ORDER = ['projects', 'writeups', 'certs', 'badges'];

export const HUB_LABEL = {
  badges: 'Badges',
  certs: 'Certifications',
  projects: 'Projects',
  writeups: 'Writeups',
};

export const HUBNAV_START = '<!-- GENERATED:hubnav start \u2014 produced by tools/build-fallbacks.mjs from HUB_ORDER in tools/ssot.mjs. Do not hand-edit; edit HUB_ORDER and run `node tools/build-fallbacks.mjs` instead. -->';
export const HUBNAV_END = '<!-- GENERATED:hubnav end -->';

/** The links to the OTHER hubs, for the foot of the hub named by currentKey.
 *  Root-absolute hrefs, so the same markup is correct whatever directory depth
 *  a page sits at, and static rather than rendered at runtime - these pages load
 *  no site.js, and a crawler following a search result is the whole audience. */
export function hubNavHTML(currentKey, SITE) {
  if (!HUB_ORDER.includes(currentKey)) throw new Error(`hubNavHTML: unknown hub "${currentKey}"`);
  const others = HUB_ORDER.filter(k => k !== currentKey);
  if (!others.length) throw new Error(`hubNavHTML: no sibling hubs for "${currentKey}"`);
  return others.map(k => {
    const n = (SITE[k] || []).length;
    if (!n) throw new Error(`hubNavHTML: SITE.${k} is empty or missing. Refusing to write a zero count.`);
    const href = HUB_HREF[k];
    const label = HUB_LABEL[k];
    if (!href || !label) throw new Error(`hubNavHTML: HUB_HREF/HUB_LABEL missing an entry for "${k}"`);
    return `      <a href="/${ssotEsc(href)}">${ssotEsc(label)} <span class="hub-sib-n">${n}</span></a>`;
  }).join('\n');
}

export function applyHubNav(html, currentKey, SITE) {
  return spliceBetweenMarkers(html, HUBNAV_START, HUBNAV_END, hubNavHTML(currentKey, SITE));
}


/* ── Writeup prev/next pagers ──────────────────────────────────────

   These were wired by hand, which meant adding a writeup was a three-page edit
   (the new page, plus BOTH neighbours) and inserting one at the top silently
   left the old first page with an empty prev slot. SITE.writeups already holds
   the order, so the chain is derived from it: add an entry and every pager on
   the site re-links itself.

   The empty slot at each end is a <span></span>, which is what keeps the
   three-column nav aligned - do not drop it to two children. */
export const WRITEUP_PAGER_START = '<!-- GENERATED:pager start \u2014 produced by tools/build-fallbacks.mjs from SITE.writeups order. Do not hand-edit; reorder SITE.writeups and run `node tools/build-fallbacks.mjs` instead. -->';
export const WRITEUP_PAGER_END = '<!-- GENERATED:pager end -->';

export function writeupPagerHTML(i, writeups) {
  if (!Array.isArray(writeups) || !writeups.length) throw new Error('writeupPagerHTML: SITE.writeups is empty.');
  if (i < 0 || i >= writeups.length) throw new Error(`writeupPagerHTML: index ${i} is outside SITE.writeups.`);
  const prev = i > 0 ? writeups[i - 1] : null;
  const next = i < writeups.length - 1 ? writeups[i + 1] : null;
  const line = (w, rel) => {
    const label = rel === 'prev' ? `&larr; ${ssotEsc(w.name)}` : `${ssotEsc(w.name)} &rarr;`;
    return `      <a class="wr-pager-link" href="${ssotEsc(w.slug)}.html" rel="${rel}">${label}</a>`;
  };
  return [
    prev ? line(prev, 'prev') : '      <span></span>',
    '      <a class="wr-pager-hub" href="index.html">All writeups</a>',
    next ? line(next, 'next') : '      <span></span>',
  ].join('\n');
}

export function applyWriteupPager(html, i, SITE) {
  return spliceBetweenMarkers(html, WRITEUP_PAGER_START, WRITEUP_PAGER_END, writeupPagerHTML(i, SITE.writeups || []));
}

/* The writeups hub's four description strings open with a spelled-out count
   ("Six detailed TryHackMe walkthroughs"). Hard-typed, they are the badges-hub
   "13 badges" bug waiting to happen: a wrong number in the text Google shows
   for the page. Generated from the array instead. */
const NUM_WORD = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];

export function numWord(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error(`numWord: refusing to spell ${n}.`);
  if (n >= NUM_WORD.length) return String(n);
  return NUM_WORD[n];
}

export function applyWriteupCountWords(html, SITE) {
  const n = (SITE.writeups || []).length;
  if (!n) throw new Error('applyWriteupCountWords: SITE.writeups is empty. Refusing to write a zero count.');
  const word = numWord(n);
  const alt = NUM_WORD.slice(1).join('|') + '|\\d+';
  return html.replace(new RegExp(`\\b(?:${alt}) detailed TryHackMe walkthroughs`, 'g'),
    `${word} detailed TryHackMe walkthroughs`);
}


/* SITE.thm formatting. Duplicated from SITE.thmDisplay in assets/js/site.js
   deliberately: this runs in Node with no DOM, and check-consistency.mjs
   compares the two outputs, so a divergence fails the commit rather than
   shipping two different numbers. */
export function thmDisplay(t) {
  const group = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const LEVEL_NAMES = { 13: 'Legend' };
  return {
    rooms: group(t.rooms),
    points: group(t.points),
    streak: String(t.streak),
    badges: String(t.badges),
    rank: group(t.rank),
    percentile: `Top ${t.percentile}%`,
    level: '0x' + t.level.toString(16).toUpperCase(),
    levelName: LEVEL_NAMES[t.level] || '',
  };
}

export function seeAllHTML(items, hubHref, label) {
  const total = items.length;
  // Always rendered, even when the home page already shows everything. The hub
  // is a real page worth linking either way, and a link that appears on three
  // sections but not the fourth reads as a bug rather than a rule.
  return `    <a class="section-see-all" href="${ssotEsc(hubHref)}">See all ${total} ${ssotEsc(label)} <span aria-hidden="true">&raquo;</span></a>`;
}

/** Builds the JSON text for the `hasCredential` array value (the `[...]`
 *  substring only — matches renderJsonLd()'s shape exactly), for the
 *  earned certs, formatted to match the hand-authored indentation already
 *  in the JSON-LD block (2-space object indent). */
export function hasCredentialArrayText(certs) {
  const earned = certs.filter(c => c.earned);
  const entries = earned.map(c => `    {
      "@type": "EducationalOccupationalCredential",
      "name": ${JSON.stringify(c.jsonLdName || c.name)},
      "credentialCategory": "certification",
      "recognizedBy": { "@type": "Organization", "name": ${JSON.stringify(c.issuer)} }
    }`).join(',\n');
  return `[\n${entries}\n  ]`;
}

/* ── Generated-region splicing ────────────────────────────────────────── */

export function spliceBetweenMarkers(html, startMarker, endMarker, newInner) {
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1) throw new Error(`marker not found: ${startMarker}`);
  if (endIdx === -1) throw new Error(`marker not found: ${endMarker}`);
  if (endIdx < startIdx) throw new Error(`end marker precedes start marker: ${startMarker}`);
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  return `${before}\n${newInner}\n    ${after}`;
}

/** Like spliceBetweenMarkers but for a single-line/inline region (e.g. a
 *  hub's ".hub-count" text) — no injected newlines or indentation. */
/* The badges hub's own description carried a hand-typed count. It said 13 while
   SITE.badges held 15 and the home page's own "See all 15 badges" link said 15,
   so the number a search result showed for that page was wrong. Generated from
   the array now, like every other count on the site. */
export function applyBadgeCountTags(html, SITE) {
  const n = (SITE.badges || []).length;
  if (!n) throw new Error('applyBadgeCountTags: SITE.badges is empty. Refusing to write a zero count.');
  return html.replace(/All \d+ TryHackMe badges/g, `All ${n} TryHackMe badges`);
}

/* F8: per-writeup TechArticle structured data.

   Only the home page and the writeups index carried JSON-LD. The six writeup
   pages, which are the longest and most substantive content on the site, had
   none, so a search engine saw them as ordinary pages.

   Generated from SITE.writeups, the same array the cards and the index's
   CollectionPage already come from, so a writeup cannot end up described one
   way in a card and another way in its own structured data. The description is
   stripped of the HTML entities the card markup uses, because JSON-LD is read
   as text, not parsed as HTML. */
export const WRITEUP_JSONLD_START = '<!-- GENERATED:writeup-jsonld start \u2014 produced by tools/build-fallbacks.mjs from SITE.writeups. Do not hand-edit; edit SITE.writeups and run `node tools/build-fallbacks.mjs` instead. -->';
export const WRITEUP_JSONLD_END = '<!-- GENERATED:writeup-jsonld end -->';

/* Writes (or rewrites) the block on one writeup page. Inserted before </head>
   the first time, then only ever replaced between its own markers. */
export function applyWriteupJsonLd(html, w, SITE) {
  const block = WRITEUP_JSONLD_START + '\n<script type="application/ld+json">\n'
    + writeupJsonLd(w, SITE) + '\n</script>\n' + WRITEUP_JSONLD_END;
  const i = html.indexOf(WRITEUP_JSONLD_START);
  if (i === -1) {
    const h = html.indexOf('</head>');
    if (h === -1) throw new Error('applyWriteupJsonLd: no </head> found');
    return html.slice(0, h) + block + '\n' + html.slice(h);
  }
  const j = html.indexOf(WRITEUP_JSONLD_END);
  if (j === -1) throw new Error('applyWriteupJsonLd: start marker without end marker');
  return html.slice(0, i) + block + html.slice(j + WRITEUP_JSONLD_END.length);
}

/** Turns a SITE field (trusted hand-authored HTML: entities plus the odd
 *  <span>) into the plain text JSON-LD needs. JSON-LD is read as text, not
 *  parsed as HTML, so "&mdash;" left in place is shown literally by anything
 *  that consumes the block.
 *
 *  Extracted from writeupJsonLd so the hub CollectionPage builders below decode
 *  identically \u2014 three copies of this list is how one of them ends up missing
 *  an entity nobody notices until it is in a search result. */
export function plainText(s) {
  return String(s == null ? '' : s)
    .replace(/&middot;/g, '\u00b7')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
}

export function writeupJsonLd(w, SITE) {
  const base = (SITE.share && SITE.share.base) || 'https://atharvaxsecurity.com/';
  const url = `${base}writeups/${w.slug}.html`;
  const plain = plainText(w.desc);
  const obj = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${w.name} \u2014 ${w.org} walkthrough`,
    name: w.name,
    url,
    description: plain,
    author: { '@type': 'Person', name: 'Atharva Kulkarni', url: base },
    publisher: { '@type': 'Person', name: 'Atharva Kulkarni', url: base },
    inLanguage: 'en',
    isPartOf: { '@type': 'CollectionPage', name: 'CTF Writeups', url: `${base}writeups/` },
    about: { '@type': 'Thing', name: 'Penetration testing walkthrough' },
  };
  return JSON.stringify(obj, null, 2);
}

/* Title and description tags, driven from SITE.identity.

   renderIdentity() in assets/js/site.js writes these at runtime, which covers
   people but NOT crawlers: a search engine reads the static HTML and never runs
   the script. So the tag a search result actually shows was the hand-written
   one, and it silently stopped matching SITE.identity the moment either changed.
   That is exactly what happened when the title was shortened - the live page
   still served the old 104-character title.

   These are now generated, so the static tag and the runtime value cannot
   disagree, and check-consistency.mjs fails the commit if they do. */
const IDENTITY_TAGS = [
  ['title',       'title',                                            null],
  ['meta',        'meta[name="description"]',      'metaDescription'],
  ['meta',        'meta[property="og:title"]',     'ogTitle'],
  ['meta',        'meta[property="og:description"]', 'ogDescription'],
  ['meta',        'meta[name="twitter:title"]',    'twTitle'],
  ['meta',        'meta[name="twitter:description"]', 'twDescription'],
];

export function applyIdentityTags(html, SITE) {
  const id = SITE.identity || {};
  if (!id.title || !id.metaDescription) {
    throw new Error('applyIdentityTags: SITE.identity is missing title or metaDescription. Refusing to blank the page title.');
  }
  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${id.title}</title>`);
  const metas = [
    ['name="description"', id.metaDescription],
    ['property="og:title"', id.ogTitle],
    ['property="og:description"', id.ogDescription],
    ['name="twitter:title"', id.twTitle],
    ['name="twitter:description"', id.twDescription],
  ];
  for (const [attr, val] of metas) {
    if (!val) continue;
    const re = new RegExp(`(<meta\\s+${attr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+content=")[^"]*(")`);
    out = out.replace(re, `$1${val.replace(/"/g, '&quot;')}$2`);
  }
  return out;
}

/* Share-image tags, driven from SITE.share.

   Eleven pages carried the image URL by hand, 22 tags in all, plus the two
   dimension tags on the home page. One value now feeds every one of them.
   Used by build-fallbacks.mjs to write them and by check-consistency.mjs to
   verify them, so the two can never disagree about what is correct. */
export function shareImageUrl(SITE) {
  const sh = SITE.share || {};
  return String(sh.base || '') + String(sh.image || '');
}

export function applyShareTags(html, SITE) {
  const url = shareImageUrl(SITE);
  const sh = SITE.share || {};
  // Refuse to write nothing. Without this a missing SITE.share silently blanked
  // og:image and twitter:image on all eleven pages, which would have shipped a
  // site whose every shared link had no preview image. A generator that can
  // write an empty required value is a generator that eventually will.
  if (!sh.base || !sh.image || !/^https?:\/\/\S+$/.test(url)) {
    throw new Error(
      `applyShareTags: SITE.share is missing or unusable (base=${JSON.stringify(sh.base)}, ` +
      `image=${JSON.stringify(sh.image)}). Refusing to blank the share tags.`
    );
  }
  let out = html;
  out = out.replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/g, `$1${url}$2`);
  out = out.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/g, `$1${url}$2`);
  // Dimensions only exist where they are already declared; this never adds them.
  if (sh.width)  out = out.replace(/(<meta\s+property="og:image:width"\s+content=")[^"]*(")/g,  `$1${sh.width}$2`);
  if (sh.height) out = out.replace(/(<meta\s+property="og:image:height"\s+content=")[^"]*(")/g, `$1${sh.height}$2`);
  return out;
}

/* Every HTML page in the repo, read from the tree rather than hardcoded, so a
   writeup added later is covered without anyone remembering to list it. */
export function allPages(root) {
  return [
    'index.html',
    'badges/index.html', 'certifications/index.html',
    'projects/index.html', 'writeups/index.html',
    ...readdirSync(join(root, 'writeups'))
      .filter(f => f.endsWith('.html') && f !== 'index.html')
      .map(f => `writeups/${f}`),
  ];
}

export function spliceInline(html, startMarker, endMarker, newInner) {
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1) throw new Error(`marker not found: ${startMarker}`);
  if (endIdx === -1) throw new Error(`marker not found: ${endMarker}`);
  if (endIdx < startIdx) throw new Error(`end marker precedes start marker: ${startMarker}`);
  const before = html.slice(0, startIdx + startMarker.length);
  const after = html.slice(endIdx);
  return `${before}${newInner}${after}`;
}

export function getRegion(html, startMarker, endMarker) {
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;
  return html.slice(startIdx + startMarker.length, endIdx);
}

/** Locates the `"hasCredential": [ ... ]` array literal inside the JSON-LD
 *  region delimited by [regionStartMarker, regionEndMarker) and returns
 *  { text, absIndex } (text = the exact `[...]` substring, absIndex = its
 *  offset in html), or null if the markers or the key aren't found. */
export function locateHasCredential(html, regionStartMarker, regionEndMarker) {
  const regionStart = html.indexOf(regionStartMarker);
  const regionEnd = html.indexOf(regionEndMarker);
  if (regionStart === -1 || regionEnd === -1) return null;
  const keyRe = /"hasCredential"\s*:\s*/;
  const m = keyRe.exec(html.slice(regionStart, regionEnd));
  if (!m) return null;
  const keyAbsIdx = regionStart + m.index + m[0].length;
  if (html[keyAbsIdx] !== '[') return null;
  return { text: extractBalanced(html, keyAbsIdx), absIndex: keyAbsIdx };
}

/** Convenience wrapper: returns just the `[...]` source text, or null. */
export function getHasCredentialText(html, regionStartMarker, regionEndMarker) {
  const loc = locateHasCredential(html, regionStartMarker, regionEndMarker);
  return loc ? loc.text : null;
}

/** Replaces the `"hasCredential": [ ... ]` array literal inside a JSON-LD
 *  <script> block (searched for within [regionStart, regionEnd) of html)
 *  with newArrayText, leaving every other byte of the JSON untouched. */
export function spliceHasCredential(html, regionStartMarker, regionEndMarker, newArrayText) {
  const loc = locateHasCredential(html, regionStartMarker, regionEndMarker);
  if (loc === null) throw new Error('"hasCredential" array not found inside JSON-LD generated region — check GENERATED:jsonld markers');
  return html.slice(0, loc.absIndex) + newArrayText + html.slice(loc.absIndex + loc.text.length);
}

/* ── Hub-page CollectionPage structured data ──────────────────────────────

   writeups/index.html has carried a CollectionPage since the writeup JSON-LD
   went in, and each writeup page carries a TechArticle. The other three hubs
   carried nothing: certifications/index.html is the page someone opens to check
   a credential, and a crawler saw six cert cards as decorated <div>s with no
   machine-readable credential behind them.

   Generated from the same SITE arrays the cards come from, so a credential
   cannot be described one way on its card and another in the page's structured
   data. Each builder throws rather than emit an empty hasPart — a generator that
   can write nothing eventually will, silently.

   Markers are per-hub ("GENERATED:certs-jsonld") and distinct from the grid
   markers ("GENERATED:certs"), so each region only ever rewrites its own bytes. */

export const HUB_JSONLD = {};
for (const key of ['certs', 'projects', 'badges']) {
  const [start, end] = markers(`${key}-jsonld`, key);
  HUB_JSONLD[key] = { start, end };
}

function siteBase(SITE) {
  return (SITE.share && SITE.share.base) || 'https://atharvaxsecurity.com/';
}

/** Resolves a SITE path to an absolute URL on this origin. Already-absolute
 *  URLs pass through. */
function absUrl(path, base) {
  return /^https?:/.test(path) ? path : base + String(path).replace(/^\//, '');
}

/** The GitHub repository behind a project: its href when that is already a repo
 *  URL, otherwise the repo path printed in p.org (e.g. "github.com/x/y"), which
 *  is where the live-site projects keep theirs. Returns null when there is no
 *  repository — that is what decides SoftwareSourceCode vs CreativeWork, so it
 *  is derived, never a typed field that can go stale against the org line. */
export function projectRepoUrl(p) {
  if (p.href && /^https:\/\/github\.com\/[^/]+\/[^/?#]+/.test(p.href)) return p.href.replace(/\/+$/, '');
  const m = String(p.org || '').match(/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/);
  return m ? `https://${m[0]}` : null;
}

/** Which SITE items a hub's hasPart lists. Stated once, used by the builders and
 *  by check-consistency.mjs, so "what belongs in the block" cannot be written
 *  twice and differ. */
export function hubJsonLdItems(key, SITE) {
  switch (key) {
    // Only earned credentials. In-progress paths belong in #learning, exactly as
    // the home page's hasCredential array already treats them.
    case 'certs': return (SITE.certs || []).filter(c => c.earned);
    // A project with no href has nothing to point a "url" at, and a CreativeWork
    // without a URL is not worth a crawler's time.
    case 'projects': return (SITE.projects || []).filter(p => p.href);
    case 'badges': return SITE.badges || [];
    default: throw new Error(`hubJsonLdItems: unknown hub "${key}"`);
  }
}

/** Shared CollectionPage envelope. Throws on an empty hasPart: structured data
 *  that describes nothing is worse than none, because it looks correct. */
function collectionPage(SITE, { name, hubKey, description, hasPart }) {
  if (!Array.isArray(hasPart) || hasPart.length === 0) {
    throw new Error(`collectionPage(${hubKey}): hasPart is empty. Refusing to write structured data that describes nothing.`);
  }
  if (!HUB_HREF[hubKey]) throw new Error(`collectionPage: no HUB_HREF for "${hubKey}"`);
  const base = siteBase(SITE);
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: base + HUB_HREF[hubKey],
    description,
    author: { '@type': 'Person', name: 'Atharva Kulkarni', url: base },
    isPartOf: { '@type': 'WebSite', name: 'Atharva Kulkarni', url: base },
    hasPart,
  }, null, 2);
}

/** certifications/index.html — the six earned credentials as
 *  EducationalOccupationalCredential, with the issuer as recognizedBy and, where
 *  one exists, the credential ID and the self-hosted certificate PDF. */
export function certsHubJsonLd(SITE) {
  const earned = hubJsonLdItems('certs', SITE);
  const base = siteBase(SITE);
  const inProgress = (SITE.certs || []).length - earned.length;
  const hasPart = earned.map(c => {
    const entry = {
      '@type': 'EducationalOccupationalCredential',
      name: plainText(c.jsonLdName || c.name),
      credentialCategory: 'certification',
      recognizedBy: { '@type': 'Organization', name: plainText(c.issuer) },
    };
    if (c.credentialId) entry.identifier = plainText(c.credentialId);
    const evidence = c.certUrl || (c.pill && c.pill.href) || null;
    if (evidence) entry.url = absUrl(evidence, base);
    return entry;
  });
  // Counted, never typed. A sentence with a number in it drifts from the array
  // behind it; that is how the badges hub came to claim 13 of 15.
  const description = `${earned.length} security certifications and credentials earned by Atharva Kulkarni`
    + (inProgress > 0 ? `, plus ${inProgress} in progress` : '') + '.';
  return collectionPage(SITE, { name: 'Certifications', hubKey: 'certs', description, hasPart });
}

/** projects/index.html — every project with a real href. SoftwareSourceCode when
 *  a repository can be resolved, CreativeWork otherwise. */
export function projectsHubJsonLd(SITE) {
  const listed = hubJsonLdItems('projects', SITE);
  const hasPart = listed.map(p => {
    const repo = projectRepoUrl(p);
    const entry = {
      '@type': repo ? 'SoftwareSourceCode' : 'CreativeWork',
      name: plainText(p.name),
      description: plainText(p.desc),
      url: p.href,
    };
    if (repo) entry.codeRepository = repo;
    if (Array.isArray(p.techStack) && p.techStack.length) {
      entry.keywords = p.techStack.map(plainText).join(', ');
    }
    return entry;
  });
  const description = `${listed.length} published projects and repositories by Atharva Kulkarni.`;
  return collectionPage(SITE, { name: 'Projects', hubKey: 'projects', description, hasPart });
}

/** badges/index.html — the TryHackMe badge wall. Deliberately the plainest of
 *  the three: a name, a description and the badge's own share URL. */
export function badgesHubJsonLd(SITE) {
  const badges = hubJsonLdItems('badges', SITE);
  if (typeof SITE.thmShare !== 'function') {
    throw new Error('badgesHubJsonLd: SITE.thmShare is not a function — badge URLs would be undefined.');
  }
  const hasPart = badges.map(b => {
    const url = b.href || SITE.thmShare(b.slug);
    if (!url) throw new Error(`badgesHubJsonLd: badge "${b.name}" has neither href nor slug.`);
    return {
      '@type': 'CreativeWork',
      name: plainText(b.name),
      description: plainText(b.desc),
      url,
    };
  });
  const description = `${badges.length} TryHackMe badges earned by Atharva Kulkarni.`;
  return collectionPage(SITE, { name: 'TryHackMe Badges', hubKey: 'badges', description, hasPart });
}

export const HUB_JSONLD_BUILDER = {
  certs: certsHubJsonLd,
  projects: projectsHubJsonLd,
  badges: badgesHubJsonLd,
};

/** Writes (or rewrites) one hub's CollectionPage block. Inserted before </head>
 *  the first time, then only ever replaced between its own markers. Same shape
 *  as applyWriteupJsonLd, so the two behave identically. */
export function applyHubJsonLd(html, key, SITE) {
  const mk = HUB_JSONLD[key];
  const build = HUB_JSONLD_BUILDER[key];
  if (!mk || !build) throw new Error(`applyHubJsonLd: unknown hub "${key}"`);
  const json = build(SITE);
  if (!json || !json.trim()) throw new Error(`applyHubJsonLd(${key}): builder produced an empty block.`);
  const block = mk.start + '\n<script type="application/ld+json">\n' + json + '\n</script>\n' + mk.end;
  const i = html.indexOf(mk.start);
  if (i === -1) {
    const h = html.indexOf('</head>');
    if (h === -1) throw new Error(`applyHubJsonLd(${key}): no </head> found`);
    return html.slice(0, h) + block + '\n' + html.slice(h);
  }
  const j = html.indexOf(mk.end);
  if (j === -1) throw new Error(`applyHubJsonLd(${key}): start marker without end marker`);
  return html.slice(0, i) + block + html.slice(j + mk.end.length);
}
