# Title

Grapevine Care

## One-line Summary

WebMCP helps a care coordinator investigate uncertainty, recover disrupted
coverage, and preserve accountable context across an entire caregiver shift.

## Problem

Care does not happen in one shift. A coordinator must reconcile schedules,
caregiver readiness, resident-specific context, missing verification, visit
records, and handoffs—often while plans change. Conventional dashboards scatter
that context across screens and leave people to reconstruct what is known, what
is still unknown, and who must decide next.

## Solution

Grapevine Care is a fictional, safety-first caregiver-continuity simulation. Its
primary experience is one compressed Care Team Day across three residents:

1. At 9:15 AM, Evelyn's visit lacks a verification record. The agent prepares a
   bounded inquiry; Luis answers in his own voice; the coordinator closes it.
2. At 11:30 AM, Elena is available for Walter but lacks resident-specific
   readiness. The agent prepares the packet and follow-up; Elena reports her
   completion; the coordinator verifies it.
3. At 2:15 PM, Maya calls out for Rose. The server evaluates four caregivers
   against eight named constraints, and the agent explains why only Jordan is
   eligible before a scheduler approves.
4. At 5:00 PM and 7:35 PM, the coordinator requests and verifies Jordan's
   readiness and visit record instead of impersonating her.
5. At 8:00 PM, Jordan approves the prepared handoff, Luis confirms receipt, and
   the coordinator verifies both sides.

Time is the spine of the experience. The clock cannot advance until the current
decision is resolved, escalated, deferred with a reason, or waiting on an
identified person. Advancing time never reveals the answer to an open question.

## Why This Matters

The product models the caregiver coordinator's actual job: maintain continuity
when evidence is incomplete and people change. WebMCP makes the experience
meaningfully better because an agent can work with the same evolving,
page-scoped state as the coordinator, traverse resident context and schedule
constraints, and prepare the next bounded action without scraping the interface
or taking authority away from people.

## How We Used AI

Grapevine exposes twenty purpose-built WebMCP tools through
`document.modelContext.registerTool`. Only the subset valid for the current
workflow state is registered. Read tools expose structured context, knowns,
unknowns, provenance, versioned snapshots, and deterministic constraint results.
Preparation tools stage bounded inquiries, orientation, coverage, or handoff
records. They do not contact a person or change an assignment without a visible
human decision.

The server—not the model—enforces time gates, eligibility, snapshot freshness,
idempotency, and legal workflow transitions. The agent cannot diagnose, make
clinical or emergency determinations, change care plans, assign staff, answer
for a caregiver or resident, or release medication.

## How We Used Codex

Codex helped turn the concept into a working React/TypeScript application:
designing schemas and state machines, implementing Cloudflare Worker/D1 routes,
building the caregiver-first interface, registering state-dependent WebMCP
tools, writing deterministic tests, diagnosing browser-specific registration
behavior, auditing safety boundaries, and iterating the judge journey. Codex
also helped keep the repository, origin record, evaluation matrix, judge guide,
and demo script aligned with the live implementation.

## Key Features

- One coherent six-block Care Team Day across Rose, Walter, and Evelyn.
- One focused decision at a time, with a server-enforced simulated-time gate.
- Inquiry-driven discovery: observations first, unknowns explicit, no surprise
  resolution through the timeline.
- Natural-language coverage discovery with eight transparent eligibility checks
  and no opaque suitability score.
- Coordinator-led readiness, visit-record, and handoff loops; judges never
  impersonate caregivers.
- Dynamic WebMCP capabilities that appear and disappear with the valid job.
- Versioned evidence and schedule snapshots with stale-state rejection.
- Idempotent preparation and conditional state transitions.
- Per-browser isolated demo runs and deterministic reset.
- Responsive, keyboard-focusable, reduced-motion-aware interface.
- Least-privilege simulated device adapter and explicit medical-safety boundary.

## Architecture

- React 19, TypeScript, Vite
- Cloudflare Worker API and D1 persistence
- Zod runtime validation and generated JSON Schema inputs
- Imperative, page-scoped WebMCP tool registration
- OpenAI Sites packaging and hosting
- Vitest, Testing Library, and Node SQLite test harness

