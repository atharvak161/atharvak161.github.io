# atharvaxsecurity.com

Personal security portfolio. Single-page static site, no build step, no
framework, no runtime dependencies. Served by GitHub Pages from `main` at
[atharvaxsecurity.com](https://atharvaxsecurity.com).

```
.
├── index.html                     the whole site — markup, CSS, JS, SSOT
├── CNAME                          custom domain for GitHub Pages
├── robots.txt                     → sitemap.xml
├── sitemap.xml                    6 URLs: home + 5 writeups
├── thumbnail.png                  og:image — DO NOT MOVE (see below)
├── Atharva_Kulkarni_Resume.pdf    linked from the CV section — DO NOT MOVE
├── resume-archive/                superseded CVs, one dated folder each
│
├── assets/
│   ├── badges/thm/                all TryHackMe badge art (10 PNGs)
│   │                              exam badges + league and room badges
│   ├── certs/                     every certificate PDF, self-hosted
│   │   ├── CEH-V12-Certificate.pdf
│   │   ├── TryHackMe-SEC0-Certificate.pdf
│   │   └── TryHackMe-SEC1-Certificate.pdf
│   ├── img/atharva.jpg
│   └── vendor/                    GSAP + ScrambleTextPlugin, vendored
│                                  deliberately — no CDN dependency
├── writeups/                      5 standalone CTF writeups
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

One HTML document. All CSS in one `<style>`, all JavaScript in two inline
`<script>` blocks, GSAP vendored locally. Nothing is fetched at runtime except
Google Fonts and a single analytics beacon.

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
│                     renderAll() on DOMContentLoaded:
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

**The terminal reads the DOM, not the data.** `cat certs.txt` queries
`#certifications .cert-card` rather than `SITE.certs`. One less place to update,
and it can never disagree with what the visitor sees.

**Dependencies are vendored, not fetched.** GSAP sits in `assets/vendor/`
rather than loading from a CDN, so an outage or a compromised CDN cannot take
the page down or inject into it. Certificates are self-hosted in
`assets/certs/` for the same reason — a credential should not disappear because
an issuer reorganised their asset paths.

**The single-file constraint is deliberate.** At roughly 170 KB it is past the
point most people would split into modules. Splitting would mean a build step,
and a build step means the deployed output is no longer the reviewed source.
The trade is made knowingly: harder to navigate, impossible to mis-deploy.

### Known limits of this stack

GitHub Pages serves the site with no configurable response headers, so there is
no Content-Security-Policy, HSTS or X-Frame-Options, and no way to add them
without putting a proxy in front. It also offers no redirects, so moving an
asset path breaks anyone holding cached HTML until `max-age=600` expires. Both
are accepted trade-offs for zero-config hosting, not oversights.

## The one thing to understand: the SSOT

Certifications, badges and identity strings are each declared **once**, in
`window.SITE` near the bottom of `index.html`. Every surface renders from it:

```
SITE.identity  →  <title>, meta description, OG/Twitter tags, hero roles
SITE.certs     →  #certifications cards  +  JSON-LD hasCredential
                  +  terminal `cat certs.txt`
SITE.badges    →  #badges grid  +  terminal `cat badges.txt`
```

The terminal builders read the **rendered DOM**, not the arrays, so they follow
automatically. Add a cert to `SITE.certs` and the card, the structured data and
the terminal all update together. That is the point — a partial update should be
structurally impossible.

### Three exceptions that are easy to get wrong

**1. The hero badge strip is NOT SSOT-driven.** It is a hand-picked favourites
list in static HTML (`<aside class="hero-badges">`). Editing `SITE.badges` does
not touch it. Edit it directly.

**2. Three no-JS fallbacks must be mirrored by hand.** The renderers overwrite
this markup at runtime, so it only shows for visitors and crawlers without
JavaScript — which means drift here is invisible in a browser:

| Fallback | Mirrors |
|---|---|
| static `.certs-grid` | `SITE.certs` |
| static `.badges-grid` | `SITE.badges` |
| static `<script type="application/ld+json">` | earned entries of `SITE.certs` |

**3. Two root files are load-bearing public URLs.** `thumbnail.png` is the
`og:image` already cached by LinkedIn, X and Slack; `Atharva_Kulkarni_Resume.pdf`
has been linked from job applications. Moving either into `assets/` would tidy
the tree and break live links. They stay at root on purpose.

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
local asset path resolves, and enforces the skill colour convention
(offensive → blue, defensive → red). It runs automatically via
`.githooks/pre-commit`, which is wired up with:

```bash
git config core.hooksPath .githooks
```

That config is per-clone, so **run it again after any fresh clone** or the hook
silently does nothing.

## Linking convention for credentials

| Surface | Links to |
|---|---|
| Certification card | the issuing platform's certificate (TryHackMe PDF) |
| Exam badge | Credly |

Certs without a public certificate URL show their credential ID instead.

## Local preview

```bash
python3 -m http.server 8899   # then open http://127.0.0.1:8899
```

No build, no install. What you see locally is what deploys.
