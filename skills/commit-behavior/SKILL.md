---
name: commit-behavior
description: Keeps git commits authored and committed by the human user, rejects Co-authored-by trailers, and keeps commit size to one change plus its tests so each commit stands alone for cherry-pick. Use when creating or amending a git commit, writing a commit message, setting the author or committer, handling a Co-authored-by trailer, choosing commit size, or preparing a cherry-pick.
---

# Commit behavior

Apply these rules whenever a commit is created or amended.

## Rules

- Never emit a "Co-authored-by" trailer, or any "co-authored by" line.
- Every code commit is authored and committed by the human user, never an LLM agent. Banned identities include claude, agent, cursor, codex, agy, gemini, and similar agent names. Do not set or pass an agent as author or committer. Do not override git user.name or user.email to an agent. If the configured identity already looks like an agent, stop and leave the commit unmade.
- A commit is a small set of work: one change plus the tests that validate that change.
- Do not make large commits that are hard to cherry-pick. Split unrelated changes into separate commits. Each commit must stand alone for cherry-pick.

## Creating or amending a commit

1. Use the existing human git identity only. No --author flag and no agent trailer.
2. Reject or strip Co-authored-by / co-authored by trailers before the commit is created.
3. Stage one logical change and the tests that validate it. Leave unrelated files unstaged.
4. If the diff is too mixed to cherry-pick safely, split it before committing.
5. Do not invent a commit-message convention the user did not ask for.
