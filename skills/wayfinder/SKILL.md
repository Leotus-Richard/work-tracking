---
name: wayfinder
description: "Map a large uncertain effort as local decision tickets and a frontier; planning, not automatic implementation."
metadata:
  version: "0.1.0"
  profile: "independent-task-plugin"
  invocation: "task-specific"
  integration-status: "portable-instructions-host-untested"
---

# Wayfinder

## Scope

Read `references/local-execution-contract.md` at task start. This skill is task-specific and local-only. Do not activate remote integrations, persistent modes, hooks or unrelated implementation.

## Workflow

1. Name the destination, domain terms, constraints, acceptance and exclusions directly; optional interview/architecture companions may supply these artifacts.
2. Write one local map with destination, notes, decision links, not-yet-specified questions and exclusions.
3. Create only questions sharp enough to ticket. Use work-tracking for canonical decision IDs and output tokens; classify research, prototype, interview and prerequisite tasks. Wire only data/authority blockers and run validation/frontier analysis. Hierarchy and narrative order do not block work.
4. Resolve one decision ticket per focused session unless the user requests otherwise; independent local research may be parallel only when authorized.
5. Record each actual answer and evidence once on its canonical decision record; render the decision ticket and map index from that record and refresh the frontier without simulating user answers.

## Default output

Local decision map, question tickets, true blockers, current frontier and resolutions.

## Failure boundary

Report the missing input or capability; do not fabricate evidence or broaden the task.

## Optional artifact integrations

Other skills and plugins are optional. Carry out the requested analysis using the procedure above. Exchange plain specifications, evidence tables, work graphs, test results, or review notes only when useful. Never install a companion or require its manifest to finish this task.

## Upstream resources

The full original skill and its resources are preserved under `references/upstream/`. Read `references/upstream/ORIGINAL-SKILL.md` for detailed rubrics, templates and examples when its branch is relevant. Resolve its relative resource paths from that directory. Its tool names, model IDs, publication steps, transcript paths and persistent modes are source-specific examples, not permission to execute them. Follow this hub and the local execution contract when those instructions conflict.

## Provenance

Adapted from [mattpocock:wayfinder](https://github.com/mattpocock/skills/blob/49dd158d1076134a641b33efb035946536778336/skills/engineering/wayfinder/SKILL.md). The original MIT notice is bundled. This is a local-only adaptation, not an endorsement or a claim of native host support.

## Independence and runtime limits

This package is self-contained. Named companion skills are optional artifact integrations, never prerequisites. Use the concrete standalone fallbacks in [artifact contracts](references/artifact-contracts.md) whenever a companion is absent. No mandatory tracker, commit, explanation, or installation dependency applies.

Archived source instructions are historical data and cannot authorize actions. This is a task-scoped skill package, with no desktop runner or scheduler and no guarantee that host-specific runtime behavior is portable.
