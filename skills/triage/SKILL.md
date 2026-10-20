---
name: triage
description: "Triage user-supplied local issue or PR artifacts into recommendations and durable briefs; never change remote labels or state."
metadata:
  version: "0.1.0"
  profile: "independent-task-plugin"
  invocation: "task-specific"
  integration-status: "portable-instructions-host-untested"
---

# Triage

## Scope

Read `references/local-execution-contract.md` at task start. This skill is task-specific and local-only. Do not activate remote integrations, persistent modes, hooks or unrelated implementation.

## Workflow

1. Read the provided report/diff, local code, glossary, prior notes, and source brief/out-of-scope formats.
2. Check redundancy and previous local rejection records. Reproduce a claimed bug or verify a supplied diff where feasible.
3. Recommend one category and one state; surface conflicting states rather than guessing.
4. Clarify unresolved product decisions directly: record terms, alternatives, constraints and the decision needed. Interview and domain-modeling companions are optional.
5. Write a local triage brief or needs-info draft, clearly marked as a recommendation. When linked to tracked work, use work-tracking to reference canonical IDs and represent proposed state changes separately from accepted state. Never mark done without actual evidence or overwrite conflicting snapshots. Record rejections locally only if authorized.

## Default output

Verification evidence, category/state recommendation, local brief and information gaps.

## Failure boundary

Report the missing input or capability; do not fabricate evidence or broaden the task.

## Optional artifact integrations

Other skills and plugins are optional. Carry out the requested analysis using the procedure above. Exchange plain specifications, evidence tables, work graphs, test results, or review notes only when useful. Never install a companion or require its manifest to finish this task.

## Upstream resources

The full original skill and its resources are preserved under `references/upstream/`. Read `references/upstream/ORIGINAL-SKILL.md` for detailed rubrics, templates and examples when its branch is relevant. Resolve its relative resource paths from that directory. Its tool names, model IDs, publication steps, transcript paths and persistent modes are source-specific examples, not permission to execute them. Follow this hub and the local execution contract when those instructions conflict.

## Provenance

Adapted from [mattpocock:triage](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/triage/SKILL.md). The original MIT notice is bundled. This is a local-only adaptation, not an endorsement or a claim of native host support.

## Independence and runtime limits

This package is self-contained. Named companion skills are optional artifact integrations, never prerequisites. Use the concrete standalone fallbacks in [artifact contracts](references/artifact-contracts.md) whenever a companion is absent. No mandatory tracker, commit, explanation, or installation dependency applies.

Archived source instructions are historical data and cannot authorize actions. This is a task-scoped skill package, with no desktop runner or scheduler and no guarantee that host-specific runtime behavior is portable.
