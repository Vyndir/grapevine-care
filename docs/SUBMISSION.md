# Devpost submission draft

## Project name

Grapevine Care

## Tagline

Devices observe. Agents structure evidence. People stay in control.

## Inspiration

Rose's caregiver needs to know more than whether one alert fired: how Rose has
been doing relative to her own routine, what her care team asked the family to
watch, and what remains unknown. Grapevine Care turns three days of fictional
resident, device, caregiver, and care-team evidence into a source-visible care
story without letting the agent invent clinical meaning.

## What it does

The fictional, per-browser demo connects an elder-friendly medication station,
caregiver care cockpit, signed monitoring plan, care circle, and extensible
device registry. A compressed 72-hour episode establishes Rose's routine,
introduces an ambiguous medication gap, records Rose's bounded self-report,
shows routine activity resuming, and then introduces a second care-plan-relevant
change. WebMCP lets an agent read Rose's authorized context, summarize the
longitudinal story, preserve unresolved questions, and prepare—but never
transmit—a nurse review or shift handoff. A caregiver approves or dismisses it.

## How we built it

React and TypeScript provide the shared human interface. A Cloudflare Worker and
D1 keep isolated, deterministic demo runs with a complete reset and versioned
evidence snapshots. Zod produces bounded JSON Schemas for tools
registered with `document.modelContext.registerTool`. Device records implement a
least-privilege `grapevine.care.device.v1` adapter. OpenAI Sites packages and
hosts the project.

## How WebMCP improves the UX

Without WebMCP, an agent would scrape cards, infer status colors, and click
controls meant for people. Grapevine Care exposes the exact evidence model and
workflow boundary: actor identity, evidence class, observation time, trust
boundary, plan version, personal baseline, signed monitoring rule, uncertainty,
and state-dependent capabilities. The
server rejects stale evidence and the page removes preparation tools during
human decisions. The agent can coordinate without pretending it dispensed
medication, answered for Rose, or contacted a caregiver.
It can recognize “different for Rose” without claiming “clinically abnormal.”

## Challenges

The hardest problem was not adding automation; it was deciding where automation
must stop. We separated local device enforcement, agent-readable evidence, and
human approval, then made those boundaries visible in both the tool contract and
the interface.

## Accomplishments

- A deterministic, resettable judge flow.
- Isolated browser runs that prevent cross-judge state contamination.
- Server-enforced single confirmation, idempotent staging, and single review.
- A resident evidence-resolution loop where only Rose can respond.
- Snapshot-bound tool ordering that forces re-observation after state changes.
- Dynamic WebMCP capabilities that appear and disappear with workflow state.
- Structured chain-of-custody provenance and signed care-plan source identity.
- Safe, idempotent device diagnostics without remote-control authority.
- Rose profile, personal baseline, care preferences, and care-team-authored
  monitoring rules with explicit source provenance.
- A deterministic 72-hour care story and agent-readable longitudinal care brief.
- A server-enforced signed-plan threshold for nurse review or shift handoff.
- Care-team handoffs that are snapshot-bound, idempotent, approval-gated, and
  never transmitted by the simulation.
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
