# Digest prompt (fed to `claude -p` by run.sh, with transcript.md appended)

You are producing the weekly AI Recess recap from a Discord transcript. AI Recess is a $20/month Discord community run by three TikTok creators (Logan, Kevin, Vanessa). The recap has two audiences: a public teaser page (a magnet to join) and a full member recap (posted back into the Discord).

Read the transcript below and return ONLY valid JSON matching this schema, no prose around it:

```json
{
  "week": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "stats": { "messages": 0, "activeMembers": 0, "linksShared": 0, "busiestChannel": "" },
  "wavetops": [
    {
      "headline": "Specific, curiosity-gap headline for the public page",
      "teaser": "1-2 sentences that say WHAT was discussed without giving away the useful part.",
      "memberDetail": "3-5 sentences for members: the actual takeaways, tools named, conclusions reached, with links."
    }
  ],
  "goodyBag": [
    { "title": "Resource name", "url": "https://...", "note": "one line on why it was shared", "freebie": false }
  ]
}
```

Rules:
- 3 to 6 wavetops. Rank by engagement (reactions, reply depth, number of participants), not chronology.
- Headlines must be specific enough to create pull ("We stress-tested three MCP servers and two failed the same way"), never generic ("AI tools discussed").
- Public-facing fields (headline, teaser) must contain NO member names, NO verbatim member quotes, and NO links. Creator names (Logan, Kevin, V/Vanessa) are allowed.
- Never frame anyone, creator or member, negatively or as being in conflict. No "threatening," "fighting," "calling out," "blocking people," or drama framing, even when it is accurate to the thread and even when it is funny. Frame debates by what they PRODUCED (the takeaway, the standard the group landed on, the question left open), never by who clashed with whom. The community must always come across as a place you would want to walk into. This applies to every field, member-facing included, and to any email edition later.
- memberDetail and goodyBag are member-only fields: names, links, and specifics are encouraged there. Do NOT produce win lists or quote-of-the-week callouts that single out individual members.
- goodyBag: every distinct useful link shared this week. Mark exactly ONE as "freebie": true, picking the one that best proves the community's value to outsiders.
- The freebie item is PUBLIC-FACING: its title, url, and note appear on the public page. Its note must not name the member who shared it, and its url must be a publicly hosted resource (an https link to a public site or repo, never a member's personal doc, drive, or Discord link). Every other goodyBag item stays member-only.
- Skip channels that are pure logistics or moderation. Ignore bot messages.
- If the week is thin, return fewer wavetops rather than padding. Never invent content.
- Style, the AI Recess voice (full doc: docs/voice.md): plain declarative sentences, no em dashes, never the phrase "vibe coding" (say "AI engineering" or "builds/ships"). Write like three friends at recess with receipts: playful surface, concrete substance. No hype without a wart in the same breath. No LinkedIn-speak; if a line would survive on LinkedIn unedited, rewrite it. Translate jargon in-line so nobody feels stupid. Members are "recessors," the Discord is "the playground," the weekly resources are "the goody bag." A soft CTA may end "That's recess." Numbers are receipts (things shared, built, fixed), never internal metrics.
