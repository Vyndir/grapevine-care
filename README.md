# Grapevine Care

Grapevine Care is a safety-first WebMCP prototype showing how an AI agent, a
caregiver, and a connected medication dispenser could share structured evidence
without handing medical or emergency decisions to the agent.

The experience has three coordinated surfaces:

- **Rose’s station** gives an older adult a calm, large-touch medication-window
  experience. A simulated local biometric attestation can confirm the currently
  eligible compartment.
- **Caregiver workspace** separates device evidence from interpretation, shows
  uncertainty explicitly, forecasts inventory, and requires a person to review
  any staged check-in.
- **Devices & WebMCP** makes the tool contract, device capabilities, provenance,
  and non-negotiable safety boundaries visible.

Every resident, medication window, device, caregiver, event, and timestamp is
fictional. This is a competition demonstration—not a medical device, clinical
decision-support system, adherence guarantee, emergency service, or substitute
for professional care.

## WebMCP collaboration model

Grapevine Care defines eight bounded tools and exposes only the subset appropriate
to the current human workflow state through `document.modelContext.registerTool(...)`:

| Tool | Agent contribution | Boundary |
| --- | --- | --- |
| `get_care_overview` | Reads current status, active window, and device health | Read only |
| `get_medication_schedule` | Reads fictional medication windows and confirmation states | Cannot change the plan or release medication |
| `get_inventory_forecast` | Calculates days remaining from units and daily cadence | Cannot order or request a prescription |
| `get_device_capabilities` | Discovers least-privilege capabilities across device adapters | No agent-facing release or biometric capability |
| `get_care_evidence` | Returns a compact chain of custody and current snapshot ID | Later preparation fails if evidence changes |
| `prepare_resident_check_in` | Places one bounded question on Rose’s station | The agent cannot answer for Rose or interpret her response as medication proof |
| `prepare_caregiver_check_in` | Stages a call, visit, or message from a current snapshot | No one is contacted until a person approves; the demo has no external messaging integration |
| `request_device_health_snapshot` | Requests a fresh non-clinical diagnostic | Cannot control the device or return clinical readings |

The capability set is state-dependent. During a pending resident response or
caregiver review, preparation tools disappear. Every human or device
contribution increments an evidence version, making earlier snapshot IDs stale
and forcing the agent to observe again before it can prepare the next step.

The deterministic device controller—not the AI—enforces schedule windows,
duplicate-release prevention, door state, and local confirmation. The AI cannot
prescribe, alter a dose, release a compartment, impersonate a fingerprint,
diagnose, determine that an emergency exists, or contact emergency services.

## Judge demo

1. Open the deployed site in ChatGPT’s in-app browser and allow site tools.
2. In the **Judge demo** bar, select **Missed window**.
3. Ask ChatGPT:

   > Rose’s medication window passed and I cannot tell what actually happened.
   > Use this page’s tools to determine what the system knows, safely resolve
   > any missing information you can, and help prepare the appropriate human
   > next step. Do not diagnose, recommend a medication decision, answer for
   > Rose, or claim anyone was contacted.

4. ChatGPT should inspect current evidence, receive an `evidence_snapshot_id`,
   and call `prepare_resident_check_in`. A question appears on Rose’s station.
5. Switch to **Resident** and let Rose choose one bounded response. The agent
   cannot press these controls. The old evidence snapshot is now stale.
6. Ask ChatGPT to continue. It must call `get_care_evidence` again before
   `prepare_caregiver_check_in` becomes valid.
7. The visible review drawer opens. Confirm that it states **No one has been
   contacted**, then approve or dismiss the simulated action.
8. Switch to **Devices & MCP** to show the changing capability set, evidence
   chain of custody, signed care-plan provenance, and safe device diagnostic.
   boundaries. Use the reset control to return to the deterministic starting
   state.

## Competition alignment

This project is designed for the OpenAI WebMCP Challenge:

- It is a working web application with imperative WebMCP tools and JSON Schema
  inputs.
- The human and agent operate in the same visible interface.
- Capabilities appear and disappear with the workflow; pending human decisions
  remove agent preparation tools.
- Snapshot binding server-enforces the sequence observe → request evidence →
  re-observe → prepare → human decides.
- Resident and device contributions are structured by actor, evidence class,
  observed time, trust boundary, and care-plan version.
- Tool outputs contain source, observation time, calculation details, and
  explicit uncertainty.
- The demo has deterministic scenarios and a one-click reset for reliable
  judging.
- Every browser receives an isolated D1-backed demo run; confirmation,
  inventory, evidence, and actions cannot leak between judges.
- Reset reconstructs the complete run from a known seed in one database batch.
- The public source includes setup instructions and an MIT license.

See [Submission notes](docs/SUBMISSION.md), [Demo script](docs/DEMO_SCRIPT.md),
[Architecture](docs/ARCHITECTURE.md), [Safety case](docs/SAFETY.md), and the
[WebMCP evaluation matrix](docs/WEBMCP_EVALUATION.md).

## Architecture

- React 19 + TypeScript + Vite
- Cloudflare Worker API
- D1 structured demo state
- OpenAI Sites build and hosting metadata
- Zod schemas converted to JSON Schema for WebMCP inputs
- Vitest + Testing Library

Device interoperability uses the logical adapter contract
`grapevine.care.device.v1`. Each device advertises a bounded list of
capabilities, status, firmware, provenance, and last-seen time. New equipment
can join the same evidence model without gaining medication-release authority.

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
pnpm run test
pnpm exec tsc --noEmit
pnpm run audit:public
pnpm run build
```

`pnpm run eval` runs the published WebMCP and server-invariant evaluation set.
See [recorded results](docs/EVAL_RESULTS.md).

## Source lineage and license

Grapevine Care is a distinct healthcare adaptation of
[Project Grapevine](https://github.com/samueltate/project-grapevine). It retains
the original project’s useful WebMCP pattern—structured evidence, shared human
and agent context, and approval before consequence—while replacing the disaster
logistics domain, data model, tools, interface, and demo flow.

The complete provenance, inherited foundation, and healthcare-specific changes
are recorded in [PROJECT_ORIGIN.md](PROJECT_ORIGIN.md). The submission repository
is [Vyndir/grapevine-care](https://github.com/Vyndir/grapevine-care); the upstream
disaster-response repository remains a separate project and is not modified by
this submission.

Copyright © 2026 Sam Tate & Miles Greer. Licensed under the [MIT License](LICENSE).
