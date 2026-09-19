/**
 * Shared SSOT (single source of truth) helpers for index.html.
 *
 * index.html defines SITE.badges / SITE.certs / SITE.thmShare as plain JS
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
import { readFileSync } from 'node:fs';

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
  const src = `"use strict";\nconst SITE = {};\nSITE.certs = ${certs};\nSITE.badges = ${badges};\nSITE.projects = ${projects};\nSITE.writeups = ${writeups};\nSITE.thmShare = ${thmShare};\nreturn SITE;`;
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

export function badgeCardHTML(b, i, thmShare, basePath) {
  const rawHref = b.href || thmShare(b.slug);
  const href = withBase(rawHref, basePath);
  const aria = b.aria || (b.name + ' badge on TryHackMe');
  const cls = 'badge-card ' + b.tier + (b.cls2 ? ' ' + b.cls2 : '') + ' reveal' + revealDelay(i);
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
        <div class="cert-card-badge">${c.badge}</div>
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
      <div class="project-icon">${p.icon}</div>
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
        <div class="project-icon">${w.icon}</div>
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
export function seeAllHTML(items, hubHref, label) {
  const total = items.length;
  const featured = items.filter(x => x.featured).length;
  if (featured >= total) return '';
  return `    <a class="section-see-all" href="${ssotEsc(hubHref)}">See all ${total} ${label} <span aria-hidden="true">&raquo;</span></a>`;
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
