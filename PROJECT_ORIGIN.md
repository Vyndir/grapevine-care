# Grapevine Care project origin

Grapevine Care is a separate healthcare WebMCP project created on August 31,
2026. Its technical starting point was MIT-licensed Project Grapevine commit
`bbe3539` (`Update LICENSE`) from
https://github.com/samueltate/project-grapevine.

This record is intentionally explicit. The OpenAI WebMCP Challenge submission
does not claim the shared foundation was created anew, and it does not modify or
replace the upstream disaster-response project.

The repository preserves the joint MIT notice—Copyright (c) 2026 Sam Tate &
Miles Greer—at the user's request. Repository separation does not remove or
diminish either contributor's authorship or licensing rights.

## Foundation retained

- React, TypeScript, Vite, Cloudflare Worker, and D1 as the general application
  stack.
- The architectural principle that agents should consume structured evidence
  while people retain authority over consequential decisions.
- Direct page-scoped WebMCP registration with JSON Schema inputs.
- The upstream MIT license and copyright notice.

## Replaced for Grapevine Care

- Disaster-response schemas, migrations, seed data, API routes, workspaces,
  sensor flows, coordination tools, and visual system were removed.
- The data model was rebuilt around fictional residents, medication windows,
  inventory, connected-care devices, evidence events, and prepared actions.
- The interface was redesigned as three healthcare-specific surfaces: an
  elder-friendly resident station, a caregiver continuity workspace, and a
  device/WebMCP control-plane view.
- The demo state became deterministic caregiver-continuity, longitudinal-story,
  and medication/device scenarios with one-click reset.

## New WebMCP contract

Grapevine Care defines seventeen healthcare-specific tools and exposes only the
subset appropriate to the current human workflow state:

1. `get_care_overview`
2. `get_medication_schedule`
3. `get_inventory_forecast`
4. `get_device_capabilities`
5. `get_care_evidence`
6. `prepare_resident_check_in`
7. `prepare_caregiver_check_in`
8. `request_device_health_snapshot`
9. `get_resident_context`
10. `get_care_story`
11. `prepare_care_team_review`
12. `get_shift_context`
13. `get_coverage_candidates`
14. `prepare_shift_coverage`
15. `get_changes_since_last_shift`
16. `get_shift_brief`
17. `prepare_shift_handoff`

These are not renamed disaster-logistics operations. They use a distinct care
evidence model, a resident evidence-resolution loop, versioned evidence
snapshots, longitudinal baseline comparison, dynamic capability registration,
and different approval semantics.
The agent can place a bounded question on Rose's station but cannot answer it;
only Rose's visible controls can contribute her self-report. Any evidence change
invalidates older snapshot IDs. A later caregiver action remains reversible and
approval-gated, and cannot contact anyone. The device diagnostic is non-clinical
and cannot control the device. Medication release, biometric confirmation,
dosage changes, diagnosis, emergency determination, and clinical decisions are
not exposed to agents.

## Independent submission artifacts

- Repository: https://github.com/Vyndir/grapevine-care
- Live application: https://grapevine-care.miles-g.chatgpt.site/
- Package: `grapevine-care-webmcp`
- Database and migrations: `grapevine-care` / `drizzle/0001_grapevine_care.sql`
  through `drizzle/0005_caregiver_continuity_loop.sql`
- Architecture, safety case, demo script, submission copy, competition
  checklist, and evaluation matrix are maintained within this repository.

Grapevine Care and Project Grapevine share a design philosophy and an
MIT-licensed starting foundation. They do not share a problem domain, data
model, tool set, user journey, approval workflow, visual interface, deployment,
or judging scenario.
