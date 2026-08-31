# Project Grapevine

Project Grapevine is an open-source WebMCP reference implementation for
permissioned coordination across human and machine sources. It contains two
fictional demonstration workspaces:

- Live Ground Truth: an agent coordinates with field responders and simulated
  infrastructure sensors around a western North Carolina relief corridor.
- Resource Coordination: an internal relief coordinator uses a structured
  partner directory to turn an operational need into a reviewable response plan.

The demo is a fictional Hurricane Helene response simulation inspired by the
aid-distribution and access challenges experienced across western North
Carolina. A relief operations team must decide whether vehicles can travel from
a Boone staging hub to a simulated mountain shelter through the Watauga Relief
Corridor. A delayed regional baseline says the route is passable, while live
human observations or simulated machine telemetry can report changing
conditions.

All routes, shelters, responders, readings, partner organizations, contact
channels, and operational conditions are fictional. They do not represent
current emergency or travel guidance.

This repository is a technical reference, not the commercial product or
operating model behind it. Source verification, quality scoring, and machine
responses are intentionally simplified for the demonstration.

Live demo: <https://project-grapevine.preflyhq.com/>

## Test the Live Site with WebMCP

Use the ChatGPT desktop app's built-in browser. Site tools are tied to the page
that provides them, so keep the relevant Grapevine page open while running each
scenario. The operations page and partner directory each expose five tools. The
field inbox intentionally exposes no WebMCP tools because it is the human
response surface.

Requirements:

1. Open the built-in browser in the ChatGPT desktop app.
2. Visit <https://project-grapevine.preflyhq.com/>.
3. Approve access to the site if prompted.
4. Check the site-tools control in the address bar. The operations page should
   show five available tools.

Site-tool availability depends on the tester's ChatGPT account and selected
model. See OpenAI's [site tools documentation](https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app).

### Scenario 1: Verify Conditions with a Machine Source

Open <https://project-grapevine.preflyhq.com/> and send:

> Use only the WebMCP tools provided by this page. Read the published baseline
> for the Watauga Relief Corridor, find available sources within 5 km, and use
> the road conditions camera to prepare a hazard-report question about the aid
> route. Stop when human approval is required.

Expected flow:

1. ChatGPT calls `get_web_baseline` and `find_available_sources`.
2. ChatGPT calls `ask_source` for the simulated road camera.
3. The request drawer opens. Select **Send question**.
4. Send this follow-up:

> Retrieve the structured response, summarize its operational impact, and rate
> the response four stars.

ChatGPT should call `get_response` and `rate_response`. This exercises all five
Demo 1 tools without requiring a second device.

### Scenario 1B: Verify Conditions with a Human Source

This optional version uses a phone or second browser window.

1. On the second device, open
   <https://project-grapevine.preflyhq.com/drive>.
2. Use call sign `boone-field-team`, keep the operational area as
   `Watauga Relief Corridor`, and select **Go online**.
3. On the operations page in ChatGPT, send:

> Use this page's WebMCP tools to find the Boone field team and prepare a
> route-status question asking whether relief vehicles can safely reach
> Mountain Shelter B. Stop for approval.

4. Select **Send question** in the request drawer.
5. On the field device, choose a structured answer, add a short simulated
   observation, and submit it.
6. In ChatGPT, send:

> Retrieve the field response and explain whether dispatch should proceed.

This demonstrates the same WebMCP contract coordinating with a live human
instead of a deterministic sensor.

### Scenario 2: Turn a Resource Directory into a Response Plan

Open <https://project-grapevine.preflyhq.com/response> and send:

> Use only the WebMCP tools provided by this page. Read the crisis brief. We
> have two truckloads of bottled water and 40 temporary shelter kits at the
> Boone Staging Hub. Find up to two active partners serving the Watauga Relief
> Corridor for water, favor locally led organizations, inspect the evidence for
> each match, save a transparent shortlist, and prepare a coordination request.
> Do not claim that anyone has been contacted or that dispatch is approved.
> Tell me what remains uncertain.

Expected flow:

1. ChatGPT calls `get_crisis_brief`, `find_response_partners`, and
   `get_partner_details`.
2. ChatGPT calls `create_response_shortlist` and
   `prepare_coordination_request`.
3. The response plan shows the selected partners, but dispatch remains locked
   until a current route report is available.

To test the cross-demo handoff, continue with:

> Follow the recommended handoff to Live Ground Truth. Find the Boone field
> team and prepare a route-status question asking whether aid vehicles can
> safely reach Mountain Shelter B. Stop for approval.

