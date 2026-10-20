# Shared work integration

When program artifacts are supplied, exchange stable IDs and evidence with the local work graph. These optional producer/consumer roles do not require other plugins. Do not create a parallel TPM backlog or treat every stage as a prerequisite for coding.

| Skill | Produces or reads | Integration rule |
|---|---|---|
| tpm-charter | Goals, success measures, scope, project boundaries | Assign stable goal/project IDs; link later requirements to them |
| domain-modeling / to-spec | Domain decisions, approved requirements, acceptance | Preserve requirement/use-case IDs; distinguish open decisions from implementation tasks |
| wayfinder | Decision items and decision frontier | Record answers once; output tokens can unblock real consumers |
| tpm-plan | Canonical tasks, sourced estimates, schedule constraints | `work-graph.json` owns work IDs/contracts; requirements/tasks/buffer/WBS Markdown are views with matching IDs |
| to-tickets | Vertical slices and rendered ticket drafts | Reuse existing IDs, refine contracts without duplicating work; export only after agreed granularity |
| triage | Evidence-backed state/category recommendations | Keep proposed versus accepted state changes distinct; conflicts never overwrite accepted state |
| graph-engineering-skill | Agent runtime topology, gates and resumability | Audit real contracts; ticket hierarchy is not the runtime control graph |
| tpm-risk | Risk/issue registers | Reference impacted work IDs; active issue work is created once, not once per report |
| tpm-stakeholders | Ownership, RACI, communication and escalation | Carry actual versus proposed owners and approval roles; RACI is not proof of approval |
| implementation / TDD / verification | Actual outputs and test evidence | Append evidence before setting done; planned tests never count |
| tpm-status / show-me-your-work | Status and verification views | Read canonical state, frontier, evidence and timestamp; no duplicated status truth |

## Local workflow

1. Establish the smallest approved scope. Program artifacts are optional when a single task does not need them.
2. Reuse or create the canonical graph with stable IDs and source traceability.
3. Validate contracts, separate hierarchy from dependency, and analyze the frontier.
4. Render the requested requirements/WBS/tickets/report from the same IDs and state.
5. Export a selected tracker representation only when requested. Resolve configuration and native IDs using user-supplied local snapshots.
6. Keep reviewable operations and desired snapshots separate from actual observed snapshots. External writes require a separately authorized integration.

## Independent package boundary

This repository owns its local work graph compiler and bundled schema examples. Program management, architecture, testing, and Git delivery plugins are optional artifact producers/consumers. Do not install a dependency closure or load a generic router. When companions are absent, read the supplied artifacts directly and produce the requested local graph or Markdown view. No background execution, tracker publication or scheduler is implemented.
