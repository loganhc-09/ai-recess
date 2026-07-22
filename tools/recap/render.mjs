#!/usr/bin/env node
// Render recap.json into (a) the public teaser page and (b) the member recap for Discord.
// Usage: node render.mjs recap.json
//   writes: <repo>/recess-report/<end-date>/index.html  and  member-recap-<end-date>.md (next to recap.json)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const recapPath = process.argv[2];
if (!recapPath) { console.error('Usage: node render.mjs <recap.json>'); process.exit(1); }
const r = JSON.parse(await readFile(recapPath, 'utf8'));
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const slug = r.week.end;
if (!/^\d{4}-\d{2}-\d{2}$/.test(slug)) { console.error(`Bad week.end "${slug}", expected YYYY-MM-DD`); process.exit(1); }
const nice = (d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
const label = `${nice(r.week.start)} to ${nice(r.week.end)}, ${r.week.end.slice(0, 4)}`;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// public-page fields are LLM output derived from member messages: coerce, gate, and warn on likely leaks
const num = (v) => Number(v) || 0;
const busiest = String(r.stats.busiestChannel ?? '').replace(/^#+/, '');
const freebie = r.goodyBag.find((g) => g.freebie && /^https?:\/\//i.test(g.url));
const locked = r.goodyBag.filter((g) => g !== freebie);
for (const w of r.wavetops) {
  const pub = `${w.headline} ${w.teaser}`;
  if (/https?:\/\/|@\w|discord\.com/i.test(pub)) console.warn(`⚠ possible leak in public wavetop text: "${pub.slice(0, 90)}..."`);
}
const desc = `What the AI Recess Discord talked about the week of ${nice(r.week.end)}: ${r.wavetops.slice(0, 2).map((w) => w.headline).join('; ')}.`.slice(0, 158);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-8CQ7JES2VT"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-8CQ7JES2VT');
  </script>
  <title>This Week at AI Recess: ${esc(label)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="https://joinairecess.com/recess-report/${slug}/">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta property="og:title" content="This Week at AI Recess: ${esc(label)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="https://joinairecess.com/og-image.png">
  <meta property="og:url" content="https://joinairecess.com/recess-report/${slug}/">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="AI Recess">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="This Week at AI Recess: ${esc(label)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="https://joinairecess.com/og-image.png">
  <script type="application/ld+json">
  ${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: `This Week at AI Recess: ${label}`, description: desc,
    datePublished: r.week.end, url: `https://joinairecess.com/recess-report/${slug}/`,
    publisher: { '@type': 'Organization', name: 'AI Recess', url: 'https://joinairecess.com' },
  }).replace(/</g, '\\u003c')}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Caveat:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root { --bg:#1c1e21; --bg-warm:#222529; --surface:#2a2d32; --surface-hover:#33373d; --chalk:#f0ebe3; --chalk-dim:#d8d2c9; --accent:#e8734a; --accent-glow:#f4945f; --yellow:#f2d06b; --green:#7ec88b; --blue:#6ba3c7; --font-display:'Instrument Serif',Georgia,serif; --font-body:'DM Sans',-apple-system,sans-serif; --font-hand:'Caveat',cursive; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:var(--bg); color:var(--chalk); font-family:var(--font-body); line-height:1.6; -webkit-font-smoothing:antialiased; }
    a { color:var(--blue); }
    .nav { display:flex; justify-content:space-between; align-items:center; max-width:1040px; margin:0 auto; padding:1.25rem 1.5rem; position:relative; }
    .nav-logo { font-family:var(--font-display); font-size:1.4rem; color:var(--chalk); text-decoration:none; }
    .nav-logo em { color:var(--accent); font-style:italic; }
    .nav-links { display:flex; gap:1.5rem; align-items:center; list-style:none; }
    .nav-links a { color:var(--chalk-dim); text-decoration:none; font-size:0.95rem; }
    .nav-links a:hover { color:var(--chalk); }
    .nav-cta { background:var(--accent); color:#fff !important; padding:0.45rem 1.1rem; border-radius:999px; font-weight:600; }
    .nav-toggle { display:none; background:none; border:none; cursor:pointer; flex-direction:column; gap:5px; padding:6px; }
    .nav-toggle span { width:22px; height:2px; background:var(--chalk); display:block; }
    @media (max-width:640px) {
      .nav-toggle { display:flex; }
      .nav-links { display:none; position:absolute; top:100%; right:1.5rem; background:var(--surface); border-radius:12px; padding:1rem 1.5rem; flex-direction:column; gap:0.9rem; z-index:10; }
      .nav-links.open { display:flex; }
    }
    main { max-width:760px; margin:0 auto; padding:2.5rem 1.5rem 5rem; }
    .kicker { font-family:var(--font-hand); font-size:1.5rem; color:var(--yellow); }
    h1 { font-family:var(--font-display); font-size:clamp(2.1rem,6vw,3.2rem); line-height:1.1; margin:0.3rem 0 1rem; }
    h1 em { color:var(--accent); font-style:italic; }
    .anchor { color:var(--chalk-dim); font-size:1.05rem; max-width:640px; }
    .anchor strong { color:var(--chalk); font-weight:500; }
    .stats { display:flex; gap:0.75rem; flex-wrap:wrap; margin:1.75rem 0 2.5rem; }
    .stat { background:var(--surface); border-radius:12px; padding:0.6rem 1rem; font-size:0.9rem; color:var(--chalk-dim); }
    .stat b { color:var(--chalk); font-weight:600; }
    h2 { font-family:var(--font-display); font-size:1.7rem; margin:2.75rem 0 1rem; }
    h2 em { font-style:italic; }
    .wavetop { background:var(--surface); border-radius:14px; padding:1.25rem 1.4rem; margin-bottom:1rem; }
    .wavetop h3 { font-size:1.1rem; font-weight:600; margin-bottom:0.35rem; }
    .wavetop p { color:var(--chalk-dim); font-size:0.95rem; margin-bottom:0.6rem; }
    .redacted { display:inline-block; position:relative; color:transparent; user-select:none; border-radius:3px; padding:0 0.4rem; background:repeating-linear-gradient(-3deg, var(--chalk-dim) 0 2px, transparent 2px 4px, var(--chalk-dim) 4px 7px, transparent 7px 9px); opacity:0.55; transform:rotate(-0.4deg); }
    .lock-note { font-family:var(--font-hand); font-size:1.15rem; color:var(--yellow); }
    .lock-note a { color:var(--yellow); }
    .goody { list-style:none; }
    .goody li { display:flex; align-items:baseline; gap:0.6rem; padding:0.55rem 0; border-bottom:1px dashed rgba(240,235,227,0.15); font-size:0.95rem; }
    .goody .n { color:var(--green); font-family:var(--font-hand); font-size:1.2rem; min-width:1.4rem; }
    .freebie { background:var(--surface); border:1px solid var(--green); border-radius:14px; padding:1.1rem 1.3rem; margin:1.2rem 0; }
    .freebie .tag { font-family:var(--font-hand); color:var(--green); font-size:1.25rem; }
    .freebie a { color:var(--chalk); font-weight:600; }
    .freebie p { color:var(--chalk-dim); font-size:0.92rem; margin-top:0.25rem; }
    .join-block { text-align:center; background:var(--bg-warm); border-radius:18px; padding:2.5rem 1.5rem; margin-top:3.5rem; }
    .join-block h2 { margin-top:0; }
    .join-block p { color:var(--chalk-dim); max-width:460px; margin:0 auto 1.4rem; }
    .cta-btn { display:inline-block; background:var(--accent); color:#fff; text-decoration:none; font-weight:600; padding:0.85rem 2rem; border-radius:999px; font-size:1.05rem; }
    .cta-btn:hover { background:var(--accent-glow); }
    .site-footer { text-align:center; padding:2.5rem 1.5rem; }
    .site-footer a { color:var(--chalk-dim); text-decoration:none; font-size:0.9rem; }
  </style>
</head>
<body>
  <nav class="nav">
    <a class="nav-logo" href="/">AI <em>Recess</em></a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Toggle menu" aria-expanded="false"><span></span><span></span><span></span></button>
    <ul class="nav-links" id="nav-links">
      <li><a href="/">Home</a></li>
      <li><a href="/recess-report/">Past weeks</a></li>
      <li><a href="#join" class="nav-cta join-cta">I'm in</a></li>
    </ul>
  </nav>
  <main>
    <p class="kicker">the recess report</p>
    <h1>This week at <em>AI Recess</em></h1>
    <p class="anchor"><strong>AI Recess is a $20/month Discord where three AI creators share how they actually use AI.</strong> This is what the community talked about from ${esc(label)}. Members got all of it. Here are the wavetops.</p>
    <div class="stats">
      <span class="stat"><b>${num(r.stats.messages)}</b> messages</span>
      <span class="stat"><b>${num(r.stats.activeMembers)}</b> members talking</span>
      <span class="stat"><b>${num(r.stats.linksShared)}</b> links shared</span>
      <span class="stat">busiest: <b>#${esc(busiest)}</b></span>
    </div>
    <h2>What we <em>talked about</em></h2>
    ${r.wavetops.map((w) => `<div class="wavetop">
      <h3>${esc(w.headline)}</h3>
      <p>${esc(w.teaser)}</p>
      <p>The takeaways: <span class="redacted">redacted redacted redacted redacted redacted</span></p>
      <span class="lock-note">🔒 the full breakdown is in the Discord</span>
    </div>`).join('\n    ')}
    <h2>The <em>goody bag</em></h2>
    ${freebie ? `<div class="freebie">
      <span class="tag">this one's free, on us</span><br>
      <a href="${esc(freebie.url)}" rel="noopener">${esc(freebie.title)}</a>
      <p>${esc(freebie.note)}</p>
    </div>` : ''}
    <ul class="goody">
      ${locked.map((g, i) => `<li><span class="n">${i + 1}.</span> <span class="redacted">redacted resource link here</span> <span class="lock-note">🔒</span></li>`).join('\n      ')}
    </ul>
    <p class="lock-note" style="margin-top:0.9rem">${locked.length} more ${locked.length === 1 ? 'resource' : 'resources'} dropped this week. Members already have them.</p>
    <div class="join-block" id="join">
      <h2>Want next week's <em>in full?</em></h2>
      <p>Everything scribbled out above is sitting in the Discord right now. $20 a month, cancel whenever, recess never ends.</p>
      <a class="cta-btn join-cta" href="#join">I'm in</a>
    </div>
  </main>
  <footer class="site-footer"><a href="/">← back to joinairecess.com</a></footer>
  <script src="/recess.js"></script>
  <script>
    var JOIN_URL = "https://www.launchpass.com/ai-recess/monthly";
    document.querySelectorAll('.join-cta').forEach(function (a) { a.setAttribute('href', JOIN_URL); });
    var t = document.getElementById('nav-toggle'), l = document.getElementById('nav-links');
    t.addEventListener('click', function () { l.classList.toggle('open'); t.setAttribute('aria-expanded', l.classList.contains('open')); });
  </script>
</body>
</html>
`;

const md = [
  `# 📋 The Recess Report: ${label}`,
  ``,
  `${r.stats.messages} messages, ${r.stats.activeMembers} of you talking, ${r.stats.linksShared} links dropped. Busiest room: #${busiest}. Here is everything worth keeping from this week.`,
  ``,
  `## The wavetops`,
  ...r.wavetops.flatMap((w) => [``, `**${w.headline}**`, w.memberDetail]),
  ``,
  `## Goody bag`,
  ...r.goodyBag.map((g, i) => `${i + 1}. **${g.title}** — ${g.url}${g.note ? `\n   ${g.note}` : ''}`),
  ``,
  `The public teaser for this week is live at https://joinairecess.com/recess-report/${slug}/ — share it with someone who should be in here.`,
].join('\n');

const pageDir = join(repo, 'recess-report', slug);
await mkdir(pageDir, { recursive: true });
await writeFile(join(pageDir, 'index.html'), html);
await writeFile(join(dirname(resolve(recapPath)), `member-recap-${slug}.md`), md);
console.log(`✓ teaser  → recess-report/${slug}/index.html`);
console.log(`✓ member  → member-recap-${slug}.md`);

// refresh the homepage "Last week at recess" strip between its markers
const homePath = join(repo, 'index.html');
const home = await readFile(homePath, 'utf8');
const START = '<!-- RECESS-REPORT:START auto-updated by tools/recap/render.mjs, do not edit by hand -->';
const END = '<!-- RECESS-REPORT:END -->';
const a = home.indexOf(START), b = home.indexOf(END);
if (a < 0 || b < 0) {
  console.warn('⚠ homepage strip markers not found; index.html NOT updated');
} else {
  const strip = `${START}
      <ul class="rs-list">
        ${r.wavetops.slice(0, 3).map((w) => `<li>${esc(w.headline)}</li>`).join('\n        ')}
      </ul>
      <p class="rs-links">
        <a href="/recess-report/${slug}/" class="cta-btn-sm">Read the recap</a>
        <a href="/recess-report/" class="rs-all">every issue →</a>
      </p>
      ${END}`;
  await writeFile(homePath, home.slice(0, a) + strip + home.slice(b + END.length));
  console.log('✓ homepage strip updated');
}
console.log(`Reminder: add /recess-report/${slug}/ to sitemap.xml before pushing.`);
