# AI Recess

Live weekly AI community by three TikTok creators (Logan, Kevin, Vanessa). Sessions every Friday at 4pm ET + async community on Skool. Site is live, no waitlist.

## Before You Start

**Always pull the latest before making changes.** Three people push to this repo. Run `git fetch origin main && git pull` at the start of every session. Editing a stale local copy will cause conflicts and lost work.

## Tech Stack

- Static HTML/CSS/JS (`index.html` + `archive.html`, no build tools)
- GitHub Pages (auto-deploys from `main`). Push to `main` to deploy.
- Domain: `joinairecess.com`
- Analytics: custom tracker in `/analytics/tracker.js`
- `images/`: Creator photos, TikTok video thumbnails
- `videos/`: Session teaser clips (served directly from repo)
- All CTAs point to Skool: `https://www.skool.com/ai-recess`

## Critical: Never Remove or Overwrite

These have been accidentally removed in past commits. Verify after any `<head>` or page structure edit.

### SEO/AEO head elements (both pages)
Every page must have ALL of these. Do not "clean rewrite" the head:
- `<link rel="icon">`, `<link rel="canonical">`, `<meta name="description">` (150-160 chars)
- OG tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`
- Twitter tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- `<html lang="en">` on the opening tag

### Heading hierarchy
- Exactly ONE `<h1>` per page. Homepage H1 must contain "AI Recess".
- Section headings use `<h2>`. Do not skip levels or add a second H1.

### Schema / JSON-LD
Homepage `@graph`: **WebSite**, **Organization** (with founder Person array + sameAs links), **Event** (recurring Friday, $30 Offer). Archive: **CollectionPage**. If founder details change, update BOTH visible HTML and JSON-LD.

### AEO anchor content
Hero subtitle starts with "AI Recess is a weekly live community where..." This is the AEO anchor, designed to be quoted by AI search engines. Keep it declarative and factual. Do not rewrite into hype copy.

### Mobile nav
Hamburger toggle (`.nav-toggle`) for screens under 640px on EVERY page. Without it, nav links disappear on mobile. Archive page must always have a "Home" link back to `/`.

### New page checklist
- [ ] `<html lang="en">`, meta description, canonical, favicon
- [ ] Full OG + Twitter Card tags, JSON-LD schema
- [ ] Single `<h1>` with keyword, alt text on every `<img>`
- [ ] Mobile nav with hamburger toggle, entry in `sitemap.xml`

## Conventions

- Commit style: conventional commits (`feat:`, `fix:`, `chore:`)
- No em dashes in copy. Use commas, periods, or restructure.
- Never say "vibe coding." Use "AI engineering" or "builds/ships."
- Remote is SSH: `git@github.com:loganhc-09/ai-recess.git`
- Logan uses she/her pronouns.

## Design

- Playground blacktop aesthetic (`--bg: #1c1e21`, cool gray asphalt)
- Weathered court line overlay (four square, hopscotch, parking, basketball, tetherball) via inline SVG with displacement filters
- Fonts: Instrument Serif (display), DM Sans (body), Caveat (handwritten)
- Accent palette: orange `#e8734a`, yellow `#f2d06b`, green `#7ec88b`, blue `#6ba3c7`
- Creator photos: circular avatars with colored borders
- TikTok embeds: click-to-play with video thumbnails, loads `/player/v1/` iframe
- Session clips: native `<video>` with poster thumbnails, `preload="none"`

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
