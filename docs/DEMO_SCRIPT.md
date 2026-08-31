# Three-minute demo script

## 0:00–0:25 — The problem

“Medication support is not just a reminder problem. Families need trustworthy
evidence, older adults need dignity and clarity, and an AI agent must never
quietly become the prescriber, dispenser, or emergency dispatcher.”

Show Rose’s resident screen and the visible “device—not the AI” explanation.

## 0:25–0:55 — Resident and device boundary

Show the eligible morning window, deterministic safety checks, and local
fingerprint simulation. Confirm the dose. Point out that only one compartment
changes and that no biometric data is exposed.

## 0:55–1:25 — A meaningful care signal

Reset, then choose **Missed window**. Switch to the caregiver workspace. Show:

- the latest observation;
- the source and timestamp;
- the explicit uncertainty that removal, ingestion, and welfare are different;
- the inventory and device-health context.

## 1:25–2:20 — WebMCP collaboration

Use the README judge prompt. Let ChatGPT call the five read-only tools and
summarize the evidence. Then let it call `prepare_caregiver_check_in`.

When the review drawer opens, say: “The agent prepared; it did not perform.”
Show the three negative confirmations and approve or dismiss the simulated
action.

## 2:20–2:50 — Extensibility

Open **Devices & MCP**. Show the adapter contract and three device categories.
Explain that each device advertises bounded capabilities and provenance, while
medication release and biometric data are never agent-facing.

## 2:50–3:00 — Close

“Grapevine Care turns a page into a safe coordination surface where devices
observe, agents structure evidence, and people remain responsible for
consequences.”

## Recording checklist

- Keep the final video under three minutes.
- Record at 1080p with readable browser zoom and clear audio.
- Show the deployed URL and real tool calls.
- Use no third-party music, logos, or private data.
- Upload publicly to YouTube and add the link to Devpost.
