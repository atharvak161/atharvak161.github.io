#!/usr/bin/env node
/**
 * Regenerates every no-JS fallback / hub-page listing in the repo from
 * SITE.badges / SITE.certs / SITE.projects / SITE.writeups — the single
 * source of truth, defined once in index.html.
 *
 * index.html carries, for crawlers and no-JS visitors (renderBadges() /
 * renderCerts() / renderProjects() / renderWriteups() / renderJsonLd()
 * overwrite them at runtime for everyone else):
 *   1. the static .badge-card fallback block in #badges      (FEATURED only)
 *   2. the static .cert-card  fallback block in #certifications (FEATURED only)
 *   3. the static .project-card fallback block in #projects  (FEATURED only)
 *   4. the static .project-card fallback block in #writeups  (FEATURED only)
 *   5. the "hasCredential" array in the JSON-LD <script>
 *   6. a "See all N <label> »" link in each section header — present only
 *      when that section has more items than are featured
 *
 * badges/index.html, certifications/index.html, projects/index.html and
 * writeups/index.html each carry the same kind of block, but with EVERY
 * item (no featured filter) — that's what makes them the "see all" hub.
 * Each also carries a ".hub-count" line ("13 badges · TryHackMe") tied to
 * the same array length.
 *
 * Adding, removing, reordering or re-featuring an item must mean editing
 * SITE.badges / SITE.certs / SITE.projects / SITE.writeups in index.html
 * and nothing else. Run this after every such edit:
 *
 *   node tools/build-fallbacks.mjs
 *
 * It is idempotent — running it twice in a row produces byte-identical
 * files the second time. tools/check-consistency.mjs (run by the pre-commit
 * hook) fails the commit if any generated region has drifted from what this
 * script would produce, so a stale fallback or hub can't ship.
 *
 * Every generated region is delimited by <!-- GENERATED:... --> markers and
 * must not be hand-edited — this script only ever rewrites the text between
 * its own markers.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  GENERATED_NOTICE,
  loadSite,
  badgesGridInner,
  certsGridInner,
  projectsGridInner,
  writeupsGridInner,
  hasCredentialArrayText,
  seeAllHTML,
  spliceBetweenMarkers,
  spliceInline,
  spliceHasCredential,
} from './ssot.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'index.html');
const badgesHubPath = join(root, 'badges/index.html');
const certsHubPath = join(root, 'certifications/index.html');
const projectsHubPath = join(root, 'projects/index.html');
const writeupsHubPath = join(root, 'writeups/index.html');

function buildIndex(html) {
  const SITE = loadSite(html);
  let out = html;

  const featuredBadges = SITE.badges.filter(b => b.featured);
  const featuredCerts = SITE.certs.filter(c => c.featured);
  const featuredProjects = SITE.projects.filter(p => p.featured);
  const featuredWriteups = SITE.writeups.filter(w => w.featured);

  out = spliceBetweenMarkers(out, GENERATED_NOTICE.badges, GENERATED_NOTICE.badgesEnd,
    badgesGridInner(featuredBadges, SITE.thmShare));
  out = spliceBetweenMarkers(out, GENERATED_NOTICE.certs, GENERATED_NOTICE.certsEnd,
    certsGridInner(featuredCerts));
  out = spliceBetweenMarkers(out, GENERATED_NOTICE.projects, GENERATED_NOTICE.projectsEnd,
    projectsGridInner(featuredProjects));
  out = spliceBetweenMarkers(out, GENERATED_NOTICE.writeups, GENERATED_NOTICE.writeupsEnd,
    writeupsGridInner(featuredWriteups, 'writeups/'));

  out = spliceBetweenMarkers(out, GENERATED_NOTICE.seeallBadges, GENERATED_NOTICE.seeallBadgesEnd,
    seeAllHTML(SITE.badges, 'badges/index.html', 'badges'));
  out = spliceBetweenMarkers(out, GENERATED_NOTICE.seeallCerts, GENERATED_NOTICE.seeallCertsEnd,
    seeAllHTML(SITE.certs, 'certifications/index.html', 'certifications'));
  out = spliceBetweenMarkers(out, GENERATED_NOTICE.seeallProjects, GENERATED_NOTICE.seeallProjectsEnd,
    seeAllHTML(SITE.projects, 'projects/index.html', 'projects'));
  out = spliceBetweenMarkers(out, GENERATED_NOTICE.seeallWriteups, GENERATED_NOTICE.seeallWriteupsEnd,
    seeAllHTML(SITE.writeups, 'writeups/index.html', 'writeups'));

  out = spliceHasCredential(out, GENERATED_NOTICE.jsonld, GENERATED_NOTICE.jsonldEnd,
    hasCredentialArrayText(SITE.certs));

  return { out, SITE };
}

function buildBadgesHub(html, SITE) {
  let out = html;
  out = spliceBetweenMarkers(out, GENERATED_NOTICE.hubBadges, GENERATED_NOTICE.hubBadgesEnd,
    badgesGridInner(SITE.badges, SITE.thmShare, '../'));
  out = spliceInline(out, GENERATED_NOTICE.countBadges, GENERATED_NOTICE.countBadgesEnd,
    `${SITE.badges.length} badges &middot; TryHackMe`);
  return out;
}

function buildCertsHub(html, SITE) {
  let out = html;
  out = spliceBetweenMarkers(out, GENERATED_NOTICE.hubCerts, GENERATED_NOTICE.hubCertsEnd,
    certsGridInner(SITE.certs, '../'));
  out = spliceInline(out, GENERATED_NOTICE.countCerts, GENERATED_NOTICE.countCertsEnd,
    `${SITE.certs.length} certifications`);
  return out;
}

function buildProjectsHub(html, SITE) {
  let out = html;
  out = spliceBetweenMarkers(out, GENERATED_NOTICE.hubProjects, GENERATED_NOTICE.hubProjectsEnd,
    projectsGridInner(SITE.projects));
  out = spliceInline(out, GENERATED_NOTICE.countProjects, GENERATED_NOTICE.countProjectsEnd,
    `${SITE.projects.length} projects`);
  return out;
}

function buildWriteupsHub(html, SITE) {
  let out = html;
  out = spliceBetweenMarkers(out, GENERATED_NOTICE.hubWriteups, GENERATED_NOTICE.hubWriteupsEnd,
    writeupsGridInner(SITE.writeups, ''));
  out = spliceInline(out, GENERATED_NOTICE.countWriteups, GENERATED_NOTICE.countWriteupsEnd,
    `${SITE.writeups.length} writeups &middot; TryHackMe`);
  return out;
}

function writeIfChanged(path, before, after) {
  if (after === before) {
    console.log(`build-fallbacks: ${path.replace(root + '/', '')} already up to date.`);
    return;
  }
  writeFileSync(path, after, 'utf8');
  console.log(`build-fallbacks: ${path.replace(root + '/', '')} regenerated.`);
}

const indexHtml = readFileSync(indexPath, 'utf8');
const { out: nextIndex, SITE } = buildIndex(indexHtml);
writeIfChanged(indexPath, indexHtml, nextIndex);

const hubs = [
  [badgesHubPath, buildBadgesHub],
  [certsHubPath, buildCertsHub],
  [projectsHubPath, buildProjectsHub],
  [writeupsHubPath, buildWriteupsHub],
];
const hubResults = hubs.map(([path, fn]) => {
  const html = readFileSync(path, 'utf8');
  const next = fn(html, SITE);
  writeIfChanged(path, html, next);
  return [path, next, fn];
});

// Idempotency self-check: regenerating the output we just wrote must be a no-op,
// for index.html and for every hub.
const againIndex = buildIndex(nextIndex).out;
if (againIndex !== nextIndex) {
  console.error('build-fallbacks: NOT IDEMPOTENT (index.html) — a second run produced different output. This is a bug in the generator.');
  process.exit(1);
}
for (const [path, next, fn] of hubResults) {
  const again = fn(next, SITE);
  if (again !== next) {
    console.error(`build-fallbacks: NOT IDEMPOTENT (${path.replace(root + '/', '')}) — a second run produced different output. This is a bug in the generator.`);
    process.exit(1);
  }
}
