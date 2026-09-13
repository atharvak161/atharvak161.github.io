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
