#!/usr/bin/env node
/**
 * Regenerates the no-JS fallback markup in index.html from SITE.badges /
 * SITE.certs — the single source of truth.
 *
 * index.html carries three duplicates of that data for crawlers and no-JS
 * visitors (renderBadges()/renderCerts()/renderJsonLd() overwrite them at
 * runtime for everyone else):
 *   1. the static .badge-card fallback block in #badges
 *   2. the static .cert-card fallback block in #certifications
 *   3. the "hasCredential" array in the JSON-LD <script type="application/ld+json">
 *
 * Adding, removing or reordering a badge/cert must mean editing SITE.badges /
 * SITE.certs and nothing else. Run this after every such edit:
 *
 *   node tools/build-fallbacks.mjs
 *
 * It is idempotent — running it twice in a row produces a byte-identical
 * file the second time. tools/check-consistency.mjs (run by the pre-commit
 * hook) fails the commit if the generated regions have drifted from what
 * this script would produce, so a stale fallback can't ship.
 *
 * Each generated region is delimited by <!-- GENERATED:... --> markers and
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
  hasCredentialArrayText,
  spliceBetweenMarkers,
  spliceHasCredential,
} from './ssot.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = join(root, 'index.html');

function build(html) {
  const SITE = loadSite(html);

  let out = html;

  out = spliceBetweenMarkers(
    out,
    GENERATED_NOTICE.badges,
    GENERATED_NOTICE.badgesEnd,
    badgesGridInner(SITE.badges, SITE.thmShare)
  );

  out = spliceBetweenMarkers(
    out,
    GENERATED_NOTICE.certs,
    GENERATED_NOTICE.certsEnd,
    certsGridInner(SITE.certs)
  );

  out = spliceHasCredential(
    out,
    GENERATED_NOTICE.jsonld,
    GENERATED_NOTICE.jsonldEnd,
    hasCredentialArrayText(SITE.certs)
  );

  return out;
}

const html = readFileSync(indexPath, 'utf8');
const next = build(html);

if (next === html) {
  console.log('build-fallbacks: already up to date, no changes written.');
} else {
  writeFileSync(indexPath, next, 'utf8');
  console.log('build-fallbacks: index.html regenerated from SITE.badges / SITE.certs.');
}

// Idempotency self-check: regenerating the output we just wrote must be a no-op.
const again = build(next);
if (again !== next) {
  console.error('build-fallbacks: NOT IDEMPOTENT — a second run produced different output. This is a bug in the generator.');
  process.exit(1);
}
