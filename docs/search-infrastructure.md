# Search infrastructure

Written against the app as of `18d84d5b`. Every number here was measured, not
estimated; the method is at the bottom so it can be re-run.

## What exists today

`GlobalSearchLogic.buildIndex` builds a [fuse.js](https://fusejs.io) index over
everything the app knows about:

| | |
|---|---|
| Entries indexed | 1,404 |
| Indexed text | ~131 KB (names + descriptions) |
| Fields and weights | `name` 0.7, `subtitle` 0.2, `description` 0.1 |
| Threshold | 0.35, `ignoreLocation: true`, `minMatchCharLength: 2` |
| First open (modal + index build) | ~895 ms |
| Query latency | 44–50 ms |
| fuse.js on disk | 332 KB (dwarfed by the 5.2 MB app bundle) |

So the app already has fuzzy search, and it works: `gobln` finds Goblin Runner.

## The ranking is good; the presentation throws it away

This is the important finding, and it costs nothing to fix.

Fuse scores are excellent — lower is better, 0 is perfect:

```
query "goblin"                        query "healing"
  0.0000  monster-group  Goblin         0.0328  item     Healing Potion
  0.0071  monster-group  Hobgoblin      0.0435  project  Craft Healing Potion
  0.0207  monster        Goblin Runner  0.4077  rule     Sneaking        <- noise
  0.0207  monster        Goblin Sniper  0.4078  imbuement Hurling        <- noise
```

But the modal renders results grouped by kind in a **fixed** order
(`KIND_ORDER` in `global-search-modal.tsx`), starting `rule`, `condition`,
`hero`, `monster`, …. The list is never ordered by score. Typing `goblin`
therefore shows the rule **Natural Roll** first and buries the monster group
`Goblin` — which scored a perfect 0.0000 — several sections down.

There is also no cut-off. `healing` displays 42 results; only 2 score under
0.05, and everything past the cliff at ~0.40 is noise.

**Recommended, in order:**

1. **Order the groups by their best-scoring member** (or lead with a flat "Top
   matches" section). One-line change; turns a broken-feeling search into a
   good one.
2. **Drop results past the score cliff.** Anything above ~0.35 is noise at this
   corpus size. `healing` goes from 42 rows to 2.
3. Only then consider anything below.

## Where lexical search genuinely fails

Queries whose words don't appear in the text return nothing useful, because
fuzzy matching is character-based, not meaning-based:

| Query | Result today |
|---|---|
| `fire breathing dragon` | **0 results** |
| `tank` | 46 results, first is *Flanking* |
| `crowd control` | 12 results, first is *Angulotl Wave* |
| `healing` | correct top 2, then 40 rows of noise |

This is the gap semantic search would close.

## What semantic search would cost

Two halves, with very different price tags.

**The corpus embeddings are cheap.** 1,404 entries at 384 dimensions
(all-MiniLM-L6-v2):

| Precision | Size |
|---|---|
| float32 | 2.06 MB |
| int8 quantised | 526 KB |

Official content is static, so these can be generated at build time and shipped
as an asset. Cosine similarity over 1,404 vectors is trivially fast in JS.

**The query encoder is the expensive half.** Embedding what the user types
needs the model in the browser — there is no backend to call. Via
transformers.js, all-MiniLM-L6-v2 is roughly 23 MB fp32, ~6–8 MB quantised,
plus the ONNX/WASM runtime, and a few hundred ms for the first inference. That
is a large addition to a 5.2 MB bundle (1.27 MB gzipped) for a PWA people load
on a phone at a table. It would have to be lazily fetched on first search and
cached, and it would still make the first semantic search noticeably slow.

Heroes and homebrew are authored at runtime, so they would need the model
locally too, or would have to stay lexical-only — a split that users would feel
as "search works for official monsters but not my homebrew".

## A cheaper middle: a synonym layer

This is a closed, well-understood domain, so most "semantic" queries are really
vocabulary mismatches. A curated alias map costs no bytes and no latency:

```
healing      -> recovery, recoveries, regain stamina
tank         -> defender, brute, stamina
crowd control-> slowed, taunted, restrained, grabbed, push, pull
fire         -> flame, burning, ignite
```

Expand the query with aliases before handing it to fuse. That fixes `tank`,
`crowd control` and `healing` without a model, and it degrades gracefully:
unknown terms behave exactly as they do now.

## Recommendation

1. Fix ranking and add a score cut-off. Free, and the biggest single
   improvement to how search *feels*.
2. Add a synonym layer for the domain vocabulary. Small, static, testable.
3. Revisit embeddings only if concept queries still miss after 1 and 2 — and if
   so, ship precomputed int8 vectors and lazy-load the encoder, rather than
   putting a model in the main bundle.

Semantic search is the interesting option, but on these numbers it is the third
thing to do, not the first.

## Method

- Index stats and fuse scores: build the index in a vitest scratch file via
  `GlobalSearchLogic.buildIndex(SourcebookLogic.getSourcebooks(), [])` and log
  `fuse.search(q)` with `includeScore`.
- Latency and result counts: drive the real modal with Playwright against
  `npm start`, typing into the search box and counting `.search-result` rows.
- Bundle sizes: `npm run build` output.
