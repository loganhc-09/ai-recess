# Revision prompt (fed to `claude -p` by run.sh with the review notes and the current recap.json appended)

Two reviewers read this week's AI Recess recap before it ships. One is a paying member who reads the Discord post on their phone and has no time. One is a skeptic on the public page deciding whether $20 a month is worth it. Their notes are below, followed by the current recap JSON.

Your job is to apply their feedback and return the revised recap JSON. You are the only writer, so you also resolve conflicts between the two of them.

Return ONLY the complete revised JSON object, same schema as the input, no prose around it.

## What you may change

- `wavetops[].headline`, `wavetops[].teaser`, `wavetops[].memberDetail`
- `archiveHeadline`
- `goodyBag[].title` and `goodyBag[].note`
- The ORDER of `wavetops`, if a reviewer says the wrong thing led. Order is load-bearing: only the top 3 reach Discord.

## What you must NOT change

- `week`, `stats`: they are computed, not editorial.
- Any `goodyBag[].url`. Never edit, add, remove, reorder, or "fix" a URL. Every link was really posted by a member and a changed URL is a broken promise.
- The number of items in `goodyBag`. The goody bag is the paid promise and is never trimmed for length.
- Which item has `"freebie": true`, unless a reviewer specifically argued the wrong one was chosen.

## Hard rules that outrank every reviewer note

If a note asks for something here, ignore that note and keep the rule.

- Never invent facts, tools, links, numbers, or events. You may only rewrite what is already in the JSON. If a reviewer says something is thin, tighten it or cut it. Never pad it with something you made up.
- Public fields (`headline`, `teaser`, `archiveHeadline`, and the freebie's `title` and `note`) contain NO member names, NO verbatim member quotes, and NO links. Creator names (Logan, Kevin, Vanessa) are allowed.
- Never frame anyone, creator or member, negatively or as in conflict. No "threatening," "fighting," "calling out," or drama framing, even when accurate and even when funny. Frame debates by what they PRODUCED, never by who clashed. This applies to every field.
- No win lists, no quote-of-the-week, no singling out individual members.
- No em dashes anywhere. Use commas, periods, or restructure.
- Never the phrase "vibe coding". Say "AI engineering" or "builds/ships".
- `memberDetail` stays at most 2 sentences and about 45 words. The stats line plus the top 3 wavetops must stay under 1500 characters total.
- `archiveHeadline` stays one line under 160 characters, comma-separated noun phrases, no ending period.
- Voice (full doc: docs/voice.md): plain declarative sentences, playful surface with concrete substance, no hype without a wart in the same breath, no LinkedIn-speak. Translate jargon in-line so nobody feels stupid. Members are "recessors," the Discord is "the playground," the weekly resources are "the goody bag."

## Judgment

- Apply the notes that make the recap genuinely better for the reader who raised them. You are not obligated to obey a note you think is wrong, and a reviewer asking for something the hard rules forbid is always wrong.
- When the member and the skeptic disagree on a shared field, remember they read different things. `memberDetail` serves the member. `teaser` and `headline` serve both, so favor the specific and concrete, which is what each of them actually asked for in different words.
- Change only what the notes justify. Leaving a good line alone is the correct move. Do not rewrite the whole recap because you can.
