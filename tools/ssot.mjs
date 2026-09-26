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
  // Every key this function is to expose must be listed here. It is not a
  // generic reader: a key that is added to site.js but not added here arrives
  // as undefined, which is how the share tags were briefly written as empty.
  const src = `"use strict";\nconst SITE = {};\nSITE.certs = ${certs};\nSITE.badges = ${badges};\nSITE.projects = ${projects};\nSITE.writeups = ${writeups};\nSITE.thmShare = ${thmShare};\nSITE.thm = ${thm};\nSITE.share = ${share};\nreturn SITE;`;
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
  // tier and cls2 land inside a class attribute, so they need escaping like
  // every other interpolated value - a quote in either breaks out of the
  // attribute. Nobody but Atharva writes SITE.badges, but an unescaped
  // interpolation is a latent correctness bug the moment a value contains a
  // quote or an ampersand, and both renderers would corrupt identically so
  // the consistency checker would still pass.
  const cls = 'badge-card ' + ssotEsc(b.tier) + (b.cls2 ? ' ' + ssotEsc(b.cls2) : '') + ' reveal' + revealDelay(i);
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

export function projectCardHTML(p) {
  const tech = p.techStack
    ? `\n      <div class="tech-stack">${p.techStack.map(t => `<span class="tech-badge">${t}</span>`).join('')}</div>`
    : '';
  const outcomes = `\n      <ul class="project-outcomes">${p.outcomes.map(o => `<li>${o}</li>`).join('')}</ul>`;
  const inner = `
      <div class="project-icon" aria-hidden="true">${p.icon}</div>
      <div><div class="project-org">${p.org}</div><h3>${p.name}</h3></div>
      <p>${p.desc}</p>${outcomes}${tech}
    `;
  const cls = `project-card reveal${projectDelayClass(p.delay)}`;
  return p.href
    ? `    <a href="${ssotEsc(p.href)}" target="_blank" rel="noopener noreferrer" class="${cls}" style="text-decoration:none;color:inherit;">${inner}</a>`
    : `    <div class="${cls}">${inner}</div>`;
}

/** basePath is prepended to the writeup's own href ("<slug>.html"): '' on the
 *  writeups hub itself (already inside /writeups/), 'writeups/' from the home
 *  page one level up. */
export function writeupCardHTML(w, basePath) {
  const href = (basePath || '') + w.slug + '.html';
  return `    <a href="${ssotEsc(href)}" class="project-card reveal${projectDelayClass(w.delay)}" style="text-decoration:none;color:inherit;border-left:3px solid var(--accent2);">
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
  return projects.map(p => projectCardHTML(p)).join('\n');
}

export function writeupsGridInner(writeups, basePath) {
  return writeups.map(w => writeupCardHTML(w, basePath)).join('\n');
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

export function writeupJsonLd(w, SITE) {
  const base = (SITE.share && SITE.share.base) || 'https://atharvaxsecurity.com/';
  const url = `${base}writeups/${w.slug}.html`;
  const plain = String(w.desc || '')
    .replace(/&middot;/g, '\u00b7')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, '')
    .trim();
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
