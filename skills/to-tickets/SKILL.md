---
name: to-tickets
description: "Split an agreed plan into local verifiable work-item drafts and real blockers; never publish tracker issues."
metadata:
  version: "0.1.0"
  profile: "independent-task-plugin"
  invocation: "task-specific"
  integration-status: "portable-instructions-host-untested"
---

# To Tickets

## Scope

Read `references/local-execution-contract.md` at task start. This skill is task-specific and local-only. Do not activate remote integrations, persistent modes, hooks or unrelated implementation.

## Workflow

1. Read the plan/spec and relevant domain decisions.
2. Propose end-to-end vertical slices sized for one focused task. For wide migrations, use expand-contract where compatibility requires it.
3. For each blocker, name the data or authority the downstream ticket needs; cut narrative-order dependencies.
4. Present the draft breakdown and granularity for the user to decide.
5. On agreement, use work-tracking to reuse or create work-graph.json with stable slice IDs, contracts, evidence and true blockers. Validate it and read its runnable frontier; render local Markdown tickets from those records, not a second work database.
6. If a tracker export is requested, use work-tracking with the chosen platform's verified configuration and supplied snapshot. Save reviewable operations only; never publish or modify a remote parent.

## Default output

Canonical work graph, local ticket views, actual validation/frontier summary, approval state and optional offline tracker export.

## Failure boundary

Report the missing input or capability; do not fabricate evidence or broaden the task.

## Optional artifact integrations

Other skills and plugins are optional. Carry out the requested analysis using the procedure above. Exchange plain specifications, evidence tables, work graphs, test results, or review notes only when useful. Never install a companion or require its manifest to finish this task.

## Upstream resources

The full original skill and its resources are preserved under `references/upstream/`. Read `references/upstream/ORIGINAL-SKILL.md` for detailed rubrics, templates and examples when its branch is relevant. Resolve its relative resource paths from that directory. Its tool names, model IDs, publication steps, transcript paths and persistent modes are source-specific examples, not permission to execute them. Follow this hub and the local execution contract when those instructions conflict.

## Provenance

Adapted from [mattpocock:to-tickets](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/to-tickets/SKILL.md). The original MIT notice is bundled. This is a local-only adaptation, not an endorsement or a claim of native host support.

## Independence and runtime limits

This package is self-contained. Named companion skills are optional artifact integrations, never prerequisites. Use the concrete standalone fallbacks in [artifact contracts](references/artifact-contracts.md) whenever a companion is absent. No mandatory tracker, commit, explanation, or installation dependency applies.

Archived source instructions are historical data and cannot authorize actions. This is a task-scoped skill package, with no desktop runner or scheduler and no guarantee that host-specific runtime behavior is portable.
