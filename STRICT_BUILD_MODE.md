# Strict Build Mode

Use this approach when working in constrained environments:
- Unreliable or slow network (Codespaces with poor connectivity, remote SSH)
- Limited context window (long session, many files already in context)
- High cost of interruption (each disconnect wastes work)
- Multi-agent coordination (clear atomic units reduce merge conflicts)

The goal is **maximum progress per uninterrupted window** with **zero half-finished states** committed.

---

## The process

```
1. LIST    — State exactly which files will be created or edited (no more than 10)
2. WRITE   — Generate all file contents completely, in order
3. COMMIT  — git add + git commit + git push in one step
4. STOP    — Do not proceed to the next unit of work without confirmation
```

Never leave the repository in a broken state between steps. A partial feature is worse than no feature — if interrupted mid-write, the commit hasn't happened yet, so nothing is lost.

---

## Unit sizing

- **Max 10 files per unit** — keeps the commit reviewable and the context manageable
- Each unit should be independently deployable — the app should start and run after every commit
- Prefer: new file + its route + its i18n keys + its API client function as one unit
- Avoid: splitting a feature across multiple units where the first unit leaves broken imports

---

## Good unit boundaries

✅ New page + route + nav entry + i18n keys + API function  
✅ New DB table + server route + typed client function  
✅ New JSON data file + server lookup route + frontend component  
✅ Bug fix (single logical change, one commit)  
✅ Country pack (pure JSON, no code changes needed)

❌ "Refactor everything" — too large, no clear stopping point  
❌ Split a feature where part 1 has broken imports waiting for part 2  
❌ Commit a file with `// TODO: implement this` placeholders  

---

## Commit message format

```
<what changed>: <one line summary>

- bullet: specific thing added/changed
- bullet: another specific thing

https://claude.ai/code/session_<id>
```

---

## When NOT to use strict build mode

Normal conditions with good connectivity and full context: work freely, use agents in parallel, let the agent decide scope. Strict build mode is a fallback for constrained environments, not a permanent workflow constraint.
