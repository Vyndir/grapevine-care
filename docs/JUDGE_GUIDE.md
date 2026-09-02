# Judge guide

## What to evaluate first

Grapevine Care models caregiver continuity, not an AI medication dispenser. The
default call-out scenario demonstrates the complete job:

```text
disruption → constraints → scheduler approval → incoming brief
→ visit evidence → outgoing approval → recipient acknowledgement
```

The agent contributes cross-system context, deterministic explanations, and
prepared drafts. People retain assignment, visit, handoff, and clinical
authority.

## Two-minute interactive verification

1. Open the live site on **Caregiver call-out**.
2. Ask: “Inspect Rose's uncovered 5 PM shift, explain every candidate against
   the explicit constraints, and prepare the eligible option for scheduler
   review. Do not assign anyone or use an opaque score.”
3. Confirm the agent uses `get_shift_context`, `get_coverage_candidates`, and
   `prepare_shift_coverage`.
4. Confirm only Jordan is eligible and the visible drawer says the schedule has
   not changed.
5. Approve the assignment. Confirm coverage tools disappear and
   `get_changes_since_last_shift` / `get_shift_brief` appear.
6. Open **My shift**, acknowledge the brief, and complete the compressed visit.
7. Confirm `prepare_shift_handoff` appears only now.
8. Prepare and approve the handoff, then acknowledge it as Luis in the visible
   UI. No agent acknowledgement tool exists.

## Fast source review

| Question | File |
| --- | --- |
| Where are tools registered dynamically? | `src/useWebMCPTools.ts` |
| Where are schemas and JSON Schema inputs defined? | `src/schemas.ts` |
| Where are server invariants enforced? | `src/server.ts` |
| Where is the caregiver-first UI? | `src/CoverageCaregiverView.tsx` |
| Where is continuity state stored? | `drizzle/0005_caregiver_continuity_loop.sql` |
| Which behaviors are executable tests? | `src/server.test.ts`, `src/App.test.tsx`, `src/schemas.test.ts` |
| What can never happen? | `docs/SAFETY.md` |
| How is this separate from Project Grapevine? | `PROJECT_ORIGIN.md` |

Run the complete verification suite with `pnpm run verify`.

## Key implementation claims

- Seventeen total WebMCP tools; only the state- and workspace-appropriate subset
  is registered.
- Six tools are dedicated to caregiver continuity.
- Eight deterministic candidate checks; zero opaque suitability scores.
- Evidence and schedule snapshots fail closed when state changes.
- Preparation is idempotent and no demo workflow has an external side effect.
- Operational handoffs and nurse review are separate data models, tools, and
  approval paths.
- All data is fictional and isolated by browser-run ID.

## Challenge-criteria loop

| Criterion | Evidence in this build |
| --- | --- |
| WebMCP leverage | Cross-system caregiver work is exposed as six purpose-built, state-dependent tools; schemas, freshness, and human gates are part of the interaction rather than prompt prose |
| Execution | Complete D1-backed state machine, deterministic reset, responsive UI, version conflicts, idempotency, and 26 passing tests |
| Potential impact | Addresses a concrete continuity failure: safe coverage recovery and context transfer when care changes hands |
| Creativity and ambition | Combines agents, caregiver operations, resident context, visit evidence, human approvals, and extensible device adapters without turning AI into a clinical or workforce authority |

## Scope honesty

This is a reliable competition simulation, not production healthcare software.
It has no identity provider, protected health information, real caregiver
dispatch, electronic health record, pharmacy, medical-device, or emergency-
service integration. Production prerequisites are listed in `docs/SAFETY.md`.
