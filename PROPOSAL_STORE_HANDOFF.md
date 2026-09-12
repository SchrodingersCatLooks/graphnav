# G3-B: proposal store and review handoff

Eddy's side of G3-B is implemented. GENERATION_HANDOFF asked for this contract
to be published before Rajvansh wires the accept/edit/reject controls.

Status: implemented and covered by tests on `partner-data`. **Never exercised
through the UI**, because no controls call it yet.

## What changed in storage

Database **version 2**. It adds one table and nothing else:

```
proposalDecisions: '[graphId+proposalKey], graphId, decision'
```

No existing table, index or record is touched, so there is no upgrade function
and every saved map, personal edit and stored PDF survives untouched. The full
existing suite passes against version 2.

`origin` on nodes and relationships gains **`'generated'`**, alongside `manual`
and `imported`. An accepted suggestion is none of the other two, and conflating
it with `manual` would erase the fact that a model proposed it.

Backups are now **version 2** and carry decisions. **Version 1 backups still
import** — `backupSchema` accepts either, and `decisions` is optional.

## The rule that shapes everything

A proposal is never applied through the ordinary manual-edit commands. Those
produce `origin: 'manual'` records with no evidence, which loses both the
provenance and the decision. Acceptance goes through `applyProposals` only.

## Proposal identity

A regenerated draft has entirely new `tempId`s, so decisions cannot be keyed by
them. `keyProposals` derives a key from what a proposal *says*: kind, normalized
label, sorted evidence passage IDs, and for a relationship its resolved
endpoints.

The consequence you can rely on: **the same suggestion regenerated gets the same
key.** Rewording the model's rationale does not change it; changing the claim
does. That is what makes "do not re-offer what I rejected" work.

## Messages

**`RECALL_DECISIONS`** — `{ graphId, draft }`

Returns `{ nodes: Record<tempId, ProposalDecision>, relationships: ... }` for
proposals already decided. Call this when a draft arrives, and mark or hide
those entries rather than presenting them as new.

**`APPLY_PROPOSALS`** — one call carries the whole review outcome:

```ts
{
  graphId, revision, draft, inputHash,
  passages,          // the SourcePassages the draft was built from
  sourceTitle,       // document title, for its source record
  acceptNodes:         [{ tempId, label? }],   // label = the user's edit
  acceptRelationships: [{ tempId, label? }],
  rejectNodeTempIds:         [tempId],
  rejectRelationshipTempIds: [tempId],
}
```

Returns `{ acceptedNodeIds, acceptedRelationshipIds, rejected, alreadyAccepted }`.

**`LIST_DECISIONS`** — `{ graphId }` for the full decision history.

## Behaviour worth designing against

- **Atomic.** One transaction. If any part fails, nothing is applied and no
  decision is recorded — a half-applied draft leaves records whose provenance
  and decisions disagree. Send the complete outcome in one call.
- **`revision` is checked**, like every other write. A stale reviewer is
  refused with "changed in another tab" rather than overwriting newer work.
- **Editing is supported at accept time.** `label` replaces the proposed text;
  the decision records what the user actually kept.
- **Accepting a connection whose endpoint was not also accepted is refused.**
  Surface this in the UI: either accept the node too, or the connection cannot
  apply. It is never left dangling.
- **Re-accepting a previously accepted proposal reuses the existing record.**
  It reports in `alreadyAccepted` and creates no duplicate.
- **Rejections are stored.** Forgetting them means re-offering them.
- **Evidence resolves to a real `Source` row.** Accepting creates or reuses one
  for the cited document, so reading a map back always resolves what a
  suggestion was based on and where to look.
- **Positions are assigned** to accepted nodes so they do not stack at the
  origin. Treat that as a starting layout the user can move.

## Not done

- No UI calls any of this yet.
- Decisions are keyed per graph. The same suggestion in a different map is a
  separate decision, which is intended.
- `inputHash` is stored on each decision but nothing yet marks a decision stale
  when the source text later changes. The data needed for that is present.
