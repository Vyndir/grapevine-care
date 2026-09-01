# Grapevine Care evaluation results

Last run: September 1, 2026

Command:

```bash
pnpm run test
```

Result: **3 test files passed, 17 tests passed, 0 failed.**

## Recorded coverage

| Evaluation area | Result | Evidence |
| --- | --- | --- |
| Only capabilities appropriate to the current workflow register | Pass | Frontend dynamic-registration tests |
| Missed-window uncertainty is visible | Pass | Frontend scenario test |
| Agent can prepare a resident card but cannot answer it | Pass | Frontend resident-loop test |
| Rose’s response exposes caregiver preparation only after human input | Pass | Frontend resident-loop test |
| Agent-prepared check-in stops at human review | Pass | Frontend tool/UI test |
| Device capabilities remain least-privilege | Pass | Frontend device-boundary test |
| Unsafe or unknown action channel is rejected | Pass | Schema and server tests |
| Isolated browser runs cannot change each other | Pass | Two-run server test |
| Full reset restores inventory, doses, events, and actions | Pass | Server reset equivalence test |
| Duplicate, missed, door-open, and offline release are blocked | Pass | Server controller-invariant test |
| Repeated idempotency key returns one action and one event | Pass | Server action test |
| Repeated action review creates no second event | Pass | Server resolution test |
| Review time follows the fictional simulated timeline | Pass | Server resolution test |
| Changed evidence invalidates an older snapshot | Pass | Server snapshot-order test |
| Resident answer is recorded as self-report, not medication proof | Pass | Server provenance test |
| Device diagnostic is non-clinical and idempotent | Pass | Server device-check test |
| Missing/invalid run identity is rejected | Pass | Server boundary test |
| Oversized request body is rejected even without content length | Pass | Server input test |

## Deterministic outcomes observed

- Unsafe medication-release paths exposed to WebMCP: **0**
- Autonomous emergency or external-contact channels accepted: **0**
- Duplicate prepared actions for the same run and key: **0**
- Duplicate review-history events on replay: **0**
- Cross-run state mutations in the two-session test: **0**
- Reset deviations from the documented baseline in the tested flow: **0**
- Stale-snapshot caregiver preparations accepted after new evidence: **0**
- Agent-facing resident-response capabilities: **0**
- Duplicate device diagnostic events for the same key: **0**

## Scope and honesty note

These are executable application, schema, and server-contract evaluations. They
do **not** claim to measure probabilistic LLM tool selection across 15–25 natural
language prompts. That separate clean-room client evaluation remains a
submission task and must be recorded only after it is actually run against the
deployed WebMCP build. The project will not invent an agent-selection score.

The planned prompt corpus and expected selections are published in
[NATURAL_LANGUAGE_EVAL_PLAN.md](NATURAL_LANGUAGE_EVAL_PLAN.md).
