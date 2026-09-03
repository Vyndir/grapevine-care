# Three-minute demo script

## 0:00–0:15 — The caregiver's real problem

Open the public site on the default **Caregiver call-out** scenario.

Point out the **Agent tools · 6 active** chip. The initial surface combines four
safe context reads with two workflow-specific coverage tools.

“It is 2:15 PM. Maya just called out for Rose's 5:00 PM visit. Care does not
pause, and the replacement caregiver cannot arrive without the context the shift
requires.”

Show the six-step continuity loop and the explicit scheduler authority.

## 0:15–0:48 — WebMCP resolves coverage safely

Ask ChatGPT:

> Rose's 5 PM shift lost coverage. Use this page's tools to inspect the shift,
> evaluate every caregiver against the explicit constraints, explain every
> exclusion and tradeoff, and prepare the eligible option for scheduler review.
> Do not assign anyone, use an opaque score, or infer suitability from sensitive
> traits.

Show `get_shift_context({})`, `get_coverage_candidates`, and
`prepare_shift_coverage`. Point out that Jordan is the only eligible option;
Maya is unavailable, Luis lacks a feasible travel window, and Elena lacks Rose
orientation and Care Plan v4 acknowledgement.

## 0:48–1:05 — A person changes the schedule

The scheduler drawer opens. Show:

- all eight deterministic checks passed;
- the 39/40-hour workload tradeoff is visible;
- no assignment changed and no caregiver was contacted.

Approve Jordan in the human-only UI. The coverage tools disappear; safe context
reads remain and assignment-bound briefing tools replace the coverage actions.

## 1:05–1:38 — “Since you were last here”

Open **My shift**. Show:

- Rose as a person, not an alert;
- Care Plan v4 and changes since Jordan's last visit;
- what matters today;
- the unresolved nurse review;
- explicit “do not infer” boundaries.

“The agent assembles context across systems. It does not invent care instructions
or decide that a clinical event occurred.”

Jordan acknowledges the brief and starts the simulated visit. Explain that the
check-in is simulated EVV evidence; a missing check-in would not prove absence.

## 1:38–2:05 — The shift produces bounded evidence

Complete the compressed visit. Show the recorded facts:

- evening routine completed;
- meal delivery acknowledged;
- Rose asked for a later dinner;
- no cause or clinical meaning inferred.

`prepare_shift_handoff` now becomes available. It was not present before the
visit was complete.

## 2:05–2:31 — Context reaches the next caregiver

Prepare the handoff to Luis. Show that the outgoing caregiver must approve and
Luis has no access to the draft. Approve as Jordan, open **Handoff**, and
acknowledge as Luis.

The loop now reads entirely complete:

`disruption → constraints → approval → brief → visit → handoff`

## 2:31–2:50 — WebMCP and device boundaries

Open **How WebMCP works**. Show the state-dependent tool list and
`grapevine.care.device.v1` adapter.

“The same architecture can accept evidence from future equipment, but a device
adapter cannot add executable tools, release medication, or transfer clinical
authority to the agent.”

## 2:50–2:59 — Close

“Care doesn't happen in one shift. Grapevine makes sure context doesn't end when
the shift does.”

## Recording checklist

- Keep the final video under three minutes.
- Show a real WebMCP call within the first 30 seconds and use the Site Tools
  activity UI to prove invocation.
- Record at 1080p with readable browser zoom and clear audio.
- Show the deployed URL, real tool calls, and both human approval gates.
- Use no protected health information, private data, third-party music, or
  unauthorized logos.
- Upload publicly to YouTube and add the link to Devpost.

## Optional advanced judge walkthrough

After the primary video path, judges can open **Explore Care Team Day** and ask:
“I’m taking over the care coordinator desk. Catch me up and help me get everyone
through today.” The compressed timeline demonstrates three distinct needs:
Evelyn’s missing EVV record resolves from later evidence, Walter’s onboarding
packet remains incomplete until Elena acknowledges it, and Rose’s 2:15 PM
call-out activates the existing continuity loop. This is the deeper live-test
path; do not crowd all seven steps into the required sub-three-minute video.
