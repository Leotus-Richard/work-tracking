# Tracker adapters and publication boundary

All adapters generate local review bundles. No API request is executed. Replace synthetic values with workspace-verified configuration, inspect every operation, and obtain specific authorization before any future external executor is used.

## Shared semantics

Stable canonical IDs, contracts, acceptance, state and evidence travel in the description/body marker. Native issue identity remains in a separate binding. Native type/state mappings are workspace configuration, not assumed global constants. A relationship capability gap is explicitly reported; never downgrade `blocks` to `related` and pretend equivalence.

| Target | Required destination/mappings | Native item binding | Relationships emitted |
|---|---|---|---|
| GitHub Issues | owner, repo, canonical state labels, kind labels | integer number and global issue id; labels for safe updates | blocked-by and sub-issue links |
| Azure DevOps | organization, project, work-item types and state names | integer id, optional revision | dependency-forward and hierarchy-forward |
| Linear | team UUID, canonical state UUIDs, optional project UUID | issue UUID/identifier | blocks, related, parentId |
| Jira Cloud | base URL, project key, issue-type IDs, desired status IDs | issue key | configurable verified blocks link; hierarchy deferred |

Native program/project/risk/approval types are not assumed. Where the target has only issues, a configured type plus the canonical body preserves kind. Owner and estimates remain canonical/body fields; native ownership and estimate field mappings are not implemented.

## GitHub

Creates use POST issues; existing items use PATCH. Canonical done/cancelled map to closed plus separate configured labels; backlog/ready/in_progress remain open with distinct labels. Provide current labels in an update snapshot so unrelated user-owned labels are retained. Label existence and repository permissions must be verified before publication.

Blockers POST to the downstream issue's `dependencies/blocked_by` endpoint with the upstream global `issue_id`, not its issue number. Parent links POST to the parent's `sub_issues` endpoint with `sub_issue_id`; replacing a parent is not enabled. These are distinct APIs, not label approximations ([GitHub issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies), [GitHub sub-issues](https://docs.github.com/en/rest/issues/sub-issues)).

## Azure DevOps

Creates and updates use JSON Patch with API version 7.1. `System.LinkTypes.Dependency-Forward` is a successor link from predecessor to downstream; `Hierarchy-Forward` is parent to child. Native process/state/type compatibility must be verified, and an observed revision adds a `/rev` test before updates ([Microsoft relation types](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-item-relation-types/list?view=azure-devops-rest-7.1), [create work item](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/create?view=azure-devops-rest-7.1), [update work item](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update?view=azure-devops-rest-7.1)).

## Linear

Creates and updates use GraphQL input variables. Blocks relations use `issueId` as source and `relatedIssueId` as target; hierarchy updates a child's `parentId`. State IDs must be from the chosen team, not guessed strings. Future execution must inspect GraphQL errors and mutation success, not merely HTTP success ([Linear SDK schema](https://raw.githubusercontent.com/linear/linear/master/packages/sdk/src/schema.graphql), [Linear GraphQL guide](https://linear.app/developers/graphql.md)).

## Jira Cloud

Creates and updates use ADF descriptions. Desired status ID is not a transition ID; the compiler emits a transition-discovery requirement, not an invented universal transition. Issue-link names and inward/outward descriptions are configurable: set `blockLink.typeName`, `sourceEnd` and `verified: true` only after confirming source-to-target meaning in that workspace. Unverified direction is unsupported, not silently guessed. No optional link comment is generated, avoiding repeated comments when retries discover an existing link ([Jira issue operations](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/), [Jira issue-linking model](https://developer.atlassian.com/cloud/jira/platform/issue-linking-model/), [Jira issue-link operations](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-links/)).

Jira hierarchy is retained canonically and in bodies but not emitted as a native relation: project issue types/hierarchy/parent legality require an additional verified mapping. This is an explicit limitation, not four-platform native feature parity.

## Two-pass export and reconciliation

Phase 1 creates/updates items. Phase 2 adds relationships only after actual native identities are known. `{{ID.field}}` denotes an unresolved binding and is not a valid native payload value. Rerun using the observed bindings; never send unresolved placeholders.

Existing item changes require a reviewed baseline and observed hash. Remote edits cause conflicts; local omission never triggers deletion. Changed native relationships require reviewed remove/add operations and are not automatically executed. Native state may disagree with canonical readiness, so runtime gating always reads the canonical contracts and evidence.

The bundle's deterministic operation IDs and no-op detection are local reconciliation aids. They are not provider idempotency keys, durable execution receipts or a guarantee against duplicate issues. A future publisher must search stable markers, inspect existing links, re-read conflicts, confirm approval and persist actual response/readback receipts before recording success.
