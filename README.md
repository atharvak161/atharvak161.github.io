# atharvaxsecurity.com

Personal security portfolio. Single-page static site, no build step, no
framework, no runtime dependencies. Served by GitHub Pages from `main` at
[atharvaxsecurity.com](https://atharvaxsecurity.com).

```
.
├── index.html                     the markup; the SSOT arrays live in assets/js/site.js
├── CNAME                          custom domain for GitHub Pages
├── robots.txt                     → sitemap.xml
├── assets/css/site.css           all styles for the home page
├── assets/js/site.js             all behaviour + the SITE.* arrays
├── badges/ certifications/ projects/   hub pages, generated from the SSOT
├── sitemap.xml                    11 URLs: home + 4 hub pages + 6 writeups
├── thumbnail.jpg                  og:image — DO NOT MOVE (see below)
├── Atharva_Kulkarni_Resume.pdf    linked from the CV section — DO NOT MOVE
│
├── assets/
│   ├── badges/thm/                all TryHackMe badge art (15 WebP badge images)
│   │                              exam badges + league and room badges
│   ├── certs/                     every certificate PDF, self-hosted
│   │   ├── CEH-V12-Certificate.pdf
│   │   ├── TryHackMe-SEC0-Certificate.pdf
│   │   └── TryHackMe-SEC1-Certificate.pdf
│   └── vendor/                    GSAP + ScrambleTextPlugin, vendored
│                                  deliberately — no CDN dependency
├── writeups/                      6 standalone CTF writeups
├── tools/check-consistency.mjs    invariant checker (see below)
└── .githooks/pre-commit           runs the checker before every commit
```

## Architecture

### Delivery

```
   your machine                GitHub                    the internet
  ┌──────────────┐         ┌──────────────┐          ┌────────────────┐
  │ edit         │         │ repo: main   │          │ Fastly CDN     │
  │ index.html   │ push ──▶│              │ ──build─▶│ (GitHub Pages) │
  │              │         │ pages-build- │          │                │
  │ pre-commit ✓ │         │ deployment   │          │ TLS: Let's     │
  └──────────────┘         └──────────────┘          │ Encrypt, auto  │
         │                                            └───────┬────────┘
         │ blocked if the                                     │
         │ checker fails                                      ▼
         ▼                                        atharvaxsecurity.com
  tools/check-consistency.mjs                     (CNAME + 4 A records
                                                   at GoDaddy, DNSSEC on)
```

No build step. The repository *is* the artifact — what is committed is what is
served, byte for byte. There is no bundler, no transpiler, no `node_modules`,
and no CI beyond the Pages deploy itself. `tools/check-consistency.mjs` runs
locally as a pre-commit gate, never in the cloud.

### Runtime

Eleven HTML documents. The home page links `assets/css/site.css` and
`assets/js/site.js`; the four hub pages and six writeups still carry their own
inline `<style>`. GSAP and the fonts are vendored locally. The only thing
fetched from a third party at runtime is the analytics beacon, and only on the
home page.

```
index.html
│
├── <head>            static meta, later overwritten by renderIdentity()
│                     static JSON-LD, later overwritten by renderJsonLd()
│
├── <body>            static markup for every section
│                     ├── hero            hand-written, badge strip included
│                     ├── #certifications static cards ← overwritten
│                     ├── #badges         static cards ← overwritten
│                     └── everything else static, never re-rendered
│
├── <script> SSOT     window.SITE = { identity, certs, badges }
│                     renderAll() inline at parse time:
│                       renderCerts()    → #certifications .certs-grid
│                       renderBadges()   → #badges .badges-grid
│                       renderIdentity() → <title>, meta, OG, Twitter
│                       renderJsonLd()   → structured data
│
└── <script> terminal buildCertsTxt()  reads the RENDERED DOM
                      buildBadgesTxt() reads the RENDERED DOM
                      → so the terminal follows the SSOT for free
```

### Why it is shaped this way

**Static markup first, rendered markup second.** Every SSOT-driven section
ships real HTML in the file and is replaced on load. That costs duplication —
the fallbacks must be kept in sync by hand — and buys a site that still works
with JavaScript disabled, and structured data that a non-executing crawler can
still read. The consistency checker exists to catch the drift this design
invites.

**The terminal reads the SSOT.** `cat certs.txt` reads `SITE.certs` rather than
the rendered cards, so it lists everything - the home page shows only the
featured subset, and a file listing that silently hid items would be a lie.

**Dependencies are vendored, not fetched.** GSAP sits in `assets/vendor/`
rather than loading from a CDN, so an outage or a compromised CDN cannot take
the page down or inject into it. Certificates are self-hosted in
`assets/certs/` for the same reason — a credential should not disappear because
an issuer reorganised their asset paths.

**Split into three files, not bundled.** `index.html` carries the markup and
the SSOT arrays; CSS and JS live under `assets/`. There is still no bundler and
no transpiler, so what is committed is what is served. `tools/build-fallbacks.mjs`
generates markup into the files, but it is run locally and its output is
committed and reviewable.

### Known limits of this stack

GitHub Pages serves the site with no configurable response headers. CSP is
delivered by `<meta>` instead, which works for `script-src` and friends but NOT
for `frame-ancestors` or `report-uri` - those are ignored in meta form, so the
site has no framing defence and no violation telemetry without a proxy. HSTS
and X-Frame-Options cannot be set at all. It also offers no redirects, so moving an
asset path breaks anyone holding cached HTML until `max-age=600` expires. Both
are accepted trade-offs for zero-config hosting, not oversights.

## The one thing to understand: the SSOT

Certifications, badges and identity strings are each declared **once**, in
`window.SITE`, at the top of `assets/js/site.js`. Every surface renders from it:

```
SITE.identity  →  <title>, meta description, OG/Twitter tags, hero roles
SITE.certs     →  #certifications cards  +  JSON-LD hasCredential
                  +  terminal `cat certs.txt`
SITE.badges    →  #badges grid (featured only)  +  /badges/ hub (all)
SITE.projects  →  #projects (featured only)     +  /projects/ hub (all)
SITE.writeups  →  #writeups (featured only)     +  /writeups/ hub (all)
                  +  terminal `cat badges.txt` (all, read from the SSOT)
```

The terminal builders read `SITE` directly, so they list the full set even when
the home page shows a featured subset. Add a cert to `SITE.certs` and the card, the structured data and
the terminal all update together. That is the point — a partial update should be
structurally impossible.

### Three exceptions that are easy to get wrong

**1. The hero badge strip is NOT SSOT-driven.** It is a hand-picked favourites
list in static HTML (`<aside class="hero-badges">`). Editing `SITE.badges` does
not touch it. Edit it directly.

**2. The no-JS fallbacks are GENERATED, never hand-edited.** The renderers overwrite
this markup at runtime, so it only shows for visitors and crawlers without
JavaScript — which means drift here is invisible in a browser:

| Fallback | Mirrors |
|---|---|
| static `.certs-grid` | `SITE.certs` |
| static `.badges-grid` | `SITE.badges` |
| static `<script type="application/ld+json">` | earned entries of `SITE.certs` |

**3. Two root files are load-bearing public URLs.** `thumbnail.jpg` is the
`og:image` cached by LinkedIn, X and Slack, referenced by all 11 pages;
`Atharva_Kulkarni_Resume.pdf` has been linked from job applications. Moving
either into `assets/` would tidy the tree and break live links. They stay at
root on purpose.

`thumbnail.png` (209KB) is a different matter: nothing in the repo references
it any more. This file used to name it as the og:image, which was wrong. Before
moving it, check whether an old shared post still hotlinks it.

## Asset conventions

**All badge art lives in `assets/badges/thm/`.** Every badge on the site is a
TryHackMe badge, so there is no second directory. Exam badges (SEC0, SEC1) sit
alongside the league and room badges rather than one level up.

**All certificates live in `assets/certs/`, self-hosted.** Cert cards link to
these local copies rather than to the issuer's URL. That keeps every credential
under this repo's control and immune to an issuer reorganising their asset
paths. The trade-off is that a self-hosted copy will not reflect a later
reissue — re-download if a certificate is ever replaced.

## Verification

```bash
node tools/check-consistency.mjs     # must print "PASS — all surfaces agree"
```

It cross-checks the SSOT arrays against the static fallbacks, verifies every
local asset path resolves, enforces the skill colour convention
(offensive → red, defensive → blue), and checks that every sub-page's return
link points back at the section that owns it. It runs automatically via
`.githooks/pre-commit`, which is wired up with:

```bash
git config core.hooksPath .githooks
```

That config is per-clone, so **run it again after any fresh clone** or the hook
silently does nothing.

## Return links from sub-pages

Every hub and writeup page links home as `../#<section>`, never `../index.html`:

| Page | Returns to |
|---|---|
| `writeups/*.html` | `../#writeups` |
| `projects/index.html` | `../#projects` |
| `certifications/index.html` | `../#certifications` |
| `badges/index.html` | `../#badges` |

Two reasons, and the asset check catches neither, which is why
`check-consistency.mjs` enforces it separately. A bare `../index.html` is a
valid path that exists on disk, so it passes every existence check while being
the wrong destination: it drops the reader at the top of the home page instead
of the section they came from, and it resolves to `/index.html` rather than the
canonical `/`, splitting analytics across two URLs for one page.

## Linking convention for credentials

| Surface | Links to |
|---|---|
| Certification card | the issuing platform's certificate (TryHackMe PDF) |
| Exam badge | Credly |

Certs without a public certificate URL show their credential ID instead.

## Local preview

```bash
python3 -m http.server 8899 --bind 127.0.0.1   # http://127.0.0.1:8899
# --bind matters: without it the server listens on every interface and serves
# .git/, .gstack/ and _local/ to everyone on your network.
```

No build, no install. What you see locally is what deploys.
