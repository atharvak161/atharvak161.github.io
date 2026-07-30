# atharvak161.github.io — portfolio site

Single-page site. Everything lives in `index.html` (markup + CSS + JS inline).
This is a **live public site**. Nothing is pushed without a verified diff.

## Run the checker before handing back any change

```bash
node tools/check-consistency.mjs   # exit 0 = surfaces agree, exit 1 = drift
```

Wired as a pre-commit hook. It is not optional and it is not advisory.

## The trap this repo sets: facts are duplicated across surfaces

The same fact is hand-maintained in several places. Changing one and missing the
others is the recurring defect here — it has happened more than once. Before you
call any content change done, check **every** row that applies:

| Fact type | Surfaces that must all agree |
|---|---|
| **Certification** | Hero badge strip · `#certifications` cards · Skills "Certifications & Programming" tags · JSON-LD `hasCredential` |
| **Project** | `#projects` cards · README · terminal `projects` command (reads DOM live — no action needed) |
| **Role / title** | `<title>` · `meta description` · `og:` + `twitter:` tags · JSON-LD `jobTitle` · hero typewriter `roles[]` |
| **Skill** | Skills section tags · JSON-LD `knowsAbout` |

`#certifications` is the **source of truth** for credentials. In-progress items belong
in `#learning`, not in the skills tags — the skills card lists *earned* credentials only.

## Colour semantics — do not break

Skill category colour binds to **meaning via `data-team`**, never to DOM position.

- `data-team="red"` → offensive. **Red team = offence.**
- `data-team="blue"` → defensive. **Blue team = defence.**
- `data-team="green"` → tooling · `data-team="amber"` → certs/programming

`.skill-category:nth-child(n)` colour rules are banned — they caused a live bug where
Offensive Security rendered blue and Defensive rendered red. The checker fails on their
return. Every `--accentN` must have an `--accentN-rgb` twin in **both** theme blocks or
`rgba(var(--cat-rgb), α)` tints silently break.

Known Chrome quirk: custom properties used as arguments to `rgba()` don't invalidate on
live theme toggle, so tag tints keep the previous theme's RGB until reload. Cosmetic at
5–25% alpha; correct on load. `color-mix` has the same quirk — don't "fix" it by switching.

## Known debt

Credentials are still duplicated across four surfaces by hand. The checker catches drift
*after* it happens; the real fix is one data array rendered into all four so drift is
impossible. Not yet done.

## Agent rules

Build and smoke-test locally. Run the checker. Hand the diff back — **do not commit, push,
or touch the remote.** If a command hits a permission gate, stop and surface it.
