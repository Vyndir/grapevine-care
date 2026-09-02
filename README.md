# Grapevine Care

**Context that follows the care.**

Grapevine Care is a safety-first WebMCP prototype for caregiver continuity. It
models the work that begins when a care plan meets a real shift: understand the
person, recover coverage when a plan breaks, brief whoever steps in, record only
what was actually observed, and preserve unresolved context for the next
caregiver.

The primary judge scenario starts at 2:15 PM. Maya calls out for Rose's 5:00–8:00
PM visit. The page and an agent collaborate through a complete loop:

```text
disruption → deterministic constraints → prepared recommendation
→ scheduler approval → incoming-caregiver brief → visit evidence
→ prepared handoff → outgoing-caregiver approval → recipient acknowledgement
```

Every resident, caregiver, shift, medication window, device, event, and timestamp
is fictional. This is a competition simulation—not a medical device, clinical
decision-support system, adherence guarantee, workforce-management product,
emergency service, or substitute for professional care.

## Why WebMCP matters here

Caregiver work spans a schedule, staff readiness, a resident's preferences and
care plan, recent evidence, a live visit, and the next shift. A static chatbot
does not have trustworthy access to that state. Grapevine exposes a small,
state-dependent capability set from the same interface people use.

The six caregiver-continuity tools are:

| Tool | Purpose | Enforced boundary |
| --- | --- | --- |
| `get_shift_context` | Read assignment, disruption, visit, handoff, and version-bound schedule context | Read only; creates a snapshot for safe follow-on preparation |
| `get_coverage_candidates` | Check availability, qualification, training, Rose orientation, care-plan acknowledgement, conflicts, travel, and weekly hours | Deterministic checks; no sensitive ranking or opaque score |
| `prepare_shift_coverage` | Stage one eligible coverage recommendation | Scheduler must approve before assignment changes |
| `get_changes_since_last_shift` | Catch the assigned caregiver up on meaningful changes | Source-bounded; no clinical inference |
| `get_shift_brief` | Assemble person, plan, expectations, unresolved items, and boundaries | Only for the assigned caregiver |
| `prepare_shift_handoff` | Stage completed work, bounded observations, and unresolved items | Outgoing caregiver approves before recipient access |

Eleven supporting tools retain the resident, medication, longitudinal story,
care-team review, and device-adapter demonstrations. Operational shift handoffs
are deliberately separate from `prepare_care_team_review`, which now stages
nurse review only. See [the tool matrix](docs/WEBMCP_EVALUATION.md).

Tools appear only when useful. An uncovered shift exposes coverage tools. A
pending scheduler decision removes them. Assignment exposes briefing tools.
Completion exposes handoff preparation. The final acknowledgement remains a
human-only UI action. This prevents redundant capabilities and makes workflow
order observable to judges.

## Human authority and reliability

- The server—not the model—evaluates all eight coverage constraints.
- Schedule and evidence snapshots become stale when authoritative state changes.
- Idempotency keys prevent duplicate proposals, check-ins, diagnostics, and
  handoffs.
- Conditional database updates prevent double approval and invalid transitions.
- A missing visit check-in is not treated as proof that a caregiver is absent.
- The agent cannot assign staff, contact anyone, diagnose, alter a care plan,
  release medication, or determine that an emergency exists.
- The demo has no external messaging, clinical-record, pharmacy, workforce, or
  emergency-service integration.

## Product surfaces

- **Caregiver cockpit** opens first with Today, Schedule, My Shift, Handoffs,
  Story, and Care Plan. It models the caregiver's job and continuity loop.
- **Rose's view** preserves the calm, large-touch resident medication station and
  bounded self-report flow.
- **Devices & MCP** shows current tools, evidence boundaries, signed-plan
  provenance, and the extensible `grapevine.care.device.v1` adapter.

## Three-minute judge path

1. Open the public site; **Caregiver call-out** is the default scenario.
2. Ask the agent to inspect `shift-wed-pm`, explain eligible and excluded
   candidates, and prepare the safest coverage option without assigning anyone.
3. Show the scheduler drawer and approve Jordan.
4. Open **My shift** and show “Since you were last here,” expectations, and
   explicit “do not infer” boundaries. Start and complete the compressed visit.
5. Prepare the handoff to Luis. Show that Luis cannot see it until Jordan
   approves, then acknowledge it as Luis.
6. Open **Devices & MCP** to show the state-dependent tool surface.

Close with: **“Care doesn't happen in one shift. Grapevine makes sure context
doesn't end when the shift does.”**

See the timed [demo script](docs/DEMO_SCRIPT.md),
[judge guide](docs/JUDGE_GUIDE.md),
[architecture](docs/ARCHITECTURE.md), [safety case](docs/SAFETY.md),
[evaluation results](docs/EVAL_RESULTS.md), and
[competition checklist](docs/COMPETITION_CHECKLIST.md).

## Architecture

- React 19, TypeScript, Vite
- Cloudflare Worker API and D1 state
- OpenAI Sites build and hosting metadata
- Zod schemas converted to WebMCP JSON Schema inputs
- Vitest, Testing Library, and Node SQLite test harness

Five migrations separate base care state, browser-run isolation, evidence
resolution, longitudinal context, and caregiver continuity. Tables and endpoints
are documented in [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local setup

Requirements: Node 24+ and pnpm 11+.

```bash
pnpm install
pnpm run db:local
pnpm run start
```

Open <http://localhost:5173/>.

## Verification

```bash
pnpm run verify
```

The suite verifies browser-run isolation, deterministic reset, medication/device
invariants, evidence freshness, idempotency, human approval, the complete
caregiver continuity loop, ineligible-candidate rejection, and stale schedule
protection.

## Source lineage and license

Grapevine Care is a distinct healthcare adaptation of
[Project Grapevine](https://github.com/samueltate/project-grapevine). It retains
the upstream pattern of structured evidence and approval before consequence,
while replacing the domain model, workflows, tools, interface, and demo story.
The full provenance is in [PROJECT_ORIGIN.md](PROJECT_ORIGIN.md).

The submission repository is
[Vyndir/grapevine-care](https://github.com/Vyndir/grapevine-care). The upstream
disaster-response repository remains separate and is not modified by this work.

Copyright © 2026 Sam Tate & Miles Greer. Licensed under the [MIT License](LICENSE).
