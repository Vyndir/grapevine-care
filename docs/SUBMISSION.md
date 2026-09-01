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

The fictional, per-browser demo connects an elder-friendly medication station, caregiver
workspace, and extensible device registry. Six WebMCP tools let an agent inspect
care status, medication windows, inventory, device capabilities, and evidence,
then stage—but never send—a caregiver check-in. The visible interface requires
a person to approve or dismiss that action.

## How we built it

React and TypeScript provide the shared human interface. A Cloudflare Worker and
D1 keep isolated, deterministic demo runs with a complete reset. Zod produces bounded JSON Schemas for tools
registered with `document.modelContext.registerTool`. Device records implement a
least-privilege `grapevine.care.device.v1` adapter. OpenAI Sites packages and
hosts the project.

## How WebMCP improves the UX

Without WebMCP, an agent would scrape cards, infer status colors, and click
controls meant for people. Grapevine Care exposes the exact evidence model and
workflow boundary: observation time, provenance, uncertainty, read-only
capabilities, and a single approval-gated preparation tool. The agent can help
without pretending it dispensed medication or contacted a caregiver.

## Challenges

The hardest problem was not adding automation; it was deciding where automation
must stop. We separated local device enforcement, agent-readable evidence, and
human approval, then made those boundaries visible in both the tool contract and
the interface.

## Accomplishments

- A deterministic, resettable judge flow.
- Isolated browser runs that prevent cross-judge state contamination.
- Server-enforced single confirmation, idempotent staging, and single review.
- Five read-only tools and one idempotent, approval-gated write tool.
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
