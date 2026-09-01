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

Grapevine Care registers six page-scoped tools directly with
`document.modelContext.registerTool(...)`:

| Tool | Agent contribution | Boundary |
| --- | --- | --- |
| `get_care_overview` | Reads current status, active window, and device health | Read only |
| `get_medication_schedule` | Reads fictional medication windows and confirmation states | Cannot change the plan or release medication |
| `get_inventory_forecast` | Calculates days remaining from units and daily cadence | Cannot order or request a prescription |
| `get_device_capabilities` | Discovers least-privilege capabilities across device adapters | No agent-facing release or biometric capability |
| `get_care_evidence` | Reads a bounded event trail with source and uncertainty | Device data is marked untrusted |
| `prepare_caregiver_check_in` | Stages a call, visit, or message for review | No one is contacted until a person approves; the demo has no external messaging integration |

The deterministic device controller—not the AI—enforces schedule windows,
duplicate-release prevention, door state, and local confirmation. The AI cannot
prescribe, alter a dose, release a compartment, impersonate a fingerprint,
diagnose, determine that an emergency exists, or contact emergency services.

## Judge demo

1. Open the deployed site in ChatGPT’s in-app browser and allow site tools.
2. In the **Judge demo** bar, select **Missed window**.
3. Ask ChatGPT:

   > Use only this page’s WebMCP tools. Review Rose’s current care overview,
   > medication schedule, recent evidence, inventory forecast, and connected
   > device capabilities. Explain what is known and what remains uncertain.
   > If a caregiver check-in is justified, prepare a call using the
   > idempotency key `judge-missed-window-call-01`. Do not claim anyone has
   > been contacted, do not diagnose, and stop for human approval.

4. ChatGPT should call the five read-only tools and then
   `prepare_caregiver_check_in`.
5. The visible review drawer opens. Confirm that it states **No one has been
   contacted**, then approve or dismiss the simulated action.
6. Switch to **Devices & MCP** to show the extensible adapter model and tool
   boundaries. Use the reset control to return to the deterministic starting
   state.

## Competition alignment

This project is designed for the OpenAI WebMCP Challenge:

- It is a working web application with imperative WebMCP tools and JSON Schema
  inputs.
- The human and agent operate in the same visible interface.
- Five tools are read-only; the only state-changing tool stages a reversible,
  approval-gated action with an idempotency key.
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
