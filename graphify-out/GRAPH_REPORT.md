# Graph Report - padeltrack  (2026-11-24)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 46 nodes · 50 edges · 7 communities (5 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ad88704b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6

## God Nodes (most connected - your core abstractions)
1. `App()` - 7 edges
2. `TrackerScreen()` - 6 edges
3. `calculateScore()` - 6 edges
4. `steps` - 5 edges
5. `permissions` - 4 edges
6. `deploy` - 4 edges
7. `concurrency` - 3 edges
8. `environment` - 3 edges
9. `on` - 3 edges
10. `ResultBadge()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `TrackerScreen()`  [EXTRACTED]
  padeltrack.html → padeltrack.html  _Bridges community 0 → community 4_
- `TrackerScreen()` --calls--> `calculateScore()`  [EXTRACTED]
  padeltrack.html → padeltrack.html  _Bridges community 0 → community 5_

## Import Cycles
- None detected.

## Communities (7 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.24
Nodes (7): ResultBadge(), RESULTS, SCORE_SEQ, SHOT_GROUPS, SHOT_TYPES, ShotBadge(), TrackerScreen()

### Community 1 - "Community 1"
Cohesion: 0.22
Nodes (8): concurrency, cancel-in-progress, group, name, permissions, contents, id-token, pages

### Community 2 - "Community 2"
Cohesion: 0.33
Nodes (6): environment, runs-on, name, url, jobs, deploy

### Community 3 - "Community 3"
Cohesion: 0.33
Nodes (6): steps, id, name, uses, with, path

### Community 6 - "Community 6"
Cohesion: 0.50
Nodes (4): on, push, workflow_dispatch, branches

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `deploy` connect `Community 2` to `Community 3`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `jobs` connect `Community 2` to `Community 1`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `steps` connect `Community 3` to `Community 2`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._