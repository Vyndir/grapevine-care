# Three-minute demo script

## 0:00–0:12 — WebMCP immediately

Begin with **Missed window** active. Ask the natural judge prompt. Show
`get_care_overview` and `get_care_evidence` returning a current snapshot.

“Rose's medication window ended without a removal confirmation. That is a care
signal—not proof she missed a dose and not proof of an emergency.”

## 0:12–0:30 — The human problem

Show the caregiver workspace beside the agent response.

“A caregiver should not have to manually reconcile a schedule, dispenser
status, inventory, and device history—and an AI should not guess what happened.”

## 0:30–1:02 — Agent requests missing human evidence

Let ChatGPT call `prepare_resident_check_in`. Switch to Rose's station as the
bounded card appears.

“The agent did not text Rose, answer for her, or escalate. It made a safe human
surface available.”

Select **I'm okay** as Rose. Point out that the response is self-report—not
medication confirmation and not clinical verification.

## 1:02–1:34 — Evidence changed; agent must re-observe

Ask ChatGPT to continue. The earlier snapshot is now stale, so the server
requires another `get_care_evidence` call. Show both facts in the result:

- device: removal was not confirmed;
- resident: Rose reports that she is okay.

“Grapevine records who says what, when they knew it, and what authority that
source has.”

## 1:34–1:58 — Agent prepares; caregiver decides

Let ChatGPT call `prepare_caregiver_check_in`. When the review drawer opens:

“The agent prepared; it did not perform. No call, message, visit, medication
change, diagnosis, or emergency determination has occurred.”

Approve or dismiss the simulated action in the visible human surface.

## 1:58–2:12 — Capabilities follow workflow state

Open **Devices & MCP**. Show that preparation tools appear and disappear as the
workflow changes. Explain that safety is enforced by capability availability
and snapshot validation, not only prompt wording.

## 2:12–2:31 — Extensible evidence plane

Show `grapevine.care.device.v1`, signed Care Plan v4 provenance, and the safe
device-health snapshot capability.

“Heterogeneous devices become understandable to agents without becoming
controllable by agents.”

## 2:31–2:47 — Reliability evidence

Briefly show the public repository, server invariant tests, evaluation results,
safety case, and joint MIT license. Mention full reset and cross-browser
isolation.

## 2:47–2:59 — Close

“A device detects uncertainty. The agent does not guess. It gathers missing
human evidence, re-observes the changed state, prepares the next step, and
stops at the person with authority.”

## Recording checklist

- Keep the final video under three minutes.
- Show a real WebMCP call within the first 12 seconds.
- Record at 1080p with readable browser zoom and clear audio.
- Show the deployed URL and real tool calls.
- Use no third-party music, logos, or private data.
- Upload publicly to YouTube and add the link to Devpost.