Approve the question, answer `passable` from the field inbox, and ask ChatGPT to
retrieve the response and return to the partner directory. The plan should show
the field evidence and unlock the final human-controlled **Approve plan**
button. A `caution` or `blocked` report should keep approval locked.

### Troubleshooting Site Tools

- Use the ChatGPT desktop app's built-in browser, not Chrome or a normal browser.
- Keep the relevant page open; tools do not carry from `/response` to `/` or
  `/drive`.
- In ChatGPT Browser settings, open **Permissions** and confirm site tools are
  enabled and `project-grapevine.preflyhq.com` is allowed.
- Reload the page after changing permissions.
- If no site-tools control appears, the tester's account or selected model may
  not currently support site tools. The visual demo will still work, but the
  WebMCP scenarios require site-tool access.

## Aid Logistics Flow

1. An AI agent reads the published operational baseline.
2. The agent discovers available human and machine sources.
3. The agent prepares a structured verification request.
4. A user reviews and authorizes the request.
5. The selected source returns a structured response with optional context.
6. The requester reviews the response and records a source-quality rating.

## Route-Specific WebMCP Tools

The Aid Logistics board at `/` registers five tools:

- `find_available_sources`
- `get_web_baseline`
- `ask_source`
- `get_response`
- `rate_response`

The same tools work for both source channels. Human requests are delivered to
the human-only field view at `/drive`. Two seeded machine sources, a creek-depth
gauge and roadside conditions camera, return deterministic, clearly labeled
simulated telemetry after authorization. A field responder cannot register a
phone as an infrastructure sensor.

The Resource Coordination workspace at `/response` registers five separate tools:

- `get_crisis_brief`
- `find_response_partners`
- `get_partner_details`
- `create_response_shortlist`
- `prepare_coordination_request`

The first three tools read structured directory evidence. The final two save a
transparent shortlist and stage a coordination request. No external partner is
contacted. If route evidence is uncertain, the result directs the coordinator
to Demo 1 for live field verification before dispatch.

## Current Build

- React operations board at `/`
- Mobile field-responder inbox at `/drive`
- Fictional response-partner directory at `/response`
- Cloudflare Worker API
- Cloudflare D1 persistence
- Approval-gated requests
- Structured logistics responses
- Illustrative source-quality feedback

The core reference does not require R2 or Durable Objects. D1 persists the
request loop, and the clients use short polling for updates.

## Local Setup

```bash
pnpm install
pnpm exec wrangler d1 migrations apply grapevine --local
pnpm run start
```

Open:

- Operations board: <http://localhost:5173/>
- Field inbox: <http://localhost:5173/drive>
- Resource coordination: <http://localhost:5173/response>

Deployed routes:

- Live ground truth: <https://project-grapevine.preflyhq.com/>
- Field inbox: <https://project-grapevine.preflyhq.com/drive>
- Resource coordination: <https://project-grapevine.preflyhq.com/response>

Local D1 remains local unless `--remote` is explicitly passed to Wrangler.

## Cloudflare Setup

The checked-in `wrangler.jsonc` points to the hosted reference demo. For a fork,
replace the D1 database ID and either replace the custom-domain route or remove
it and enable `workers_dev`.

Configure a D1 binding named `DB` in `wrangler.jsonc`:

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "grapevine",
    "database_id": "YOUR_D1_DATABASE_ID"
  }
]
```

For a fork without a custom domain, remove the existing `routes` block and set:

```json
"workers_dev": true
```

For a custom domain, replace the route pattern with a hostname in a Cloudflare
zone you control.

Apply migrations before deploying:

```bash
pnpm exec wrangler d1 migrations apply grapevine --remote
pnpm run deploy
```

Authenticate through Wrangler or environment variables. Do not commit secrets.

## Verification

```bash
pnpm run audit:public
pnpm run test
pnpm exec tsc --noEmit
pnpm run build
```

## Public Repository Safety

The repository contains no application secrets. Local environment files,
Wrangler state, build output, logs, and dependency folders are ignored. The D1
database UUID in `wrangler.jsonc` identifies the bound database but does not
grant access; Cloudflare credentials are still required for queries or deploys.

Run `pnpm run audit:public` before publishing. It fails on common credential
formats, non-empty secret assignments, private keys, and personal filesystem
paths. Keep real tokens in `.dev.vars`, `.env`, or your deployment environment;
those files must remain uncommitted.

## License

MIT
