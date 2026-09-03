# Grapevine Care project origin and submission-period record

Grapevine Care is a separate healthcare WebMCP project created on August 31,
2026, during the WebMCP Challenge submission period. Its technical starting
point was MIT-licensed Project Grapevine commit
[`bbe3539fe627dafb2514a2b32816528780f4786f`](https://github.com/samueltate/project-grapevine/commit/bbe3539fe627dafb2514a2b32816528780f4786f)
(`Update LICENSE`). The first healthcare implementation commit is
[`3eb98aa2e002e65cd8d4b15f56557a9e60d18e45`](https://github.com/Vyndir/grapevine-care/commit/3eb98aa2e002e65cd8d4b15f56557a9e60d18e45),
dated August 31, 2026.

This record is intentionally explicit. The submission does not claim that the
shared foundation was created anew, and it does not modify or replace the
upstream disaster-response project. The repository preserves the joint MIT
notice—Copyright (c) 2026 Sam Tate & Miles Greer—at the user's request.

## Foundation retained from the MIT-licensed upstream project

- React, TypeScript, Vite, Cloudflare Worker, and D1 as the general stack.
- The design principle that agents consume structured evidence while people
  retain authority over consequential decisions.
- Direct, page-scoped WebMCP registration with JSON Schema inputs.
- The upstream MIT license and joint copyright notice.

## Implemented for Grapevine Care during the submission period

- Replaced the disaster-response domain, schemas, seed data, migrations, routes,
  sensor flows, coordination tools, interface, and demo story.
- Built a fictional three-resident Care Team Day around caregiver verification,
  resident-specific readiness, coverage recovery, visit evidence, and handoff.
- Added deterministic, server-enforced time gates and one accountable decision
  per time block; advancing time never resolves an open question.
- Added versioned evidence and schedule snapshots, stale-state rejection,
  idempotent preparation, conditional updates, and isolated browser demo runs.
- Added coordinator-led inquiry loops so judges never impersonate Luis, Elena,
  Jordan, Rose, or a medical professional.
- Added the signed monitoring-plan, 72-hour care-story, nurse-review, simulated
  device adapter, and least-privilege safety boundaries.
- Redesigned the judge experience around the time-led Care Team Day, a temporary
  resident-response surface only when a response is actually needed, and a
  technical “How WebMCP works” surface.

## Current WebMCP contract

The current code defines twenty healthcare-specific tools and exposes only the
subset valid for the current human workflow state:

1. `get_care_overview`
2. `get_medication_schedule`
3. `get_inventory_forecast`
4. `get_device_capabilities`
5. `get_care_evidence`
6. `get_resident_context`
7. `get_care_story`
8. `prepare_resident_check_in`
9. `prepare_caregiver_check_in`
10. `request_device_health_snapshot`
11. `prepare_care_team_review`
12. `get_shift_context`
13. `get_coverage_candidates`
14. `prepare_shift_coverage`
15. `get_changes_since_last_shift`
16. `get_shift_brief`
17. `prepare_shift_handoff`
18. `get_care_team_overview`
19. `prepare_team_inquiry`
20. `prepare_assignment_orientation`

These are not renamed disaster-logistics operations. They use a distinct care
evidence model, resident and caregiver inquiry loops, longitudinal baseline
comparison, dynamic capability registration, and care-specific approval
semantics. Agents can read, compare, and prepare. They cannot assign staff,
answer for a person, verify another person's evidence, diagnose, change a care
plan, release medication, determine an emergency, or contact anyone without a
visible human decision.

## Dated implementation history

- **August 31:** healthcare simulation, separate repository identity, base care
  data, browser-run isolation, and initial WebMCP contract.
- **September 1:** evidence-resolution loop, dynamic tools, longitudinal care
  story, nurse review, and caregiver-first experience.
- **September 2:** complete caregiver continuity, judge-focused navigation,
  discoverability, multi-resident Care Team Day, inquiry-driven time gating, and
  Walter readiness verification.
- **September 3:** natural coverage discovery, coordinator-led Jordan readiness,
  visit and handoff inquiries, visual hierarchy, unified brand palette, and
  cross-browser WebMCP registration hardening.

The repository's [timestamped commit history](https://github.com/Vyndir/grapevine-care/commits/main/)
is the source of truth for the exact sequence and diff of each change.

## Independent submission artifacts

- Repository: https://github.com/Vyndir/grapevine-care
- Live application: https://grapevine-care.miles-g.chatgpt.site/
- Package: `grapevine-care-webmcp`
- Database: `grapevine-care`
- Migrations: `drizzle/0001_grapevine_care.sql` through
  `drizzle/0011_handoff_confirmation_inquiries.sql`
- Judge guide, architecture, safety case, demo script, submission copy,
  competition checklist, and evaluation matrices are maintained in this repo.

Grapevine Care and Project Grapevine share a design philosophy and an
MIT-licensed starting foundation. They do not share a problem domain, data
model, tool contract, user journey, approval workflow, visual interface,
deployment, or judging scenario.
