# Three-minute demo script

## 0:00–0:12 — WebMCP immediately

Begin with **Missed window** already active. Ask ChatGPT to review Rose's care
state using this page's tools. Show `get_care_overview` and
`get_care_evidence` being called.

“Rose's medication window ended without a removal confirmation. That is a care
signal—not proof she missed a dose and not proof of an emergency.”

## 0:12–0:30 — The human problem

Show the caregiver workspace beside the agent response.

“A caregiver should not have to manually reconcile a schedule, dispenser
status, inventory, and device history—and an AI should not guess what happened.”

## 0:30–1:15 — Structured evidence, not scraping

Let ChatGPT inspect schedule, evidence, inventory, and device capabilities.
Point out provenance, timestamps, stale-state handling, and explicit
uncertainty. Mention that every judge has an isolated demo run.

## 1:15–1:40 — Agent prepares; person decides

Let ChatGPT call `prepare_caregiver_check_in`. When the review drawer opens:

“The agent prepared; it did not perform. No call, message, visit, medication
change, diagnosis, or emergency determination has occurred.”

Approve or dismiss the simulated action in the visible human surface.

## 1:40–1:55 — Authority stays local

Open Rose's station. Show the secured compartment and explain that medication
release and local attestation are deliberately absent from WebMCP.

## 1:55–2:18 — Extensible evidence plane

Open **Devices & MCP**. Show `grapevine.care.device.v1`, the medication
dispenser, room sensor, and blood-pressure cuff.

“Heterogeneous devices become understandable to agents without becoming
controllable by agents.”

## 2:18–2:42 — Reliability evidence

Briefly show the public repository, server invariant tests, evaluation results,
safety case, and joint MIT license. Mention full reset and cross-browser
isolation.

## 2:42–2:59 — Close

“Grapevine Care is a proposed control plane for human-agent-device
collaboration in consequential environments. Devices observe. Agents structure
evidence. People stay in control.”

## Recording checklist

- Keep the final video under three minutes.
- Show a real WebMCP call within the first 12 seconds.
- Record at 1080p with readable browser zoom and clear audio.
- Show the deployed URL and real tool calls.
- Use no third-party music, logos, or private data.
- Upload publicly to YouTube and add the link to Devpost.
