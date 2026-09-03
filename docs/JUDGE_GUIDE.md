# Judge guide

## What to evaluate first

Grapevine Care models the caregiver coordinator's day—not an AI medication
dispenser and not a collection of disconnected scenarios.

```text
observe → investigate → prepare → human decision → document → advance
```

The page presents one focused decision at a time. The simulated clock cannot move
until that decision is resolved, escalated, deferred with a reason, or waiting on
an identified person. No open question is silently resolved by advancing time.

## Recommended WebMCP environment

- Latest ChatGPT desktop app
- Built-in browser with **Enable site tools** on under Browser settings → Permissions
- An account and selected model that support Site Tools
- Grapevine Care kept open while using its page-scoped tools

Open the address-bar Site Tools menu. In the initial 9:15 AM block, expect:

```text
get_care_team_overview   get_resident_context
get_shift_context       prepare_team_inquiry
```

The capability chip mirrors the active tool set. Consequential tools are removed
when their workflow is no longer valid.

## Primary interactive verification

Ask:

> I am taking over the care coordinator desk. Tell me what needs attention now,
> investigate what is unknown, and prepare the next safe step for my review.

### 9:15 AM — Evelyn verification inquiry

1. `get_care_team_overview` identifies one focused decision: Evelyn's visit has no
   verification record. It must not claim that Luis is absent or Evelyn is unsafe.
2. `prepare_team_inquiry` stages a bounded status-and-ETA question. Nothing is sent.
3. Approve it in the coordinator-only interface.
4. Luis's explicit simulated response arrives as caregiver self-report, not EVV.
5. Record the disposition. Only then does the advance gate open.

### 11:30 AM — Walter assignment readiness

1. Advance time. Walter becomes the single focused decision.
2. Ask whether Elena is ready for Walter's visit.
3. The agent identifies missing resident-specific orientation and Care Plan v2
   acknowledgement, then prepares the packet and follow-up.
4. The coordinator sends the simulated check-in. Elena's response explicitly
   reports that she reviewed and submitted the packet.
5. The coordinator verifies receipt and clears Elena to proceed. The judge never
   impersonates Elena, and the agent cannot complete or verify the requirement.

### 2:15 PM — Rose coverage recovery

1. Advance time. Maya's call-out enters the day as the next decision.
2. Ask the agent “Who can cover Rose, and why not Elena or Luis?” The agent may
   call `get_coverage_candidates({})`; the server resolves the single active
   uncovered shift without making the judge supply an internal ID.
3. Confirm the server reports the same named constraints for every candidate and
   no opaque suitability score.
4. The scheduler—not the agent—approves Jordan.

Continue through the 5:00 PM visit, 7:35 PM completion, and 8:00 PM handoff. At
5:00 PM, the judge stays in the coordinator role: prepare and send Jordan's readiness
check-in, review her own acknowledgement, then verify and clear her. Observations remain bounded. At handoff, the coordinator requests and verifies Jordan's approval, then requests and verifies Luis's receipt.

At 7:35 PM, keep the same coordinator lens: prepare and send the visit-update
request, review Jordan's submitted completed tasks, direct observation, and
unresolved item, then verify the record before handoff preparation becomes valid.

## Failure conditions judges should try

- Click **Advance** before closing Evelyn's inquiry: the server returns a blocked
  gate with the exact remaining requirement.
- Ask “Did Luis fail to show up?” before inquiry evidence exists: the correct
  answer is that presence is unknown.
- Try to assign an ineligible caregiver: the server rejects it.
- Reuse a stale schedule or evidence snapshot: preparation fails closed.
- Try to have the agent submit or verify Walter's packet or acknowledge Luis's handoff: no such
  WebMCP capability exists.

## Fast source review

| Question | File |
| --- | --- |
| Dynamic tool registration | `src/useWebMCPTools.ts` |
| Schemas and JSON Schema inputs | `src/schemas.ts` |
| Server invariants and advance gate | `src/server.ts` |
| Time-led day UI | `src/CareTeamDayView.tsx` |
| Inquiry persistence | `drizzle/0007_inquiry_driven_day.sql` |
| Multi-resident state | `drizzle/0006_care_team_day.sql` |
| Caregiver continuity state | `drizzle/0005_caregiver_continuity_loop.sql` |
| Executable behavior | `src/server.test.ts`, `src/App.test.tsx`, `src/schemas.test.ts` |
| Safety boundaries | `docs/SAFETY.md` |
| Source separation | `PROJECT_ORIGIN.md` |

## Challenge-criteria loop

| Criterion | Evidence in this build |
| --- | --- |
| WebMCP leverage | Natural questions drive stateful reads, bounded preparation, visible human decisions, fresh rereads, and context-dependent capability changes |
| Execution | D1-backed state machines, deterministic reset, server-enforced time gates, inquiry provenance, version conflicts, idempotency, and automated tests |
| Potential impact | Addresses missed verification, readiness gaps, schedule disruption, replacement briefing, and handoff loss in one coherent caregiver workday |
| Creativity and ambition | Combines agents, caregivers, residents, schedules, evidence, and device adapters without transferring clinical or workforce authority to AI |

## Scope honesty

This is a reliable competition simulation, not production healthcare software. It
has no identity provider, protected health information, real dispatch, electronic
health record, pharmacy, medical-device, or emergency-service integration.
