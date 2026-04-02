# AI Recess

Live weekly AI community by three TikTok creators (Logan, Kevin, Vanessa). Sessions every Friday at 4pm ET + async community on Skool. Site is live, no waitlist.

## Before You Start

**Always pull the latest before making changes.** Three people push to this repo. Run `git fetch origin main && git pull` at the start of every session. Editing a stale local copy will cause conflicts and lost work.

## Tech Stack

- Static HTML/CSS/JS (`index.html` + `archive.html`, no build tools)
- GitHub Pages (auto-deploys from `main`)
- Domain: `joinairecess.com`
- Analytics: custom tracker in `/analytics/tracker.js`

## Deploy

Push to `main`. GitHub Pages auto-deploys.

## Architecture

- `index.html`: Main landing page with nav, hero, session recap, goody bags, anti-pitch, creator bios, TikTok embeds, CTA
- `archive.html`: Past session goody bags archive
- `images/`: Creator headshot photos (logan.jpg, kevin.jpg, vanessa.jpg)
- All CTAs point to Skool: `https://www.skool.com/ai-recess`

## Critical: Do Not Remove

These elements have been accidentally removed in past commits. Always verify they exist:

- **Favicon**: `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` in `<head>`
- **OG image tags**: `og:image`, `twitter:card`, `twitter:image` meta tags in `<head>` (required for link previews)
- **Mobile nav**: Hamburger menu toggle (`.nav-toggle`) for screens under 640px. Without it, all nav links disappear on mobile and users get trapped on subpages.

## Conventions

- Commit style: conventional commits (`feat:`, `fix:`, `chore:`)
- No em dashes in copy. Use commas, periods, or restructure.
- Never say "vibe coding." Use "AI engineering" or "builds/ships."
- Remote is SSH: `git@github.com:loganhc-09/ai-recess.git`
- Logan uses she/her pronouns.

## Design

- Dark chalkboard aesthetic (`--bg: #1a1815`)
- Fonts: Instrument Serif (display), DM Sans (body), Caveat (handwritten)
- Accent palette: orange `#e8734a`, yellow `#f2d06b`, green `#7ec88b`, blue `#6ba3c7`
- Grain texture overlay via inline SVG filter
- Creator photos are circular avatars with colored borders matching their accent color
- TikTok embeds use click-to-play (blurred poster + play button, loads iframe on click)

## Nav Pattern

Both `index.html` and `archive.html` share the same nav pattern:
- Fixed top bar with blur backdrop
- Hamburger toggle on mobile (under 640px) that opens a dropdown menu
- The hamburger button, toggle JS, and mobile CSS must be present on EVERY page
- Archive page must always have a "Home" link back to `/`
