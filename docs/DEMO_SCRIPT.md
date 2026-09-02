# Three-minute demo script

## 0:00–0:12 — WebMCP immediately

The application opens with **72-hour story** active in the **Caregiver
cockpit**. Ask:

> How has Rose been doing over the last 72 hours? Compare her story with her
> signed monitoring plan and personal baseline. Explain what is known and still
> unresolved. If the authorized criteria are met, prepare the appropriate human
> care-team review. Do not diagnose or claim anything was sent.

Show `get_resident_context` and `get_care_story` within the first seconds.
Later, use **Rose’s view** to show that the resident surface is intentionally
calm and simple while the caregiver surface carries operational context.

## 0:12–0:37 — Rose is a person, not an alert

Open **Care Plan**: Rose is 79, lives independently, has documented routines and
preferences, and Nurse Ava authored the fictional monitoring rules.

“The agent does not invent what matters medically. The care team defines what
to watch; WebMCP gives the agent structured, source-labeled context.”

## 0:37–1:08 — Three days become a care story

Open **Story**. Show Day 1 routine confirmations; Day 2 unconfirmed window,
Rose's “I'm okay” self-report, and resumed activity; then Day 3's second gap and
later-than-baseline movement.

“Rose's response is useful resident evidence, but it does not prove medication
ingestion. Presence data is context, not a welfare or clinical conclusion.”

## 1:08–1:35 — Baseline-aware, uncertainty-preserving reasoning

Point to **What changed for Rose?**, the care brief counts, and **Still
unresolved**.

“Grapevine does not compare Rose with a generic definition of normal. It
compares observations with her authorized baseline and keeps unknowns visible.”

## 1:35–2:02 — Agent prepares; caregiver decides

Let ChatGPT call `get_care_evidence`, then `prepare_care_team_review`. The server
requires a current snapshot and verifies that two gaps match the signed plan.

When the drawer opens, show:

- nothing has been sent or transmitted;
- no diagnosis or emergency determination was made;
- no medication or care plan changed.

Approve or dismiss the simulated review.

## 2:02–2:25 — Capabilities follow the care workflow

Open **Devices & MCP**. Show that preparation tools disappear while a human
decision is pending and that the 11-tool catalog exposes only the current safe
subset.

“Safety is enforced by server state, snapshot freshness, idempotency, and human
surfaces—not only by prompt wording.”

## 2:25–2:45 — The original evidence-resolution loop

Briefly reset to **Missed window** and explain the optional second path:

device → agent → Rose → changed evidence → agent → caregiver.

Only Rose can answer her card; the agent must re-observe after her response.

## 2:45–2:59 — Close

“Grapevine Care helps people understand and coordinate a person's life over
time. Devices observe, agents organize context, and responsible humans remain
the source of truth and authority.”

## Recording checklist

- Keep the final video under three minutes.
- Show a real WebMCP call within the first 12 seconds.
- Record at 1080p with readable browser zoom and clear audio.
- Show the deployed URL and real tool calls.
- Use no third-party music, logos, protected health information, or private data.
- Upload publicly to YouTube and add the link to Devpost.
