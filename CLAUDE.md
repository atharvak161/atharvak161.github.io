# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-file static portfolio site for Atharva Kulkarni (Junior Penetration Tester). Everything — HTML, CSS, and JavaScript — lives in `index.html`. There is no build system, bundler, or package manager.

Deployed at: `https://atharvak161.github.io`

## Development

Open `index.html` directly in a browser, or serve it locally:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

No compilation, no install step.

## Architecture

**All code is in `index.html`** (~1674 lines), structured as:

1. `<head>` — meta tags, Open Graph, favicon (inline SVG), Google Fonts imports
2. `<style>` — all CSS (~600 lines), inline
3. HTML body — sections in order: loader → navbar → mobile menu → terminal overlay → `#hero` → `#about` → `#skills` → `#experience` → `#projects` → `#education` → `#testimonials` → `#cv` → `#contact` → footer
4. `<script>` — all JavaScript (~500 lines), inline

### Theming

CSS custom properties are defined under `:root` (dark, the default) and overridden under `[data-theme="light"]`. The `data-theme` attribute is on `<html>`. Toggle via `toggleTheme()` which also persists to `localStorage`.

### Scroll Reveal

Elements with class `reveal` start invisible (`opacity:0; transform:translateY(30px)`) and gain class `visible` when they enter the viewport via `IntersectionObserver`. Staggered delays use `reveal-delay-1` through `reveal-delay-3`.

### Key JavaScript Functions

| Function | Purpose |
|---|---|
| `toggleTheme()` | Switches dark/light, saves to localStorage |
| `updateProgress()` | Drives the right-edge scroll progress bar |
| `updateActiveNav()` | Highlights the active nav link based on scroll position |
| `openTerminal()` / `closeTerminal()` | Easter-egg terminal overlay (triggered via Konami code or nav) |
| `termPrint(lines)` | Appends output lines to the terminal body |
| `handleFormSubmit()` | Contact form handler (currently logs to console) |
| `printCV()` | Opens the PDF resume in a new tab for printing |
| `scheduleGlitch()` / `runBurst()` | Periodic CSS glitch animation on the hero name |
| Canvas IIFE | Animated hex-grid + node network on `#net-canvas` |

### Canvas Background

The `#net-canvas` (fixed, full-screen, `z-index:0`) draws: a faint hex grid, 120 drifting nodes connected by proximity lines, travelling "packet" dots, and mouse-proximity highlights. Runs at ~60fps via `requestAnimationFrame`.

### Static Assets

- `Atharva_Kulkarni_Resume.pdf` — linked for download in the hero and `#cv` section
- `thumbnail.png` — Open Graph / Twitter card image (1200×627)
