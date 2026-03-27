# AI Recess

Landing page and waitlist for AI Recess, a weekly AI community by three TikTok creators (Logan, Kevin, Vanessa). Live session Fridays at 4pm ET + async community on Skool.

## Tech Stack

- Static HTML/CSS/JS (single `index.html`, no build tools)
- GitHub Pages (auto-deploys from `main`)
- Supabase for waitlist storage (project ref: `mbgwdivgxbphktvanusd`)
- Domain: `joinairecess.com`
- Google Analytics: `G-TSXP27S2PH`

## Deploy

Push to `main`. That's it. GitHub Pages auto-deploys.

## Architecture

Single-page site with two logical sections controlled by `SITE_PHASE` variable (top of `<script>` block in `index.html`):

- **Waitlist gate** (`#waitlist-gate`): Email + phone collection form, Supabase POST
- **Full site** (`#full-site`): Marketing page with hero, anti-pitch, features, creator bios, CTA

## Phase Plan

All phase changes are a single variable swap in `index.html:1001` (`SITE_PHASE`), plus CTA link updates for Phase 3.

| Phase | Dates | `SITE_PHASE` | Behavior |
|-------|-------|-------------|----------|
| 1 | Now through March 15 | `1` | Waitlist only. Inline "you're on the list" confirmation. |
| 2 | March 16-20 | `2` | Waitlist gate, then full site revealed after submit. |
| 3 | March 20+ (after first session) | `3` | No waitlist. Full site with Stripe payment link + Skool portal. |

**Phase 3 TODO:** Replace `href="#"` on `.cta-btn` (`index.html`) with Stripe payment link. Add Skool community link.

## Conventions

- Commit style: conventional commits (`feat:`, `fix:`, `chore:`)
- No em dashes in copy. Use commas, periods, or restructure.
- Never say "vibe coding." Use "AI engineering" or "builds/ships."
- Remote is SSH: `git@github.com:loganhc-09/ai-recess.git`

## Supabase

- Publishable key is in `index.html` (client-side, safe to expose)
- Waitlist table: `id`, `email`, `phone`, `created_at`
- RLS enabled with anonymous insert policy

## Design

- Dark chalkboard aesthetic (`--bg: #1a1815`)
- Fonts: Instrument Serif (display), DM Sans (body), Caveat (handwritten)
- Accent palette: orange `#e8734a`, yellow `#f2d06b`, green `#7ec88b`, blue `#6ba3c7`
- Grain texture overlay via inline SVG filter
