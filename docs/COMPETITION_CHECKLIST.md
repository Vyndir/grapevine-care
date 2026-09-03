# OpenAI WebMCP Challenge checklist

Verified against the official challenge and Devpost rules on August 31, 2026.

## Implemented

- [x] Working WebMCP application using `document.modelContext.registerTool`
- [x] JSON Schema inputs and bounded runtime validation
- [x] Read-only annotations and untrusted-content annotations
- [x] Human-agent collaboration in the same visible interface
- [x] Explicit human approval before consequence
- [x] Deterministic scenarios and reset
- [x] Per-browser demo isolation and complete atomic reset
- [x] Server invariant tests and GitHub Actions verification
- [x] Resident evidence-resolution loop with human-only response controls
- [x] Evidence-snapshot binding and stale-state rejection
- [x] State-dependent WebMCP capability registration
- [x] Natural-language workflow bootstrap with optional shift ID
- [x] Persistent safe caregiver-context reads with state-dependent actions
- [x] Visible active-tool diagnostic on the primary caregiver workspace
- [x] Structured evidence chain of custody and safe device diagnostics
- [x] Fictional Rose profile, personal baseline, and care-team-authored monitoring plan
- [x] Deterministic compressed 72-hour care episode
- [x] Agent-readable longitudinal care brief with unresolved questions
- [x] Snapshot-bound nurse review with server-enforced plan threshold
- [x] Nurse review and operational shift handoff separated into non-overlapping workflows
- [x] Caregiver-first workspace with a focused Today → My Shift → Handoff path and contextual supporting detail
- [x] Full call-out recovery loop from disruption through recipient acknowledgement
- [x] Deterministic eight-constraint caregiver eligibility with no opaque ranking score
- [x] Schedule-snapshot binding and stale-shift rejection
- [x] Human-only scheduler approval, visit acknowledgement, handoff approval, and recipient acknowledgement
- [x] “Since you were last here” assignment brief with unchanged facts and explicit unknowns
- [x] Simulated EVV events that do not treat missing check-in as proof of absence
- [x] Multi-resident Care Team Day with exactly three distinct operational needs
- [x] Deterministic seven-step compressed workday with visible Advance simulated time control
- [x] Cross-resident WebMCP overview with knowns, unknowns, sources, policy bases, deadlines, and human owners
- [x] Natural resident references that resolve exactly or fail without guessing
- [x] Idempotent Walter orientation preparation with human-only Elena acknowledgement
- [x] Responsive, keyboard-focusable, reduced-motion-aware UI
- [x] Public-repository-ready source, setup, tests, and MIT license
- [x] Clear source lineage from Project Grapevine
- [x] Dedicated repository identity, origin record, and WebMCP evaluation matrix
- [x] Submission copy and under-three-minute demo script

## Required before final Devpost submission

- [x] Deploy the caregiver-continuity build to the live Sites URL
- [x] Publish this healthcare adaptation in a public repository
- [x] Confirm the joint MIT license is visible at the repository root/about area
- [ ] Record and publicly upload the demo video to YouTube with audio
- [ ] Add live URL, repository URL, video URL, screenshots, and team members to Devpost
- [ ] Run the judge prompt in ChatGPT’s in-app browser on the deployed URL
- [x] Set the Sites deployment to judge-accessible public access
- [ ] Submit before September 3, 2026 at 1:00 p.m. PT

The project must remain available throughout judging. Any external libraries,
data, or assets added later must be authorized for use and documented.
