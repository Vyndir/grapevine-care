# Devpost submission draft

## Project name

Grapevine Care

## Tagline

Context that follows the care.

## Inspiration

Care does not happen in one shift. When a caregiver calls out, the replacement
needs more than an address and a time: they need to know the person, what
changed, what matters today, what the previous caregiver saw, and what remains
unresolved. Grapevine Care keeps that context moving across the whole caregiver
continuity loop without transferring workforce or clinical authority to AI.

## What it does

The default fictional demo begins when Maya calls out for Rose's 5:00 PM visit.
WebMCP lets an agent inspect the versioned shift, evaluate four caregivers
against eight explicit constraints, explain exclusions and workload tradeoffs,
and prepare the one eligible option. A scheduler—not the agent—assigns Jordan.
Jordan receives a “Since you were last here” brief, acknowledges it, completes a
compressed visit, and records bounded facts. The agent prepares an
assignment-bound handoff; Jordan approves before Luis receives and acknowledges
it. The existing resident station, 72-hour care story, signed monitoring plan,
nurse review, and extensible device registry remain available as supporting
surfaces.

## How we built it

React and TypeScript provide the shared human interface. A Cloudflare Worker and
D1 keep isolated, deterministic demo runs with a complete reset and versioned
evidence snapshots. Zod produces bounded JSON Schemas for tools
registered with `document.modelContext.registerTool`. Device records implement a
least-privilege `grapevine.care.device.v1` adapter. OpenAI Sites packages and
hosts the project.

## How WebMCP improves the UX

Without WebMCP, an agent would scrape cards, infer status colors, and miss the
relationship between schedule, availability, readiness, resident context,
recent history, visit evidence, and the next shift. Grapevine exposes those
systems as one bounded conversation. Four safe caregiver-context reads remain
available so natural questions can use WebMCP without first scraping the page.
The opening `get_shift_context({})` call discovers the active disrupted shift
without requiring the user to know an internal ID. Consequential tools change
with the job: coverage tools disappear after scheduler approval, briefing tools
appear only for an assignment, and handoff preparation appears only after visit
completion. The server rejects stale schedule/evidence snapshots and ineligible
candidates. Human-only controls own assignment, visit acknowledgement, handoff
release, and recipient acknowledgement.

## Challenges

The hardest problem was modeling continuity without turning the agent into a
black-box dispatcher. We separated deterministic eligibility, agent explanation
and preparation, scheduler authority, assigned-caregiver actions, nurse review,
and next-caregiver acknowledgement, then encoded those boundaries in both the
server state machine and the visible interface.

## Accomplishments

- A deterministic, resettable judge flow.
- A complete coverage-recovery and caregiver-continuity loop.
- Eight named eligibility constraints with no sensitive ranking or opaque score.
- Schedule-version snapshots and stale-state rejection.
- Assignment-bound “Since you were last here” brief.
- Simulated EVV evidence that does not treat missing check-in as proof of absence.
- Operational handoffs separated from the nurse-review workflow.
- Outgoing-caregiver approval before recipient access and acknowledgement.
- Isolated browser runs that prevent cross-judge state contamination.
- Server-enforced single confirmation, idempotent staging, and single review.
- A resident evidence-resolution loop where only Rose can respond.
- Snapshot-bound tool ordering that forces re-observation after state changes.
- Dynamic WebMCP capabilities that appear and disappear with workflow state.
- A deterministic six-block **Care Team Day** across Rose, Walter, and Evelyn,
  with one focused decision and a server-enforced advance gate per block.
- An operational attention queue with explicit deadlines, sources, policy
  bases, knowns, unknowns, and human owners—never opaque medical prioritization.
- Human-gated resident-specific onboarding: the agent prepares Walter’s packet;
  Elena alone acknowledges it.
- Structured chain-of-custody provenance and signed care-plan source identity.
- Safe, idempotent device diagnostics without remote-control authority.
- Rose profile, personal baseline, care preferences, and care-team-authored
  monitoring rules with explicit source provenance.
- A deterministic 72-hour care story and agent-readable longitudinal care brief.
- A server-enforced signed-plan threshold for nurse review.
- Nurse reviews and shift handoffs that are separate, snapshot-bound,
  idempotent, approval-gated, and never transmitted by the simulation.
- Explicit uncertainty for missed windows and stale devices.
- Elder, caregiver, and device/MCP surfaces in one shared application.
- A capability adapter that can support future equipment without granting
  release authority.

## What we learned

WebMCP is most valuable when it exposes a trustworthy workflow contract—not
just buttons. In a high-consequence domain, annotations, provenance,
idempotency, and visible human approval are part of the user experience.

## What’s next

The next step is not a clinical pilot. It is independent review with caregivers,
older adults, pharmacists, clinicians, security specialists, accessibility
experts, and regulatory counsel, followed by validated hardware and privacy
architecture if the concept is appropriate to pursue.

## Required links before submission

- Live Sites URL: https://grapevine-care.miles-g.chatgpt.site/
- Public repository URL: https://github.com/Vyndir/grapevine-care
- Public YouTube demo: _record and upload using `docs/DEMO_SCRIPT.md`_

## Testing instructions for judges

Use the latest ChatGPT desktop app and open the live URL in ChatGPT's built-in
browser. In Browser settings → Permissions, ensure **Enable site tools** is on;
Site Tools also require a supported account and selected model. Keep the page
open and use the address-bar Site Tools menu to inspect the registered tools.

The default Care Team Day initially exposes four tools: three safe context reads
(`get_care_team_overview`, `get_resident_context`, `get_shift_context`) plus
`prepare_team_inquiry`. The interface's **Agent tools** chip shows the same set.
After explicit inquiry closure, the clock can advance and the capability set
changes to Walter's readiness work, then Rose's coverage, visit, and handoff
tools. The smaller visible set is an intentional workflow boundary.

Suggested prompt:

> I am taking over the care coordinator desk. Tell me what needs attention now,
> investigate what is unknown, and prepare the next safe step for my review.

The first call should be `get_care_team_overview({})`; no internal resident or
shift ID is required. Close Evelyn's inquiry before advancing to Walter, then
continue to Rose's call-out. Inspect Site Tools after each transition to confirm
that inquiry, readiness, coverage, briefing, and handoff capabilities follow the
work instead of appearing as one oversized static API.