The browser page is the WebMCP server. Human controls and agent tools share one
workflow state. Eleven migrations model isolated runs, evidence resolution,
longitudinal context, caregiver continuity, multi-resident time gates, readiness,
visit evidence, and two-sided handoff confirmation.

## Testing Instructions

1. Open the public demo in the latest ChatGPT desktop app's built-in browser.
2. Enable Site Tools under Browser settings → Permissions and use a supported
   account/model.
3. Reset Care Team Day with the circular-arrow control.
4. Confirm the opening block reads **9:15 AM · Morning verification** and the
   active tools are `get_care_team_overview`, `get_resident_context`,
   `get_shift_context`, and `prepare_team_inquiry`.
5. Ask: “I am taking over the care coordinator desk. Tell me what needs
   attention now, investigate what is unknown, and prepare the next safe step
   for my review.”
6. Approve Luis's simulated check-in, review his self-report, record the
   disposition, and advance to Walter.
7. Complete Walter's coordinator-led readiness loop, then advance to Rose.
8. Ask: “Who can cover Rose, and why not Elena or Luis?” Confirm every candidate
   receives the same eight named checks and only Jordan is eligible.
9. Continue through scheduler approval, Jordan readiness, visit evidence, and
   the two-sided handoff. Confirm the clock remains blocked at every unresolved
   decision.
10. Refresh midway to verify the current browser run remains coherent; reset to
    confirm a clean deterministic run.

Local verification:

```bash
pnpm install
pnpm run db:local
pnpm run verify
pnpm run start
```

## Public Demo Link

https://grapevine-care.miles-g.chatgpt.site/

## Public Repository Link

https://github.com/Vyndir/grapevine-care

## Demo Video

TODO — record and upload a public YouTube video under three minutes, with audio,
using `docs/DEMO_SCRIPT.md`. Per the user's instruction, recording begins only
after the final cold-start production verification.

## Screenshot Shot List

1. 9:15 AM hero clock, closed time gate, and Evelyn's known/unknown evidence.
2. Site Tools showing the four opening WebMCP capabilities.
3. Walter's orientation gap and Elena's submitted acknowledgement awaiting
   coordinator verification.
4. Rose coverage comparison showing Jordan eligible and explicit exclusions for
   Maya, Luis, and Elena.
5. 8:00 PM handoff showing separate Jordan approval and Luis receipt.

## Submission Readiness Notes

- Official event: The WebMCP Challenge (`webmcp`)
- Official deadline: September 3, 2026 at 1:00 PM Pacific / 4:00 PM Eastern
- Submitter type: **Team of Individuals** (Miles Greer and Sam Tate)
- App status: **New**; Grapevine Care was created August 31, 2026 during the
  submission period from a documented MIT-licensed foundation.
- Learning derived: **Significant**
- Career AI value: **Yes**
- Built with: WebMCP, React, TypeScript, Vite, Cloudflare Workers, Cloudflare D1,
  Zod, OpenAI Sites, Codex, Vitest
- Tested client: ChatGPT desktop in-app browser through Codex, with Site Tools
  enabled. The full six-block protocol and a separate final-release smoke check
  both passed on the public production deployment.
- Current verification: 31 automated tests plus TypeScript, public-repository
  security audit, production build, full six-block cold-start browser run,
  mid-flow refresh, deterministic reset, second-session isolation, and zero
  observed console errors.

## Known Limitations

This is a deterministic competition simulation, not production healthcare
software. It has no identity provider, protected health information, real
messaging or dispatch, electronic health record, pharmacy, workforce, medical
device, or emergency-service integration. Device and human responses are
fictional. It provides no diagnosis, medical advice, treatment decision, or
proof of medication ingestion.

## TODO Official Form Fields

- **Demo video URL:** pending recording and public YouTube upload.
- **Countries of residence for every team member:** confirm before submission;
  do not infer.
- **Devpost project/team:** create the separate Grapevine Care Devpost project,
  then add Sam Tate with the project invite link before submission.
- **Screenshots/thumbnail:** capture from the final public build after cold-start
  verification.
- **Codex session ID:** add if the final Devpost form requests one.
- **Final submission:** intentionally not performed; requires the user's explicit
  approval after video and asset review.
