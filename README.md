# Grapevine Care

**Context that follows the care.**

Grapevine Care is a safety-first WebMCP prototype for caregiver continuity. Its
primary experience is one compressed **Care Team Day** across three fictional
residents. The coordinator sees one accountable decision at a time, investigates
unknowns through evidence, records a human disposition, and advances the clock
only when the current time block is accounted for.

```text
observe → investigate → prepare → human decision → document → advance
```

The app never resolves uncertainty through a hidden timeline reveal. New events
may arrive as time advances, but open questions remain visibly waiting, deferred,
escalated, or resolved until evidence and a human decision close them.

Every resident, caregiver, shift, medication window, device, event, and timestamp
is fictional. This is a competition simulation—not a medical device, clinical
decision-support system, workforce-management product, emergency service, or
substitute for professional care.

## The Care Team Day

The large clock, named daypart, current-decision workspace, and six-block progress
rail make time the spine of the experience:

1. **9:15 AM · Evelyn:** a visit is scheduled, but no verification record exists.
   WebMCP prepares a bounded status inquiry; a coordinator approves it; Luis
   supplies a simulated self-report; the coordinator records a disposition.
2. **11:30 AM · Walter:** Elena is available, but resident-specific orientation
   and Care Plan v2 acknowledgement are incomplete. The agent prepares the packet
   and follow-up; the coordinator sends it, reviews Elena's response, and verifies
   receipt before clearing her to proceed.
3. **2:15 PM · Rose:** Maya calls out before the evening visit. Deterministic
   constraints identify Jordan as the eligible replacement; a scheduler approves.
4. **5:00 PM · Replacement visit:** the agent prepares a current-brief readiness check-in, the coordinator sends it, Jordan responds in her own voice, and the coordinator verifies her response before the visit begins.
5. **7:35 PM · Visit completion:** bounded observations are recorded without
   clinical inference.
6. **8:00 PM · Continuity handoff:** the agent prepares a handoff; Jordan approves;
   Luis acknowledges receipt.

## Why WebMCP matters

Caregiver coordination spans schedules, staff readiness, resident preferences,
signed plans, recent evidence, live visits, and handoffs. WebMCP gives the agent
structured, page-scoped access to the same evolving state people are using.

The primary day begins with four capabilities:

| Tool | Purpose | Boundary |
| --- | --- | --- |
| `get_care_team_overview` | Read the current block, focused decision, knowns, unknowns, owner, and advance gate | Read only; operational ordering is not medical triage |
| `get_resident_context` | Resolve the resident in view by natural name or current context | Read only; facts and preferences remain distinct |
| `get_shift_context` | Discover the relevant shift without requiring an internal ID | Read only; returns versioned state |
| `prepare_team_inquiry` | Stage a bounded question when verification evidence is missing | No contact until coordinator approval; no inference of absence |

During Rose's call-out, `get_coverage_candidates({})` likewise resolves the one
active uncovered shift. Natural questions such as “Who can cover Rose?”, “Why
not Elena?”, and “What excludes Luis?” reach the same deterministic comparison.
If more than one shift needs coverage, the tool asks the user to choose instead
of guessing. Coverage preparation still requires the explicit shift, caregiver,
and fresh schedule snapshot returned by earlier reads.

As the day changes, the page replaces completed capabilities with only the tools
valid for the next job: assignment orientation, coverage comparison and
preparation, incoming-caregiver briefing, visit evidence, and handoff preparation.
The complete contract is documented in
[the WebMCP evaluation matrix](docs/WEBMCP_EVALUATION.md).

## Human authority and reliability

- The server—not the model—evaluates coverage constraints and timeline gates.
- The clock cannot advance while the current decision lacks an accountable state.
- A missing verification record is not proof that a caregiver is absent.
- Luis's demo response is labeled caregiver self-report, not independent EVV proof.
- Snapshot versions fail closed when authoritative state changes.
- Idempotency keys and conditional updates prevent duplicate preparation and
  double decisions.
- The agent cannot assign staff, contact anyone without approval, diagnose, alter
  a care plan, release medication, or determine that an emergency exists.
- The demo has no external messaging, clinical-record, pharmacy, workforce, or
  emergency-service integration.

## Product surfaces

- **Care Team Day** is the single judge-facing workspace and opens by default.
- **Resident station** appears only when a resident response is genuinely needed.
- **How WebMCP works** shows the current capability set, evidence boundaries,
  provenance, and the extensible `grapevine.care.device.v1` adapter.

## Judge path

Use the latest ChatGPT desktop app's built-in browser with Site Tools enabled and
a supported account/model. Ask:

> I am taking over the care coordinator desk. Tell me what needs attention now,
> investigate what is unknown, and prepare the next safe step for my review.

Confirm that the agent reads the current day state, prepares rather than performs
consequential work, and that the clock stays gated until a person records the
disposition. Continue through Walter's readiness and Rose's call-out to see the
tool surface change with the job.

Close with: **“Care doesn't happen in one shift. Grapevine makes sure context
doesn't end when the shift does.”**

See the [timed demo script](docs/DEMO_SCRIPT.md), [judge guide](docs/JUDGE_GUIDE.md),
[architecture](docs/ARCHITECTURE.md), [safety case](docs/SAFETY.md), and
[competition checklist](docs/COMPETITION_CHECKLIST.md).

## Architecture

- React 19, TypeScript, and Vite
- Cloudflare Worker API and D1 state
- OpenAI Sites build and hosting metadata
- Zod schemas converted to WebMCP JSON Schema inputs
- Vitest, Testing Library, and Node SQLite test harness

Eight migrations separate base care state, browser-run isolation, evidence
resolution, longitudinal context, caregiver continuity, the multi-resident day,
inquiry-driven time gating, and Walter's readiness follow-up verification. See
[ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Local setup and verification

Requirements: Node 24+ and pnpm 11+.

```bash
pnpm install
pnpm run db:local
pnpm run start
pnpm run verify
```

The suite verifies browser-run isolation, deterministic reset, evidence freshness,
idempotency, human approvals, inquiry closure, time gating, caregiver readiness,
coverage recovery, visit completion, and handoff acknowledgement.

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
