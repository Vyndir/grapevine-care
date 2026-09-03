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
goal-oriented capability set from the same interface people use.

The six caregiver-continuity tools are:

| Tool | Purpose | Enforced boundary |
| --- | --- | --- |
| `get_shift_context` | Discover the active disrupted shift without requiring an internal ID, then read assignment, disruption, visit, handoff, and version-bound schedule context | Read only; creates a snapshot for safe follow-on preparation |
| `get_coverage_candidates` | Check availability, qualification, training, Rose orientation, care-plan acknowledgement, conflicts, travel, and weekly hours | Deterministic checks; no sensitive ranking or opaque score |
| `prepare_shift_coverage` | Stage one eligible coverage recommendation | Scheduler must approve before assignment changes |
| `get_changes_since_last_shift` | Catch the assigned caregiver up on meaningful changes | Source-bounded; no clinical inference |
| `get_shift_brief` | Assemble person, plan, expectations, unresolved items, and boundaries | Only for the assigned caregiver |
| `prepare_shift_handoff` | Stage completed work, bounded observations, and unresolved items | Outgoing caregiver approves before recipient access |

Eleven supporting tools retain the resident, medication, longitudinal story,
care-team review, and device-adapter demonstrations. Operational shift handoffs
are deliberately separate from `prepare_care_team_review`, which now stages
nurse review only. See [the tool matrix](docs/WEBMCP_EVALUATION.md).

Four safe context tools remain discoverable throughout the caregiver call-out
workflow: `get_resident_context`, `get_care_story`, `get_care_evidence`, and
`get_shift_context`. Consequential tools still appear only when useful. An
uncovered shift adds coverage evaluation and preparation; assignment replaces
those with briefing tools; completion adds handoff preparation. Final
acknowledgement remains a human-only UI action. The main workspace shows the
current capability set so judges can see that this lifecycle is intentional.

The bootstrap call accepts `get_shift_context({})`. Grapevine resolves the one
active disrupted shift and returns its opaque IDs for later calls, so a person
can simply ask, “Who can cover Rose tonight?”

### Advanced scenario: Care Team Day

The short **Caregiver call-out** remains the default judge path. **Care Team
Day** is the broader proof: a seven-step compressed workday across exactly three
fictional residents.

- **Evelyn, 81:** a scheduled visit has no verification record. Grapevine says
  presence is unknown—not that the caregiver failed to arrive—and later resolves
  the gap when a simulated EVV record appears.
- **Walter, 84:** Elena is generally qualified and available, but Walter-specific
  orientation and Care Plan v2 acknowledgement are incomplete. WebMCP can
  prepare the packet; only Elena can acknowledge it in the visible interface.
- **Rose, 79:** a later call-out enters the existing deterministic coverage,
  briefing, visit, and handoff workflow.

`get_care_team_overview` returns the operational attention queue with deadlines,
sources, policy bases, known facts, unknowns, and human owners. It is ordered by
workflow rules—not medical severity or an opaque AI score. Natural references
such as `resident_ref: "Evelyn"` let an agent drill into a shift without asking
the user for internal IDs. Across all scenarios the application has 19 tools,
but only the small state-appropriate subset is page-scoped at any moment.

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

- **Caregiver workspace** opens first with a focused Today, My Shift, and Handoff
  journey. Schedule, recent context, and the signed plan remain available as
  supporting disclosures inside the caregiver workflow.
- **Rose's station** preserves the calm, large-touch resident medication station and
  bounded self-report flow.
- **How WebMCP works** shows current tools, evidence boundaries, signed-plan
  provenance, and the extensible `grapevine.care.device.v1` adapter.

## Three-minute judge path

Use the latest ChatGPT desktop app's built-in browser with Site Tools enabled
under Browser → Permissions and a supported account/model. Open the address-bar
Site Tools menu to inspect the capabilities currently offered by the page.

1. Open the public site; **Caregiver call-out** is the default scenario. The
   page should show **Agent tools · 6 active**.
2. Ask the agent to inspect Rose's uncovered evening shift, explain eligible and excluded
   candidates, and prepare the safest coverage option without assigning anyone.
3. Show the scheduler drawer and approve Jordan.
4. Open **My shift** and show “Since you were last here,” expectations, and
   explicit “do not infer” boundaries. Start and complete the compressed visit.
5. Prepare the handoff to Luis. Show that Luis cannot see it until Jordan
   approves, then acknowledge it as Luis.
6. Open **How WebMCP works** to show the state-dependent tool surface.

For the advanced proof, open the visible **Explore Care Team Day** invitation or
use `?scenario=care_team_day`, then ask: “I’m taking over the care coordinator
desk. Catch me up and help me get everyone through today.” Use **Advance
simulated time** to move from Evelyn’s uncertainty to Walter’s human-gated
readiness work and then Rose’s call-out. The global **Scenario guide** maps each
deterministic scenario to a natural-language judge prompt and its intended proof.

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
