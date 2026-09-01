# Devpost submission draft

## Project name

Grapevine Care

## Tagline

Devices observe. Agents structure evidence. People stay in control.

## Inspiration

Rose's morning medication window ends without a removal confirmation. Her
caregiver should not have to manually reconcile a dispenser alert, schedule,
device status, inventory level, and activity history—and an AI should not guess
what happened. Grapevine Care gives an agent structured evidence through
WebMCP, lets it explain what is known and unknown, and lets it prepare the next
human check-in without gaining authority over medication or emergency decisions.

## What it does

The fictional, per-browser demo connects an elder-friendly medication station,
caregiver workspace, and extensible device registry. When a medication removal
is unconfirmed, the agent reads a versioned evidence snapshot, prepares a
bounded question that only Rose can answer, re-reads the changed evidence, and
then may prepare—but never send—a caregiver check-in. A person approves or
dismisses the final action.

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
boundary, plan version, uncertainty, and state-dependent capabilities. The
server rejects stale evidence and the page removes preparation tools during
human decisions. The agent can coordinate without pretending it dispensed
medication, answered for Rose, or contacted a caregiver.

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
