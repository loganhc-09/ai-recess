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

## Critical: Never Remove or Overwrite

These elements have been accidentally removed in past commits. Always verify they exist after any edit to `<head>` or page structure.

### SEO/AEO head elements (both pages)

Every page must have ALL of these in `<head>`. Do not do a "clean rewrite" of the head that drops any of them:

- `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`
- `<link rel="canonical" href="...">` (trailing slash on homepage, full path on subpages)
- `<meta name="description" content="...">` (150-160 chars with value prop)
- `<meta property="og:title">`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`
- `<meta name="twitter:card">`, `twitter:title`, `twitter:description`, `twitter:image`
- `<html lang="en">` on the opening tag

### Heading hierarchy

- Each page has exactly ONE `<h1>`. The homepage H1 must contain "AI Recess" as the primary keyword.
- Section headings use `<h2>`. Do not skip levels or add a second H1.

### Schema / JSON-LD

The homepage has a `<script type="application/ld+json">` block with an `@graph` array containing:

- **WebSite**: name, url, description
- **Organization**: name, url, logo, sameAs (TikTok profiles + Skool), founder array
- **Event**: recurring Friday schedule, VirtualLocation, Offer with $15 price

The archive page has a **CollectionPage** schema.

If founder details change (name, handle, title), update BOTH the visible HTML and the JSON-LD Person entries. They must stay in sync.

### AEO anchor content

The hero subtitle paragraph is the AEO (Answer Engine Optimization) anchor. It starts with "AI Recess is a weekly live community where..." and is a declarative, factual definition of what AI Recess is. This paragraph:

- Must remain near the top of the page (within or immediately after the H1)
- Must be plain, factual language (not hype copy, not a tagline)
- Is designed to be quoted verbatim by AI search engines answering "What is AI Recess?"
- Do not rewrite it into marketing fluff. If it needs updating, keep the declarative "AI Recess is..." structure.

### Mobile nav

Hamburger menu toggle (`.nav-toggle`) for screens under 640px. Without it, all nav links disappear on mobile and users get trapped on subpages. The hamburger button, toggle JS, and mobile CSS must be present on EVERY page.

### When adding new pages

Any new HTML page added to this repo must include:

- [ ] `<html lang="en">`
- [ ] `<meta name="description">` (unique, 150-160 chars)
- [ ] `<link rel="canonical" href="https://joinairecess.com/[path]">`
- [ ] `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`
- [ ] Full OG tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`
- [ ] Full Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- [ ] JSON-LD schema appropriate to the page type
- [ ] Single `<h1>` with primary keyword
- [ ] Alt text on every `<img>`
- [ ] Mobile nav with hamburger toggle (copy from index.html)
- [ ] Entry in `sitemap.xml`

## Conventions

- Commit style: conventional commits (`feat:`, `fix:`, `chore:`)
- No em dashes in copy. Use commas, periods, or restructure.
- Never say "vibe coding." Use "AI engineering" or "builds/ships."
- Remote is SSH: `git@github.com:loganhc-09/ai-recess.git`
- Logan uses she/her pronouns.

## Design

- Playground blacktop aesthetic (`--bg: #1c1e21`, cool gray asphalt)
- Weathered court line overlay (four square, hopscotch, parking lines, basketball arc, tetherball circle) via inline SVG with displacement filters
- Fonts: Instrument Serif (display), DM Sans (body), Caveat (handwritten)
- Accent palette: orange `#e8734a`, yellow `#f2d06b`, green `#7ec88b`, blue `#6ba3c7`
- Creator photos are circular avatars with colored borders matching their accent color
- TikTok embeds use click-to-play (video thumbnail poster + play button, loads `/player/v1/` iframe on click)
- Session clips use native `<video>` with poster thumbnails and `preload="none"`

## Nav Pattern

Both `index.html` and `archive.html` share the same nav pattern:
- Fixed top bar with blur backdrop
- Hamburger toggle on mobile (under 640px) that opens a dropdown menu
- The hamburger button, toggle JS, and mobile CSS must be present on EVERY page
- Archive page must always have a "Home" link back to `/`
