# Canonical work model

The canonical file is `work-graph.json`, schemaVersion 1. Treat it as the shared local interchange format, not an assertion that remote trackers were updated. Preserve IDs when changing tracker or rendering a new artifact.

## Graph contract

| Field | Contract |
|---|---|
| `id` | Stable nonempty graph identifier |
| `asOf` | Supplied evidence timestamp or null; never invent freshness |
| `items` | Array of the item records below |
| `edges` | Array of semantic relationships below |
| `scheduleConstraints` | Optional scheduling constraints, separate from blocking edges |

Each item requires `id`, `kind`, `title`, `owner`, `state`, `inputs`, `outputs`, `acceptance`, `completionEvidence`, `externalInputEvidence`, and `failurePolicy`.

- **Kinds:** program, project, requirement, decision, task, milestone, risk, issue, approval.
- **Owner:** explicit identity string or null. Null means unknown/unassigned, not agent ownership.
- **States:** backlog, ready, in_progress, done, cancelled. Blocked is derived from unmet contracts, not a sixth stored state. A ready state is intent; only an unblocked ready item appears in the runnable frontier.
- **Inputs/outputs:** unique nonempty token strings representing named data or authority artifacts. Acceptance is a nonempty array of observable checks.
- **Evidence:** arrays of `{ "token": "...", "reference": "..." }`. Done requires evidence for every output, completed incoming prerequisites and supplied inputs. External input evidence supplies inputs not provided by a blocker. References may point to actual local checks or actual approval records; do not manufacture them.
- **Failure policy:** RETRY, FALLBACK, SKIP, REPAIR, ESCALATE or STOP. This compiler records policy, not executing retries. Runtime integrations must add caps, budgets and escalation.
- **Optional fields:** description, traceability with goal/requirement/use-case IDs, and estimate `{value, unit, source}`. Estimates must be nonnegative and sourced; absent means unknown. Keep confidence and assumptions as additional record fields rather than inventing duration.

The code validates structural evidence presence, not the truth, authorization or quality of that evidence. A verification gate must actually read and evaluate the referenced results. The local compiler is not such a judge.

## Relationship contract

Each edge has unique `id`, `from`, `to`, `type`, and a nonempty `reason`. No dangling endpoints, self-links or duplicate type/from/to relationships. Combine multiple token requirements into one relationship with unique carries tokens rather than creating duplicate native links.

| Type | Meaning | Additional rules |
|---|---|---|
| `contains` | Parent owns child | One parent per child, acyclic. No execution order implied |
| `blocks` | Source must supply data/authority before target can proceed | Acyclic; contract `data` or `authority`; nonempty `carries`; every token must be in source outputs and target inputs |
| `informs` | Useful context | Does not block execution |
| `relates_to` | Association | Does not block execution |

Authority blockers originate from an `approval` item. A planned approval, cancelled blocker, or merely open/closed tracker item does not provide authority. Cancelled prerequisites remain blocked until someone explicitly revises the contract. AND joins are represented by multiple incoming blocker edges. OR alternatives require an explicit chosen decision and revised graph; this compiler does not infer them.

Controlled agent cycles belong to the graph-engineering runtime design. This work-management graph is a dependency DAG: represent iteration as new bounded work items or an explicit runtime referenced by a task, not an unbounded ticket cycle.

## Scheduling contract

Schedule constraints are `{from, to, type, lag, unit}`, with type FS, SS, FF or SF and finite numeric lag. Negative lag represents a lead. Validate references and units; retain them as planning metadata. They never silently become blockers. No resource calendar, critical-path duration, crash optimization, overhead model or dates are calculated here.

## Snapshot contract

For export reconciliation, supply a normalized local snapshot:

```json
{
  "graphId": "YOUR-GRAPH",
  "platform": "github",
  "asOf": "ACTUAL-SNAPSHOT-TIME",
  "items": {
    "T-1": {
      "binding": {"number": 17, "id": 123456, "labels": ["user-owned-label"]},
      "baseHash": "HASH-OF-LAST-REVIEWED-REPRESENTATION",
      "observedHash": "HASH-OF-CURRENT-NORMALIZED-REPRESENTATION"
    }
  },
  "edges": {
    "E-1": {"baseHash": "PREVIOUS", "observedHash": "CURRENT"}
  }
}
```

Hash values must come from a trustworthy normalization/reconciliation process. Copying the proposed desired hash into both observed and baseline fields without inspecting the remote record fabricates a snapshot. There is no included remote fetcher or normalizer.

Use the export's `desiredHash` as a candidate baseline only after the corresponding write/readback is actually successful and reviewed. `desiredSnapshot` is deliberately incomplete and cannot be used as an observed snapshot: it has no as-of time, observed hashes or native bindings.

Existing native bindings without a reviewed baseline produce conflicts, not automatic updates. Divergent observed/base hashes produce conflicts. Missing baseline items produce creates; stable operation IDs aid reconciliation but do not provide server-side idempotency. Deleted items/edges and changed relationships require reviewed reconciliation; this tool never deletes or silently removes blockers.
