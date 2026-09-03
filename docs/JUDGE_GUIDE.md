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

## Recommended WebMCP test environment

- Latest ChatGPT desktop app.
- ChatGPT's built-in browser with **Enable site tools** turned on under Browser
  settings → Permissions.
- An account and selected model that support Site Tools.
- Keep the Grapevine Care page open; page-scoped tools are available only while
  their page is open.

Open the address-bar Site Tools menu before the prompt. In the initial call-out
state, expect six tools:

```text
get_resident_context       get_care_story
get_care_evidence          get_shift_context
get_coverage_candidates    prepare_shift_coverage
```

Nineteen tools exist across the complete application. Grapevine deliberately
offers only four persistent caregiver-context reads plus the currently valid
workflow tools. The capability chip on the main caregiver page mirrors this
expected set.

## Two-minute interactive verification

1. Open the live site on **Caregiver call-out**.
2. Ask: “Rose's 5 PM caregiver called out. Determine who is eligible to cover
   the shift, explain every candidate against the explicit constraints, and prepare the eligible option for scheduler
   review. Do not assign anyone or use an opaque score.”
3. Confirm the agent begins with `get_shift_context({})`—without an internal
   shift ID—then uses `get_coverage_candidates` and `prepare_shift_coverage`.
4. Confirm only Jordan is eligible and the visible drawer says the schedule has
   not changed.
5. Approve the assignment. Confirm coverage tools disappear and
   `get_changes_since_last_shift` / `get_shift_brief` appear.
6. Open **My shift**, acknowledge the brief, and complete the compressed visit.
7. Confirm `prepare_shift_handoff` appears only now.
8. Prepare and approve the handoff, then acknowledge it as Luis in the visible
   UI. No agent acknowledgement tool exists.

## Advanced multi-resident verification

Reset to **Care Team Day** and ask:

> I’m taking over the care coordinator desk. Catch me up and help me get
> everyone through today.

The initial page exposes `get_care_team_overview`, `get_resident_context`, and
`get_shift_context`. The overview must distinguish operational deadlines from
medical severity and return a source, policy basis, known facts, unknowns, and a
human owner for each queue item.

1. Ask “Has Luis shown up for Evelyn?” The answer must say no verification
   record has arrived—not that Luis is absent or Evelyn is unsafe.
2. Advance once. The simulated EVV record resolves the gap without an agent
   action.
3. Advance to Walter’s readiness review. `prepare_assignment_orientation`
   appears and may prepare Care Plan v2 context for Elena, but it cannot record
   completion.
4. Confirm the preparation tool disappears while the packet waits. Acknowledge
   as Elena in the visible UI; only then does Walter’s readiness resolve.
5. Advance to 2:15 PM. Rose’s call-out enters the existing coverage workflow.

## Fast source review

| Question | File |
| --- | --- |
| Where are tools registered dynamically? | `src/useWebMCPTools.ts` |
| Where are schemas and JSON Schema inputs defined? | `src/schemas.ts` |
| Where are server invariants enforced? | `src/server.ts` |
| Where is the caregiver-first UI? | `src/CoverageCaregiverView.tsx` |
| Where is the multi-resident day? | `src/CareTeamDayView.tsx`, `drizzle/0006_care_team_day.sql` |
| Where is continuity state stored? | `drizzle/0005_caregiver_continuity_loop.sql` |
| Which behaviors are executable tests? | `src/server.test.ts`, `src/App.test.tsx`, `src/schemas.test.ts` |
| What can never happen? | `docs/SAFETY.md` |
| How is this separate from Project Grapevine? | `PROJECT_ORIGIN.md` |

Run the complete verification suite with `pnpm run verify`.

## Key implementation claims

- Nineteen total WebMCP tools; safe caregiver-context reads remain
  discoverable during the call-out while consequential tools follow state.
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
| WebMCP leverage | Cross-system caregiver work spans a deterministic care-team overview, resident drill-down, coverage, readiness, briefing, and handoff; schemas, freshness, and human gates are part of the interaction rather than prompt prose |
| Execution | Complete D1-backed state machines, deterministic reset and time progression, responsive UI, version conflicts, idempotency, and 30 passing tests |
| Potential impact | Addresses a concrete continuity failure: safe coverage recovery and context transfer when care changes hands |
| Creativity and ambition | Combines agents, caregiver operations, resident context, visit evidence, human approvals, and extensible device adapters without turning AI into a clinical or workforce authority |

## Scope honesty

This is a reliable competition simulation, not production healthcare software.
It has no identity provider, protected health information, real caregiver
dispatch, electronic health record, pharmacy, medical-device, or emergency-
service integration. Production prerequisites are listed in `docs/SAFETY.md`.
